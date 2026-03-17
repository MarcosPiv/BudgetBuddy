"use client"

import { createContext, useContext, useState, useEffect, useRef, useMemo, type ReactNode } from "react"
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

// ── Offline queue ─────────────────────────────────────────────────────────────
type OfflineOp =
  | { op: "add"; tempId: string; row: Record<string, unknown> }
  | { op: "update"; id: string; row: Record<string, unknown> }
  | { op: "delete"; id: string }

const QUEUE_KEY = "bb_offline_queue"

function loadQueue(): OfflineOp[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") } catch { return [] }
}

function persistQueue(q: OfflineOp[]) {
  if (typeof window !== "undefined") localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
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
  navDirection: "forward" | "back"
  // Transactions
  transactions: Transaction[]
  addTransaction: (t: Omit<Transaction, "id">, onError?: (msg: string) => void) => void
  deleteTransaction: (id: string, onError?: (msg: string) => void) => void
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, "id">>, onError?: (msg: string) => void) => void
  // UI
  isProcessing: boolean
  setIsProcessing: (v: boolean) => void
  // Offline
  isOnline: boolean
  pendingOfflineCount: number
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

const AUTHENTICATED_VIEWS: View[] = ["dashboard", "settings", "profile", "analytics"]

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [currentView, setCurrentView] = useState<View>("landing")
  const [navDirection, setNavDirection] = useState<"forward" | "back">("forward")

  // Ref so auth callbacks (closures) always read the latest view without stale state
  const currentViewRef = useRef<View>("landing")
  // Ref for user so the popstate closure (created once on mount) can read current value
  const userRef = useRef<User | null>(null)
  useEffect(() => { userRef.current = user }, [user])

  const setView = (view: View, replace = false) => {
    currentViewRef.current = view
    setNavDirection("forward")
    setCurrentView(view)
    if (typeof window !== "undefined") {
      if (AUTHENTICATED_VIEWS.includes(view)) {
        sessionStorage.setItem("bb_view", view)
      } else {
        sessionStorage.removeItem("bb_view")
      }
      if (replace) {
        history.replaceState({ view }, "")
      } else {
        history.pushState({ view }, "")
      }
    }
  }

  // ── Android back button / back-gesture support ─────────────────────────────
  // NOTE: iOS PWA standalone mode does NOT fire popstate on edge-swipe (Apple limit).
  // Strategy: push to history on every setView; on popstate restore the correct view.
  // When the user reaches the "landing" entry (bottom of the auth stack), we show an
  // exit hint. The NEXT back press has no more history → Android closes the PWA.
  // This gives the "double-back to exit" pattern with zero bounce complexity.
  useEffect(() => {
    if (typeof window === "undefined") return

    // Replace the browser's initial entry with our current view state
    history.replaceState({ view: currentViewRef.current }, "")

    const handlePopState = (e: PopStateEvent) => {
      const target = (e.state as { view?: View } | null)?.view

      // Authenticated user going back past the app's history (landing / null)
      if (userRef.current && (!target || !AUTHENTICATED_VIEWS.includes(target))) {
        // Show exit hint. React state is unchanged (user still sees their current view).
        // The browser is now at the bottom of our history stack — one more back
        // will have no entry left and Android will close the PWA naturally.
        window.dispatchEvent(new CustomEvent("bb_exit_hint"))
        return
      }

      if (!target) return
      // Unauthenticated user somehow reaching an authenticated entry → block
      if (!userRef.current && AUTHENTICATED_VIEWS.includes(target)) return

      // Normal back navigation within the app
      currentViewRef.current = target
      setNavDirection("back")
      setCurrentView(target)
      if (AUTHENTICATED_VIEWS.includes(target)) {
        sessionStorage.setItem("bb_view", target)
      } else {
        sessionStorage.removeItem("bb_view")
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // ── Offline state ────────────────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  )
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(() => loadQueue().length)

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

  // ── Online/offline listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  // ── Replay offline queue when back online ────────────────────────────────────
  useEffect(() => {
    if (!isOnline || !user) return
    const queue = loadQueue()
    if (queue.length === 0) return

    ;(async () => {
      const idMap = new Map<string, string>() // tempId → realId for chained ops
      for (const op of queue) {
        if (op.op === "add") {
          const { data, error } = await supabase
            .from("transactions").insert(op.row).select().single()
          if (!error && data) {
            idMap.set(op.tempId, data.id)
            setTransactions(prev => prev.map(tx => tx.id === op.tempId ? mapTransaction(data) : tx))
          }
        } else if (op.op === "update") {
          const realId = idMap.get(op.id) ?? op.id
          await supabase.from("transactions").update(op.row).eq("id", realId)
        } else if (op.op === "delete") {
          const realId = idMap.get(op.id) ?? op.id
          if (idMap.has(op.id)) setTransactions(prev => prev.filter(tx => tx.id !== realId))
          await supabase.from("transactions").delete().eq("id", realId)
        }
      }
      persistQueue([])
      setPendingOfflineCount(0)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, user])

  // ── Data loaders ────────────────────────────────────────────────────────────
  const loadProfile = async (u: { id: string; user_metadata?: Record<string, unknown>; identities?: Array<{ identity_data?: Record<string, unknown> }> }) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", u.id)
      .single()

    // Extract name from OAuth provider metadata as fallback
    const meta = u.user_metadata ?? {}
    const identityData = u.identities?.[0]?.identity_data ?? {}
    const oauthName: string =
      meta.full_name ||
      meta.name ||
      meta.user_name ||
      meta.preferred_username ||
      identityData.full_name ||
      identityData.name ||
      identityData.user_name ||
      identityData.preferred_username ||
      identityData.login ||
      "Usuario"

    if (data) {
      const hasRealName = data.user_name && data.user_name !== "Usuario"
      const effectiveName = hasRealName ? data.user_name : oauthName
      setUserName(effectiveName)
      setMonthlyBudget(data.monthly_budget ?? 200000)
      setProfileMode(data.profile_mode ?? "standard")
      setExchangeRateMode(data.exchange_rate_mode ?? "api")
      setUsdRate(data.usd_rate ?? 1350)
      setAiProvider((data.ai_provider as AIProvider) ?? "claude")
      // api_key column stores Claude key (backward compat)
      setApiKeyClaude(data.api_key ?? "")
      setApiKeyOpenAI(data.api_key_openai ?? "")
      setApiKeyGemini(data.api_key_gemini ?? "")

      // Persist OAuth name to DB if profile has no real name yet
      if (!hasRealName && oauthName !== "Usuario") {
        await supabase.from("profiles").update({ user_name: oauthName }).eq("id", u.id)
      }
    } else if (oauthName !== "Usuario") {
      // First OAuth login — create profile row with the provider name
      setUserName(oauthName)
      await supabase.from("profiles").upsert({ id: u.id, user_name: oauthName })
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
        Promise.all([loadProfile(u), loadTransactions(u.id)]).finally(() => {
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

      const u = session?.user ?? null
      setUser(u)
      if (u) {
        Promise.all([loadProfile(u), loadTransactions(u.id)]).then(() => {
          // Only navigate to dashboard if we're on an unauthenticated view.
          // If the user is already on settings/analytics/profile/dashboard,
          // any auth event (SIGNED_IN, TOKEN_REFRESHED, etc.) must NOT redirect them.
          if (!AUTHENTICATED_VIEWS.includes(currentViewRef.current)) {
            setView("dashboard")
          }
          setLoadingAuth(false)
        })
      } else {
        setTransactions([])
        setUserName("Usuario")
        setApiKeyClaude("")
        setApiKeyOpenAI("")
        setApiKeyGemini("")
        setView("landing", true)
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auth actions ─────────────────────────────────────────────────────────────
  const signOut = () => {
    // Optimistic: clear state and navigate immediately so the UI never freezes
    sessionStorage.removeItem("bb_view")
    sessionStorage.removeItem("bb_chat_messages")
    setUser(null)
    setTransactions([])
    setUserName("Usuario")
    setApiKeyClaude("")
    setApiKeyOpenAI("")
    setApiKeyGemini("")
    setView("landing", true)
    // Fire-and-forget — onAuthStateChange will handle any remaining cleanup
    supabase.auth.signOut()
  }

  // ── Transaction actions ──────────────────────────────────────────────────────
  const addTransaction = (t: Omit<Transaction, "id">, onError?: (msg: string) => void) => {
    if (!user) return

    const tempId = `temp-${Date.now()}`
    setTransactions((prev) => [{ ...t, id: tempId }, ...prev])

    const row: Record<string, unknown> = {
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
    }

    // Offline: queue for sync when reconnected (keep optimistic update)
    if (!navigator.onLine) {
      const q = loadQueue()
      const next = [...q, { op: "add" as const, tempId, row }]
      persistQueue(next)
      setPendingOfflineCount(next.length)
      return
    }

    supabase
      .from("transactions")
      .insert(row)
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

    if (!navigator.onLine) {
      const q = loadQueue()
      const next = [...q, { op: "delete" as const, id }]
      persistQueue(next)
      setPendingOfflineCount(next.length)
      return
    }

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

    const row: Record<string, unknown> = {
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
    }

    if (!navigator.onLine) {
      const q = loadQueue()
      const next = [...q, { op: "update" as const, id, row }]
      persistQueue(next)
      setPendingOfflineCount(next.length)
      return
    }

    supabase
      .from("transactions")
      .update(row)
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
    navDirection,
    transactions,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    isProcessing,
    setIsProcessing,
    isOnline,
    pendingOfflineCount,
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
  }), [user, loadingAuth, isPasswordRecovery, currentView, navDirection, transactions, isProcessing,
       isOnline, pendingOfflineCount,
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
