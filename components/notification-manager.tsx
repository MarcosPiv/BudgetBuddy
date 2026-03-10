"use client"

import { useEffect, useRef } from "react"
import { useApp } from "@/lib/app-context"
import { useNotifications } from "@/hooks/use-notifications"

const K = {
  daily:         "bb_notif_daily",
  dailyTime:     "bb_notif_daily_time",
  budget:        "bb_notif_budget",
  recurring:     "bb_notif_recurring",
  lastDaily:     "bb_notif_last_daily",
  budgetMonth:   "bb_notif_budget_month",
  recurringMonth:"bb_notif_recurring_month",
}

function ls(key: string) {
  return typeof window !== "undefined" ? localStorage.getItem(key) : null
}

export function NotificationManager() {
  const { transactions, monthlyBudget, usdRate } = useApp()
  const { showNotification } = useNotifications()
  const dailyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toArs = (tx: { amount: number; currency: "ARS" | "USD"; txRate?: number }) =>
    tx.currency === "USD" ? tx.amount * (tx.txRate ?? usdRate) : tx.amount

  // ── Daily reminder ────────────────────────────────────────────────────────
  useEffect(() => {
    if (ls(K.daily) !== "true") return

    const schedule = () => {
      const [h, m] = (ls(K.dailyTime) ?? "20:00").split(":").map(Number)
      const now = new Date()
      const target = new Date(now)
      target.setHours(h, m, 0, 0)
      if (target <= now) target.setDate(target.getDate() + 1)

      dailyTimerRef.current = setTimeout(async () => {
        const today = new Date().toDateString()
        if (ls(K.lastDaily) !== today) {
          localStorage.setItem(K.lastDaily, today)
          await showNotification(
            "BudgetBuddy 💰",
            "¿Registraste todos tus gastos de hoy?",
            "daily-reminder"
          )
        }
        schedule()
      }, target.getTime() - new Date().getTime())
    }

    schedule()
    return () => { if (dailyTimerRef.current) clearTimeout(dailyTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Budget alert (fires when ≥90 % of monthly budget is used) ─────────────
  useEffect(() => {
    if (ls(K.budget) !== "true" || monthlyBudget <= 0) return

    const now = new Date()
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`
    if (ls(K.budgetMonth) === monthKey) return

    const monthTxs = transactions.filter(tx => {
      const d = new Date(tx.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })

    const total = monthTxs
      .filter(tx => tx.type === "expense")
      .reduce((a, tx) => a + toArs(tx), 0)

    if (total >= monthlyBudget * 0.9) {
      const pct = Math.round((total / monthlyBudget) * 100)
      localStorage.setItem(K.budgetMonth, monthKey)
      showNotification(
        "Alerta de presupuesto ⚠️",
        `Usaste el ${pct}% de tu presupuesto mensual.`,
        "budget-alert"
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, monthlyBudget])

  // ── Recurring reminder (fires on the 1st of each month) ───────────────────
  useEffect(() => {
    if (ls(K.recurring) !== "true") return

    const now = new Date()
    if (now.getDate() !== 1) return

    const monthKey = `${now.getFullYear()}-${now.getMonth()}`
    if (ls(K.recurringMonth) === monthKey) return

    const hasRecurring = transactions.some(tx => tx.isRecurring)
    if (hasRecurring) {
      localStorage.setItem(K.recurringMonth, monthKey)
      showNotification(
        "Fijos mensuales 🔄",
        "Es el 1° del mes. Recordá aplicar tus gastos fijos en Analítica.",
        "recurring-reminder"
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions])

  return null
}
