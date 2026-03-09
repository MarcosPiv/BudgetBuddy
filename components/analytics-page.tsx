"use client"

import { useMemo, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  BarChart2,
  RefreshCw,
  Repeat,
  ShoppingCart,
  Car,
  Coffee,
  Code,
  Dumbbell,
  ArrowDownLeft,
  Check,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { useApp } from "@/lib/app-context"
import type { Transaction } from "@/lib/app-context"

// ── Icon map ─────────────────────────────────────────────────────────────────
const iconMap: Record<string, React.ElementType> = {
  ShoppingCart,
  Car,
  Coffee,
  Code,
  Dumbbell,
  ArrowDownLeft,
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtArs(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString("es-AR")}`
}

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name === "ingresos" ? "Ingresos" : "Gastos"}:</span>
          <span className="font-medium text-foreground tabular-nums">{fmtArs(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AnalyticsPage() {
  const { setView, transactions, addTransaction, updateTransaction, usdRate } = useApp()
  const [applyingMonth, setApplyingMonth] = useState(false)
  const [appliedCount, setAppliedCount] = useState<number | null>(null)

  // Resolve CSS custom property colors for Recharts SVG strokes
  const [chartColors, setChartColors] = useState({ income: "#22c994", expense: "#e0633a" })
  useEffect(() => {
    const style = getComputedStyle(document.documentElement)
    const primary = style.getPropertyValue("--primary").trim()
    const destructive = style.getPropertyValue("--destructive").trim()
    if (primary) setChartColors(c => ({ ...c, income: primary }))
    if (destructive) setChartColors(c => ({ ...c, expense: destructive }))
  }, [])

  const toArs = (tx: Transaction) =>
    tx.currency === "USD" ? tx.amount * (tx.txRate ?? usdRate) : tx.amount

  // ── Recurring templates (deduplicated — latest transaction per description+category)
  const recurringTemplates = useMemo(() => {
    const map = new Map<string, Transaction>()
    transactions
      .filter(tx => tx.isRecurring)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach(tx => {
        const key = `${tx.description.toLowerCase()}::${tx.category}`
        if (!map.has(key)) map.set(key, tx)
      })
    return Array.from(map.values())
  }, [transactions])

  // ── Apply recurring: create this month's missing transactions
  const handleApplyMonth = () => {
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()

    const alreadyThisMonth = new Set(
      transactions
        .filter(tx => {
          const d = new Date(tx.date)
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear
        })
        .map(tx => `${tx.description.toLowerCase()}::${tx.category}`)
    )

    const toCreate = recurringTemplates.filter(
      tpl => !alreadyThisMonth.has(`${tpl.description.toLowerCase()}::${tpl.category}`)
    )

    setApplyingMonth(true)
    toCreate.forEach(tpl => {
      addTransaction({
        description: tpl.description,
        amount: tpl.amount,
        type: tpl.type,
        icon: tpl.icon,
        category: tpl.category,
        date: now,
        observation: tpl.observation,
        currency: tpl.currency,
        amountUsd: tpl.amountUsd,
        txRate: tpl.txRate,
        exchangeRateType: tpl.exchangeRateType,
        isRecurring: true,
      })
    })
    setApplyingMonth(false)
    setAppliedCount(toCreate.length)
    setTimeout(() => setAppliedCount(null), 4000)
  }

  // ── Monthly trend — last 12 calendar months (always uses all transactions)
  const trendData = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      const month = d.getMonth()
      const year = d.getFullYear()
      const monthTxs = transactions.filter(tx => {
        const td = new Date(tx.date)
        return td.getMonth() === month && td.getFullYear() === year
      })
      const gastos = monthTxs
        .filter(tx => tx.type === "expense")
        .reduce((a, tx) => a + toArs(tx), 0)
      const ingresos = monthTxs
        .filter(tx => tx.type === "income")
        .reduce((a, tx) => a + toArs(tx), 0)
      return {
        label: MONTH_LABELS[month],
        gastos: Math.round(gastos),
        ingresos: Math.round(ingresos),
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, usdRate])

  const hasData = trendData.some(d => d.gastos > 0 || d.ingresos > 0)

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalRecurringArs = recurringTemplates
    .filter(t => t.type === "expense")
    .reduce((a, t) => a + toArs(t), 0)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 sm:px-6 border-b border-border bg-background/90 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setView("dashboard")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Dashboard</span>
        </button>
        <div className="flex items-center gap-2 ml-1">
          <BarChart2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Analítica</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 sm:px-6 max-w-3xl mx-auto w-full pb-16 flex flex-col gap-4">

        {/* ── Monthly Trend Chart ──────────────────────────────────── */}
        <motion.div
          className="rounded-2xl border border-border bg-card p-4"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Tendencia — últimos 12 meses
          </p>

          {hasData ? (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtArs}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={54}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={7}
                  formatter={(value) => (
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                      {value === "gastos" ? "Gastos" : "Ingresos"}
                    </span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="ingresos"
                  stroke={chartColors.income}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: chartColors.income }}
                />
                <Line
                  type="monotone"
                  dataKey="gastos"
                  stroke={chartColors.expense}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: chartColors.expense }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[210px] flex items-center justify-center text-sm text-muted-foreground">
              Todavía no hay suficientes datos para mostrar la tendencia.
            </div>
          )}
        </motion.div>

        {/* ── Recurring Transactions ───────────────────────────────── */}
        <motion.div
          className="rounded-2xl border border-border bg-card overflow-hidden"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
        >
          {/* Section header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Fijos mensuales
                {recurringTemplates.length > 0 && (
                  <span className="ml-1.5 text-foreground">({recurringTemplates.length})</span>
                )}
              </p>
            </div>
            {recurringTemplates.length > 0 && (
              <button
                type="button"
                onClick={handleApplyMonth}
                disabled={applyingMonth}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${applyingMonth ? "animate-spin" : ""}`} />
                Aplicar este mes
              </button>
            )}
          </div>

          {/* Feedback banner */}
          <AnimatePresence>
            {appliedCount !== null && (
              <motion.div
                className="flex items-center gap-2 px-4 py-2.5 text-xs border-b border-primary/20 bg-primary/10 text-primary"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Check className="w-3.5 h-3.5 shrink-0" />
                {appliedCount > 0
                  ? `Se crearon ${appliedCount} transacción${appliedCount > 1 ? "es" : ""} este mes.`
                  : "Todos los fijos ya están registrados este mes."}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Summary row when there are templates */}
          {recurringTemplates.length > 0 && totalRecurringArs > 0 && (
            <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total gastos fijos/mes</span>
              <span className="text-xs font-semibold text-destructive tabular-nums">
                −{fmtArs(totalRecurringArs)} ARS
              </span>
            </div>
          )}

          {/* Template list */}
          {recurringTemplates.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Repeat className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No hay transacciones fijas todavía.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Editá un movimiento en el Dashboard y activá &quot;Fijo mensual&quot;.
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {recurringTemplates.map(tpl => {
                const Icon = iconMap[tpl.icon] || ShoppingCart
                const isIncome = tpl.type === "income"
                return (
                  <div key={tpl.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div
                      className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
                        isIncome ? "bg-primary/10" : "bg-secondary"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isIncome ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tpl.description}</p>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-secondary text-muted-foreground mt-0.5">
                        {tpl.category}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          isIncome ? "text-primary" : "text-destructive"
                        }`}
                      >
                        {isIncome ? "+" : "−"}${tpl.amount.toLocaleString("es-AR")} {tpl.currency}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateTransaction(tpl.id, { isRecurring: false })}
                        className="text-[10px] text-muted-foreground/50 hover:text-destructive transition-colors cursor-pointer"
                      >
                        Quitar fijo
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
