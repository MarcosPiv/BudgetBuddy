"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  Send,
  ShoppingCart,
  Dumbbell,
  Code,
  Car,
  Coffee,
  ArrowDownLeft,
  MessageCircle,
  X,
  Settings,
  LogOut,
  Bot,
  User,
  Wallet,
  Loader2,
  ImagePlus,
  Camera,
  Mic,
  MicOff,
  Trash2,
  Pencil,
  TrendingUp,
  TrendingDown,
  DollarSign,
  StickyNote,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApp, type TimeFilter, type ExchangeRateType } from "@/lib/app-context"
import { callAI, callAIChat, type ChatTurn, type AIAttachment } from "@/lib/ai"
import { Calendar } from "@/components/ui/calendar"
import { ExchangeWidget } from "@/components/ui/exchange-widget"
import { useExchangeRate } from "@/hooks/use-exchange-rate"
import type { DateRange } from "react-day-picker"
import { es } from "date-fns/locale"

const iconMap: Record<string, React.ElementType> = {
  ShoppingCart,
  Dumbbell,
  Code,
  Car,
  Coffee,
  ArrowDownLeft,
}

const VALID_CATEGORIES = ["Comida", "Transporte", "Salidas", "Suscripciones", "Deporte", "Educacion", "Salud", "Trabajo", "General"]

const CATEGORY_ICON_MAP: Record<string, string> = {
  Comida: "ShoppingCart",
  Transporte: "Car",
  Salidas: "Coffee",
  Suscripciones: "Code",
  Deporte: "Dumbbell",
  Educacion: "Dumbbell",
  Salud: "Dumbbell",
  Trabajo: "ArrowDownLeft",
  General: "ShoppingCart",
}

interface ChatMessage {
  role: "bot" | "user"
  text: string
}

interface Attachment {
  type: "image" | "audio"
  name: string
  url: string
  file: File
}

// ── Badge de tipo de cambio ───────────────────────────────────────────────────
const RATE_BADGE_CONFIG: Record<ExchangeRateType, { label: string; className: string }> = {
  BLUE:    { label: "Blue",    className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  TARJETA: { label: "Tarjeta", className: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  OFICIAL: { label: "Oficial", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  MEP:     { label: "MEP",     className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  MANUAL:  { label: "Manual",  className: "bg-secondary text-muted-foreground border-border" },
}

function ExchangeTypeBadge({ type }: { type: ExchangeRateType }) {
  const cfg = RATE_BADGE_CONFIG[type]
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border ${cfg.className}`}
    >
      {cfg.label}
    </span>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "")
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatDate(d: Date): string {
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return "Hoy"
  if (diff === 1) return "Ayer"
  if (diff < 7) return `Hace ${diff} días`
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "long" })
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

export function DashboardPage() {
  const {
    transactions,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    setView,
    signOut,
    monthlyBudget,
    profileMode,
    userName,
    usdRate,
    apiKey,
    aiProvider,
    timeFilter,
    setTimeFilter,
    customRange,
    setCustomRange,
  } = useApp()

  const [magicInput, setMagicInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Hola! Soy tu asistente financiero. Que necesitas registrar hoy?",
    },
  ])
  const [chatInput, setChatInput] = useState("")
  const [isChatProcessing, setIsChatProcessing] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [attachments, setAttachments] = useState<Attachment[]>([])
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Live camera
  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const [observation, setObservation] = useState("")
  const [showObservation, setShowObservation] = useState(false)
  const [newCurrency, setNewCurrency] = useState<"ARS" | "USD">("ARS")
  const [newExRateType, setNewExRateType] = useState<ExchangeRateType>("BLUE")
  const [newManualRate, setNewManualRate] = useState("")
  const [expandedTx, setExpandedTx] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  // Edit & long-press
  const [editingTx, setEditingTx] = useState<import("@/lib/app-context").Transaction | null>(null)
  const [editForm, setEditForm] = useState({
    description: "",
    amount: "",
    type: "expense" as "expense" | "income",
    category: "General",
    icon: "ShoppingCart",
    date: "",
    currency: "ARS" as "ARS" | "USD",
    exRateType: "BLUE" as ExchangeRateType,
    manualRate: "",
    observation: "",
  })
  const [longPressId, setLongPressId] = useState<string | null>(null)
  const lpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null)

  // Cotizaciones en vivo para el selector de tipo de cambio en el formulario
  const { rates: liveRates, loading: ratesLoading } = useExchangeRate({ enabled: true })

  // Time filter — chip row + inline calendar
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>({
    from: customRange.from,
    to: customRange.to,
  })

  const isExpensesOnly = profileMode === "expenses_only"

  const filteredTransactions = useMemo(() => {
    const now = new Date()
    return transactions.filter((t) => {
      const txDate = new Date(t.date)
      if (timeFilter === "week") {
        const weekAgo = new Date(now)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return txDate >= weekAgo
      }
      if (timeFilter === "month") {
        return (
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear()
        )
      }
      if (timeFilter === "year") {
        return txDate.getFullYear() === now.getFullYear()
      }
      return txDate >= customRange.from && txDate <= customRange.to
    })
  }, [transactions, timeFilter, customRange])

  const toArs = (tx: { amount: number; currency: "ARS" | "USD"; txRate?: number }) =>
    tx.currency === "USD" ? tx.amount * (tx.txRate ?? usdRate) : tx.amount

  const totalExpenses = useMemo(
    () => filteredTransactions.filter((t) => t.type === "expense").reduce((a, b) => a + toArs(b), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredTransactions, usdRate]
  )
  const totalIncome = useMemo(
    () => filteredTransactions.filter((t) => t.type === "income").reduce((a, b) => a + toArs(b), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredTransactions, usdRate]
  )

  const balance = isExpensesOnly ? monthlyBudget - totalExpenses : totalIncome - totalExpenses
  const spentPercent = isExpensesOnly
    ? Math.min((totalExpenses / monthlyBudget) * 100, 100)
    : 0

  const formatCurrency = (n: number) =>
    `$ ${Math.abs(n).toLocaleString("es-AR")} ARS`

  const filterLabels: Record<TimeFilter, string> = useMemo(() => ({
    week: "Esta semana",
    month: "Este mes",
    year: "Este año",
    custom: `${formatDateShort(customRange.from)} — ${formatDateShort(customRange.to)}`,
  }), [customRange.from, customRange.to])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])


  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const next: Attachment[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type.startsWith("image/")) {
        next.push({ type: "image", name: file.name, url: URL.createObjectURL(file), file })
      }
    }
    setAttachments((prev) => [...prev, ...next])
    e.target.value = ""
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const file = new File([blob], `voz-${Date.now()}.webm`, { type: "audio/webm" })
        setAttachments((prev) => [
          ...prev,
          { type: "audio", name: file.name, url: URL.createObjectURL(blob), file },
        ])
        stream.getTracks().forEach((t) => t.stop())
      }
      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      setAiError("No se pudo acceder al micrófono. Habilitá el permiso en tu navegador.")
      setTimeout(() => setAiError(null), 5000)
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const removeAttachment = (i: number) => {
    setAttachments((prev) => {
      URL.revokeObjectURL(prev[i].url)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  // Attach stream to video element once the modal mounts
  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [showCamera])

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      })
      streamRef.current = stream
      setShowCamera(true)
    } catch {
      // Camera unavailable or denied → fall back to file picker
      cameraInputRef.current?.click()
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext("2d")?.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `ticket-${Date.now()}.jpg`, { type: "image/jpeg" })
        setAttachments((prev) => [
          ...prev,
          { type: "image", name: file.name, url: URL.createObjectURL(blob), file },
        ])
        stopCamera()
      },
      "image/jpeg",
      0.9,
    )
  }

  // Opciones del selector de tipo de cambio con valores en vivo
  const rateTypeOptions: Array<{
    key: ExchangeRateType
    label: string
    emoji: string
    value: number | null | undefined
  }> = [
    { key: "BLUE",    label: "Blue",    emoji: "💵", value: liveRates.blue?.venta },
    { key: "TARJETA", label: "Tarjeta", emoji: "💳", value: liveRates.tarjeta?.venta },
    { key: "OFICIAL", label: "Oficial", emoji: "🏦", value: liveRates.oficial?.venta },
    { key: "MEP",     label: "MEP",     emoji: "📈", value: liveRates.mep?.venta },
    { key: "MANUAL",  label: "Manual",  emoji: "✏️",  value: null },
  ]

  // Tasa a aplicar según el tipo elegido al momento de registrar el gasto
  const getAppliedRate = (): number => {
    if (newCurrency === "ARS") return 1
    if (newExRateType === "MANUAL") return parseFloat(newManualRate) || usdRate
    const live = liveRates[newExRateType.toLowerCase() as keyof typeof liveRates]
    return (live as { venta?: number } | null)?.venta ?? usdRate
  }

  const handleMagicSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!magicInput.trim() && attachments.length === 0) || isProcessing) return

    if (!apiKey.trim()) {
      setAiError("Configurá tu API key en Ajustes para usar el asistente de IA.")
      setTimeout(() => setAiError(null), 4000)
      return
    }

    setIsProcessing(true)
    setAiError(null)

    const textInput = magicInput.trim()
    const capturedAttachments = [...attachments]
    const obs = observation.trim() || undefined
    const curr = newCurrency
    const appliedRate = getAppliedRate()
    const rateType = curr === "USD" ? newExRateType : null

    setMagicInput("")
    setAttachments([])
    setObservation("")
    setShowObservation(false)

    try {
      // Convert File objects to base64 AIAttachments
      const aiAttachments: AIAttachment[] = await Promise.all(
        capturedAttachments.map(async (a) => ({
          type: a.type,
          base64: await fileToBase64(a.file),
          mimeType: a.file.type || (a.type === "audio" ? "audio/webm" : "image/jpeg"),
          file: a.file,
        }))
      )

      const result = await callAI(aiProvider, apiKey, textInput, aiAttachments.length > 0 ? aiAttachments : undefined)

      if (result.type === "unknown") {
        setAiError("No detecté una transacción. Describí un gasto o ingreso (ej: 'gasté 5000 en comida').")
        setTimeout(() => setAiError(null), 5000)
        return
      }

      addTransaction({
        description: result.description,
        amount: result.amount,
        type: result.type,
        icon: result.icon,
        category: result.category,
        date: new Date(),
        currency: curr,
        amountUsd: curr === "USD" ? result.amount : undefined,
        txRate: curr === "USD" ? appliedRate : undefined,
        exchangeRateType: rateType,
        observation: obs,
      }, (msg) => {
        setAiError(msg)
        setTimeout(() => setAiError(null), 6000)
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al procesar."
      setAiError(msg)
      setTimeout(() => setAiError(null), 6000)
    } finally {
      setIsProcessing(false)
    }
  }

  const buildFinancialContext = (): string => {
    const expensesByCategory = filteredTransactions
      .filter(t => t.type === "expense")
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + toArs(t)
        return acc
      }, {})
    const topCategories = Object.entries(expensesByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amt]) => `${cat}: ${formatCurrency(amt)}`)
      .join(", ")
    const txLines = filteredTransactions
      .slice(0, 50)
      .map(t => {
        const dateStr = t.date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
        const typeStr = t.type === "expense" ? "Gasto" : "Ingreso"
        return `${dateStr} · ${typeStr} · ${t.description} · ${t.category} · ${formatCurrency(toArs(t))}`
      })
      .join("\n")

    const lines = [
      `Período: ${filterLabels[timeFilter]}`,
      `Ingresos totales: ${formatCurrency(totalIncome)}`,
      `Gastos totales: ${formatCurrency(totalExpenses)}`,
      `Balance: ${formatCurrency(balance)}`,
      isExpensesOnly && monthlyBudget ? `Presupuesto mensual: ${formatCurrency(monthlyBudget)}` : null,
      topCategories ? `Top categorías de gastos: ${topCategories}` : null,
      `Transacciones en el período: ${filteredTransactions.length}`,
      txLines ? `\nDetalle de transacciones:\n${txLines}` : null,
    ]
    return lines.filter(Boolean).join("\n")
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || isChatProcessing) return

    const userMsg = chatInput.trim()
    setChatInput("")

    // Add user message and capture current history before state update
    const prevMessages = chatMessages
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }])

    if (!apiKey.trim()) {
      setChatMessages(prev => [...prev, { role: "bot", text: "Configurá tu API key en Ajustes para usar el asistente." }])
      return
    }

    setIsChatProcessing(true)

    // Build history: skip the initial greeting, convert roles
    const history: ChatTurn[] = [
      ...prevMessages.slice(1).map(m => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        text: m.text,
      })),
      { role: "user", text: userMsg },
    ]

    try {
      const reply = await callAIChat(aiProvider, apiKey, buildFinancialContext(), history)
      setChatMessages(prev => [...prev, { role: "bot", text: reply }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al conectar."
      setChatMessages(prev => [...prev, { role: "bot", text: msg }])
    } finally {
      setIsChatProcessing(false)
    }
  }

  const openEdit = (tx: import("@/lib/app-context").Transaction) => {
    setEditingTx(tx)
    setLongPressId(null)
    setEditForm({
      description: tx.description,
      amount: String(tx.amount),
      type: tx.type,
      category: tx.category,
      icon: tx.icon,
      date: new Date(tx.date).toISOString().split("T")[0],
      currency: tx.currency,
      exRateType: (tx.exchangeRateType as ExchangeRateType) ?? "BLUE",
      manualRate: tx.txRate ? String(tx.txRate) : "",
      observation: tx.observation ?? "",
    })
  }

  const getEditRate = (): number => {
    if (editForm.exRateType === "MANUAL") return parseFloat(editForm.manualRate) || usdRate
    const live = liveRates[editForm.exRateType.toLowerCase() as keyof typeof liveRates]
    return (live as { venta?: number } | null)?.venta ?? usdRate
  }

  const handleSaveEdit = () => {
    if (!editingTx) return
    const amount = parseFloat(editForm.amount)
    if (!amount || amount <= 0) return
    updateTransaction(editingTx.id, {
      description: editForm.description.trim() || "Transacción",
      amount,
      type: editForm.type,
      icon: editForm.icon,
      category: editForm.category,
      date: new Date(editForm.date + "T12:00:00"),
      currency: editForm.currency,
      amountUsd: editForm.currency === "USD" ? amount : undefined,
      txRate: editForm.currency === "USD" ? getEditRate() : undefined,
      exchangeRateType: editForm.currency === "USD" ? editForm.exRateType : null,
      observation: editForm.observation.trim() || undefined,
    }, (msg) => {
      setAiError(msg)
      setTimeout(() => setAiError(null), 5000)
    })
    setEditingTx(null)
  }

  const handleTouchStart = (txId: string) => {
    lpTimerRef.current = setTimeout(() => {
      setLongPressId(txId)
      setExpandedTx(null)
      if (navigator.vibrate) navigator.vibrate(40)
    }, 500)
  }

  const handleTouchEnd = () => {
    if (lpTimerRef.current) {
      clearTimeout(lpTimerRef.current)
      lpTimerRef.current = null
    }
  }

  const applyRange = (from: Date, to: Date) => {
    const end = new Date(to)
    end.setHours(23, 59, 59, 999)
    setCustomRange({ from, to: end })
    setCalendarRange({ from, to: end })
    setTimeFilter("custom")
    setShowCalendar(false)
  }

  const handleApplyCustomRange = () => {
    if (!calendarRange?.from) return
    const to = calendarRange.to ?? calendarRange.from
    applyRange(calendarRange.from, to)
  }

  const calendarPresets: { label: string; getRange: () => { from: Date; to: Date } }[] = [
    {
      label: "Hoy",
      getRange: () => { const d = new Date(); return { from: d, to: d } },
    },
    {
      label: "Ayer",
      getRange: () => {
        const d = new Date(); d.setDate(d.getDate() - 1); return { from: d, to: d }
      },
    },
    {
      label: "7 días",
      getRange: () => {
        const to = new Date()
        const from = new Date(); from.setDate(from.getDate() - 6)
        return { from, to }
      },
    },
    {
      label: "30 días",
      getRange: () => {
        const to = new Date()
        const from = new Date(); from.setDate(from.getDate() - 29)
        return { from, to }
      },
    },
    {
      label: "Este mes",
      getRange: () => {
        const n = new Date()
        return { from: new Date(n.getFullYear(), n.getMonth(), 1), to: n }
      },
    },
    {
      label: "Mes ant.",
      getRange: () => {
        const n = new Date()
        const from = new Date(n.getFullYear(), n.getMonth() - 1, 1)
        const to = new Date(n.getFullYear(), n.getMonth(), 0)
        return { from, to }
      },
    },
  ]

  const initials =
    userName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "U"

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">

      {/* ── Sticky header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 sm:px-6 border-b border-border bg-background/90 backdrop-blur-md">
        {/* Left: logo + balance */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
            <Wallet className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-none min-w-0">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {isExpensesOnly ? "Disponible" : "Balance"} · {filterLabels[timeFilter]}
            </span>
            <motion.span
              className={`text-lg font-bold tabular-nums truncate ${
                balance >= 0 ? "text-primary" : "text-destructive"
              }`}
              key={balance}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {balance < 0 ? "-" : ""}
              {formatCurrency(balance)}
            </motion.span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => setChatOpen(!chatOpen)}
            aria-label="Chat"
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => setView("settings")}
            aria-label="Configuracion"
          >
            <Settings className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={signOut}
            aria-label="Salir"
          >
            <LogOut className="w-5 h-5" />
          </Button>
          <button
            className="cursor-pointer ml-1"
            onClick={() => setView("profile")}
            aria-label="Perfil"
          >
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-secondary text-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </header>

      {/* ── Scrollable content ────────────────────────────────── */}
      <div className={`flex-1 flex flex-col lg:flex-row transition-[padding] duration-300 ease-out ${chatOpen ? "lg:pr-80 xl:pr-96" : ""}`}>
        <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8 pb-56 lg:pb-52 max-w-3xl mx-auto w-full">

          {/* Greeting */}
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-base font-semibold text-foreground">
              Hola, {userName}
            </h1>
            <p className="text-xs text-muted-foreground">
              Registra con texto, foto o audio
            </p>
          </motion.div>

          {/* ── Time filter chips ─────────────────────────────── */}
          <motion.div
            className="mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
          >
            {/* Horizontal scrollable chips — no scrollbar */}
            <div className="relative">
            <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-background to-transparent pointer-events-none z-10 lg:hidden" />
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(["week", "month", "year"] as TimeFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`shrink-0 h-8 px-3.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    timeFilter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => {
                    setTimeFilter(f)
                    setShowCalendar(false)
                  }}
                >
                  {filterLabels[f]}
                </button>
              ))}
              {/* Custom range chip */}
              <button
                type="button"
                className={`shrink-0 h-8 px-3.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap border ${
                  timeFilter === "custom"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setShowCalendar(!showCalendar)}
              >
                {timeFilter === "custom" ? filterLabels.custom : "Personalizado"}
              </button>
            </div>
            </div>

            {/* Inline calendar for custom range */}
            <AnimatePresence>
              {showCalendar && (
                <motion.div
                  className="mt-3 rounded-2xl border border-border bg-card overflow-hidden"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Quick presets */}
                  <div className="flex gap-1.5 overflow-x-auto px-3 pt-3 pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {calendarPresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const { from, to } = preset.getRange()
                          applyRange(from, to)
                        }}
                        className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary hover:bg-secondary/70 text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border/40"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-border/40" />

                  <div className="p-3">
                    {/* Selected range preview */}
                    <div className="flex items-center justify-between mb-2 px-1 min-h-[20px]">
                      {calendarRange?.from ? (
                        <>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatDateShort(calendarRange.from)}
                            {" → "}
                            {calendarRange.to ? formatDateShort(calendarRange.to) : "..."}
                          </span>
                          {calendarRange.to && (
                            <span className="text-xs text-muted-foreground">
                              {Math.max(1, Math.round((calendarRange.to.getTime() - calendarRange.from.getTime()) / 86400000) + 1)} días
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">Seleccioná una fecha de inicio</span>
                      )}
                    </div>

                    <Calendar
                      mode="range"
                      selected={calendarRange}
                      onSelect={setCalendarRange as (r: DateRange | undefined) => void}
                      locale={es}
                      numberOfMonths={1}
                      className="rounded-xl bg-transparent mx-auto"
                      disabled={{ after: new Date() }}
                    />
                    <button
                      type="button"
                      className="mt-2 w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={handleApplyCustomRange}
                      disabled={!calendarRange?.from}
                    >
                      Aplicar rango
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Summary ───────────────────────────────────────── */}
          {isExpensesOnly ? (
            <motion.div
              className="rounded-2xl border border-border bg-card p-4 mb-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Presupuesto mensual</span>
                </div>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {formatCurrency(totalExpenses)} / {formatCurrency(monthlyBudget)}
                </span>
              </div>
              <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    spentPercent > 90
                      ? "bg-destructive"
                      : spentPercent > 70
                        ? "bg-chart-4"
                        : "bg-primary"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${spentPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {spentPercent.toFixed(0)}% usado
                </span>
                <span
                  className={`text-xs font-medium ${
                    balance >= 0 ? "text-primary" : "text-destructive"
                  }`}
                >
                  {balance >= 0
                    ? `Te quedan ${formatCurrency(balance)}`
                    : `Excediste ${formatCurrency(Math.abs(balance))}`}
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="grid grid-cols-2 gap-3 mb-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">Ingresos</span>
                </div>
                <p className="text-lg font-bold text-primary tabular-nums leading-tight">
                  {formatCurrency(totalIncome)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-destructive/10">
                    <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                  </div>
                  <span className="text-xs text-muted-foreground">Gastos</span>
                </div>
                <p className="text-lg font-bold text-destructive tabular-nums leading-tight">
                  {formatCurrency(totalExpenses)}
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Exchange Rate Widget ──────────────────────────── */}
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <ExchangeWidget />
          </motion.div>

          {/* ── Transaction list ──────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Movimientos ({filteredTransactions.length})
              </p>
              {filteredTransactions.length > 0 && (
                <p className="md:hidden text-[10px] text-muted-foreground/50 flex items-center gap-1">
                  <span>Mantenés pulsado para editar o eliminar</span>
                </p>
              )}
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No hay movimientos en este periodo.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <AnimatePresence mode="popLayout">
                  {filteredTransactions.map((tx) => {
                    const Icon = iconMap[tx.icon] || ShoppingCart
                    const isIncome = tx.type === "income"
                    const isExpanded = expandedTx === tx.id
                    const isUsd = tx.currency === "USD"
                    return (
                      <motion.div
                        key={tx.id}
                        layout
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        className="group"
                      >
                        {/* Card row */}
                        <div
                          className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 hover:bg-secondary/30 active:bg-secondary/50 transition-colors cursor-pointer text-left select-none"
                          onClick={() => { if (longPressId !== tx.id) setExpandedTx(isExpanded ? null : tx.id) }}
                          onTouchStart={() => handleTouchStart(tx.id)}
                          onTouchEnd={handleTouchEnd}
                          onTouchMove={handleTouchEnd}
                        >
                          <div
                            className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                              isIncome ? "bg-primary/10" : "bg-secondary"
                            }`}
                          >
                            <Icon
                              className={`w-5 h-5 ${
                                isIncome ? "text-primary" : "text-muted-foreground"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {tx.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>{tx.category} · {formatDate(new Date(tx.date))}</span>
                              {isUsd && tx.exchangeRateType && (
                                <ExchangeTypeBadge type={tx.exchangeRateType} />
                              )}
                            </p>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-0.5">
                            <span
                              className={`text-sm font-semibold tabular-nums ${
                                isIncome ? "text-primary" : "text-foreground"
                              }`}
                            >
                              {isIncome ? "+" : "−"}{" "}
                              {isUsd
                                ? `US$ ${tx.amount.toLocaleString("es-AR")}`
                                : `$ ${tx.amount.toLocaleString("es-AR")}`}
                            </span>
                            {isUsd && (
                              <span className="text-[11px] text-muted-foreground tabular-nums">
                                ~${(tx.amount * (tx.txRate ?? usdRate)).toLocaleString("es-AR", { maximumFractionDigits: 0 })} ARS
                              </span>
                            )}
                          </div>

                          {/* Desktop action buttons — visible on hover */}
                          <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                            <button
                              type="button"
                              className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); openEdit(tx) }}
                              aria-label="Editar movimiento"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); setDeletingTxId(tx.id) }}
                              aria-label="Eliminar movimiento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {tx.observation && (
                            <ChevronRight
                              className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                                isExpanded ? "rotate-90" : ""
                              }`}
                            />
                          )}
                        </div>

                        {/* Mobile long-press action row */}
                        <AnimatePresence>
                          {longPressId === tx.id && (
                            <motion.div
                              className="flex md:hidden items-center gap-2 mt-1 px-2 py-2 rounded-xl bg-secondary/80 border border-border"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.18 }}
                            >
                              <button
                                type="button"
                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium cursor-pointer active:bg-primary/20"
                                onClick={() => openEdit(tx)}
                              >
                                <Pencil className="w-4 h-4" />
                                Editar
                              </button>
                              <button
                                type="button"
                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium cursor-pointer active:bg-destructive/20"
                                onClick={() => { setDeletingTxId(tx.id); setLongPressId(null) }}
                              >
                                <Trash2 className="w-4 h-4" />
                                Eliminar
                              </button>
                              <button
                                type="button"
                                className="p-2 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => setLongPressId(null)}
                                aria-label="Cerrar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Observation expand */}
                        <AnimatePresence>
                          {isExpanded && tx.observation && (
                            <motion.div
                              className="ml-14 mr-2 mt-1 mb-1 px-4 py-2.5 rounded-xl bg-secondary/50 border border-border"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              <p className="text-xs text-muted-foreground flex items-start gap-2">
                                <StickyNote className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
                                {tx.observation}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </main>

        {/* ── Chat panel ────────────────────────────────────────── */}
        <AnimatePresence>
          {chatOpen && (
            <motion.aside
              className="fixed inset-y-0 right-0 w-full sm:w-96 lg:w-80 xl:w-96 flex flex-col z-50 lg:top-[57px] bg-card border-l border-border shadow-2xl lg:shadow-none"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 280 }}
            >

              {/* Chat header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-accent/8 via-transparent to-transparent shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent/15 ring-1 ring-accent/20">
                      <Bot className="w-4.5 h-4.5 text-accent" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-none mb-1">BudgetBuddy AI</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      En línea
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                  onClick={() => setChatOpen(false)}
                  aria-label="Cerrar chat"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className={`flex items-center justify-center w-6 h-6 rounded-lg shrink-0 mt-0.5 ${
                        msg.role === "bot" ? "bg-accent/15" : "bg-primary/15"
                      }`}
                    >
                      {msg.role === "bot" ? (
                        <Bot className="w-3 h-3 text-accent" />
                      ) : (
                        <User className="w-3 h-3 text-primary" />
                      )}
                    </div>
                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === "bot"
                          ? "bg-secondary text-foreground rounded-tl-md"
                          : "bg-primary text-primary-foreground rounded-tr-md"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                {isChatProcessing && (
                  <motion.div
                    className="flex gap-2.5"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0 mt-0.5 bg-accent/15">
                      <Bot className="w-3 h-3 text-accent" />
                    </div>
                    <div className="bg-secondary text-foreground rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                    </div>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-border shrink-0">
                <form
                  onSubmit={handleChatSubmit}
                  className="flex items-center gap-2 bg-secondary/50 rounded-xl px-3 py-1.5 border border-border/60 focus-within:border-accent/50 transition-colors"
                >
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Pregunta sobre tus finanzas..."
                    disabled={isChatProcessing}
                    className="border-0 bg-transparent text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0 text-sm"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isChatProcessing}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 rounded-lg h-8 w-8 cursor-pointer disabled:opacity-50"
                    aria-label="Enviar"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </form>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ── Fixed bottom input bar ────────────────────────────── */}
      <div
        className={`fixed bottom-0 left-0 z-40 bg-background/95 backdrop-blur-md border-t border-border transition-[right] duration-300 ease-out ${
          chatOpen ? "right-0 lg:right-80 xl:right-96" : "right-0"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="max-w-3xl mx-auto px-4 pt-3 pb-3">

          {/* Hidden file inputs */}
          <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} multiple />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />

          <div className="magic-border rounded-xl p-[1px]">
            <div className="bg-background rounded-[11px] px-4 py-3">

              {/* Attachment previews */}
              <AnimatePresence>
                {attachments.length > 0 && (
                  <motion.div
                    className="flex flex-wrap gap-2 mb-3"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {attachments.map((att, i) => (
                      <motion.div
                        key={i}
                        className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs text-foreground"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        {att.type === "image" ? (
                          <img src={att.url} alt={att.name} className="w-7 h-7 rounded object-cover" />
                        ) : (
                          <div className="flex items-center justify-center w-7 h-7 rounded bg-accent/20">
                            <Mic className="w-3.5 h-3.5 text-accent" />
                          </div>
                        )}
                        <span className="max-w-20 truncate">{att.name}</span>
                        <button
                          type="button"
                          className="ml-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          onClick={() => removeAttachment(i)}
                          aria-label={`Eliminar ${att.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Selector de tipo de dólar (aparece cuando moneda = USD) ── */}
              <AnimatePresence>
                {newCurrency === "USD" && (
                  <motion.div
                    className="mb-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {/* Chips de tipo de cambio */}
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {rateTypeOptions.map((opt) => {
                        const isSelected = newExRateType === opt.key
                        const hasValue = opt.value != null
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setNewExRateType(opt.key)}
                            className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-border/80"
                            }`}
                          >
                            <span className="leading-none">{opt.emoji}</span>
                            <span>{opt.label}</span>
                            {opt.key !== "MANUAL" && (
                              <span className={`tabular-nums font-mono ${isSelected ? "opacity-80" : "opacity-55"}`}>
                                {hasValue
                                  ? `· $${opt.value!.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
                                  : ratesLoading
                                    ? "· …"
                                    : ""}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Input de cotización manual — expand suave */}
                    <AnimatePresence>
                      {newExRateType === "MANUAL" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          className="mt-2"
                        >
                          <div className="flex items-center gap-2 bg-chart-5/10 border border-chart-5/25 rounded-lg px-3 py-2">
                            <DollarSign className="w-3.5 h-3.5 text-chart-5 shrink-0" />
                            <span className="text-xs text-chart-5/80 font-medium whitespace-nowrap">
                              1 USD =
                            </span>
                            <input
                              type="number"
                              value={newManualRate}
                              onChange={(e) => setNewManualRate(e.target.value)}
                              placeholder={usdRate.toString()}
                              className="flex-1 min-w-0 bg-transparent text-sm text-chart-5 font-mono outline-none placeholder:text-chart-5/40"
                              min={1}
                              step={50}
                              aria-label="Cotización manual"
                            />
                            <span className="text-xs text-chart-5/80 font-medium">ARS</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Observation row */}
              <AnimatePresence>
                {showObservation && (
                  <motion.div
                    className="mb-3"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Input
                      value={observation}
                      onChange={(e) => setObservation(e.target.value)}
                      placeholder="Observacion (opcional)..."
                      className="border-0 bg-secondary/50 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 text-xs rounded-lg"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main input row */}
              <form onSubmit={handleMagicSubmit}>

                {/* Text row */}
                <div className="flex items-center gap-2 mb-2.5">
                  <Sparkles className="w-4 h-4 text-accent shrink-0" />
                  <Input
                    value={magicInput}
                    onChange={(e) => setMagicInput(e.target.value)}
                    placeholder="Pague 12000 en el super..."
                    className="border-0 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0 text-sm"
                    disabled={isProcessing}
                  />

                  {/* Currency toggle */}
                  <button
                    type="button"
                    className={`shrink-0 px-2 py-1 rounded-md text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      newCurrency === "USD"
                        ? "bg-chart-5/20 text-chart-5"
                        : "bg-secondary text-muted-foreground"
                    }`}
                    onClick={() => setNewCurrency((p) => (p === "ARS" ? "USD" : "ARS"))}
                    title="Cambiar moneda"
                  >
                    {newCurrency}
                  </button>

                  {/* Send */}
                  <Button
                    type="submit"
                    size="icon"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 rounded-lg h-9 w-9 cursor-pointer"
                    disabled={isProcessing}
                    aria-label="Enviar"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Multimodal toolbar */}
                <div className="grid grid-cols-4 gap-1 pt-2 border-t border-border/40">

                  {/* Note */}
                  <button
                    type="button"
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      showObservation
                        ? "bg-accent/15 text-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                    onClick={() => setShowObservation(!showObservation)}
                    aria-label="Agregar nota"
                  >
                    <StickyNote className="w-3.5 h-3.5 shrink-0" />
                    <span>Nota</span>
                  </button>

                  {/* Gallery */}
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={isProcessing}
                    aria-label="Subir desde galeria"
                  >
                    <ImagePlus className="w-3.5 h-3.5 shrink-0" />
                    <span>Galería</span>
                  </button>

                  {/* Camera */}
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={startCamera}
                    disabled={isProcessing}
                    aria-label="Escanear ticket"
                  >
                    <Camera className="w-3.5 h-3.5 shrink-0" />
                    <span>Ticket</span>
                  </button>

                  {/* Audio */}
                  <button
                    type="button"
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      isRecording
                        ? "bg-destructive/15 text-destructive animate-pulse"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    aria-label={isRecording ? "Detener grabacion" : "Grabar audio"}
                  >
                    {isRecording ? (
                      <MicOff className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{isRecording ? "Detener" : "Audio"}</span>
                  </button>

                </div>
              </form>
            </div>
          </div>

          {/* AI error — no API key */}
          <AnimatePresence>
            {aiError && (
              <motion.div
                className="flex items-center gap-2 mt-2 text-xs text-destructive"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Settings className="w-3 h-3 shrink-0" />
                <span>{aiError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Processing indicator */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                className="flex items-center gap-2 mt-2 text-xs text-accent"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Analizando con IA...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Delete confirmation ───────────────────────────── */}
      {(() => {
        const txToDelete = transactions.find(tx => tx.id === deletingTxId)
        return (
          <AlertDialog open={!!deletingTxId} onOpenChange={(open) => { if (!open) setDeletingTxId(null) }}>
            <AlertDialogContent className="bg-card border-border sm:max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">¿Eliminar movimiento?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  {txToDelete && (
                    <span className="block mb-1 font-medium text-foreground/80">
                      &ldquo;{txToDelete.description}&rdquo;
                      {" — "}
                      {txToDelete.currency === "USD"
                        ? `US$ ${txToDelete.amount.toLocaleString("es-AR")}`
                        : `$ ${txToDelete.amount.toLocaleString("es-AR")} ARS`}
                    </span>
                  )}
                  Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
                  onClick={() => {
                    if (deletingTxId) {
                      deleteTransaction(deletingTxId, (msg) => { setAiError(msg); setTimeout(() => setAiError(null), 5000) })
                      setDeletingTxId(null)
                    }
                  }}
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )
      })()}

      {/* ── Edit transaction dialog ───────────────────────── */}
      <Dialog open={!!editingTx} onOpenChange={(open) => { if (!open) setEditingTx(null) }}>
        <DialogContent className="sm:max-w-md p-0 gap-0 bg-card border-border flex flex-col max-h-[92dvh] overflow-hidden">

          {/* Fixed header */}
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
                editForm.type === "expense" ? "bg-destructive/10" : "bg-primary/10"
              }`}>
                {editForm.type === "expense"
                  ? <TrendingDown className="w-4.5 h-4.5 text-destructive" />
                  : <TrendingUp className="w-4.5 h-4.5 text-primary" />}
              </div>
              <div>
                <DialogTitle className="text-foreground text-base leading-tight">Editar movimiento</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[240px]">{editingTx?.description}</p>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">

            {/* Type toggle */}
            <div className="flex gap-2 p-1 rounded-xl bg-secondary/50 border border-border">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    editForm.type === t
                      ? t === "expense"
                        ? "bg-destructive/15 text-destructive shadow-sm"
                        : "bg-primary/15 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setEditForm(f => ({ ...f, type: t }))}
                >
                  {t === "expense" ? "− Gasto" : "+ Ingreso"}
                </button>
              ))}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Descripción</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                className="bg-secondary/50 border-border h-10 text-sm"
                placeholder="Descripción del movimiento"
              />
            </div>

            {/* Amount + Currency */}
            <div className="flex gap-2 items-end">
              <div className="flex flex-col gap-1.5 flex-1">
                <Label className="text-xs font-medium text-muted-foreground">Monto</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={editForm.amount}
                  onChange={(e) => setEditForm(f => ({ ...f, amount: e.target.value }))}
                  className="bg-secondary/50 border-border h-10 text-sm font-mono"
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <Label className="text-xs font-medium text-muted-foreground">Moneda</Label>
                <div className="flex h-10 rounded-lg border border-border overflow-hidden">
                  {(["ARS", "USD"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`px-4 text-sm font-semibold transition-colors cursor-pointer ${
                        editForm.currency === c
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                      }`}
                      onClick={() => setEditForm(f => ({ ...f, currency: c }))}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* USD rate type — same chips as Magic Bar */}
            <AnimatePresence>
              {editForm.currency === "USD" && (
                <motion.div
                  className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/30 p-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Tipo de cambio
                  </p>
                  {/* Chips */}
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {rateTypeOptions.map((opt) => {
                      const isSelected = editForm.exRateType === opt.key
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setEditForm(f => ({ ...f, exRateType: opt.key as ExchangeRateType }))}
                          className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-border/80"
                          }`}
                        >
                          <span className="leading-none">{opt.emoji}</span>
                          <span>{opt.label}</span>
                          {opt.key !== "MANUAL" && opt.value != null && (
                            <span className={`tabular-nums font-mono ${isSelected ? "opacity-80" : "opacity-55"}`}>
                              · ${opt.value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                            </span>
                          )}
                          {opt.key !== "MANUAL" && opt.value == null && ratesLoading && (
                            <span className="opacity-40">· …</span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Manual rate input */}
                  <AnimatePresence>
                    {editForm.exRateType === "MANUAL" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="flex items-center gap-2 bg-chart-5/10 border border-chart-5/25 rounded-lg px-3 py-2 mt-1">
                          <DollarSign className="w-3.5 h-3.5 text-chart-5 shrink-0" />
                          <span className="text-xs text-chart-5/80 font-medium whitespace-nowrap">1 USD =</span>
                          <input
                            type="number"
                            value={editForm.manualRate}
                            onChange={(e) => setEditForm(f => ({ ...f, manualRate: e.target.value }))}
                            placeholder={String(usdRate)}
                            className="flex-1 min-w-0 bg-transparent text-sm text-chart-5 font-mono outline-none placeholder:text-chart-5/40"
                            min={1}
                            step={50}
                          />
                          <span className="text-xs text-chart-5/80 font-medium">ARS</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Preview */}
                  {editForm.amount && parseFloat(editForm.amount) > 0 && (
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      US$ {parseFloat(editForm.amount).toLocaleString("es-AR")} ≈ $ {(parseFloat(editForm.amount) * getEditRate()).toLocaleString("es-AR", { maximumFractionDigits: 0 })} ARS
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Category + Date row */}
            <div className="flex gap-2">
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <Label className="text-xs font-medium text-muted-foreground">Categoría</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(val) => setEditForm(f => ({ ...f, category: val, icon: CATEGORY_ICON_MAP[val] ?? "ShoppingCart" }))}
                >
                  <SelectTrigger className="bg-secondary/50 border-border h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {VALID_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-sm">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <Label className="text-xs font-medium text-muted-foreground">Fecha</Label>
                <Input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm(f => ({ ...f, date: e.target.value }))}
                  className="bg-secondary/50 border-border h-10 text-sm w-[9.5rem]"
                />
              </div>
            </div>

            {/* Observation */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Nota (opcional)</Label>
              <Textarea
                value={editForm.observation}
                onChange={(e) => setEditForm(f => ({ ...f, observation: e.target.value }))}
                className="bg-secondary/50 border-border resize-none text-sm"
                rows={2}
                placeholder="Ej: Incluye propina, cuotas, detalles..."
              />
            </div>
          </div>

          {/* Fixed footer */}
          <div className="px-5 pb-5 pt-3 border-t border-border shrink-0 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 cursor-pointer h-10"
              onClick={() => setEditingTx(null)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer h-10 font-semibold"
              onClick={handleSaveEdit}
              disabled={!editForm.amount || parseFloat(editForm.amount) <= 0}
            >
              Guardar cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Live camera modal ─────────────────────────────── */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-5 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-white/60 text-sm tracking-wide">
              Apunta la cámara al ticket o factura
            </p>

            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full"
              />
              {/* viewfinder corners */}
              <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/30" />
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl bg-white/15 text-white text-sm font-medium hover:bg-white/25 transition-colors cursor-pointer"
                onClick={stopCamera}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors cursor-pointer"
                onClick={capturePhoto}
              >
                <Camera className="w-4 h-4" />
                Capturar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
