"use client"

import { useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, Pencil, Trash2, ChevronDown, ChevronUp, ChevronRight,
  Search, StickyNote, ShoppingCart, Wallet,
} from "lucide-react"
// Note: X still used by search clear button; Pencil/Trash2 used by desktop hover buttons
import { SwipeCard } from "./swipe-card"
import { ReceiptImage } from "./receipt-image"
import { ExchangeTypeBadge } from "./exchange-type-badge"
import { iconMap, formatDate } from "./shared"
import type { Transaction } from "@/lib/app-context"

const TX_PAGE = 6

// ── Date separator helpers ────────────────────────────────────────────────────
function getDateLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Hoy"
  if (diffDays === 1) return "Ayer"
  if (diffDays < 7) {
    const name = date.toLocaleDateString("es-AR", { weekday: "long" })
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString("es-AR", {
    weekday: "short", day: "numeric", month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  })
}

type ListItem =
  | { kind: "separator"; label: string; key: string }
  | { kind: "tx"; tx: Transaction }

interface TransactionListProps {
  filteredTransactions: Transaction[]
  displayedTransactions: Transaction[]
  visibleTransactions: Transaction[]
  hasMoreTx: boolean
  showAllTx: boolean
  setShowAllTx: React.Dispatch<React.SetStateAction<boolean>>
  searchQuery: string
  setSearchQuery: (q: string) => void
  expandedTx: string | null
  setExpandedTx: (id: string | null) => void
  dragActiveRef: React.MutableRefObject<boolean>
  usdRate: number
  openEdit: (tx: Transaction) => void
  onDelete: (tx: Transaction) => void
}

export function TransactionList({
  filteredTransactions,
  displayedTransactions,
  visibleTransactions,
  hasMoreTx,
  showAllTx,
  setShowAllTx,
  searchQuery,
  setSearchQuery,
  expandedTx,
  setExpandedTx,
  dragActiveRef,
  usdRate,
  openEdit,
  onDelete,
}: TransactionListProps) {

  // Build flat list with date separators
  const items = useMemo<ListItem[]>(() => {
    const result: ListItem[] = []
    let lastKey = ""
    for (const tx of visibleTransactions) {
      const d = new Date(tx.date)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (key !== lastKey) {
        lastKey = key
        result.push({ kind: "separator", label: getDateLabel(d), key: `sep-${key}` })
      }
      result.push({ kind: "tx", tx })
    }
    return result
  }, [visibleTransactions])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header row */}
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Movimientos{" "}
            {searchQuery.trim()
              ? `(${displayedTransactions.length} de ${filteredTransactions.length})`
              : `(${filteredTransactions.length})`}
          </p>
          <div className="flex items-center gap-2">
            {filteredTransactions.length > 0 && (
              <p className="md:hidden text-[10px] text-muted-foreground/50">
                Deslizá para editar o eliminar
              </p>
            )}
          </div>
        </div>

        {filteredTransactions.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por descripción o categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-sm bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Empty state — no transactions in period */}
      {filteredTransactions.length === 0 ? (
        <motion.div
          className="flex flex-col items-center gap-4 py-16 text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary">
            <Wallet className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Sin movimientos</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Registrá un gasto o ingreso usando<br />la barra de abajo
            </p>
          </div>
        </motion.div>

      /* Empty state — search with no results */
      ) : displayedTransactions.length === 0 ? (
        <motion.div
          className="flex flex-col items-center gap-3 py-12 text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Search className="w-8 h-8 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium text-foreground">Sin resultados</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              No hay movimientos para &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        </motion.div>

      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {items.map((item) => {
              if (item.kind === "separator") {
                return (
                  <motion.div
                    key={item.key}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 px-1 pt-2 pb-0.5"
                  >
                    <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider whitespace-nowrap">
                      {item.label}
                    </span>
                    <div className="flex-1 h-px bg-border/50" />
                  </motion.div>
                )
              }

              const tx = item.tx
              const Icon = iconMap[tx.icon] || ShoppingCart
              const isIncome = tx.type === "income"
              const isExpanded = expandedTx === tx.id
              const isUsd = tx.currency === "USD"

              return (
                <motion.div
                  key={tx.id}
                  layout
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  className="group relative"
                >
                  <SwipeCard
                    onDragStart={() => { dragActiveRef.current = true }}
                    onDragEnd={(swipedLeft, swipedRight) => {
                      setTimeout(() => { dragActiveRef.current = false }, 50)
                      if (swipedLeft) onDelete(tx)
                      else if (swipedRight) openEdit(tx)
                    }}
                  >
                    {/* Card row */}
                    <div
                      className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 hover:bg-secondary/30 active:bg-secondary/50 transition-colors cursor-pointer text-left select-none"
                      onClick={() => { if (dragActiveRef.current) return; setExpandedTx(isExpanded ? null : tx.id) }}
                    >
                      <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${isIncome ? "bg-primary/10" : "bg-secondary"}`}>
                        <Icon className={`w-5 h-5 ${isIncome ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{tx.category} · {formatDate(new Date(tx.date))}</span>
                          {isUsd && tx.exchangeRateType && (
                            <ExchangeTypeBadge type={tx.exchangeRateType} />
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-0.5">
                        <span className={`text-sm font-semibold tabular-nums ${isIncome ? "text-primary" : "text-foreground"}`}>
                          {isIncome ? "+" : "−"}{" "}
                          {isUsd
                            ? `US$ ${tx.amount.toLocaleString("es-AR")}`
                            : `$ ${tx.amount.toLocaleString("es-AR")}`}
                        </span>
                        {isUsd && (
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            ~${(tx.amount * (tx.txRate ?? usdRate)).toLocaleString("es-AR", { maximumFractionDigits: 0 })} ARS
                          </span>
                        )}
                      </div>

                      {/* Desktop action buttons — visible on hover */}
                      <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                        <button
                          type="button"
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); openEdit(tx) }}
                          aria-label="Editar movimiento"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); onDelete(tx) }}
                          aria-label="Eliminar movimiento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {(tx.observation || tx.receiptUrl) && (
                        <ChevronRight
                          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        />
                      )}
                    </div>
                  </SwipeCard>

                  {/* Observation + Receipt expand */}
                  <AnimatePresence>
                    {isExpanded && (tx.observation || tx.receiptUrl) && (
                      <motion.div
                        className="ml-14 mr-2 mt-1 mb-1 px-4 py-2.5 rounded-xl bg-secondary/50 border border-border"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {tx.receiptUrl && <ReceiptImage path={tx.receiptUrl} />}
                        {tx.observation && (
                          <p className="text-xs text-muted-foreground flex items-start gap-2">
                            <StickyNote className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
                            {tx.observation}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Ver más / Ver menos */}
          {hasMoreTx && (
            <button
              type="button"
              onClick={() => setShowAllTx(v => !v)}
              className="w-full mt-1 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              {showAllTx ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Ver menos
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Ver {displayedTransactions.length - TX_PAGE} movimientos más
                </>
              )}
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}
