import type { AIProvider } from "@/lib/app-context"

export interface ParsedTransaction {
  type: "expense" | "income" | "unknown"
  description: string
  amount: number
  category: string
  icon: string
  daysAgo?: number        // 0 = today, 1 = yesterday, N = N days ago (0–365)
  suggestRecurring?: boolean
  suggestedCurrency?: "USD" // only present when AI explicitly detects USD in the text
}

export interface ChatTurn {
  role: "user" | "assistant"
  text: string
}

export interface AIAttachment {
  type: "image" | "audio" | "file"
  base64: string
  mimeType: string
  file?: File // required for OpenAI Whisper audio transcription
}

// ── Prompt injection protection ───────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|prior|las?\s+instrucciones)/i,
  /you\s+are\s+(now|a\b)/i,
  /\bsystem\s*:/i,
  /instrucciones\s+anteriores/i,
  /olvidá?\s+(todo|instrucciones)/i,
  /<\s*\/?\s*system\s*>/i,
  /\[INST\]/i,
  /###\s*instruc/i,
  /\bnew\s+persona\b/i,
  /\bjailbreak\b/i,
  /pretend\s+(you|that)/i,
  /act\s+as\s+(if\b|a\b)/i,
  /forget\s+(previous|all|prior)/i,
  /disregard\s+(previous|all|prior|your)/i,
  /from\s+now\s+on\s+(you|ignore|act)/i,
]

/** Strips injection attempts and enforces max length. Throws on detected attack. */
export function sanitizeUserInput(text: string): string {
  const trimmed = text.trim().slice(0, 300)
  for (const p of INJECTION_PATTERNS) {
    if (p.test(trimmed)) {
      throw new Error("Entrada inválida. Describí el gasto de forma simple, por ejemplo: 'Gasté 5000 en el super'.")
    }
  }
  return trimmed
}

// ── Validation constants ──────────────────────────────────────────────────────

const VALID_ICONS = ["ShoppingCart", "Car", "Coffee", "Code", "Dumbbell", "ArrowDownLeft"]
const VALID_CATEGORIES = ["Comida", "Transporte", "Salidas", "Suscripciones", "Deporte", "Educacion", "Salud", "Trabajo", "General"]

// ── System prompts ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Sos un asistente de finanzas personales para Argentina. Tu única tarea es analizar texto, imágenes o audio en lenguaje natural y extraer transacciones financieras.

Respondé ÚNICAMENTE con JSON válido, sin texto extra, sin markdown, sin backticks.

Si hay UNA sola transacción:
{"type":"expense","description":"descripción corta máx 35 chars","amount":número,"category":"Comida","icon":"ShoppingCart","daysAgo":0,"suggestRecurring":false}

Si el mensaje menciona MÚLTIPLES transacciones, devolvé un array JSON (una por item):
[{"type":"expense","description":"...","amount":número,"category":"...","icon":"...","daysAgo":0,"suggestRecurring":false},{"type":"expense","description":"...","amount":número,"category":"...","icon":"...","daysAgo":0,"suggestRecurring":false}]

Para ingresos usar type:"income".

Si el contenido NO describe ninguna transacción financiera respondé exactamente:
{"type":"unknown"}

Reglas generales:
- amount siempre es un número positivo (sin signos)
- description: primera letra en mayúscula, máx 35 chars
- Si hay imagen de ticket o factura: extraé el monto total y el tipo de establecimiento
- Si hay audio: transcribí y analizá el contenido
- type "income" = cobro, ingreso, salario, venta, me pagaron, transferencia recibida
- type "expense" = gasto, compra, pago, transferencia enviada, gasté
- Cuando el usuario menciona un comercio (ej: "en MaxiLibrerias") aplicalo como contexto de categoría
- category y icon según el tema:
  * Comida/supermercado/delivery → "Comida", "ShoppingCart"
  * Transporte/nafta/peaje/uber/taxi/colectivo → "Transporte", "Car"
  * Restaurante/bar/salida/café → "Salidas", "Coffee"
  * Netflix/Spotify/software/app/suscripción → "Suscripciones", "Code"
  * Gym/deporte/medicina/salud → "Deporte", "Dumbbell"
  * Trabajo/freelance/salario/cobro → "Trabajo", "ArrowDownLeft"
  * Librería/papelería/útiles/ropa/shopping/electrodoméstico → "General", "ShoppingCart"
  * Si no entra en ninguna → "General", "ShoppingCart"
- Para ingresos preferir icon "ArrowDownLeft"
- Si dicen "hola", preguntas o texto sin transacción → {"type":"unknown"}

Campo daysAgo (entero ≥ 0, SIEMPRE incluir en la respuesta):
- 0 = hoy (valor por defecto cuando no se menciona fecha)
- 1 = "ayer"
- 2 = "anteayer" o "hace 2 días"
- N = "hace N días"
- Para día de semana (ej: "el lunes", "el martes pasado"): calculá los días hasta la fecha de hoy provista en el mensaje
- "la semana pasada" → 7
- "el mes pasado" → 30
- Para fechas exactas (ej: "el 5 de marzo", "3/3"): calculá los días usando la fecha de hoy del mensaje
- Máximo 365. Si no se menciona fecha → 0.

Campo suggestRecurring (boolean, SIEMPRE incluir):
- true: alquiler, sueldo, cuota, préstamo, gym, streaming, Netflix, Spotify, suscripción mensual/anual, luz, gas, internet, agua
- false: cualquier otro caso

Campo suggestedCurrency (incluir SOLO si se detecta explícitamente USD):
- Incluir "USD" SOLO si el texto menciona: dólares, dolares, USD, usd, verdes, dls, us$, u$s, dollar, dollars
- Omitir completamente el campo si el pago es en pesos argentinos`

function buildChatSystemPrompt(context: string): string {
  return `Sos BudgetBuddy AI, un asistente financiero personal para Argentina. Hablás en español rioplatense informal (vos, che).

Datos financieros actuales del usuario:
${context}

Instrucciones:
- Respondé preguntas sobre finanzas, gastos, ingresos y presupuesto basándote en los datos del contexto
- Dás consejos financieros prácticos y concretos adaptados a Argentina
- Sé conciso y claro (máximo 3-4 oraciones por respuesta)
- Si el usuario pregunta algo sin relación a finanzas, redirigilo amablemente
- No inventés datos que no estén en el contexto`
}

function buildUserMessage(input: string): string {
  // Include today's date so the AI can accurately compute daysAgo for relative dates
  const today = new Date().toISOString().split("T")[0] // "YYYY-MM-DD"
  return input.trim()
    ? `Hoy es ${today}.\nTexto del usuario: """${input}"""`
    : `Hoy es ${today}.\nAnalizá el contenido adjunto y extraé la transacción financiera si existe.`
}

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function validateOne(raw: ParsedTransaction): ParsedTransaction {
  if (!["expense", "income"].includes(raw.type)) raw.type = "expense"
  if (typeof raw.amount !== "number" || raw.amount <= 0) throw new Error("Monto inválido en la respuesta.")
  if (!VALID_ICONS.includes(raw.icon)) raw.icon = "ShoppingCart"
  if (!VALID_CATEGORIES.includes(raw.category)) raw.category = "General"
  if (!raw.description?.trim()) raw.description = "Transacción"
  raw.description = capitalize(raw.description.slice(0, 40))
  // daysAgo: must be a non-negative integer ≤ 365, default 0
  raw.daysAgo = (
    typeof raw.daysAgo === "number" &&
    Number.isInteger(raw.daysAgo) &&
    raw.daysAgo >= 0 &&
    raw.daysAgo <= 365
  ) ? raw.daysAgo : 0
  // suggestRecurring: must be boolean
  raw.suggestRecurring = raw.suggestRecurring === true
  // suggestedCurrency: only "USD" is accepted, otherwise remove the field
  if (raw.suggestedCurrency !== "USD") delete raw.suggestedCurrency
  return raw
}

function extractAndValidate(raw: string): ParsedTransaction | ParsedTransaction[] {
  const clean = raw.trim().replace(/```json|```/g, "").trim()

  // Try to find array first, then object
  const arrMatch = clean.match(/\[[\s\S]*\]/)
  const objMatch = clean.match(/\{[\s\S]*?\}/)

  // Array of transactions
  if (arrMatch) {
    let parsed: ParsedTransaction[]
    try { parsed = JSON.parse(arrMatch[0]) } catch { throw new Error("Error al interpretar la respuesta de la IA.") }
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("La IA no devolvió transacciones.")
    return parsed
      .filter(item => item.type !== "unknown")
      .map(validateOne)
  }

  // Single transaction object
  if (!objMatch) throw new Error("La IA no devolvió una respuesta válida.")
  let parsed: ParsedTransaction
  try { parsed = JSON.parse(objMatch[0]) } catch { throw new Error("Error al interpretar la respuesta de la IA.") }

  if (!parsed.type) throw new Error("Respuesta incompleta de la IA.")
  if (parsed.type === "unknown") return { type: "unknown", description: "", amount: 0, category: "", icon: "" }

  return validateOne(parsed)
}

// Key prefix validation — called before any network request to fail fast
const KEY_PREFIXES: Record<AIProvider, string> = {
  claude: "sk-ant-",
  openai: "sk-",
  gemini: "AIza",
}

function validateKeyFormat(provider: AIProvider, key: string): void {
  if (!key.startsWith(KEY_PREFIXES[provider]))
    throw new Error("API key inválida. Verificá tu clave en Ajustes.")
}

function translateError(msg: string): string {
  const m = msg.toLowerCase()
  if (
    m.includes("api key") || m.includes("api_key") || m.includes("api-key") ||
    m.includes("401") || m.includes("403") ||
    m.includes("invalid_api_key") || m.includes("authentication_error") ||
    m.includes("unauthorized") || m.includes("invalid_argument") ||
    m.includes("not valid") || (m.includes("invalid") && m.includes("key"))
  )
    return "API key inválida. Verificá tu clave en Ajustes."
  if (m.includes("rate limit") || m.includes("429") || m.includes("quota") || m.includes("resource_exhausted"))
    return "Límite de requests alcanzado. Esperá unos segundos."
  if (m.includes("model_not_found") || m.includes("model not found") || m.includes("not found for api"))
    return "Modelo no disponible. Verificá tu plan de API."
  if (m.includes("fetch") || m.includes("network") || m.includes("failed to fetch"))
    return "Error de conexión. Revisá tu internet."
  return msg
}

// ── Audio transcription (Whisper / OpenAI) ───────────────────────────────────
async function transcribeWithWhisper(apiKey: string, file: File): Promise<string> {
  const form = new FormData()
  form.append("file", file, file.name)
  form.append("model", "whisper-1")
  form.append("language", "es")

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}` },
    body: form,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(translateError(err?.error?.message || `Error transcribiendo audio ${res.status}`))
  }

  const data = await res.json()
  return data.text?.trim() || ""
}

// ── Claude (Anthropic) ────────────────────────────────────────────────────────
async function callClaude(apiKey: string, input: string, attachments?: AIAttachment[]): Promise<ParsedTransaction | ParsedTransaction[]> {
  validateKeyFormat("claude", apiKey)
  const images = attachments?.filter(a => a.type === "image") ?? []
  const audios = attachments?.filter(a => a.type === "audio") ?? []
  const files = attachments?.filter(a => a.type === "file") ?? []

  if (audios.length > 0) {
    throw new Error("Claude no soporta audio. Cambiá a Gemini o OpenAI en Ajustes para usar audio.")
  }

  const hasMedia = images.length > 0 || files.length > 0
  const userContent = hasMedia
    ? [
        ...images.map(img => ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: (img.mimeType || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: img.base64,
          },
        })),
        ...files.filter(f => f.mimeType === "application/pdf").map(f => ({
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: f.base64,
          },
        })),
        { type: "text" as const, text: buildUserMessage(input) },
      ]
    : buildUserMessage(input)

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-allow-browser": "true",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(translateError(err?.error?.message || `Error ${res.status}`))
  }

  const data = await res.json()
  const text = data.content?.[0]?.text
  if (!text) throw new Error("Claude no devolvió respuesta.")
  return extractAndValidate(text)
}

async function callClaudeChat(apiKey: string, context: string, history: ChatTurn[], audioAttachment?: AIAttachment): Promise<string> {
  validateKeyFormat("claude", apiKey)
  if (audioAttachment) {
    throw new Error("Claude no soporta audio en el chat. Cambiá a Gemini u OpenAI en Ajustes.")
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-allow-browser": "true",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 300,
      system: buildChatSystemPrompt(context),
      messages: history.map(m => ({ role: m.role, content: m.text })),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(translateError(err?.error?.message || `Error ${res.status}`))
  }

  const data = await res.json()
  const text = data.content?.[0]?.text
  if (!text) throw new Error("Claude no devolvió respuesta.")
  return text.trim()
}

// ── OpenAI ────────────────────────────────────────────────────────────────────
async function callOpenAI(apiKey: string, input: string, attachments?: AIAttachment[]): Promise<ParsedTransaction | ParsedTransaction[]> {
  validateKeyFormat("openai", apiKey)
  const images = attachments?.filter(a => a.type === "image") ?? []
  const audios = attachments?.filter(a => a.type === "audio") ?? []
  // files (PDFs, docs) are not directly supported by gpt-4o-mini vision; skipped

  // Transcribe audio with Whisper first
  let textInput = input
  for (const audio of audios) {
    if (!audio.file) continue
    const transcript = await transcribeWithWhisper(apiKey, audio.file)
    if (transcript) {
      textInput = textInput ? `${textInput} (audio: ${transcript})` : transcript
    }
  }

  const userContent = images.length > 0
    ? [
        ...images.map(img => ({
          type: "image_url" as const,
          image_url: { url: `data:${img.mimeType || "image/jpeg"};base64,${img.base64}` },
        })),
        { type: "text" as const, text: buildUserMessage(textInput) },
      ]
    : buildUserMessage(textInput)

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 400,
      temperature: 0.1,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(translateError(err?.error?.message || `Error ${res.status}`))
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error("OpenAI no devolvió respuesta.")
  return extractAndValidate(text)
}

async function callOpenAIChat(apiKey: string, context: string, history: ChatTurn[], audioAttachment?: AIAttachment): Promise<string> {
  validateKeyFormat("openai", apiKey)
  let finalHistory = history
  if (audioAttachment?.file) {
    const transcript = await transcribeWithWhisper(apiKey, audioAttachment.file)
    finalHistory = [
      ...history.slice(0, -1),
      { role: "user" as const, text: transcript || "[Audio no reconocido]" },
    ]
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 300,
      temperature: 0.7,
      messages: [
        { role: "system", content: buildChatSystemPrompt(context) },
        ...finalHistory.map(m => ({ role: m.role, content: m.text })),
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(translateError(err?.error?.message || `Error ${res.status}`))
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error("OpenAI no devolvió respuesta.")
  return text.trim()
}

// ── Gemini (Google) ───────────────────────────────────────────────────────────
async function callGemini(apiKey: string, input: string, attachments?: AIAttachment[]): Promise<ParsedTransaction | ParsedTransaction[]> {
  validateKeyFormat("gemini", apiKey)
  const parts: object[] = []

  // Add all attachments (images + audio + files) as inline_data
  for (const att of attachments ?? []) {
    parts.push({ inline_data: { mime_type: att.mimeType, data: att.base64 } })
  }

  parts.push({ text: buildUserMessage(input) })

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts }],
        generationConfig: {
          maxOutputTokens: 400,
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(translateError(err?.error?.message || `Error ${res.status}`))
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error("Gemini no devolvió respuesta.")
  return extractAndValidate(text)
}

async function callGeminiChat(apiKey: string, context: string, history: ChatTurn[], audioAttachment?: AIAttachment): Promise<string> {
  validateKeyFormat("gemini", apiKey)
  const contents = history.map((m, i) => {
    const isLast = i === history.length - 1
    if (isLast && audioAttachment) {
      return {
        role: "user",
        parts: [
          { inline_data: { mime_type: audioAttachment.mimeType, data: audioAttachment.base64 } },
          { text: m.text || "Procesá este mensaje de voz como consulta sobre mis finanzas." },
        ],
      }
    }
    return {
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    }
  })

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildChatSystemPrompt(context) }] },
        contents,
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.7,
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(translateError(err?.error?.message || `Error ${res.status}`))
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error("Gemini no devolvió respuesta.")
  return text.trim()
}

// ── Public entry points ───────────────────────────────────────────────────────
export async function callAI(
  provider: AIProvider,
  apiKey: string,
  input: string,
  attachments?: AIAttachment[]
): Promise<ParsedTransaction | ParsedTransaction[]> {
  // Sanitize input — throws immediately on injection attempt
  const safeInput = sanitizeUserInput(input)
  try {
    if (provider === "claude") return await callClaude(apiKey, safeInput, attachments)
    if (provider === "openai") return await callOpenAI(apiKey, safeInput, attachments)
    return await callGemini(apiKey, safeInput, attachments)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido."
    throw new Error(translateError(msg))
  }
}

export async function callAIChat(
  provider: AIProvider,
  apiKey: string,
  context: string,
  history: ChatTurn[],
  audioAttachment?: AIAttachment
): Promise<string> {
  // Defense-in-depth: sanitize the last user turn before sending
  const safeHistory = history.map((turn, i) =>
    i === history.length - 1 && turn.role === "user"
      ? { ...turn, text: sanitizeUserInput(turn.text) }
      : turn
  )
  try {
    if (provider === "claude") return await callClaudeChat(apiKey, context, safeHistory, audioAttachment)
    if (provider === "openai") return await callOpenAIChat(apiKey, context, safeHistory, audioAttachment)
    return await callGeminiChat(apiKey, context, safeHistory, audioAttachment)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido."
    throw new Error(translateError(msg))
  }
}
