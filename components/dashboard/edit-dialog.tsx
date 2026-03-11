"use client"

import { motion, AnimatePresence } from "framer-motion"
import { TrendingUp, TrendingDown, Repeat, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ExchangeRateType } from "@/lib/app-context"
import { VALID_CATEGORIES, CATEGORY_ICON_MAP } from "./shared"

export interface EditForm {
  description: string
  amount: string
  type: "expense" | "income"
  category: string
  icon: string
  date: string
  currency: "ARS" | "USD"
  exRateType: ExchangeRateType
  manualRate: string
  observation: string
  isRecurring: boolean
}

interface RateOption {
  key: ExchangeRateType
  label: string
  emoji: string
  value: number | null | undefined
}

interface EditDialogProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  saveLabel: string
  editForm: EditForm
  setEditForm: React.Dispatch<React.SetStateAction<EditForm>>
  rateTypeOptions: RateOption[]
  ratesLoading: boolean
  usdRate: number
  onSave: () => void
  getEditRate: () => number
}

export function EditDialog({
  open,
  onClose,
  title,
  subtitle,
  saveLabel,
  editForm,
  setEditForm,
  rateTypeOptions,
  ratesLoading,
  usdRate,
  onSave,
  getEditRate,
}: EditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-card border-border flex flex-col max-h-[92dvh] overflow-hidden">

        {/* Fixed header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
              editForm.type === "expense" ? "bg-destructive/10" : "bg-primary/10"
            }`}>
              {editForm.type === "expense"
                ? <TrendingDown className="w-4.5 h-4.5 text-destructive" />
                : <TrendingUp className="w-4.5 h-4.5 text-primary" />}
            </div>
            <div>
              <DialogTitle className="text-foreground text-base leading-tight">{title}</DialogTitle>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[240px]">{subtitle}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">

          {/* Type toggle */}
          <div className="flex gap-2 p-1 rounded-xl bg-secondary/50 border border-border">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  editForm.type === t
                    ? t === "expense"
                      ? "bg-destructive/15 text-destructive shadow-sm"
                      : "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setEditForm(f => ({ ...f, type: t }))}
              >
                {t === "expense" ? "− Gasto" : "+ Ingreso"}
              </button>
            ))}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Descripción</Label>
            <Input
              value={editForm.description}
              onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
              className="bg-secondary/50 border-border h-10 text-sm"
              placeholder="Descripción del movimiento"
            />
          </div>

          {/* Amount + Currency */}
          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label className="text-xs font-medium text-muted-foreground">Monto</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={editForm.amount}
                onChange={(e) => setEditForm(f => ({ ...f, amount: e.target.value }))}
                className="bg-secondary/50 border-border h-10 text-sm font-mono"
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <Label className="text-xs font-medium text-muted-foreground">Moneda</Label>
              <div className="flex h-10 rounded-lg border border-border overflow-hidden">
                {(["ARS", "USD"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`px-4 text-sm font-semibold transition-colors cursor-pointer ${
                      editForm.currency === c
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    }`}
                    onClick={() => setEditForm(f => ({ ...f, currency: c }))}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* USD rate type */}
          <AnimatePresence>
            {editForm.currency === "USD" && (
              <motion.div
                className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/30 p-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Tipo de cambio
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {rateTypeOptions.map((opt) => {
                    const isSelected = editForm.exRateType === opt.key
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setEditForm(f => ({ ...f, exRateType: opt.key as ExchangeRateType }))}
                        className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-border/80"
                        }`}
                      >
                        <span className="leading-none">{opt.emoji}</span>
                        <span>{opt.label}</span>
                        {opt.key !== "MANUAL" && opt.value != null && (
                          <span className={`tabular-nums font-mono ${isSelected ? "opacity-80" : "opacity-55"}`}>
                            · ${opt.value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                          </span>
                        )}
                        {opt.key !== "MANUAL" && opt.value == null && ratesLoading && (
                          <span className="opacity-40">· …</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                <AnimatePresence>
                  {editForm.exRateType === "MANUAL" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="flex items-center gap-2 bg-chart-5/10 border border-chart-5/25 rounded-lg px-3 py-2 mt-1">
                        <DollarSign className="w-3.5 h-3.5 text-chart-5 shrink-0" />
                        <span className="text-xs text-chart-5/80 font-medium whitespace-nowrap">1 USD =</span>
                        <input
                          type="number"
                          value={editForm.manualRate}
                          onChange={(e) => setEditForm(f => ({ ...f, manualRate: e.target.value }))}
                          placeholder={String(usdRate)}
                          className="flex-1 min-w-0 bg-transparent text-sm text-chart-5 font-mono outline-none placeholder:text-chart-5/40"
                          min={1}
                          step={50}
                        />
                        <span className="text-xs text-chart-5/80 font-medium">ARS</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {editForm.amount && parseFloat(editForm.amount) > 0 && (
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    US$ {parseFloat(editForm.amount).toLocaleString("es-AR")} ≈ ${" "}
                    {(parseFloat(editForm.amount) * getEditRate()).toLocaleString("es-AR", { maximumFractionDigits: 0 })} ARS
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category + Date row */}
          <div className="flex gap-2">
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <Label className="text-xs font-medium text-muted-foreground">Categoría</Label>
              <Select
                value={editForm.category}
                onValueChange={(val) => setEditForm(f => ({ ...f, category: val, icon: CATEGORY_ICON_MAP[val] ?? "ShoppingCart" }))}
              >
                <SelectTrigger className="bg-secondary/50 border-border h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {VALID_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-sm">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <Label className="text-xs font-medium text-muted-foreground">Fecha</Label>
              <Input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm(f => ({ ...f, date: e.target.value }))}
                className="bg-secondary/50 border-border h-10 text-sm w-[9.5rem]"
              />
            </div>
          </div>

          {/* Observation */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Nota (opcional)</Label>
            <Textarea
              value={editForm.observation}
              onChange={(e) => setEditForm(f => ({ ...f, observation: e.target.value }))}
              className="bg-secondary/50 border-border resize-none text-sm"
              rows={2}
              placeholder="Ej: Incluye propina, cuotas, detalles..."
            />
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center justify-between py-1">
            <div className="flex flex-col gap-0.5">
              <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
                Fijo mensual
              </Label>
              <span className="text-[11px] text-muted-foreground">Se registra automáticamente cada mes</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={editForm.isRecurring}
              onClick={() => setEditForm(f => ({ ...f, isRecurring: !f.isRecurring }))}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                editForm.isRecurring ? "bg-primary" : "bg-secondary"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                  editForm.isRecurring ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Fixed footer */}
        <div className="px-5 pb-5 pt-3 border-t border-border shrink-0 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 cursor-pointer h-10"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer h-10 font-semibold"
            onClick={onSave}
            disabled={!editForm.amount || parseFloat(editForm.amount) <= 0}
          >
            {saveLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
