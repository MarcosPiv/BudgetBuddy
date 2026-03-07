"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { type User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

export type View = "landing" | "auth" | "settings" | "dashboard" | "profile"
export type ProfileMode = "standard" | "expenses_only"
export type TimeFilter = "week" | "month" | "year" | "custom"
export type ExchangeRateMode = "api" | "manual"
export type ExchangeRateType = "BLUE" | "TARJETA" | "OFICIAL" | "MEP" | "MANUAL"

export interface Transaction {
  id: string
  description: string
  amount: number
  type: "income" | "expense"
  icon: string
  category: string
  date: Date
  observation?: string
  currency: "ARS" | "USD"
  amountUsd?: number
  /** Tasa ARS bloqueada al momento del gasto — inmutable */
  txRate?: number
  exchangeRateType?: ExchangeRateType | null
}

// ─── DB row → Transaction ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTransaction(row: any): Transaction {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    type: row.type,
    icon: row.icon || "ShoppingCart",
    category: row.category,
    date: new Date(row.date),
    observation: row.observation ?? undefined,
    currency: row.currency,
    amountUsd: row.amount_usd != null ? Number(row.amount_usd) : undefined,
    txRate: row.tx_rate != null ? Number(row.tx_rate) : undefined,
    exchangeRateType: row.exchange_rate_type ?? null,
  }
}

interface AppState {
  // Auth
  user: User | null
  loadingAuth: boolean
  signOut: () => Promise<void>
  // Navigation
  currentView: View
  setView: (view: View) => void
  // Transactions
  transactions: Transaction[]
  addTransaction: (t: Omit<Transaction, "id">) => void
  deleteTransaction: (id: string) => void
  // UI
  isProcessing: boolean
  setIsProcessing: (v: boolean) => void
  // Profile
  apiKey: string
  setApiKey: (key: string) => void
  userName: string
  setUserName: (name: string) => void
  monthlyBudget: number
  setMonthlyBudget: (n: number) => void
  profileMode: ProfileMode
  setProfileMode: (mode: ProfileMode) => void
  usdRate: number
  setUsdRate: (n: number) => void
  exchangeRateMode: ExchangeRateMode
  setExchangeRateMode: (mode: ExchangeRateMode) => void
  saveProfile: (overrides?: {
    userName?: string
    monthlyBudget?: number
    profileMode?: ProfileMode
    usdRate?: number
    exchangeRateMode?: ExchangeRateMode
    apiKey?: string
  }) => Promise<void>
  // Filters
  timeFilter: TimeFilter
  setTimeFilter: (f: TimeFilter) => void
  customRange: { from: Date; to: Date }
  setCustomRange: (r: { from: Date; to: Date }) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [currentView, setView] = useState<View>("landing")

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const [apiKey, setApiKey] = useState("")
  const [userName, setUserName] = useState("Usuario")
  const [monthlyBudget, setMonthlyBudget] = useState(200000)
  const [profileMode, setProfileMode] = useState<ProfileMode>("standard")
  const [usdRate, setUsdRate] = useState(1350)
  const [exchangeRateMode, setExchangeRateMode] = useState<ExchangeRateMode>("api")

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month")
  const now = new Date()
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date }>({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: now,
  })

  // ── Data loaders ────────────────────────────────────────────────────────────
  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (data) {
      setUserName(data.user_name ?? "Usuario")
      setMonthlyBudget(data.monthly_budget ?? 200000)
      setProfileMode(data.profile_mode ?? "standard")
      setExchangeRateMode(data.exchange_rate_mode ?? "api")
      setUsdRate(data.usd_rate ?? 1350)
      setApiKey(data.api_key ?? "")
    }
  }

  const loadTransactions = async (userId: string) => {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })

    if (data) {
      setTransactions(data.map(mapTransaction))
    }
  }

  // ── Auth listener ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        Promise.all([loadProfile(u.id), loadTransactions(u.id)]).finally(() => {
          setView("dashboard")
          setLoadingAuth(false)
        })
      } else {
        setLoadingAuth(false)
      }
    })

    // Subscribe to future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        Promise.all([loadProfile(u.id), loadTransactions(u.id)]).then(() => {
          setView("dashboard")
        })
      } else {
        setTransactions([])
        setUserName("Usuario")
        setApiKey("")
        setView("landing")
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auth actions ─────────────────────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut()
    // State cleanup handled by onAuthStateChange
  }

  // ── Transaction actions ──────────────────────────────────────────────────────
  const addTransaction = (t: Omit<Transaction, "id">) => {
    if (!user) return

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    setTransactions((prev) => [{ ...t, id: tempId }, ...prev])

    supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        description: t.description,
        amount: t.amount,
        type: t.type,
        icon: t.icon,
        category: t.category,
        date: t.date instanceof Date ? t.date.toISOString() : t.date,
        observation: t.observation ?? null,
        currency: t.currency,
        amount_usd: t.amountUsd ?? null,
        tx_rate: t.txRate ?? null,
        exchange_rate_type: t.exchangeRateType ?? null,
      })
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) {
          // Rollback on failure
          setTransactions((prev) => prev.filter((tx) => tx.id !== tempId))
          return
        }
        if (data) {
          setTransactions((prev) =>
            prev.map((tx) => (tx.id === tempId ? mapTransaction(data) : tx))
          )
        }
      })
  }

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id))
    supabase.from("transactions").delete().eq("id", id)
  }

  // ── Profile sync ─────────────────────────────────────────────────────────────
  // Accepts optional overrides to avoid stale-closure issues when callers
  // call React setters and saveProfile in the same synchronous block.
  const saveProfile = async (overrides?: {
    userName?: string
    monthlyBudget?: number
    profileMode?: ProfileMode
    usdRate?: number
    exchangeRateMode?: ExchangeRateMode
    apiKey?: string
  }) => {
    if (!user) return
    await supabase.from("profiles").upsert({
      id: user.id,
      user_name: overrides?.userName ?? userName,
      monthly_budget: overrides?.monthlyBudget ?? monthlyBudget,
      profile_mode: overrides?.profileMode ?? profileMode,
      exchange_rate_mode: overrides?.exchangeRateMode ?? exchangeRateMode,
      usd_rate: overrides?.usdRate ?? usdRate,
      api_key: overrides?.apiKey ?? apiKey,
      updated_at: new Date().toISOString(),
    })
  }

  return (
    <AppContext.Provider
      value={{
        user,
        loadingAuth,
        signOut,
        currentView,
        setView,
        transactions,
        addTransaction,
        deleteTransaction,
        isProcessing,
        setIsProcessing,
        apiKey,
        setApiKey,
        userName,
        setUserName,
        monthlyBudget,
        setMonthlyBudget,
        profileMode,
        setProfileMode,
        usdRate,
        setUsdRate,
        exchangeRateMode,
        setExchangeRateMode,
        saveProfile,
        timeFilter,
        setTimeFilter,
        customRange,
        setCustomRange,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
