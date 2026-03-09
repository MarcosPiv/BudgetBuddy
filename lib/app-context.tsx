"use client"

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react"
import { type User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

export type View = "landing" | "auth" | "settings" | "dashboard" | "profile" | "analytics"
export type ProfileMode = "standard" | "expenses_only"
export type TimeFilter = "week" | "month" | "year" | "custom"
export type ExchangeRateMode = "api" | "manual"
export type ExchangeRateType = "BLUE" | "TARJETA" | "OFICIAL" | "MEP" | "MANUAL"
export type AIProvider = "claude" | "openai" | "gemini"

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
  /** Ruta en Supabase Storage del comprobante adjunto */
  receiptUrl?: string
  /** Se repite automáticamente cada mes */
  isRecurring?: boolean
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
    receiptUrl: row.receipt_url ?? undefined,
    isRecurring: row.is_recurring ?? false,
  }
}

interface AppState {
  // Auth
  user: User | null
  loadingAuth: boolean
  signOut: () => void
  isPasswordRecovery: boolean
  setIsPasswordRecovery: (v: boolean) => void
  // Navigation
  currentView: View
  setView: (view: View) => void
  // Transactions
  transactions: Transaction[]
  addTransaction: (t: Omit<Transaction, "id">, onError?: (msg: string) => void) => void
  deleteTransaction: (id: string, onError?: (msg: string) => void) => void
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, "id">>, onError?: (msg: string) => void) => void
  // UI
  isProcessing: boolean
  setIsProcessing: (v: boolean) => void
  // AI Provider
  aiProvider: AIProvider
  setAiProvider: (p: AIProvider) => void
  apiKeyClaude: string
  setApiKeyClaude: (k: string) => void
  apiKeyOpenAI: string
  setApiKeyOpenAI: (k: string) => void
  apiKeyGemini: string
  setApiKeyGemini: (k: string) => void
  /** Computed: the active provider's key (used by dashboard for the AI check) */
  apiKey: string
  // Profile
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
    aiProvider?: AIProvider
    apiKeyClaude?: string
    apiKeyOpenAI?: string
    apiKeyGemini?: string
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
  const [currentView, setCurrentView] = useState<View>("landing")

  const setView = (view: View) => {
    setCurrentView(view)
    if (typeof window !== "undefined") {
      // Persist so tab-discard / remount restores the last authenticated view
      const authenticatedViews: View[] = ["dashboard", "settings", "profile", "analytics"]
      if (authenticatedViews.includes(view)) {
        sessionStorage.setItem("bb_view", view)
      } else {
        sessionStorage.removeItem("bb_view")
      }
    }
  }
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // AI provider state
  const [aiProvider, setAiProvider] = useState<AIProvider>("claude")
  const [apiKeyClaude, setApiKeyClaude] = useState("")
  const [apiKeyOpenAI, setApiKeyOpenAI] = useState("")
  const [apiKeyGemini, setApiKeyGemini] = useState("")

  // Computed: the key for the active provider
  const apiKey =
    aiProvider === "claude" ? apiKeyClaude :
    aiProvider === "openai" ? apiKeyOpenAI :
    apiKeyGemini

  const [userName, setUserName] = useState("Usuario")
  const [monthlyBudget, setMonthlyBudget] = useState(200000)
  const [profileMode, setProfileMode] = useState<ProfileMode>("standard")
  const [usdRate, setUsdRate] = useState(1350)
  const [exchangeRateMode, setExchangeRateMode] = useState<ExchangeRateMode>("api")

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month")
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date }>(() => {
    const now = new Date()
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
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
      setAiProvider((data.ai_provider as AIProvider) ?? "claude")
      // api_key column stores Claude key (backward compat)
      setApiKeyClaude(data.api_key ?? "")
      setApiKeyOpenAI(data.api_key_openai ?? "")
      setApiKeyGemini(data.api_key_gemini ?? "")
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
          // Restore last authenticated view (survives tab discard / remount)
          const saved = sessionStorage.getItem("bb_view") as View | null
          const authenticatedViews: View[] = ["dashboard", "settings", "profile", "analytics"]
          setView(saved && authenticatedViews.includes(saved) ? saved : "dashboard")
          setLoadingAuth(false)
        })
      } else {
        setLoadingAuth(false)
      }
    })

    // Subscribe to future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Handle password recovery link click
      if (event === "PASSWORD_RECOVERY") {
        setUser(session?.user ?? null)
        setIsPasswordRecovery(true)
        setView("auth")
        return
      }

      // Token refresh / user update — just sync the user, don't navigate away
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        setUser(session?.user ?? null)
        return
      }

      const u = session?.user ?? null
      setUser(u)
      if (u) {
        Promise.all([loadProfile(u.id), loadTransactions(u.id)]).then(() => {
          setView("dashboard")
          setLoadingAuth(false)
        })
      } else {
        setTransactions([])
        setUserName("Usuario")
        setApiKeyClaude("")
        setApiKeyOpenAI("")
        setApiKeyGemini("")
        setView("landing")
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auth actions ─────────────────────────────────────────────────────────────
  const signOut = () => {
    // Optimistic: clear state and navigate immediately so the UI never freezes
    sessionStorage.removeItem("bb_view")
    setUser(null)
    setTransactions([])
    setUserName("Usuario")
    setApiKeyClaude("")
    setApiKeyOpenAI("")
    setApiKeyGemini("")
    setView("landing")
    // Fire-and-forget — onAuthStateChange will handle any remaining cleanup
    supabase.auth.signOut()
  }

  // ── Transaction actions ──────────────────────────────────────────────────────
  const addTransaction = (t: Omit<Transaction, "id">, onError?: (msg: string) => void) => {
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
        receipt_url: t.receiptUrl ?? null,
        is_recurring: t.isRecurring ?? false,
      })
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) {
          // Rollback on failure
          setTransactions((prev) => prev.filter((tx) => tx.id !== tempId))
          onError?.("No se pudo guardar la transacción. Verificá tu conexión.")
          return
        }
        if (data) {
          setTransactions((prev) =>
            prev.map((tx) => (tx.id === tempId ? mapTransaction(data) : tx))
          )
        }
      })
  }

  const deleteTransaction = (id: string, onError?: (msg: string) => void) => {
    const backup = transactions.find((tx) => tx.id === id)
    setTransactions((prev) => prev.filter((tx) => tx.id !== id))
    supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error && backup) {
          // Rollback: restore the deleted transaction
          setTransactions((prev) => [backup, ...prev])
          onError?.("No se pudo eliminar la transacción. Verificá tu conexión.")
        }
      })
  }

  const updateTransaction = (id: string, updates: Partial<Omit<Transaction, "id">>, onError?: (msg: string) => void) => {
    const backup = transactions.find(tx => tx.id === id)
    if (!backup) return
    setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx))
    const merged = { ...backup, ...updates }
    supabase
      .from("transactions")
      .update({
        description: merged.description,
        amount: merged.amount,
        type: merged.type,
        icon: merged.icon,
        category: merged.category,
        date: merged.date instanceof Date ? merged.date.toISOString() : merged.date,
        observation: merged.observation ?? null,
        currency: merged.currency,
        amount_usd: merged.amountUsd ?? null,
        tx_rate: merged.txRate ?? null,
        exchange_rate_type: merged.exchangeRateType ?? null,
        receipt_url: merged.receiptUrl ?? null,
        is_recurring: merged.isRecurring ?? false,
      })
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          setTransactions(prev => prev.map(tx => tx.id === id ? backup : tx))
          onError?.("No se pudo actualizar la transacción. Verificá tu conexión.")
        }
      })
  }

  // ── Profile sync ─────────────────────────────────────────────────────────────
  const saveProfile = async (overrides?: {
    userName?: string
    monthlyBudget?: number
    profileMode?: ProfileMode
    usdRate?: number
    exchangeRateMode?: ExchangeRateMode
    aiProvider?: AIProvider
    apiKeyClaude?: string
    apiKeyOpenAI?: string
    apiKeyGemini?: string
  }) => {
    if (!user) return
    await supabase.from("profiles").upsert({
      id: user.id,
      user_name: overrides?.userName ?? userName,
      monthly_budget: overrides?.monthlyBudget ?? monthlyBudget,
      profile_mode: overrides?.profileMode ?? profileMode,
      exchange_rate_mode: overrides?.exchangeRateMode ?? exchangeRateMode,
      usd_rate: overrides?.usdRate ?? usdRate,
      ai_provider: overrides?.aiProvider ?? aiProvider,
      api_key: overrides?.apiKeyClaude ?? apiKeyClaude,
      api_key_openai: overrides?.apiKeyOpenAI ?? apiKeyOpenAI,
      api_key_gemini: overrides?.apiKeyGemini ?? apiKeyGemini,
      updated_at: new Date().toISOString(),
    })
  }

  // Memoize context value to prevent all consumers from re-rendering on unrelated state changes
  const contextValue = useMemo(() => ({
    user,
    loadingAuth,
    signOut,
    isPasswordRecovery,
    setIsPasswordRecovery,
    currentView,
    setView,
    transactions,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    isProcessing,
    setIsProcessing,
    aiProvider,
    setAiProvider,
    apiKeyClaude,
    setApiKeyClaude,
    apiKeyOpenAI,
    setApiKeyOpenAI,
    apiKeyGemini,
    setApiKeyGemini,
    apiKey,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, loadingAuth, isPasswordRecovery, currentView, transactions, isProcessing,
       aiProvider, apiKeyClaude, apiKeyOpenAI, apiKeyGemini, apiKey, userName,
       monthlyBudget, profileMode, usdRate, exchangeRateMode, timeFilter, customRange])

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
