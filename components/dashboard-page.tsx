"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageCircle, Settings, LogOut, Wallet, BarChart2, Loader2, WifiOff, RefreshCw, CheckCircle2, ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useApp, type TimeFilter, type ExchangeRateType } from "@/lib/app-context"
import { supabase } from "@/lib/supabase"
import { callAI, callAIChat, type ChatTurn, type AIAttachment } from "@/lib/ai"
import { useExchangeRate } from "@/hooks/use-exchange-rate"
import type { DateRange } from "react-day-picker"

// Sub-components
import { OnboardingWizard } from "@/components/onboarding-wizard"
import { SummaryCards } from "./dashboard/summary-cards"
import { CategoryChart } from "./dashboard/category-chart"
import { FilterBar } from "./dashboard/filter-bar"
import { TransactionList } from "./dashboard/transaction-list"
import { MagicBar } from "./dashboard/magic-bar"
import { ChatPanel } from "./dashboard/chat-panel"
import { EditDialog, type EditForm } from "./dashboard/edit-dialog"
import { CameraModal } from "./dashboard/camera-modal"
import { toast } from "sonner"

// Shared utilities
import {
  ONBOARDING_KEY,
  formatDateShort,
  fileToBase64,
  compressImage,
  type ChatMessage,
  type Attachment,
} from "./dashboard/shared"

const TX_PAGE = 6

export function DashboardPage() {
  const {
    user,
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
    isOnline,
    pendingOfflineCount,
  } = useApp()

  // ── Magic Bar state ──────────────────────────────────────────────────────────
  const [magicInput, setMagicInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [observation, setObservation] = useState("")
  const [showObservation, setShowObservation] = useState(false)
  const [newCurrency, setNewCurrency] = useState<"ARS" | "USD">("ARS")
  const [newExRateType, setNewExRateType] = useState<ExchangeRateType>("BLUE")
  const [newManualRate, setNewManualRate] = useState("")
  const [newTxDate, setNewTxDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [aiError, setAiError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioHoldRef = useRef(false) // tracks if pointer is still held during getUserMedia
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // ── Chat state ───────────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "bot", text: "Hola! Soy tu asistente financiero. Que necesitas registrar hoy?" },
  ])
  const [chatInput, setChatInput] = useState("")
  const [isChatProcessing, setIsChatProcessing] = useState(false)
  const [isChatRecording, setIsChatRecording] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatMediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chatAudioChunksRef = useRef<Blob[]>([])

  // ── Live camera ──────────────────────────────────────────────────────────────
  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // ── Transaction UI state ─────────────────────────────────────────────────────
  const [expandedTx, setExpandedTx] = useState<string | null>(null)
  const [editingTx, setEditingTx] = useState<import("@/lib/app-context").Transaction | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    description: "",
    amount: "",
    type: "expense",
    category: "General",
    icon: "ShoppingCart",
    date: "",
    currency: "ARS",
    exRateType: "BLUE",
    manualRate: "",
    observation: "",
    isRecurring: false,
  })
  const [longPressId, setLongPressId] = useState<string | null>(null)
  const lpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragActiveRef = useRef(false)
  const handleDeleteWithUndo = (tx: (typeof transactions)[number]) => {
    deleteTransaction(tx.id, (msg) => { setAiError(msg); setTimeout(() => setAiError(null), 5000) })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...rest } = tx
    toast("Movimiento eliminado", {
      description: tx.description,
      action: { label: "Deshacer", onClick: () => addTransaction(rest) },
      duration: 5000,
    })
  }

  // ── Manual entry (no-AI / offline fallback) ──────────────────────────────────
  const [showManualEntry, setShowManualEntry] = useState(false)

  // ── Search / view state ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("")
  const [showCategoryChart, setShowCategoryChart] = useState(false)
  const [showAllTx, setShowAllTx] = useState(false)

  // ── Onboarding ───────────────────────────────────────────────────────────────
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false
    return !localStorage.getItem(ONBOARDING_KEY)
  })
  const [showFirstTxTooltip, setShowFirstTxTooltip] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const prevTxCountRef = useRef(transactions.length)

  useEffect(() => {
    const prev = prevTxCountRef.current
    prevTxCountRef.current = transactions.length
    if (prev === 0 && transactions.length === 1 && !showOnboarding) {
      setShowFirstTxTooltip(false)
      setShowCelebration(true)
      localStorage.setItem("bb_first_tx_tip", "done")
      setTimeout(() => setShowCelebration(false), 2800)
    }
  }, [transactions.length, showOnboarding])

  // ── Filter / calendar ────────────────────────────────────────────────────────
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>({
    from: customRange.from,
    to: customRange.to,
  })

  // ── Live exchange rates ──────────────────────────────────────────────────────
  const { rates: liveRates, loading: ratesLoading } = useExchangeRate({ enabled: true })

  // ── Derived / computed ───────────────────────────────────────────────────────
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
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()
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
    [filteredTransactions, usdRate],
  )
  const totalIncome = useMemo(
    () => filteredTransactions.filter((t) => t.type === "income").reduce((a, b) => a + toArs(b), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredTransactions, usdRate],
  )

  const balance = isExpensesOnly ? monthlyBudget - totalExpenses : totalIncome - totalExpenses
  const spentPercent = isExpensesOnly ? Math.min((totalExpenses / monthlyBudget) * 100, 100) : 0

  const prevPeriodExpenses = useMemo(() => {
    if (timeFilter === "custom") return null
    const now = new Date()
    let from: Date, to: Date
    if (timeFilter === "week") {
      from = new Date(now); from.setDate(now.getDate() - 14); from.setHours(0, 0, 0, 0)
      to = new Date(now); to.setDate(now.getDate() - 7); to.setHours(23, 59, 59, 999)
    } else if (timeFilter === "month") {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      to = new Date(now.getFullYear(), now.getMonth(), 0); to.setHours(23, 59, 59, 999)
    } else {
      from = new Date(now.getFullYear() - 1, 0, 1)
      to = new Date(now.getFullYear() - 1, 11, 31); to.setHours(23, 59, 59, 999)
    }
    return transactions
      .filter(tx => { const d = new Date(tx.date); return tx.type === "expense" && d >= from && d <= to })
      .reduce((a, tx) => a + toArs(tx), 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, timeFilter, usdRate])

  const expensesChangePct = (prevPeriodExpenses !== null && prevPeriodExpenses > 0)
    ? ((totalExpenses - prevPeriodExpenses) / prevPeriodExpenses) * 100
    : null
  const periodLabel = timeFilter === "week" ? "vs sem. ant." : timeFilter === "month" ? "vs mes ant." : "vs año ant."

  const formatCurrency = (n: number) => `$ ${Math.abs(n).toLocaleString("es-AR")} ARS`

  const filterLabels: Record<TimeFilter, string> = useMemo(() => ({
    week: "Esta semana",
    month: "Este mes",
    year: "Este año",
    custom: `${formatDateShort(customRange.from)} — ${formatDateShort(customRange.to)}`,
  }), [customRange.from, customRange.to])

  const displayedTransactions = useMemo(() => {
    if (!searchQuery.trim()) return filteredTransactions
    const q = searchQuery.toLowerCase()
    return filteredTransactions.filter(tx =>
      tx.description.toLowerCase().includes(q) ||
      tx.category.toLowerCase().includes(q) ||
      (tx.observation?.toLowerCase().includes(q) ?? false),
    )
  }, [filteredTransactions, searchQuery])

  useEffect(() => { setShowAllTx(false) }, [filteredTransactions, searchQuery])

  const visibleTransactions = showAllTx ? displayedTransactions : displayedTransactions.slice(0, TX_PAGE)
  const hasMoreTx = displayedTransactions.length > TX_PAGE

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    filteredTransactions
      .filter(t => t.type === "expense")
      .forEach(t => { map[t.category] = (map[t.category] || 0) + toArs(t) })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTransactions, usdRate])

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

  const calendarPresets: { label: string; getRange: () => { from: Date; to: Date } }[] = [
    { label: "Hoy",      getRange: () => { const d = new Date(); return { from: d, to: d } } },
    { label: "Ayer",     getRange: () => { const d = new Date(); d.setDate(d.getDate() - 1); return { from: d, to: d } } },
    { label: "7 días",   getRange: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 6); return { from, to } } },
    { label: "30 días",  getRange: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 29); return { from, to } } },
    { label: "Este mes", getRange: () => { const n = new Date(); return { from: new Date(n.getFullYear(), n.getMonth(), 1), to: n } } },
    { label: "Mes ant.", getRange: () => { const n = new Date(); return { from: new Date(n.getFullYear(), n.getMonth() - 1, 1), to: new Date(n.getFullYear(), n.getMonth(), 0) } } },
  ]

  const initials = userName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "U"

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()) }
  }, [])

  // ── Magic Bar handlers ───────────────────────────────────────────────────────
  const getAppliedRate = (): number => {
    if (newCurrency === "ARS") return 1
    if (newExRateType === "MANUAL") return parseFloat(newManualRate) || usdRate
    const live = liveRates[newExRateType.toLowerCase() as keyof typeof liveRates]
    return (live as { venta?: number } | null)?.venta ?? usdRate
  }

  // ── Manual entry helpers ─────────────────────────────────────────────────────
  const openManualEntry = (prefillDesc = "") => {
    setEditForm({
      description: prefillDesc,
      amount: "",
      type: "expense",
      category: "General",
      icon: "ShoppingCart",
      date: new Date().toISOString().split("T")[0],
      currency: newCurrency,
      exRateType: newExRateType,
      manualRate: newManualRate,
      observation: "",
      isRecurring: false,
    })
    setShowManualEntry(true)
  }

  const handleSaveNew = () => {
    const amount = parseFloat(editForm.amount)
    if (!amount || amount <= 0) return
    addTransaction({
      description: editForm.description.trim() || "Transacción",
      amount,
      type: editForm.type,
      icon: editForm.icon,
      category: editForm.category,
      date: editForm.date ? new Date(editForm.date + "T12:00:00") : new Date(),
      currency: editForm.currency,
      amountUsd: editForm.currency === "USD" ? amount : undefined,
      txRate: editForm.currency === "USD" ? getEditRate() : undefined,
      exchangeRateType: editForm.currency === "USD" ? editForm.exRateType : null,
      observation: editForm.observation.trim() || undefined,
      isRecurring: editForm.isRecurring,
    }, (msg) => {
      setAiError(msg)
      setTimeout(() => setAiError(null), 5000)
    })
    setShowManualEntry(false)
  }

  const handleMagicSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!magicInput.trim() && attachments.length === 0) || isProcessing) return

    // If offline or no API key, open manual entry form pre-filled with the typed text
    if (!isOnline || !apiKey.trim()) {
      openManualEntry(magicInput.trim())
      setMagicInput("")
      setAttachments([])
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
    const txDate = newTxDate ?? new Date()

    setMagicInput("")
    setAttachments([])
    setObservation("")
    setShowObservation(false)
    setNewTxDate(null)

    try {
      const aiAttachments: AIAttachment[] = await Promise.all(
        capturedAttachments.map(async (a) => ({
          type: a.type,
          base64: await fileToBase64(a.file),
          mimeType: a.file.type || (a.type === "audio" ? "audio/webm" : "image/jpeg"),
          file: a.file,
        })),
      )

      const aiResult = await callAI(aiProvider, apiKey, textInput, aiAttachments.length > 0 ? aiAttachments : undefined)
      const results = Array.isArray(aiResult) ? aiResult : [aiResult]
      const valid = results.filter(r => r.type !== "unknown")

      if (valid.length === 0) {
        setAiError("No detecté una transacción. Describí un gasto o ingreso (ej: 'gasté 5000 en comida').")
        setTimeout(() => setAiError(null), 5000)
        return
      }

      // Upload receipt image to Supabase Storage (best-effort, only for single transactions)
      let receiptUrl: string | undefined
      const imageAtt = capturedAttachments.find(a => a.type === "image")
      if (imageAtt && user && valid.length === 1) {
        try {
          const compressed = await compressImage(imageAtt.file)
          const path = `${user.id}/${Date.now()}.jpg`
          const { error: uploadError } = await supabase.storage
            .from("receipts")
            .upload(path, compressed, { contentType: "image/jpeg" })
          if (!uploadError) receiptUrl = path
        } catch {
          // Non-critical — transaction still saves without the receipt
        }
      }

      for (const result of valid) {
        addTransaction({
          description: result.description,
          amount: result.amount,
          type: result.type,
          icon: result.icon,
          category: result.category,
          date: txDate,
          currency: curr,
          amountUsd: curr === "USD" ? result.amount : undefined,
          txRate: curr === "USD" ? appliedRate : undefined,
          exchangeRateType: rateType,
          observation: obs,
          receiptUrl: valid.length === 1 ? receiptUrl : undefined,
        }, (msg) => {
          setAiError(msg)
          setTimeout(() => setAiError(null), 6000)
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al procesar."
      setAiError(msg)
      setTimeout(() => setAiError(null), 6000)
    } finally {
      setIsProcessing(false)
    }
  }

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
    audioHoldRef.current = true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // User released before permission resolved — abort cleanly
      if (!audioHoldRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
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
      audioHoldRef.current = false
      setAiError("No se pudo acceder al micrófono. Habilitá el permiso en tu navegador.")
      setTimeout(() => setAiError(null), 5000)
    }
  }

  const stopRecording = () => {
    audioHoldRef.current = false
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const removeAttachment = (i: number) => {
    setAttachments((prev) => {
      URL.revokeObjectURL(prev[i].url)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      })
      streamRef.current = stream
      setShowCamera(true)
    } catch {
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

  // ── Chat handlers ────────────────────────────────────────────────────────────
  const buildFinancialContext = (): string => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const yearTxs = transactions.filter(t => new Date(t.date).getFullYear() === currentYear)
    const monthTxs = transactions.filter(t => {
      const d = new Date(t.date)
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth
    })

    const sumExpenses = (txs: typeof transactions) =>
      txs.filter(t => t.type === "expense").reduce((a, t) => a + toArs(t), 0)
    const sumIncome = (txs: typeof transactions) =>
      txs.filter(t => t.type === "income").reduce((a, t) => a + toArs(t), 0)

    const catMap: Record<string, number> = {}
    yearTxs.filter(t => t.type === "expense").forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + toArs(t)
    })
    const topCategories = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt]) => `${cat}: ${formatCurrency(amt)}`)
      .join(", ")

    const recentTxs = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 60)
    const txLines = recentTxs
      .map(t => {
        const dateStr = new Date(t.date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
        return `${dateStr} · ${t.type === "expense" ? "Gasto" : "Ingreso"} · ${t.description} · ${t.category} · ${formatCurrency(toArs(t))}`
      })
      .join("\n")

    return [
      `=== RESUMEN ANUAL ${currentYear} ===`,
      `Ingresos año: ${formatCurrency(sumIncome(yearTxs))}`,
      `Gastos año: ${formatCurrency(sumExpenses(yearTxs))}`,
      `Balance año: ${formatCurrency(sumIncome(yearTxs) - sumExpenses(yearTxs))}`,
      `Transacciones en el año: ${yearTxs.length}`,
      topCategories ? `Top categorías de gastos (año): ${topCategories}` : null,
      ``,
      `=== MES ACTUAL ===`,
      `Ingresos mes: ${formatCurrency(sumIncome(monthTxs))}`,
      `Gastos mes: ${formatCurrency(sumExpenses(monthTxs))}`,
      isExpensesOnly && monthlyBudget ? `Presupuesto mensual: ${formatCurrency(monthlyBudget)}` : null,
      ``,
      `=== ÚLTIMAS ${recentTxs.length} TRANSACCIONES ===`,
      txLines,
    ].filter(v => v !== null).join("\n")
  }

  const dispatchChatMessage = async (userLabel: string, prevMessages: ChatMessage[], audioAttachment?: AIAttachment) => {
    if (!apiKey.trim()) {
      setChatMessages(prev => [...prev, { role: "bot", text: "Configurá tu API key en Ajustes para usar el asistente." }])
      return
    }
    setIsChatProcessing(true)
    const history: ChatTurn[] = [
      ...prevMessages.slice(1).map(m => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        text: m.text,
      })),
      { role: "user" as const, text: userLabel },
    ]
    try {
      const reply = await callAIChat(aiProvider, apiKey, buildFinancialContext(), history, audioAttachment)
      setChatMessages(prev => [...prev, { role: "bot", text: reply }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al conectar."
      setChatMessages(prev => [...prev, { role: "bot", text: msg }])
    } finally {
      setIsChatProcessing(false)
    }
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || isChatProcessing || isChatRecording) return
    const userMsg = chatInput.trim()
    setChatInput("")
    const prevMessages = chatMessages
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }])
    await dispatchChatMessage(userMsg, prevMessages)
  }

  const startChatRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chatMediaRecorderRef.current = recorder
      chatAudioChunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chatAudioChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chatAudioChunksRef.current, { type: "audio/webm" })
        const file = new File([blob], `chat-voz-${Date.now()}.webm`, { type: "audio/webm" })
        const base64 = await fileToBase64(file)
        const attachment: AIAttachment = { type: "audio", base64, mimeType: "audio/webm", file }
        const prevMessages = chatMessages
        setChatMessages(prev => [...prev, { role: "user", text: "🎤 Mensaje de voz" }])
        await dispatchChatMessage("🎤 Mensaje de voz", prevMessages, attachment)
      }
      recorder.start()
      setIsChatRecording(true)
    } catch {
      setChatMessages(prev => [...prev, { role: "bot", text: "No se pudo acceder al micrófono." }])
    }
  }

  const stopChatRecording = () => {
    chatMediaRecorderRef.current?.stop()
    setIsChatRecording(false)
  }

  // ── Edit handlers ────────────────────────────────────────────────────────────
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
      isRecurring: tx.isRecurring ?? false,
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
      isRecurring: editForm.isRecurring,
    }, (msg) => {
      setAiError(msg)
      setTimeout(() => setAiError(null), 5000)
    })
    setEditingTx(null)
  }

  // ── Touch / long-press handlers ──────────────────────────────────────────────
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

  // ── Calendar / filter helpers ────────────────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">

        {/* ── Sticky header ────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 pb-3 sm:px-6" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0.75rem))" }}>
          {/* Left: logo + balance (balance visible on sm+) */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
              <Wallet className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="hidden sm:flex flex-col leading-none min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {isExpensesOnly ? "Disponible" : "Balance"} · {filterLabels[timeFilter]}
              </span>
              <div className="flex items-baseline gap-2">
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
                {expensesChangePct !== null && (
                  <span className={`text-[10px] font-medium tabular-nums shrink-0 ${
                    expensesChangePct > 5 ? "text-destructive" :
                    expensesChangePct < -5 ? "text-primary" :
                    "text-muted-foreground"
                  }`}>
                    {expensesChangePct > 0 ? "+" : ""}{expensesChangePct.toFixed(0)}% {periodLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Offline / syncing pill */}
          {(!isOnline || pendingOfflineCount > 0) && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
              !isOnline
                ? "bg-amber-500/15 text-amber-500"
                : "bg-primary/10 text-primary"
            }`}>
              {!isOnline
                ? <><WifiOff className="w-3 h-3" />{pendingOfflineCount > 0 ? `${pendingOfflineCount} en cola` : "Sin conexión"}</>
                : <><RefreshCw className="w-3 h-3 animate-spin" />Sincronizando...</>
              }
            </div>
          )}

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
              onClick={() => setView("analytics")}
              aria-label="Analítica"
            >
              <BarChart2 className="w-5 h-5" />
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
          </div>

          {/* Mobile-only: prominent centered balance */}
          <div className="sm:hidden px-4 pb-3 flex flex-col items-center gap-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {isExpensesOnly ? "Disponible" : "Balance"} · {filterLabels[timeFilter]}
            </span>
            <motion.span
              key={balance}
              className={`text-3xl font-bold tabular-nums ${balance >= 0 ? "text-primary" : "text-destructive"}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {balance < 0 ? "-" : ""}{formatCurrency(balance)}
            </motion.span>
            {expensesChangePct !== null && (
              <span className={`text-xs font-medium tabular-nums mt-0.5 ${
                expensesChangePct > 5 ? "text-destructive" :
                expensesChangePct < -5 ? "text-primary" :
                "text-muted-foreground"
              }`}>
                {expensesChangePct > 0 ? "+" : ""}{expensesChangePct.toFixed(0)}% gastos {periodLabel}
              </span>
            )}
          </div>
        </header>

        {/* ── Scrollable content ──────────────────────────────── */}
        <div className={`flex-1 flex flex-col lg:flex-row transition-[padding] duration-300 ease-out ${chatOpen ? "lg:pr-80 xl:pr-96" : ""}`}>
          <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8 pb-56 lg:pb-52 max-w-3xl mx-auto w-full">

            {/* Greeting */}
            <motion.div
              className="mb-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="text-base font-semibold text-foreground">Hola, {userName}</h1>
              <p className="text-xs text-muted-foreground">Registra con texto, foto o audio</p>
            </motion.div>

            <FilterBar
              timeFilter={timeFilter}
              setTimeFilter={setTimeFilter}
              filterLabels={filterLabels}
              showCalendar={showCalendar}
              setShowCalendar={setShowCalendar}
              calendarRange={calendarRange}
              setCalendarRange={setCalendarRange}
              calendarPresets={calendarPresets}
              applyRange={applyRange}
              handleApplyCustomRange={handleApplyCustomRange}
            />

            <SummaryCards
              isExpensesOnly={isExpensesOnly}
              totalExpenses={totalExpenses}
              totalIncome={totalIncome}
              balance={balance}
              spentPercent={spentPercent}
              monthlyBudget={monthlyBudget}
              formatCurrency={formatCurrency}
            />

            <CategoryChart
              categoryBreakdown={categoryBreakdown}
              showCategoryChart={showCategoryChart}
              setShowCategoryChart={setShowCategoryChart}
              formatCurrency={formatCurrency}
            />

            <TransactionList
              filteredTransactions={filteredTransactions}
              displayedTransactions={displayedTransactions}
              visibleTransactions={visibleTransactions}
              hasMoreTx={hasMoreTx}
              showAllTx={showAllTx}
              setShowAllTx={setShowAllTx}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              expandedTx={expandedTx}
              setExpandedTx={setExpandedTx}
              longPressId={longPressId}
              setLongPressId={setLongPressId}
              dragActiveRef={dragActiveRef}
              lpTimerRef={lpTimerRef}
              usdRate={usdRate}
              openEdit={openEdit}
              onDelete={handleDeleteWithUndo}
              handleTouchStart={handleTouchStart}
              handleTouchEnd={handleTouchEnd}
            />
          </main>

          <ChatPanel
            chatOpen={chatOpen}
            setChatOpen={setChatOpen}
            chatMessages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            isChatProcessing={isChatProcessing}
            isChatRecording={isChatRecording}
            chatEndRef={chatEndRef}
            handleChatSubmit={handleChatSubmit}
            startChatRecording={startChatRecording}
            stopChatRecording={stopChatRecording}
          />
        </div>

        <MagicBar
          chatOpen={chatOpen}
          magicInput={magicInput}
          setMagicInput={setMagicInput}
          isProcessing={isProcessing}
          attachments={attachments}
          removeAttachment={removeAttachment}
          newCurrency={newCurrency}
          setNewCurrency={setNewCurrency}
          newExRateType={newExRateType}
          setNewExRateType={setNewExRateType}
          newManualRate={newManualRate}
          setNewManualRate={setNewManualRate}
          observation={observation}
          setObservation={setObservation}
          showObservation={showObservation}
          setShowObservation={setShowObservation}
          newTxDate={newTxDate}
          setNewTxDate={setNewTxDate}
          showDatePicker={showDatePicker}
          setShowDatePicker={setShowDatePicker}
          rateTypeOptions={rateTypeOptions}
          ratesLoading={ratesLoading}
          usdRate={usdRate}
          handleMagicSubmit={handleMagicSubmit}
          galleryInputRef={galleryInputRef}
          cameraInputRef={cameraInputRef}
          handleImageSelect={handleImageSelect}
          startCamera={startCamera}
          isRecording={isRecording}
          startRecording={startRecording}
          stopRecording={stopRecording}
          aiError={aiError}
          onManualEntry={() => openManualEntry()}
        />


        {/* Edit existing transaction */}
        <EditDialog
          open={!!editingTx}
          onClose={() => setEditingTx(null)}
          title="Editar movimiento"
          subtitle={editingTx?.description}
          saveLabel="Guardar cambios"
          editForm={editForm}
          setEditForm={setEditForm}
          rateTypeOptions={rateTypeOptions}
          ratesLoading={ratesLoading}
          usdRate={usdRate}
          onSave={handleSaveEdit}
          getEditRate={getEditRate}
        />

        {/* Manual new transaction (no-AI / offline) */}
        <EditDialog
          open={showManualEntry}
          onClose={() => setShowManualEntry(false)}
          title="Nuevo movimiento"
          saveLabel="Agregar"
          editForm={editForm}
          setEditForm={setEditForm}
          rateTypeOptions={rateTypeOptions}
          ratesLoading={ratesLoading}
          usdRate={usdRate}
          onSave={handleSaveNew}
          getEditRate={getEditRate}
        />

        <CameraModal
          showCamera={showCamera}
          videoRef={videoRef}
          canvasRef={canvasRef}
          streamRef={streamRef}
          stopCamera={stopCamera}
          capturePhoto={capturePhoto}
        />
      </div>

      {/* ── Onboarding overlay ──────────────────────────────── */}
      {/* ── First-tx tooltip ────────────────────────────────── */}
      <AnimatePresence>
        {showFirstTxTooltip && (
          <motion.div
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-card border border-primary/40 rounded-2xl px-4 py-3.5 shadow-xl w-[calc(100%-2rem)] max-w-xs text-center"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 260 }}
          >
            <p className="text-sm font-semibold text-foreground">Registrá tu primer gasto</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ej: <span className="font-medium text-foreground">"Almuerzo $1500"</span> o <span className="font-medium text-foreground">"Nafta 10 dólares"</span>
            </p>
            <motion.div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 bg-card border-r border-b border-primary/40"
            />
            <button
              type="button"
              onClick={() => { setShowFirstTxTooltip(false); localStorage.setItem("bb_first_tx_tip", "done") }}
              className="absolute top-2 right-2.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer text-xs"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── First-tx celebration ─────────────────────────────── */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="flex flex-col items-center gap-3 bg-card border border-primary/30 rounded-2xl px-8 py-7 shadow-2xl"
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              transition={{ type: "spring", damping: 18, stiffness: 240 }}
            >
              <motion.div
                className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10"
                animate={{ scale: [1, 1.18, 1, 1.08, 1] }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </motion.div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">¡Primer movimiento registrado!</p>
                <p className="text-sm text-muted-foreground mt-1">Ya estás controlando tus finanzas</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Onboarding wizard ────────────────────────────────── */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingWizard onDone={() => {
            setShowOnboarding(false)
            if (transactions.length === 0) {
              setShowFirstTxTooltip(true)
            }
          }} />
        )}
      </AnimatePresence>
    </>
  )
}
