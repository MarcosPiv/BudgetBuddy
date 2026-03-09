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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApp, type ProfileMode, type ExchangeRateMode, type AIProvider } from "@/lib/app-context"
import { useExchangeRate } from "@/hooks/use-exchange-rate"

function fmt(n: number | null | undefined) {
  if (n == null) return "—"
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`
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

            {/* ── USD Exchange Rate ──────────────────────────────── */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5" />
                  Tipo de cambio USD
                </Label>
                {/* Mode toggle pill */}
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
                        <span className="font-medium text-foreground">
                          dolarapi.com
                        </span>{" "}
                        · Los valores se actualizan automáticamente.
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
                  <div className="flex items-center gap-2 h-11 px-3 rounded-lg bg-secondary/50 border border-border">
                    <span className="flex-1 font-mono text-sm text-foreground tracking-wider">
                      {displayedKey.slice(0, 8)}{"•".repeat(16)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingKey(true)}
                      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer shrink-0"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  /* Input when no key or editing */
                  <div className="flex gap-2">
                    <Input
                      id="providerKey"
                      type="password"
                      autoComplete="off"
                      placeholder={activeProviderMeta.placeholder}
                      value={editingKey ? "" : displayedKey}
                      onChange={(e) => handleKeyChange(e.target.value)}
                      onFocus={() => { if (editingKey) handleKeyChange("") }}
                      className="flex-1 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11 font-mono text-sm"
                    />
                    {editingKey && (
                      <button
                        type="button"
                        onClick={() => setEditingKey(false)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 px-2"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground">{activeProviderMeta.hint}</p>
              </div>
            </div>

            {/* Security notice */}
            <div className="flex items-start gap-3 rounded-xl bg-secondary/50 p-4 border border-border">
              <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tus credenciales se guardan localmente en tu navegador. Al
                cambiar de modo tus datos se mantienen intactos.
              </p>
            </div>

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
