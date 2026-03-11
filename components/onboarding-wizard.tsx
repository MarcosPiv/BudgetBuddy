"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Wallet, Briefcase, ReceiptText, Brain, Bot, Sparkles,
  ArrowRight, CheckCircle2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useApp, type ProfileMode, type AIProvider } from "@/lib/app-context"
import { ONBOARDING_KEY } from "@/components/dashboard/shared"

const KEY_PREFIXES: Record<AIProvider, string> = {
  claude: "sk-ant-",
  openai: "sk-",
  gemini: "AIza",
}

const AI_PROVIDERS: Array<{ id: AIProvider; label: string; model: string; Icon: React.ElementType; placeholder: string }> = [
  { id: "claude",  label: "Claude",  model: "Anthropic", Icon: Brain,    placeholder: "sk-ant-api03-..." },
  { id: "openai",  label: "OpenAI",  model: "GPT-4o",    Icon: Bot,      placeholder: "sk-proj-..."    },
  { id: "gemini",  label: "Gemini",  model: "Google",    Icon: Sparkles, placeholder: "AIzaSy..."      },
]

export function OnboardingWizard({ onDone }: { onDone: () => void }) {
  const {
    userName,
    setProfileMode, profileMode,
    setMonthlyBudget, monthlyBudget,
    setAiProvider,
    setApiKeyClaude, setApiKeyOpenAI, setApiKeyGemini,
    saveProfile,
  } = useApp()

  const [step, setStep] = useState(0)
  const TOTAL_STEPS = 3

  // Step 1 state
  const [localMode, setLocalMode] = useState<ProfileMode>(profileMode)
  const [localBudget, setLocalBudget] = useState(monthlyBudget > 0 ? monthlyBudget.toString() : "")

  // Step 2 state
  const [localProvider, setLocalProvider] = useState<AIProvider>("claude")
  const [localKey, setLocalKey] = useState("")
  const [keyError, setKeyError] = useState<string | null>(null)

  const prefix = KEY_PREFIXES[localProvider]
  const keyIsValid = localKey.startsWith(prefix) && localKey.length > prefix.length + 8
  const keyIsWrong = localKey.length > 3 && !localKey.startsWith(prefix)

  const handleNext = () => setStep(s => s + 1)

  const finish = async (withAI: boolean) => {
    const budget = parseInt(localBudget) || 200000
    setProfileMode(localMode)
    setMonthlyBudget(budget)

    const aiOverrides: Parameters<typeof saveProfile>[0] = {
      profileMode: localMode,
      monthlyBudget: budget,
    }

    if (withAI && localKey && keyIsValid) {
      setAiProvider(localProvider)
      if (localProvider === "claude") setApiKeyClaude(localKey)
      else if (localProvider === "openai") setApiKeyOpenAI(localKey)
      else setApiKeyGemini(localKey)
      aiOverrides.aiProvider = localProvider
      if (localProvider === "claude") aiOverrides.apiKeyClaude = localKey
      else if (localProvider === "openai") aiOverrides.apiKeyOpenAI = localKey
      else aiOverrides.apiKeyGemini = localKey
    }

    await saveProfile(aiOverrides)
    localStorage.setItem(ONBOARDING_KEY, "done")
    onDone()
  }

  const handleAINext = () => {
    if (localKey && !keyIsValid) {
      setKeyError(`La clave de ${AI_PROVIDERS.find(p => p.id === localProvider)?.label} debe empezar con "${prefix}"`)
      return
    }
    setKeyError(null)
    finish(true)
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-md px-5 pb-8 sm:pb-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
        initial={{ scale: 0.94, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 20, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 220 }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-secondary">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${((step) / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        <div className="p-7 flex flex-col gap-5">
          <AnimatePresence mode="wait">
            {/* ── Step 0: Welcome ──────────────────────────────── */}
            {step === 0 && (
              <motion.div
                key="step-0"
                className="flex flex-col items-center gap-4 text-center"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22 }}
              >
                <motion.div
                  className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Wallet className="w-8 h-8 text-primary-foreground" />
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    ¡Bienvenido/a{userName && userName !== "Usuario" ? `, ${userName.split(" ")[0]}` : ""}!
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Configuremos tu experiencia en 2 pasos para que BudgetBuddy funcione exactamente como necesitás.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Empezar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* ── Step 1: Profile mode ─────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step-1"
                className="flex flex-col gap-4"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22 }}
              >
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Paso 1 de 2</p>
                  <h2 className="text-lg font-bold text-foreground">¿Cómo querés usar la app?</h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLocalMode("expenses_only")}
                    className={`flex flex-col items-center gap-2.5 rounded-xl border p-4 transition-all cursor-pointer ${
                      localMode === "expenses_only"
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border bg-secondary/30 hover:bg-secondary/50"
                    }`}
                  >
                    <ReceiptText className={`w-6 h-6 ${localMode === "expenses_only" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="text-center">
                      <p className={`text-xs font-semibold ${localMode === "expenses_only" ? "text-foreground" : "text-muted-foreground"}`}>
                        Solo gastos
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                        Presupuesto mensual fijo
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocalMode("standard")}
                    className={`flex flex-col items-center gap-2.5 rounded-xl border p-4 transition-all cursor-pointer ${
                      localMode === "standard"
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border bg-secondary/30 hover:bg-secondary/50"
                    }`}
                  >
                    <Briefcase className={`w-6 h-6 ${localMode === "standard" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="text-center">
                      <p className={`text-xs font-semibold ${localMode === "standard" ? "text-foreground" : "text-muted-foreground"}`}>
                        Ingresos y gastos
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                        Balance completo
                      </p>
                    </div>
                  </button>
                </div>

                <AnimatePresence>
                  {localMode === "expenses_only" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground">Presupuesto mensual (ARS)</label>
                        <Input
                          type="number"
                          placeholder="200000"
                          value={localBudget}
                          onChange={(e) => setLocalBudget(e.target.value)}
                          className="bg-secondary/50 border-border h-10 tabular-nums"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Siguiente
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* ── Step 2: AI (optional) ────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step-2"
                className="flex flex-col gap-4"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22 }}
              >
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Paso 2 de 2</p>
                  <h2 className="text-lg font-bold text-foreground">Activá el asistente IA</h2>
                  <p className="text-xs text-muted-foreground mt-1">Opcional — podés configurarlo después en Ajustes.</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {AI_PROVIDERS.map((p) => {
                    const isSelected = localProvider === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setLocalProvider(p.id); setLocalKey(""); setKeyError(null) }}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all cursor-pointer ${
                          isSelected ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border bg-secondary/30 hover:bg-secondary/50"
                        }`}
                      >
                        <p.Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <p className={`text-[11px] font-semibold ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>{p.label}</p>
                        <p className="text-[10px] text-muted-foreground">{p.model}</p>
                      </button>
                    )
                  })}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">
                    API Key · {AI_PROVIDERS.find(p => p.id === localProvider)?.label}
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={AI_PROVIDERS.find(p => p.id === localProvider)?.placeholder}
                      value={localKey}
                      onChange={(e) => { setLocalKey(e.target.value.trim()); setKeyError(null) }}
                      className={`font-mono text-sm h-10 bg-secondary/50 pr-8 transition-colors ${
                        keyIsValid ? "border-primary/60" : keyIsWrong ? "border-destructive/60" : "border-border"
                      }`}
                    />
                    {keyIsValid && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    )}
                  </div>
                  {keyIsWrong && (
                    <p className="text-[11px] text-destructive">
                      Debe empezar con <span className="font-mono">{prefix}</span>
                    </p>
                  )}
                  {keyError && <p className="text-[11px] text-destructive">{keyError}</p>}
                </div>

                <button
                  type="button"
                  onClick={handleAINext}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Finalizar
                </button>
                <button
                  type="button"
                  onClick={() => finish(false)}
                  className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer text-center -mt-2"
                >
                  Hacerlo después
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
