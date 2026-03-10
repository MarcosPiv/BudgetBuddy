"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Wallet, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"

interface SummaryCardsProps {
  isExpensesOnly: boolean
  totalExpenses: number
  totalIncome: number
  balance: number
  spentPercent: number
  monthlyBudget: number
  formatCurrency: (n: number) => string
}

export function SummaryCards({
  isExpensesOnly,
  totalExpenses,
  totalIncome,
  balance,
  spentPercent,
  monthlyBudget,
  formatCurrency,
}: SummaryCardsProps) {
  if (isExpensesOnly) {
    return (
      <motion.div
        className="rounded-2xl border border-border bg-card p-4 mb-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Presupuesto mensual</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {formatCurrency(totalExpenses)} / {formatCurrency(monthlyBudget)}
          </span>
        </div>
        <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              spentPercent > 90
                ? "bg-destructive"
                : spentPercent > 70
                  ? "bg-chart-4"
                  : "bg-primary"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${spentPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {spentPercent.toFixed(0)}% usado
          </span>
          <span className={`text-xs font-medium ${balance >= 0 ? "text-primary" : "text-destructive"}`}>
            {balance >= 0
              ? `Te quedan ${formatCurrency(balance)}`
              : `Excediste ${formatCurrency(Math.abs(balance))}`}
          </span>
        </div>

        <AnimatePresence>
          {spentPercent >= 80 && spentPercent < 100 && (
            <motion.div
              className="mt-3 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Usaste el {spentPercent.toFixed(0)}% de tu presupuesto. ¡Atención!</span>
            </motion.div>
          )}
          {spentPercent >= 100 && (
            <motion.div
              className="mt-3 flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>¡Superaste tu presupuesto mensual! Revisá tus gastos.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="grid grid-cols-2 gap-3 mb-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground">Ingresos</span>
        </div>
        <p className="text-lg font-bold text-primary tabular-nums leading-tight">
          {formatCurrency(totalIncome)}
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-destructive/10">
            <TrendingDown className="w-3.5 h-3.5 text-destructive" />
          </div>
          <span className="text-xs text-muted-foreground">Gastos</span>
        </div>
        <p className="text-lg font-bold text-destructive tabular-nums leading-tight">
          {formatCurrency(totalExpenses)}
        </p>
      </div>
    </motion.div>
  )
}
