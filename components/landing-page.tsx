"use client"

import { useState, useEffect } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { useRef } from "react"
import {
  Sparkles, Mic, Brain, BarChart3, ArrowRight, Wallet,
  Download, Smartphone, DollarSign, Camera, MessageCircle,
  ShieldCheck, Repeat, Github, TrendingUp, Zap,
} from "lucide-react"
import { useApp } from "@/lib/app-context"

// ── Animation variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.13, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

// ── Illustrations ─────────────────────────────────────────────────────────────
const CHAT_MESSAGES = [
  { side: "user", text: "Pagué $12.000 en el super" },
  { side: "bot",  text: "✓ Comida — $12.000 ARS registrado" },
  { side: "user", text: "Gasté 20 dólares en Netflix" },
  { side: "bot",  text: "✓ Suscripciones — USD 20 registrado" },
]

function ChatIllustration() {
  const [visible, setVisible] = useState(1)
  useEffect(() => {
    if (visible >= CHAT_MESSAGES.length) return
    const t = setTimeout(() => setVisible(v => v + 1), 900)
    return () => clearTimeout(t)
  }, [visible])

  return (
    <div className="flex flex-col gap-2 py-1 w-full min-h-[80px]">
      <AnimatePresence>
        {CHAT_MESSAGES.slice(0, visible).map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`text-xs px-3 py-1.5 rounded-2xl max-w-[88%] ${
              m.side === "user"
                ? "self-end bg-primary/15 border border-primary/20 text-primary rounded-tr-sm"
                : "self-start bg-secondary text-foreground rounded-tl-sm"
            }`}
          >
            {m.side === "bot" && <Sparkles className="inline w-3 h-3 text-accent mr-1 shrink-0" />}
            {m.text}
          </motion.div>
        ))}
      </AnimatePresence>
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
      {cats.map((c, i) => (
        <motion.span
          key={c.label}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.07, duration: 0.35 }}
          className={`${c.cls} rounded-full px-2.5 py-1 text-xs font-medium`}
        >
          {c.label}
        </motion.span>
      ))}
    </div>
  )
}

function ChartIllustration() {
  const bars = [40, 70, 30, 85, 50, 65, 35, 90, 55, 75, 45, 80]
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  return (
    <div ref={ref} className="flex items-end gap-1 h-16 w-full">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-t-sm"
          initial={{ height: 0 }}
          animate={inView ? { height: `${h}%` } : { height: 0 }}
          transition={{ delay: i * 0.04, duration: 0.5, ease: "easeOut" }}
          style={{ background: `oklch(0.72 0.19 160 / ${0.18 + (i / bars.length) * 0.7})` }}
        />
      ))}
    </div>
  )
}

// ── Features data ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: DollarSign,
    title: "Multimoneda ARS / USD",
    desc: "Cotización en vivo Blue, Oficial, Tarjeta y MEP. La tasa queda bloqueada al momento del gasto.",
    color: "text-primary bg-primary/10",
  },
  {
    icon: Camera,
    title: "Foto de ticket",
    desc: "Sacale una foto a la factura y la IA extrae el monto y el tipo de establecimiento automáticamente.",
    color: "text-accent bg-accent/10",
  },
  {
    icon: MessageCircle,
    title: "Chat financiero IA",
    desc: "Preguntale a tu asistente en qué estás gastando más, cómo ahorrar, o cualquier consulta de finanzas.",
    color: "text-yellow-400 bg-yellow-400/10",
  },
  {
    icon: Repeat,
    title: "Gastos fijos",
    desc: "Marcá alquiler, suscripciones o cuotas como recurrentes y aplicalos todos en un clic cada mes.",
    color: "text-sky-400 bg-sky-400/10",
  },
  {
    icon: ShieldCheck,
    title: "Datos seguros",
    desc: "Todo sincronizado en Supabase con cifrado en reposo. Tus datos siempre disponibles en cualquier dispositivo.",
    color: "text-destructive bg-destructive/10",
  },
  {
    icon: TrendingUp,
    title: "Tendencia mensual",
    desc: "Gráfico de ingresos vs gastos de los últimos 12 meses. Detectá patrones y meses atípicos al instante.",
    color: "text-primary bg-primary/10",
  },
]

// ── Main component ────────────────────────────────────────────────────────────
export function LandingPage() {
  const { setView } = useApp()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) setIsInstalled(true)
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e as BeforeInstallPromptEvent) }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === "accepted") { setInstallPrompt(null); setIsInstalled(true) }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-4 lg:px-12 relative z-10">
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
            Iniciar sesión
          </button>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <main className="relative flex flex-col items-center justify-center px-5 text-center py-16 md:py-24 overflow-hidden">
        {/* Animated background orbs */}
        <motion.div
          className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/8 blur-[120px]"
          animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute top-1/2 -left-32 w-[300px] h-[300px] rounded-full bg-accent/6 blur-[100px]"
          animate={{ y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute top-1/3 -right-20 w-[250px] h-[250px] rounded-full bg-primary/6 blur-[90px]"
          animate={{ y: [0, 30, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        {/* Badge */}
        <motion.div
          className="flex items-center gap-2 mb-6 rounded-full border border-border bg-secondary/50 px-4 py-1.5 relative z-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Zap className="w-4 h-4 text-accent" />
          <span className="text-sm text-muted-foreground">Potenciado por Inteligencia Artificial</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground max-w-4xl text-balance leading-[1.1] relative z-10"
          variants={fadeUp}
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
          className="mt-5 text-base md:text-xl text-muted-foreground max-w-2xl text-pretty leading-relaxed px-2 relative z-10"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          Olvidate de los formularios aburridos. Contale a BudgetBuddy lo que
          gastaste — en texto, foto o audio — y la IA hace el resto. Diseñado para la economía argentina.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="mt-8 flex flex-col sm:flex-row items-center gap-3 relative z-10"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          <button
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold text-base px-10 py-4 rounded-full cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:scale-[1.03] w-full sm:w-auto justify-center"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 35px oklch(0.72 0.19 160 / 0.55)" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "" }}
            onClick={() => setView("auth")}
          >
            Empezar gratis
            <ArrowRight className="w-5 h-5" />
          </button>

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

        {!installPrompt && !isInstalled && (
          <motion.p
            className="mt-4 text-xs text-muted-foreground/50 relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            En iPhone: Compartir → Agregar a pantalla de inicio
          </motion.p>
        )}

        {/* Floating stat chips */}
        <motion.div
          className="mt-12 flex flex-wrap justify-center gap-3 relative z-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          {[
            { icon: Mic, label: "Voz, texto o foto" },
            { icon: DollarSign, label: "ARS y USD" },
            { icon: ShieldCheck, label: "Datos encriptados" },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 border border-border/60 rounded-full px-3 py-1.5">
              <Icon className="w-3.5 h-3.5 text-primary" />
              {label}
            </span>
          ))}
        </motion.div>
      </main>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="px-5 pb-16 lg:px-12">
        <motion.p
          className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Cómo funciona
        </motion.p>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3">
          <motion.div
            className="md:col-span-2 flex flex-col rounded-2xl border border-border bg-card p-5 gap-4 cursor-default"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4, boxShadow: "0 20px 40px oklch(0 0 0 / 0.3), 0 0 0 1px oklch(0.72 0.19 160 / 0.3)" }}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary self-start">
              <Mic className="w-5 h-5 text-primary" />
            </div>
            <ChatIllustration />
            <div>
              <p className="text-foreground font-semibold">Hablá o escribí</p>
              <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                Contale a BudgetBuddy lo que gastaste como si le mandaras un mensaje.
              </p>
            </div>
          </motion.div>

          <motion.div
            className="flex flex-col rounded-2xl border border-border bg-card p-5 gap-4 cursor-default"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4, boxShadow: "0 20px 40px oklch(0 0 0 / 0.3), 0 0 0 1px oklch(0.72 0.19 160 / 0.3)" }}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary self-start">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <CategoriesIllustration />
            <div>
              <p className="text-foreground font-semibold">La IA clasifica</p>
              <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                Categoriza y organiza todo automáticamente.
              </p>
            </div>
          </motion.div>

          <motion.div
            className="md:col-span-3 flex flex-col sm:flex-row gap-6 rounded-2xl border border-border bg-card p-5 cursor-default"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4, boxShadow: "0 20px 40px oklch(0 0 0 / 0.3), 0 0 0 1px oklch(0.72 0.19 160 / 0.3)" }}
          >
            <div className="flex flex-col gap-3 sm:w-52 shrink-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary self-start">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-semibold">Visualizá tus datos</p>
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                  Gráficos claros y alertas inteligentes al instante.
                </p>
              </div>
            </div>
            <div className="flex-1 flex items-end min-h-[64px]">
              <ChartIllustration />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────────────── */}
      <section className="px-5 pb-20 lg:px-12">
        <motion.p
          className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Características
        </motion.p>
        <motion.p
          className="text-center text-2xl md:text-3xl font-bold text-foreground mb-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          Todo lo que necesitás en un solo lugar
        </motion.p>

        <motion.div
          className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3 cursor-default"
              whileHover={{ y: -3, boxShadow: "0 12px 32px oklch(0 0 0 / 0.25)" }}
              transition={{ duration: 0.25 }}
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-xl self-start ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-foreground font-semibold text-sm">{title}</p>
                <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="px-5 pb-20 lg:px-12">
        <motion.div
          className="max-w-2xl mx-auto rounded-2xl border border-primary/20 bg-primary/5 p-10 flex flex-col items-center text-center gap-5 relative overflow-hidden"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="pointer-events-none absolute inset-0 bg-primary/4 blur-3xl"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <div className="relative z-10 flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15">
            <Wallet className="w-7 h-7 text-primary" />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
              ¿Listo para tomar control<br className="hidden sm:block" /> de tus finanzas?
            </h2>
            <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
              Gratis, sin tarjeta de crédito. Empezá en segundos.
            </p>
          </div>
          <button
            className="relative z-10 inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold text-base px-10 py-4 rounded-full cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:scale-[1.03]"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 35px oklch(0.72 0.19 160 / 0.55)" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "" }}
            onClick={() => setView("auth")}
          >
            Crear cuenta gratis
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border/50 px-5 py-6 lg:px-12">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary shrink-0">
              <Wallet className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">BudgetBuddy</span>
          </div>
          <a
            href="https://github.com/MarcosPiv"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
          >
            Desarrollado por
            <span className="font-medium text-foreground group-hover:text-primary transition-colors">Marcos Pividori</span>
            <Github className="w-3.5 h-3.5" />
          </a>
        </div>
      </footer>

    </div>
  )
}
