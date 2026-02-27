"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Brain,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  Wallet,
  DollarSign,
  Briefcase,
  ReceiptText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApp, type ProfileMode } from "@/lib/app-context"

export function SettingsPage() {
  const {
    setView,
    apiKey,
    setApiKey,
    monthlyBudget,
    setMonthlyBudget,
    profileMode,
    setProfileMode,
    usdRate,
    setUsdRate,
  } = useApp()
  const [showKey, setShowKey] = useState(false)
  const [localKey, setLocalKey] = useState(apiKey)
  const [localBudget, setLocalBudget] = useState(monthlyBudget.toString())
  const [localMode, setLocalMode] = useState<ProfileMode>(profileMode)
  const [localUsdRate, setLocalUsdRate] = useState(usdRate.toString())

  const handleSave = () => {
    setApiKey(localKey)
    const budget = parseInt(localBudget) || 200000
    setMonthlyBudget(budget)
    setProfileMode(localMode)
    const rate = parseFloat(localUsdRate) || 1350
    setUsdRate(rate)
    setView("dashboard")
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
            {localMode === "expenses_only" && (
              <motion.div
                className="flex flex-col gap-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
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

            {/* USD Exchange Rate */}
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="usdRate"
                className="text-sm text-muted-foreground flex items-center gap-2"
              >
                <DollarSign className="w-3.5 h-3.5" />
                Tipo de cambio USD (manual)
              </Label>
              <Input
                id="usdRate"
                type="number"
                placeholder="1350"
                value={localUsdRate}
                onChange={(e) => setLocalUsdRate(e.target.value)}
                className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11 tabular-nums font-mono"
              />
              <p className="text-xs text-muted-foreground">
                1 USD = {localUsdRate || "..."} ARS. Luego se conectara a una
                API en tiempo real.
              </p>
            </div>

            {/* API Key Input */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="apiKey" className="text-sm text-muted-foreground">
                API Key (Claude / OpenAI)
              </Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showKey ? "text" : "password"}
                  placeholder="sk-..."
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  className="pr-10 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showKey ? "Ocultar clave" : "Mostrar clave"}
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
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
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 font-semibold rounded-xl mt-2 cursor-pointer"
              onClick={handleSave}
            >
              Guardar y Continuar
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
