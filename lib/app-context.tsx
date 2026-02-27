"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export type View = "landing" | "auth" | "settings" | "dashboard" | "profile"
export type ProfileMode = "standard" | "expenses_only"
export type TimeFilter = "week" | "month" | "year" | "custom"

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
  txRate?: number
}

interface AppState {
  currentView: View
  setView: (view: View) => void
  transactions: Transaction[]
  addTransaction: (t: Omit<Transaction, "id">) => void
  isProcessing: boolean
  setIsProcessing: (v: boolean) => void
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
  timeFilter: TimeFilter
  setTimeFilter: (f: TimeFilter) => void
  customRange: { from: Date; to: Date }
  setCustomRange: (r: { from: Date; to: Date }) => void
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(12, 0, 0, 0)
  return d
}

const defaultTransactions: Transaction[] = [
  {
    id: "1",
    description: "Supermercado Dia",
    amount: 45000,
    type: "expense",
    icon: "ShoppingCart",
    category: "Comida",
    date: daysAgo(0),
    currency: "ARS",
  },
  {
    id: "2",
    description: "Freelance diseno web",
    amount: 180000,
    type: "income",
    icon: "ArrowDownLeft",
    category: "Freelance",
    date: daysAgo(0),
    currency: "ARS",
  },
  {
    id: "3",
    description: "Turno de Padel",
    amount: 12000,
    type: "expense",
    icon: "Dumbbell",
    category: "Deporte",
    date: daysAgo(1),
    currency: "ARS",
  },
  {
    id: "4",
    description: "Suscripcion ChatGPT Plus",
    amount: 20,
    type: "expense",
    icon: "Code",
    category: "Suscripciones",
    date: daysAgo(1),
    currency: "USD",
    amountUsd: 20,
    observation: "Pago mensual con tarjeta de credito",
  },
  {
    id: "5",
    description: "Venta en MercadoLibre",
    amount: 95000,
    type: "income",
    icon: "ArrowDownLeft",
    category: "Ventas",
    date: daysAgo(2),
    currency: "ARS",
  },
  {
    id: "6",
    description: "Uber al centro",
    amount: 8500,
    type: "expense",
    icon: "Car",
    category: "Transporte",
    date: daysAgo(2),
    currency: "ARS",
  },
  {
    id: "7",
    description: "Cafe con amigos",
    amount: 6000,
    type: "expense",
    icon: "Coffee",
    category: "Salidas",
    date: daysAgo(3),
    currency: "ARS",
    observation: "Fueron 3 cafes y una medialuna",
  },
  {
    id: "8",
    description: "Dominio .com",
    amount: 12,
    type: "expense",
    icon: "Code",
    category: "Suscripciones",
    date: daysAgo(10),
    currency: "USD",
    amountUsd: 12,
  },
  {
    id: "9",
    description: "Compras del mes",
    amount: 62000,
    type: "expense",
    icon: "ShoppingCart",
    category: "Comida",
    date: daysAgo(15),
    currency: "ARS",
  },
  {
    id: "10",
    description: "Pago proyecto app",
    amount: 350000,
    type: "income",
    icon: "ArrowDownLeft",
    category: "Freelance",
    date: daysAgo(20),
    currency: "ARS",
    observation: "Segundo pago del proyecto e-commerce",
  },
]

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentView, setView] = useState<View>("landing")
  const [profileMode, setProfileMode] = useState<ProfileMode>("standard")
  const [transactions, setTransactions] = useState<Transaction[]>(defaultTransactions)
  const [isProcessing, setIsProcessing] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [userName, setUserName] = useState("Usuario")
  const [monthlyBudget, setMonthlyBudget] = useState(200000)
  const [usdRate, setUsdRate] = useState(1350)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month")

  const now = new Date()
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date }>({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: now,
  })

  const addTransaction = (t: Omit<Transaction, "id">) => {
    setTransactions((prev) => [{ ...t, id: Date.now().toString() }, ...prev])
  }

  return (
    <AppContext.Provider
      value={{
        currentView,
        setView,
        transactions,
        addTransaction,
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
