import type { AIProvider } from "@/lib/app-context"

export interface ParsedTransaction {
  type: "expense" | "income" | "unknown"
  description: string
  amount: number
  category: string
  icon: string
}

export interface ChatTurn {
  role: "user" | "assistant"
  text: string
}

export interface AIAttachment {
  type: "image" | "audio"
  base64: string
  mimeType: string
  file?: File // required for OpenAI Whisper audio transcription
}

const VALID_ICONS = ["ShoppingCart", "Car", "Coffee", "Code", "Dumbbell", "ArrowDownLeft"]
const VALID_CATEGORIES = ["Comida", "Transporte", "Salidas", "Suscripciones", "Deporte", "Educacion", "Salud", "Trabajo", "General"]

const SYSTEM_PROMPT = `Sos un asistente de finanzas personales para Argentina. Tu única tarea es analizar texto, imágenes o audio en lenguaje natural y extraer información de una transacción financiera.

Respondé ÚNICAMENTE con JSON válido, sin texto extra, sin markdown, sin backticks.

Formato exacto cuando hay transacción:
{"type":"expense","description":"descripción corta máx 35 chars","amount":número,"category":"Comida","icon":"ShoppingCart"}

Para ingresos usar type:"income".

Si el contenido NO describe una transacción financiera respondé exactamente:
{"type":"unknown"}

Reglas:
- amount siempre es un número positivo (sin signos)
- Si hay imagen de ticket o factura: extraé el monto total y el tipo de establecimiento
- Si hay audio: transcribí y analizá el contenido
- type "income" = cobro, ingreso, salario, venta, me pagaron, transferencia recibida
- type "expense" = gasto, compra, pago, transferencia enviada, gasté
- category y icon según el tema:
  * Comida/supermercado/delivery → "Comida", "ShoppingCart"
  * Transporte/nafta/peaje/uber/taxi/colectivo → "Transporte", "Car"
  * Restaurante/bar/salida/café → "Salidas", "Coffee"
  * Netflix/Spotify/software/app/suscripción → "Suscripciones", "Code"
  * Gym/deporte/medicina/salud → "Deporte", "Dumbbell"
  * Trabajo/freelance/salario/cobro → "Trabajo", "ArrowDownLeft"
  * Ropa/shopping/electrodoméstico → "General", "ShoppingCart"
  * Si no entra en ninguna → "General", "ShoppingCart"
- Para ingresos preferir icon "ArrowDownLeft"
- Si dicen "hola", preguntas o texto sin transacción → {"type":"unknown"}`

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
  return input.trim()
    ? `Texto: "${input}"`
    : "Analizá el contenido adjunto y extraé la transacción financiera si existe."
}

function extractAndValidate(raw: string): ParsedTransaction {
  const clean = raw.trim().replace(/```json|```/g, "").trim()
  const match = clean.match(/\{[\s\S]*?\}/)
  if (!match) throw new Error("La IA no devolvió una respuesta válida.")

  let parsed: ParsedTransaction
  try {
    parsed = JSON.parse(match[0])
  } catch {
    throw new Error("Error al interpretar la respuesta de la IA.")
  }

  if (!parsed.type) throw new Error("Respuesta incompleta de la IA.")
  if (parsed.type === "unknown") return { type: "unknown", description: "", amount: 0, category: "", icon: "" }

  if (!["expense", "income"].includes(parsed.type)) parsed.type = "expense"
  if (typeof parsed.amount !== "number" || parsed.amount <= 0) throw new Error("Monto inválido en la respuesta.")
  if (!VALID_ICONS.includes(parsed.icon)) parsed.icon = "ShoppingCart"
  if (!VALID_CATEGORIES.includes(parsed.category)) parsed.category = "General"
  if (!parsed.description?.trim()) parsed.description = "Transacción"
  parsed.description = parsed.description.slice(0, 40)

  return parsed
}

function translateError(msg: string): string {
  if (msg.includes("API key") || msg.includes("api_key") || msg.includes("401") || msg.includes("403") || msg.includes("invalid_api_key") || msg.includes("Invalid API key") || msg.includes("INVALID_ARGUMENT"))
    return "API key inválida. Verificá tu clave en Ajustes."
  if (msg.includes("rate limit") || msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED"))
    return "Límite de requests alcanzado. Esperá unos segundos."
  if (msg.includes("MODEL_NOT_FOUND") || msg.includes("model not found") || msg.includes("not found for API"))
    return "Modelo no disponible. Verificá tu plan de API."
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch"))
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
async function callClaude(apiKey: string, input: string, attachments?: AIAttachment[]): Promise<ParsedTransaction> {
  const images = attachments?.filter(a => a.type === "image") ?? []
  const audios = attachments?.filter(a => a.type === "audio") ?? []

  if (audios.length > 0) {
    throw new Error("Claude no soporta audio. Cambiá a Gemini o OpenAI en Ajustes para usar audio.")
  }

  const userContent = images.length > 0
    ? [
        ...images.map(img => ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: (img.mimeType || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: img.base64,
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
      max_tokens: 150,
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

async function callClaudeChat(apiKey: string, context: string, history: ChatTurn[]): Promise<string> {
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
async function callOpenAI(apiKey: string, input: string, attachments?: AIAttachment[]): Promise<ParsedTransaction> {
  const images = attachments?.filter(a => a.type === "image") ?? []
  const audios = attachments?.filter(a => a.type === "audio") ?? []

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
      max_tokens: 150,
      temperature: 0.1,
      response_format: images.length > 0 ? undefined : { type: "json_object" },
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

async function callOpenAIChat(apiKey: string, context: string, history: ChatTurn[]): Promise<string> {
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
        ...history.map(m => ({ role: m.role, content: m.text })),
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
async function callGemini(apiKey: string, input: string, attachments?: AIAttachment[]): Promise<ParsedTransaction> {
  const parts: object[] = []

  // Add all attachments (images + audio) as inline_data
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
          maxOutputTokens: 150,
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

async function callGeminiChat(apiKey: string, context: string, history: ChatTurn[]): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildChatSystemPrompt(context) }] },
        contents: history.map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.text }],
        })),
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
): Promise<ParsedTransaction> {
  try {
    if (provider === "claude") return await callClaude(apiKey, input, attachments)
    if (provider === "openai") return await callOpenAI(apiKey, input, attachments)
    return await callGemini(apiKey, input, attachments)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido."
    throw new Error(translateError(msg))
  }
}

export async function callAIChat(
  provider: AIProvider,
  apiKey: string,
  context: string,
  history: ChatTurn[]
): Promise<string> {
  try {
    if (provider === "claude") return await callClaudeChat(apiKey, context, history)
    if (provider === "openai") return await callOpenAIChat(apiKey, context, history)
    return await callGeminiChat(apiKey, context, history)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido."
    throw new Error(translateError(msg))
  }
}
