"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  X, Pencil, Trash2, ChevronDown, ChevronUp, ChevronRight,
  Search, StickyNote, ShoppingCart,
} from "lucide-react"
import { SwipeCard } from "./swipe-card"
import { ReceiptImage } from "./receipt-image"
import { ExchangeTypeBadge } from "./exchange-type-badge"
import { iconMap, formatDate } from "./shared"
import type { Transaction } from "@/lib/app-context"

const TX_PAGE = 6

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
  longPressId: string | null
  setLongPressId: (id: string | null) => void
  dragActiveRef: React.MutableRefObject<boolean>
  lpTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  usdRate: number
  openEdit: (tx: Transaction) => void
  setDeletingTxId: (id: string | null) => void
  handleTouchStart: (txId: string) => void
  handleTouchEnd: () => void
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
  longPressId,
  setLongPressId,
  dragActiveRef,
  lpTimerRef,
  usdRate,
  openEdit,
  setDeletingTxId,
  handleTouchStart,
  handleTouchEnd,
}: TransactionListProps) {
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

      {/* List / empty states */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No hay movimientos en este periodo.
        </div>
      ) : displayedTransactions.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Sin resultados para &ldquo;{searchQuery}&rdquo;
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {visibleTransactions.map((tx) => {
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
                    onDragStart={() => {
                      dragActiveRef.current = true
                      if (lpTimerRef.current) clearTimeout(lpTimerRef.current)
                      setLongPressId(null)
                    }}
                    onDragEnd={(swipedLeft, swipedRight) => {
                      setTimeout(() => { dragActiveRef.current = false }, 50)
                      if (swipedLeft) setDeletingTxId(tx.id)
                      else if (swipedRight) openEdit(tx)
                    }}
                  >
                    {/* Card row */}
                    <div
                      className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 hover:bg-secondary/30 active:bg-secondary/50 transition-colors cursor-pointer text-left select-none"
                      onClick={() => { if (dragActiveRef.current || longPressId === tx.id) return; setExpandedTx(isExpanded ? null : tx.id) }}
                      onTouchStart={() => handleTouchStart(tx.id)}
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchEnd}
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
                          onClick={(e) => { e.stopPropagation(); setDeletingTxId(tx.id) }}
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

                  {/* Mobile long-press action row */}
                  <AnimatePresence>
                    {longPressId === tx.id && (
                      <motion.div
                        className="flex md:hidden items-center gap-2 mt-1 px-2 py-2 rounded-xl bg-secondary/80 border border-border"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <button
                          type="button"
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium cursor-pointer active:bg-primary/20"
                          onClick={() => openEdit(tx)}
                        >
                          <Pencil className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          type="button"
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium cursor-pointer active:bg-destructive/20"
                          onClick={() => { setDeletingTxId(tx.id); setLongPressId(null) }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={() => setLongPressId(null)}
                          aria-label="Cerrar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
