"use client"

import { motion } from "framer-motion"
import { Sparkles, Mic, Brain, BarChart3, ArrowRight, Wallet } from "lucide-react"
import { useApp } from "@/lib/app-context"

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground tracking-tight">BudgetBuddy</span>
        </div>
        <button
          className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          onClick={() => setView("auth")}
        >
          Iniciar sesion
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-16 min-h-[60vh]">
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
          className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl text-pretty leading-relaxed"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          Olvidate de los formularios aburridos. Cuentale a BudgetBuddy que
          gastaste y la IA hace el resto.
        </motion.p>

        <motion.div
          className="mt-10"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          <button
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold text-base px-10 py-4 rounded-full cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:scale-[1.03]"
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
        </motion.div>
      </main>

      {/* How it works */}
      <section className="px-6 pb-20 lg:px-12">
        <motion.p
          className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Como funciona
        </motion.p>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 — wide (2/3) */}
          <motion.div
            className="md:col-span-2 flex flex-col rounded-2xl border border-border bg-card p-6 gap-4 cursor-default"
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
            className="flex flex-col rounded-2xl border border-border bg-card p-6 gap-4 cursor-default"
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
            className="md:col-span-3 flex flex-col sm:flex-row gap-6 rounded-2xl border border-border bg-card p-6 cursor-default"
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
