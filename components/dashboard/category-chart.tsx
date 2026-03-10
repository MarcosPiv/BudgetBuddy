"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, ShoppingCart } from "lucide-react"
import { iconMap, CATEGORY_ICON_MAP } from "./shared"

interface CategoryChartProps {
  categoryBreakdown: [string, number][]
  showCategoryChart: boolean
  setShowCategoryChart: React.Dispatch<React.SetStateAction<boolean>>
  formatCurrency: (n: number) => string
}

export function CategoryChart({
  categoryBreakdown,
  showCategoryChart,
  setShowCategoryChart,
  formatCurrency,
}: CategoryChartProps) {
  if (categoryBreakdown.length === 0) return null

  return (
    <div className="rounded-2xl border border-border bg-card mb-4 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setShowCategoryChart(v => !v)}
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Gastos por categoría
        </p>
        <ChevronRight
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
            showCategoryChart ? "rotate-90" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {showCategoryChart && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-col gap-2.5 px-4 pb-4">
              {categoryBreakdown.map(([cat, amount]) => {
                const maxAmount = categoryBreakdown[0][1]
                const pct = (amount / maxAmount) * 100
                const Icon = iconMap[CATEGORY_ICON_MAP[cat] ?? "ShoppingCart"] || ShoppingCart
                return (
                  <div key={cat} className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-secondary shrink-0">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground w-[4.5rem] shrink-0 truncate">{cat}</span>
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary/60 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                      />
                    </div>
                    <span className="text-xs text-foreground tabular-nums font-medium w-28 text-right shrink-0">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
