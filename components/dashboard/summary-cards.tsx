"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown } from "lucide-react"

function fmtCompact(n: number): string {
  const sign = n < 0 ? "-" : ""
  return `${sign}$${Math.round(Math.abs(n)).toLocaleString("es-AR")}`
}

interface SummaryCardsProps {
  totalExpenses: number
  totalIncome: number
  balance: number
  formatCurrency: (n: number) => string
}

export function SummaryCards({
  totalExpenses,
  totalIncome,
}: SummaryCardsProps) {
  return (
    <motion.div
      className="grid grid-cols-2 gap-3 mb-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="rounded-2xl border border-border bg-card p-4 flex flex-col items-center text-center gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground">Ingresos</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-lg font-bold text-primary tabular-nums leading-tight">
            {fmtCompact(totalIncome)}
          </p>
          <span className="text-[10px] font-medium text-muted-foreground/60 tracking-widest uppercase">ARS</span>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 flex flex-col items-center text-center gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-destructive/10">
            <TrendingDown className="w-3.5 h-3.5 text-destructive" />
          </div>
          <span className="text-xs text-muted-foreground">Gastos</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-lg font-bold text-destructive tabular-nums leading-tight">
            {fmtCompact(totalExpenses)}
          </p>
          <span className="text-[10px] font-medium text-muted-foreground/60 tracking-widest uppercase">ARS</span>
        </div>
      </div>
    </motion.div>
  )
}
