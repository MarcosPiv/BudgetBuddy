"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Brain,
  Bot,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  Wallet,
  DollarSign,
  Briefcase,
  ReceiptText,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  Sun,
  Moon,
  Bell,
  BellOff,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApp, type ProfileMode, type ExchangeRateMode, type AIProvider } from "@/lib/app-context"
import { useExchangeRate } from "@/hooks/use-exchange-rate"
import { useTheme } from "next-themes"
import { useNotifications } from "@/hooks/use-notifications"

function fmt(n: number | null | undefined) {
  if (n == null) return "—"
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`
}

const KEY_PREFIXES: Record<AIProvider, string> = {
  claude: "sk-ant-",
  openai: "sk-",
  gemini: "AIza",
}

const AI_PROVIDERS: Array<{
  id: AIProvider
  label: string
  model: string
  Icon: React.ElementType
  placeholder: string
  hint: string
}> = [
  {
    id: "claude",
    label: "Claude",
    model: "Anthropic",
    Icon: Brain,
    placeholder: "sk-ant-api03-...",
    hint: "Conseguí tu clave en console.anthropic.com",
  },
  {
    id: "openai",
    label: "OpenAI",
    model: "GPT-4o",
    Icon: Bot,
    placeholder: "sk-proj-...",
    hint: "Conseguí tu clave en platform.openai.com",
  },
  {
    id: "gemini",
    label: "Gemini",
    model: "Google",
    Icon: Sparkles,
    placeholder: "AIzaSy...",
    hint: "Conseguí tu clave en aistudio.google.com",
  },
]

export function SettingsPage() {
  const {
    setView,
    aiProvider,
    setAiProvider,
    apiKeyClaude,
    setApiKeyClaude,
    apiKeyOpenAI,
    setApiKeyOpenAI,
    apiKeyGemini,
    setApiKeyGemini,
    monthlyBudget,
    setMonthlyBudget,
    profileMode,
    setProfileMode,
    usdRate,
    setUsdRate,
    exchangeRateMode,
    setExchangeRateMode,
    saveProfile,
  } = useApp()

  const [editingKey, setEditingKey] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState("")
  const [localProvider, setLocalProvider] = useState<AIProvider>(aiProvider)
  const [localKeysClaude, setLocalKeysClaude] = useState(apiKeyClaude)
  const [localKeysOpenAI, setLocalKeysOpenAI] = useState(apiKeyOpenAI)
  const [localKeysGemini, setLocalKeysGemini] = useState(apiKeyGemini)
  const [localBudget, setLocalBudget] = useState(monthlyBudget.toString())
  const [localMode, setLocalMode] = useState<ProfileMode>(profileMode)
  const [localUsdRate, setLocalUsdRate] = useState(usdRate.toString())
  const [localExMode, setLocalExMode] = useState<ExchangeRateMode>(exchangeRateMode)
  const [selectedApiKey, setSelectedApiKey] = useState<"blue" | "oficial" | "tarjeta" | "mep">("blue")
  const [saved, setSaved] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [exOpen, setExOpen] = useState(false)

  const { theme, setTheme } = useTheme()
  const { isSupported: notifSupported, requestPermission } = useNotifications()

  const [notifDaily, setNotifDaily] = useState(() => typeof window !== "undefined" && localStorage.getItem("bb_notif_daily") === "true")
  const [notifDailyTime, setNotifDailyTime] = useState(() => typeof window !== "undefined" ? (localStorage.getItem("bb_notif_daily_time") ?? "20:00") : "20:00")
  const [notifBudget, setNotifBudget] = useState(() => typeof window !== "undefined" && localStorage.getItem("bb_notif_budget") === "true")
  const [notifRecurring, setNotifRecurring] = useState(() => typeof window !== "undefined" && localStorage.getItem("bb_notif_recurring") === "true")
  const [notifWeekly, setNotifWeekly] = useState(() => typeof window !== "undefined" && localStorage.getItem("bb_notif_weekly") === "true")

  const handleNotifToggle = async (key: string, setter: (v: boolean) => void, current: boolean) => {
    const next = !current
    if (next) {
      const granted = await requestPermission()
      if (!granted) return
    }
    localStorage.setItem(key, next ? "true" : "false")
    setter(next)
  }

  const handleThemeChange = (next: string) => {
    const html = document.documentElement
    html.classList.add("theme-transitioning")
    setTheme(next)
    setTimeout(() => html.classList.remove("theme-transitioning"), 500)
  }

  // Derived: key value and setter for the currently selected provider
  const displayedKey =
    localProvider === "claude" ? localKeysClaude :
    localProvider === "openai" ? localKeysOpenAI :
    localKeysGemini

  const handleKeyChange = (value: string) => {
    if (localProvider === "claude") setLocalKeysClaude(value)
    else if (localProvider === "openai") setLocalKeysOpenAI(value)
    else setLocalKeysGemini(value)
  }

  const activeProviderMeta = AI_PROVIDERS.find((p) => p.id === localProvider)!

  const isApiMode = localExMode === "api"

  const { rates, loading, error, refresh } = useExchangeRate({ enabled: isApiMode })

  const apiCards: Array<{
    key: "blue" | "oficial" | "tarjeta" | "mep"
    label: string
    emoji: string
  }> = [
    { key: "blue", label: "Blue", emoji: "💵" },
    { key: "oficial", label: "Oficial", emoji: "🏦" },
    { key: "tarjeta", label: "Tarjeta", emoji: "💳" },
    { key: "mep", label: "MEP", emoji: "📈" },
  ]

  const handleSave = async () => {
    // Block save if the API key has the wrong format for the selected provider
    const prefix = KEY_PREFIXES[localProvider]
    const activeKey =
      localProvider === "claude" ? localKeysClaude :
      localProvider === "openai" ? localKeysOpenAI : localKeysGemini
    if (activeKey && !activeKey.startsWith(prefix)) {
      setKeyError(`La clave de ${activeProviderMeta.label} debe empezar con "${prefix}"`)
      return
    }
    setKeyError(null)

    const budget = parseInt(localBudget) || 200000
    let newRate = parseFloat(localUsdRate) || 1350

    if (localExMode === "api") {
      const active = rates[selectedApiKey]
      if (active?.venta) newRate = active.venta
    }

    // Update context state
    setAiProvider(localProvider)
    setApiKeyClaude(localKeysClaude)
    setApiKeyOpenAI(localKeysOpenAI)
    setApiKeyGemini(localKeysGemini)
    setMonthlyBudget(budget)
    setProfileMode(localMode)
    setExchangeRateMode(localExMode)
    setUsdRate(newRate)

    // Pass fresh values to avoid stale-closure bug
    await saveProfile({
      aiProvider: localProvider,
      apiKeyClaude: localKeysClaude,
      apiKeyOpenAI: localKeysOpenAI,
      apiKeyGemini: localKeysGemini,
      monthlyBudget: budget,
      profileMode: localMode,
      exchangeRateMode: localExMode,
      usdRate: newRate,
    })

    setEditingKey(false)
    setNewKeyValue("")
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      setView("dashboard")
    }, 800)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full bg-accent/5 blur-[120px]" />

      <motion.button
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        onClick={() => setView("dashboard")}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Volver</span>
      </motion.button>

      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="glass rounded-2xl border border-border p-8">
          {/* Header */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/20">
              <Brain className="w-6 h-6 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-foreground text-balance text-center">
              Configura tu Cerebro Financiero
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
              Elige tu perfil financiero, configura la moneda y conecta tu clave
              de API.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {/* Appearance toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                {theme === "light" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                Apariencia
              </Label>
              <div className="flex items-center gap-1 rounded-full bg-secondary/70 p-1 border border-border">
                <button
                  type="button"
                  onClick={() => handleThemeChange("dark")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    theme === "dark"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Moon className="w-3 h-3" />
                  Oscuro
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange("light")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    theme === "light"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sun className="w-3 h-3" />
                  Claro
                </button>
              </div>
            </div>

            {/* Profile Mode Selector */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-muted-foreground">
                Perfil financiero
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className={`flex flex-col items-center gap-2.5 rounded-xl border p-4 transition-all cursor-pointer ${
                    localMode === "standard"
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "border-border bg-secondary/30 hover:bg-secondary/50"
                  }`}
                  onClick={() => setLocalMode("standard")}
                >
                  <Briefcase
                    className={`w-6 h-6 ${
                      localMode === "standard"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div className="text-center">
                    <p
                      className={`text-sm font-semibold ${
                        localMode === "standard"
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      Estandar
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      Ingresos y gastos. Ideal para emprendedores o freelancers.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  className={`flex flex-col items-center gap-2.5 rounded-xl border p-4 transition-all cursor-pointer ${
                    localMode === "expenses_only"
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "border-border bg-secondary/30 hover:bg-secondary/50"
                  }`}
                  onClick={() => setLocalMode("expenses_only")}
                >
                  <ReceiptText
                    className={`w-6 h-6 ${
                      localMode === "expenses_only"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div className="text-center">
                    <p
                      className={`text-sm font-semibold ${
                        localMode === "expenses_only"
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      Solo gastos
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      Controla tus gastos con un presupuesto mensual fijo.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Monthly Budget (only for expenses_only mode) */}
            <AnimatePresence>
              {localMode === "expenses_only" && (
                <motion.div
                  className="flex flex-col gap-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Label
                    htmlFor="budget"
                    className="text-sm text-muted-foreground flex items-center gap-2"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    Presupuesto mensual (ARS)
                  </Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="200000"
                    value={localBudget}
                    onChange={(e) => setLocalBudget(e.target.value)}
                    className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11 tabular-nums"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cuanto quieres gastar como maximo este mes?
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── USD Exchange Rate (collapsible) ───────────────── */}
            <div className="flex flex-col gap-0">
              {/* Collapsible header row */}
              <button
                type="button"
                onClick={() => setExOpen(v => !v)}
                className="flex items-center justify-between py-1 cursor-pointer group"
              >
                <Label className="text-sm text-muted-foreground flex items-center gap-2 cursor-pointer group-hover:text-foreground transition-colors">
                  <DollarSign className="w-3.5 h-3.5" />
                  Tipo de cambio USD
                  <span className="text-[10px] font-normal text-muted-foreground/70">
                    · {isApiMode ? "Automático" : `Manual · $${localUsdRate}`}
                  </span>
                </Label>
                <motion.div
                  animate={{ rotate: exOpen ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {exOpen && (
                  <motion.div
                    key="ex-body"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-3 pt-3">
                      {/* Mode toggle pill */}
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Fuente</Label>
                        <div className="flex items-center gap-1 rounded-full bg-secondary/70 p-1 border border-border">
                          <button
                            type="button"
                            onClick={() => setLocalExMode("api")}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                              isApiMode
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Wifi className="w-3 h-3" />
                            Automático
                          </button>
                          <button
                            type="button"
                            onClick={() => setLocalExMode("manual")}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                              !isApiMode
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <WifiOff className="w-3 h-3" />
                            Manual
                          </button>
                        </div>
                      </div>

                      {/* API mode panel */}
                      <AnimatePresence mode="wait">
                        {isApiMode ? (
                          <motion.div
                            key="api-panel"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="rounded-xl border border-border bg-secondary/30 p-4 flex flex-col gap-3">
                              {/* Status row */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {loading ? (
                                    <RefreshCw className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                                  ) : error ? (
                                    <div className="w-2 h-2 rounded-full bg-destructive" />
                                  ) : (
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {loading
                                      ? "Conectando a DolarAPI..."
                                      : error
                                        ? "Sin conexión"
                                        : "DolarAPI · en vivo"}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={refresh}
                                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Actualizar
                                </button>
                              </div>

                              {/* Rate cards grid */}
                              <div className="grid grid-cols-2 gap-2">
                                {apiCards.map((c) => {
                                  const r = rates[c.key]
                                  const isSelected = selectedApiKey === c.key
                                  return (
                                    <motion.button
                                      key={c.key}
                                      type="button"
                                      whileTap={{ scale: 0.96 }}
                                      onClick={() => {
                                        setSelectedApiKey(c.key)
                                        if (r?.venta) setLocalUsdRate(r.venta.toString())
                                      }}
                                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer ${
                                        isSelected
                                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                                          : "border-border bg-card hover:bg-secondary/50"
                                      }`}
                                    >
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                          {c.emoji} {c.label}
                                        </span>
                                        <span className="text-sm font-bold tabular-nums text-foreground">
                                          {r ? fmt(r.venta) : "—"}
                                        </span>
                                        {r && (
                                          <span className="text-[10px] text-muted-foreground tabular-nums">
                                            C: {fmt(r.compra)}
                                          </span>
                                        )}
                                      </div>
                                      {isSelected && (
                                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                      )}
                                    </motion.button>
                                  )
                                })}
                              </div>

                              <p className="text-[11px] text-muted-foreground">
                                Fuente:{" "}
                                <span className="font-medium text-foreground">dolarapi.com</span>
                                {" "}· Los valores se actualizan automáticamente.
                              </p>
                            </div>
                          </motion.div>
                        ) : (
                          /* Manual mode panel */
                          <motion.div
                            key="manual-panel"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-col gap-2">
                              <Input
                                id="usdRate"
                                type="number"
                                placeholder="1350"
                                value={localUsdRate}
                                onChange={(e) => setLocalUsdRate(e.target.value)}
                                className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11 tabular-nums font-mono"
                              />
                              <p className="text-xs text-muted-foreground">
                                1 USD ={" "}
                                <span className="font-semibold text-foreground tabular-nums">
                                  {localUsdRate || "..."} ARS
                                </span>
                                . Ingresá tu cotización preferida.
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notifications */}
            {notifSupported && (
              <div className="flex flex-col gap-3">
                <Label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5" />
                  Notificaciones
                </Label>

                <div className="rounded-xl border border-border bg-secondary/30 divide-y divide-border overflow-hidden">
                  {/* Daily reminder */}
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Recordatorio diario</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Recordarte registrar gastos</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <AnimatePresence>
                        {notifDaily && (
                          <motion.input
                            type="time"
                            value={notifDailyTime}
                            onChange={(e) => { setNotifDailyTime(e.target.value); localStorage.setItem("bb_notif_daily_time", e.target.value) }}
                            className="text-xs bg-secondary border border-border rounded-lg px-2 py-1 text-foreground outline-none focus:border-primary/60 tabular-nums cursor-pointer"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                          />
                        )}
                      </AnimatePresence>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifDaily}
                        onClick={() => handleNotifToggle("bb_notif_daily", setNotifDaily, notifDaily)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none ${notifDaily ? "bg-primary" : "bg-muted"}`}
                      >
                        <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${notifDaily ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                  </div>

                  {/* Budget alert */}
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Alerta de presupuesto</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Aviso al llegar al 90% del límite</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifBudget}
                      onClick={() => handleNotifToggle("bb_notif_budget", setNotifBudget, notifBudget)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none ${notifBudget ? "bg-primary" : "bg-muted"}`}
                    >
                      <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${notifBudget ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {/* Recurring reminder */}
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Fijos mensuales</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Aviso el 1° de cada mes</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifRecurring}
                      onClick={() => handleNotifToggle("bb_notif_recurring", setNotifRecurring, notifRecurring)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none ${notifRecurring ? "bg-primary" : "bg-muted"}`}
                    >
                      <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${notifRecurring ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {/* Weekly summary */}
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Resumen semanal</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Cada lunes: gasto de la semana anterior</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifWeekly}
                      onClick={() => handleNotifToggle("bb_notif_weekly", setNotifWeekly, notifWeekly)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none ${notifWeekly ? "bg-primary" : "bg-muted"}`}
                    >
                      <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${notifWeekly ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>

                {Notification.permission === "denied" && (
                  <p className="text-[11px] text-destructive flex items-center gap-1.5">
                    <BellOff className="w-3 h-3 shrink-0" />
                    Notificaciones bloqueadas en el navegador. Habilitálas en Configuración del sitio.
                  </p>
                )}
              </div>
            )}

            {/* AI Provider + API Key */}
            <div className="flex flex-col gap-3">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <Brain className="w-3.5 h-3.5" />
                Proveedor de IA
              </Label>

              {/* Provider selector */}
              <div className="grid grid-cols-3 gap-2">
                {AI_PROVIDERS.map((p) => {
                  const isSelected = localProvider === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setLocalProvider(p.id)
                        setEditingKey(false)
                        setNewKeyValue("")
                        setKeyError(null)
                      }}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border bg-secondary/30 hover:bg-secondary/50"
                      }`}
                    >
                      <p.Icon
                        className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <div className="text-center">
                        <p
                          className={`text-xs font-semibold leading-none ${
                            isSelected ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {p.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{p.model}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* API Key input for selected provider */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="providerKey" className="text-xs text-muted-foreground">
                  API Key · {activeProviderMeta.label}
                </Label>

                {displayedKey && !editingKey ? (
                  /* Masked display when key is saved */
                  <div className="flex items-center gap-2 h-11 px-3 rounded-lg bg-secondary/50 border border-border overflow-hidden">
                    <span className="flex-1 min-w-0 font-mono text-sm text-foreground truncate">
                      {displayedKey.slice(0, 12)}{"•".repeat(10)}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setEditingKey(true); setNewKeyValue("") }}
                      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer shrink-0"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  /* Input when no key or editing */
                  (() => {
                    const prefix = KEY_PREFIXES[localProvider]
                    const isValid = newKeyValue.startsWith(prefix) && newKeyValue.length > prefix.length + 8
                    const isWrongFormat = newKeyValue.length > 3 && !newKeyValue.startsWith(prefix)
                    return (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="providerKey"
                              type="text"
                              autoComplete="off"
                              spellCheck={false}
                              placeholder={activeProviderMeta.placeholder}
                              value={newKeyValue}
                              onChange={(e) => {
                                const v = e.target.value.trim()
                                setNewKeyValue(v)
                                handleKeyChange(v)
                              }}
                              className={`font-mono text-sm h-11 bg-secondary/50 text-foreground placeholder:text-muted-foreground/50 pr-8 transition-colors ${
                                isValid
                                  ? "border-primary/60 focus-visible:ring-primary/40"
                                  : isWrongFormat
                                  ? "border-destructive/60 focus-visible:ring-destructive/40"
                                  : "border-border"
                              }`}
                            />
                            {isValid && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary text-xs">✓</span>
                            )}
                          </div>
                          {editingKey && (
                            <button
                              type="button"
                              onClick={() => { setEditingKey(false); setNewKeyValue("") }}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 px-2"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                        {isWrongFormat && (
                          <p className="text-[11px] text-destructive">
                            Las claves de {activeProviderMeta.label} empiezan con <span className="font-mono">{prefix}</span>
                          </p>
                        )}
                      </div>
                    )
                  })()
                )}

                <p className="text-[11px] text-muted-foreground">{activeProviderMeta.hint}</p>
              </div>
            </div>

            {/* Security notice */}
            <div className="flex items-start gap-3 rounded-xl bg-secondary/50 p-4 border border-border">
              <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tus claves se almacenan en tu cuenta de Supabase, cifradas en reposo.
              </p>
            </div>

            <AnimatePresence>
              {keyError && (
                <motion.p
                  className="text-xs text-destructive text-center -mt-1"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {keyError}
                </motion.p>
              )}
            </AnimatePresence>

            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 font-semibold rounded-xl mt-2 cursor-pointer transition-all"
              onClick={handleSave}
            >
              <AnimatePresence mode="wait" initial={false}>
                {saved ? (
                  <motion.span
                    key="saved"
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Guardado!
                  </motion.span>
                ) : (
                  <motion.span
                    key="save"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    Guardar y Continuar
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>

            <button
              className="text-sm text-muted-foreground hover:text-foreground text-center transition-colors cursor-pointer"
              onClick={() => setView("dashboard")}
            >
              Saltar por ahora
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
