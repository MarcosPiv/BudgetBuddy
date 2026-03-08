"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Sparkles, Mic, Brain, BarChart3, ArrowRight, Wallet, Download, Smartphone } from "lucide-react"
import { useApp } from "@/lib/app-context"

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function ChatIllustration() {
  return (
    <div className="flex flex-col gap-2 py-1 w-full">
      <div className="self-end bg-primary/15 border border-primary/20 rounded-2xl rounded-tr-sm px-3 py-1.5 text-xs text-primary max-w-[88%]">
        Pague $12.000 en el super
      </div>
      <div className="self-start bg-secondary rounded-2xl rounded-tl-sm px-3 py-1.5 text-xs flex items-center gap-1.5 text-foreground max-w-[88%]">
        <Sparkles className="w-3 h-3 text-accent shrink-0" />
        Registrado automaticamente
      </div>
      <div className="self-end bg-primary/15 border border-primary/20 rounded-2xl rounded-tr-sm px-3 py-1.5 text-xs text-primary max-w-[88%]">
        Gaste 20 dolares en Netflix
      </div>
    </div>
  )
}

function CategoriesIllustration() {
  const cats = [
    { label: "Comida", cls: "text-primary bg-primary/15" },
    { label: "Transporte", cls: "text-accent bg-accent/15" },
    { label: "Salidas", cls: "text-yellow-400 bg-yellow-400/15" },
    { label: "Salud", cls: "text-destructive bg-destructive/15" },
    { label: "Ocio", cls: "text-sky-400 bg-sky-400/15" },
    { label: "Trabajo", cls: "text-primary bg-primary/10" },
  ]
  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {cats.map((c) => (
        <span key={c.label} className={`${c.cls} rounded-full px-2.5 py-1 text-xs font-medium`}>
          {c.label}
        </span>
      ))}
    </div>
  )
}

function ChartIllustration() {
  const bars = [40, 70, 30, 85, 50, 65, 35, 90, 55, 75, 45, 80]
  return (
    <div className="flex items-end gap-1 h-16 w-full">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm"
          style={{
            height: `${h}%`,
            background: `oklch(0.72 0.19 160 / ${0.18 + (i / bars.length) * 0.7})`,
          }}
        />
      ))}
    </div>
  )
}

export function LandingPage() {
  const { setView } = useApp()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === "accepted") {
      setInstallPrompt(null)
      setIsInstalled(true)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-5 py-4 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary shrink-0">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground tracking-tight">BudgetBuddy</span>
        </div>
        <div className="flex items-center gap-3">
          {installPrompt && !isInstalled && (
            <motion.button
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground border border-border/60 rounded-full px-3 py-1.5 hover:text-foreground hover:border-border transition-colors cursor-pointer"
              onClick={handleInstall}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
            >
              <Download className="w-3 h-3" />
              Instalar
            </motion.button>
          )}
          <button
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            onClick={() => setView("auth")}
          >
            Iniciar sesion
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 text-center py-12 min-h-[55vh]">
        <motion.div
          className="flex items-center gap-2 mb-6 rounded-full border border-border bg-secondary/50 px-4 py-1.5"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm text-muted-foreground">Potenciado por Inteligencia Artificial</span>
        </motion.div>

        <motion.h1
          className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground max-w-4xl text-balance leading-[1.1]"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          Tus finanzas, a la{" "}
          <span
            className="text-primary"
            style={{ textShadow: "0 0 50px oklch(0.72 0.19 160 / 0.65), 0 0 100px oklch(0.72 0.19 160 / 0.3)" }}
          >
            velocidad del chat
          </span>
        </motion.h1>

        <motion.p
          className="mt-5 text-base md:text-xl text-muted-foreground max-w-2xl text-pretty leading-relaxed px-2"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          Olvidate de los formularios aburridos. Cuentale a BudgetBuddy que
          gastaste y la IA hace el resto.
        </motion.p>

        <motion.div
          className="mt-8 flex flex-col sm:flex-row items-center gap-3"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          <button
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold text-base px-10 py-4 rounded-full cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:scale-[1.03] w-full sm:w-auto justify-center"
            style={{ boxShadow: "0 0 0 0 oklch(0.72 0.19 160 / 0)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 35px oklch(0.72 0.19 160 / 0.55)"
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 0 oklch(0.72 0.19 160 / 0)"
            }}
            onClick={() => setView("auth")}
          >
            Empezar gratis
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Mobile install button */}
          {installPrompt && !isInstalled && (
            <motion.button
              className="sm:hidden inline-flex items-center gap-2 border border-border/60 text-muted-foreground font-medium text-sm px-6 py-3.5 rounded-full cursor-pointer transition-colors hover:text-foreground hover:border-border w-full justify-center"
              onClick={handleInstall}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Smartphone className="w-4 h-4" />
              Instalar como app
            </motion.button>
          )}
        </motion.div>

        {/* iOS install hint */}
        {!installPrompt && !isInstalled && (
          <motion.p
            className="mt-4 text-xs text-muted-foreground/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            En iPhone: Compartir → Agregar a pantalla de inicio
          </motion.p>
        )}
      </main>

      {/* How it works */}
      <section className="px-5 pb-16 lg:px-12">
        <motion.p
          className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Como funciona
        </motion.p>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Step 1 — wide (2/3) */}
          <motion.div
            className="md:col-span-2 flex flex-col rounded-2xl border border-border bg-card p-5 gap-4 cursor-default"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{
              y: -5,
              boxShadow: "0 20px 40px oklch(0 0 0 / 0.3), 0 0 0 1px oklch(0.72 0.19 160 / 0.3)",
            }}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary self-start">
              <Mic className="w-5 h-5 text-primary" />
            </div>
            <ChatIllustration />
            <div>
              <p className="text-foreground font-semibold">Habla o escribe</p>
              <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                Dile a BudgetBuddy lo que gastaste, como en un chat.
              </p>
            </div>
          </motion.div>

          {/* Step 2 — narrow (1/3) */}
          <motion.div
            className="flex flex-col rounded-2xl border border-border bg-card p-5 gap-4 cursor-default"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{
              y: -5,
              boxShadow: "0 20px 40px oklch(0 0 0 / 0.3), 0 0 0 1px oklch(0.72 0.19 160 / 0.3)",
            }}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary self-start">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <CategoriesIllustration />
            <div>
              <p className="text-foreground font-semibold">La IA clasifica</p>
              <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                Categoriza y organiza todo automaticamente.
              </p>
            </div>
          </motion.div>

          {/* Step 3 — full width */}
          <motion.div
            className="md:col-span-3 flex flex-col sm:flex-row gap-6 rounded-2xl border border-border bg-card p-5 cursor-default"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{
              y: -5,
              boxShadow: "0 20px 40px oklch(0 0 0 / 0.3), 0 0 0 1px oklch(0.72 0.19 160 / 0.3)",
            }}
          >
            <div className="flex flex-col gap-3 sm:w-52 shrink-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary self-start">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-semibold">Visualiza tus datos</p>
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                  Graficos claros y alertas inteligentes al instante.
                </p>
              </div>
            </div>
            <div className="flex-1 flex items-end min-h-[64px]">
              <ChartIllustration />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
