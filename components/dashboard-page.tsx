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
  TrendingUp,
  TrendingDown,
  DollarSign,
  StickyNote,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useApp, type TimeFilter, type ExchangeRateType } from "@/lib/app-context"
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
    setView,
    signOut,
    monthlyBudget,
    profileMode,
    userName,
    usdRate,
    apiKey,
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

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((a, b) => a + toArs(b), 0)
  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((a, b) => a + toArs(b), 0)

  const balance = isExpensesOnly
    ? monthlyBudget - totalExpenses
    : totalIncome - totalExpenses
  const spentPercent = isExpensesOnly
    ? Math.min((totalExpenses / monthlyBudget) * 100, 100)
    : 0

  const formatCurrency = (n: number) =>
    `$ ${Math.abs(n).toLocaleString("es-AR")} ARS`

  const filterLabels: Record<TimeFilter, string> = {
    week: "Esta semana",
    month: "Este mes",
    year: "Este año",
    custom: `${formatDateShort(customRange.from)} — ${formatDateShort(customRange.to)}`,
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  useEffect(() => {
    return () => {
      attachments.forEach((a) => URL.revokeObjectURL(a.url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      // mic denied
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

  const handleMagicSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if ((!magicInput.trim() && attachments.length === 0) || isProcessing) return

    if (!apiKey.trim()) {
      setAiError("Configurá tu API key en Ajustes para usar el asistente de IA.")
      setTimeout(() => setAiError(null), 4000)
      return
    }
    setIsProcessing(true)
    const input =
      magicInput ||
      attachments.map((a) => (a.type === "image" ? "Imagen: " + a.name : "Audio: " + a.name)).join(", ")
    const obs = observation.trim() || undefined
    const curr = newCurrency
    const appliedRate = getAppliedRate()
    const rateType = curr === "USD" ? newExRateType : null
    setMagicInput("")
    setAttachments([])
    setObservation("")
    setShowObservation(false)
    setTimeout(() => {
      const categories = ["Comida", "Transporte", "Salidas", "Suscripciones", "Deporte", "Educacion", "Salud"]
      const icons = ["ShoppingCart", "Car", "Coffee", "Code", "Dumbbell", "ShoppingCart", "ShoppingCart"]
      const idx = Math.floor(Math.random() * categories.length)
      const amount =
        curr === "USD"
          ? Math.floor(Math.random() * 50) + 5
          : Math.floor(Math.random() * 30000) + 2000
      addTransaction({
        description: input.length > 50 ? input.slice(0, 50) + "..." : input,
        amount,
        type: "expense",
        icon: icons[idx],
        category: categories[idx],
        date: new Date(),
        currency: curr,
        amountUsd: curr === "USD" ? amount : undefined,
        txRate: curr === "USD" ? appliedRate : undefined,
        exchangeRateType: rateType,
        observation: obs,
      })
      setIsProcessing(false)
    }, 2000)
  }

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    const userMsg = chatInput
    setChatInput("")
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }])
    setTimeout(() => {
      const expenses = filteredTransactions.filter((t) => t.type === "expense")
      const topCategory = expenses.reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + toArs(t)
        return acc
      }, {})
      const top = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0]
      const summaryText = isExpensesOnly
        ? `${filterLabels[timeFilter]}: llevas ${formatCurrency(totalExpenses)} gastados. Te queda ${formatCurrency(balance)}.`
        : `${filterLabels[timeFilter]}: ingresos ${formatCurrency(totalIncome)}, gastos ${formatCurrency(totalExpenses)}. Balance: ${formatCurrency(balance)}. Top: "${top?.[0] || "General"}".`
      setChatMessages((prev) => [...prev, { role: "bot", text: summaryText }])
    }, 1200)
  }

  const handleApplyCustomRange = () => {
    if (!calendarRange?.from) return
    const to = calendarRange.to ? new Date(calendarRange.to) : new Date(calendarRange.from)
    to.setHours(23, 59, 59)
    setCustomRange({ from: calendarRange.from, to })
    setTimeFilter("custom")
    setShowCalendar(false)
  }

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

            {/* Inline calendar for custom range */}
            <AnimatePresence>
              {showCalendar && (
                <motion.div
                  className="mt-3 rounded-2xl border border-border bg-card overflow-hidden"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="p-3">
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Movimientos ({filteredTransactions.length})
            </p>

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
                      >
                        <button
                          type="button"
                          className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 hover:bg-secondary/30 active:bg-secondary/50 transition-colors cursor-pointer text-left"
                          onClick={() => setExpandedTx(isExpanded ? null : tx.id)}
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
                          {tx.observation && (
                            <ChevronRight
                              className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                                isExpanded ? "rotate-90" : ""
                              }`}
                            />
                          )}
                        </button>
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
                    className="border-0 bg-transparent text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0 text-sm"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 rounded-lg h-8 w-8 cursor-pointer"
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
