"use client"

import { useEffect, useRef } from "react"
import { useApp } from "@/lib/app-context"
import { useNotifications } from "@/hooks/use-notifications"

const K = {
  daily:         "bb_notif_daily",
  dailyTime:     "bb_notif_daily_time",
  budget:        "bb_notif_budget",
  recurring:     "bb_notif_recurring",
  weekly:        "bb_notif_weekly",
  lastDaily:     "bb_notif_last_daily",
  budgetMonth:   "bb_notif_budget_month",
  recurringMonth:"bb_notif_recurring_month",
  weeklyKey:     "bb_notif_weekly_key",
}

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${week}`
}

function fmtArsShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n)}`
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

  // ── Weekly summary (fires every Monday with last week's spending) ─────────────
  useEffect(() => {
    if (ls(K.weekly) !== "true") return

    const now = new Date()
    if (now.getDay() !== 1) return // Only on Mondays

    const weekKey = isoWeekKey(now)
    if (ls(K.weeklyKey) === weekKey) return

    // Last week: Mon 00:00 → Sun 23:59:59
    const lastMonday = new Date(now)
    lastMonday.setDate(now.getDate() - 7)
    lastMonday.setHours(0, 0, 0, 0)
    const lastSunday = new Date(now)
    lastSunday.setDate(now.getDate() - 1)
    lastSunday.setHours(23, 59, 59, 999)

    const lastWeekTxs = transactions.filter(tx => {
      const d = new Date(tx.date)
      return d >= lastMonday && d <= lastSunday
    })

    const totalExp = lastWeekTxs
      .filter(tx => tx.type === "expense")
      .reduce((a, tx) => a + toArs(tx), 0)

    if (totalExp <= 0) return

    const catMap: Record<string, number> = {}
    lastWeekTxs.filter(tx => tx.type === "expense").forEach(tx => {
      catMap[tx.category] = (catMap[tx.category] || 0) + toArs(tx)
    })
    const top3 = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat)

    localStorage.setItem(K.weeklyKey, weekKey)
    showNotification(
      "Resumen semanal 📊",
      `La semana pasada gastaste ${fmtArsShort(totalExp)}${top3.length ? `. Top: ${top3.join(", ")}` : "."}`
      , "weekly-summary"
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions])

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
