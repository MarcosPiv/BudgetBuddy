"use client"

import { useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles, Send, StickyNote, ImagePlus, Camera,
  Mic, MicOff, Loader2, DollarSign, Trash2, Settings, CalendarIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { es } from "date-fns/locale"
import type { ExchangeRateType } from "@/lib/app-context"
import type { Attachment } from "./shared"

interface RateOption {
  key: ExchangeRateType
  label: string
  emoji: string
  value: number | null | undefined
}

interface MagicBarProps {
  chatOpen: boolean
  magicInput: string
  setMagicInput: (v: string) => void
  isProcessing: boolean
  attachments: Attachment[]
  removeAttachment: (i: number) => void
  newCurrency: "ARS" | "USD"
  setNewCurrency: React.Dispatch<React.SetStateAction<"ARS" | "USD">>
  newExRateType: ExchangeRateType
  setNewExRateType: (t: ExchangeRateType) => void
  newManualRate: string
  setNewManualRate: (v: string) => void
  observation: string
  setObservation: (v: string) => void
  showObservation: boolean
  setShowObservation: (v: boolean) => void
  newTxDate: Date | null
  setNewTxDate: (d: Date | null) => void
  showDatePicker: boolean
  setShowDatePicker: (v: boolean) => void
  rateTypeOptions: RateOption[]
  ratesLoading: boolean
  usdRate: number
  handleMagicSubmit: (e: React.FormEvent) => void
  galleryInputRef: React.RefObject<HTMLInputElement>
  cameraInputRef: React.RefObject<HTMLInputElement>
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  startCamera: () => void
  isRecording: boolean
  startRecording: () => void
  stopRecording: () => void
  aiError: string | null
}

export function MagicBar({
  chatOpen,
  magicInput,
  setMagicInput,
  isProcessing,
  attachments,
  removeAttachment,
  newCurrency,
  setNewCurrency,
  newExRateType,
  setNewExRateType,
  newManualRate,
  setNewManualRate,
  observation,
  setObservation,
  showObservation,
  setShowObservation,
  newTxDate,
  setNewTxDate,
  showDatePicker,
  setShowDatePicker,
  rateTypeOptions,
  ratesLoading,
  usdRate,
  handleMagicSubmit,
  galleryInputRef,
  cameraInputRef,
  handleImageSelect,
  startCamera,
  isRecording,
  startRecording,
  stopRecording,
  aiError,
}: MagicBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 80)}px`
  }, [magicInput])

  return (
    <div
      className={`fixed bottom-0 left-0 z-40 bg-background/95 backdrop-blur-md border-t border-border transition-[right] duration-300 ease-out ${
        chatOpen ? "right-0 lg:right-80 xl:right-96" : "right-0"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="max-w-3xl mx-auto px-4 pt-3 pb-3">

        {/* Hidden file inputs */}
        <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} multiple />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />

        <div className="magic-border rounded-xl p-[1px]">
          <div className="bg-background rounded-[11px] px-4 py-3">

            {/* Attachment previews */}
            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div
                  className="flex flex-wrap gap-2 mb-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {attachments.map((att, i) => (
                    <motion.div
                      key={i}
                      className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs text-foreground"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      {att.type === "image" ? (
                        <img src={att.url} alt={att.name} className="w-7 h-7 rounded object-cover" />
                      ) : (
                        <div className="flex items-center justify-center w-7 h-7 rounded bg-accent/20">
                          <Mic className="w-3.5 h-3.5 text-accent" />
                        </div>
                      )}
                      <span className="max-w-20 truncate">{att.name}</span>
                      <button
                        type="button"
                        className="ml-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        onClick={() => removeAttachment(i)}
                        aria-label={`Eliminar ${att.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* USD rate type selector */}
            <AnimatePresence>
              {newCurrency === "USD" && (
                <motion.div
                  className="mb-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {rateTypeOptions.map((opt) => {
                      const isSelected = newExRateType === opt.key
                      const hasValue = opt.value != null
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setNewExRateType(opt.key)}
                          className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-border/80"
                          }`}
                        >
                          <span className="leading-none">{opt.emoji}</span>
                          <span>{opt.label}</span>
                          {opt.key !== "MANUAL" && (
                            <span className={`tabular-nums font-mono ${isSelected ? "opacity-80" : "opacity-55"}`}>
                              {hasValue
                                ? `· $${opt.value!.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
                                : ratesLoading
                                  ? "· …"
                                  : ""}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Manual rate input */}
                  <AnimatePresence>
                    {newExRateType === "MANUAL" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="mt-2"
                      >
                        <div className="flex items-center gap-2 bg-chart-5/10 border border-chart-5/25 rounded-lg px-3 py-2">
                          <DollarSign className="w-3.5 h-3.5 text-chart-5 shrink-0" />
                          <span className="text-xs text-chart-5/80 font-medium whitespace-nowrap">1 USD =</span>
                          <input
                            type="number"
                            value={newManualRate}
                            onChange={(e) => setNewManualRate(e.target.value)}
                            placeholder={usdRate.toString()}
                            className="flex-1 min-w-0 bg-transparent text-sm text-chart-5 font-mono outline-none placeholder:text-chart-5/40"
                            min={1}
                            step={50}
                            aria-label="Cotización manual"
                          />
                          <span className="text-xs text-chart-5/80 font-medium">ARS</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Observation row */}
            <AnimatePresence>
              {showObservation && (
                <motion.div
                  className="mb-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Input
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Observacion (opcional)..."
                    className="border-0 bg-secondary/50 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 text-xs rounded-lg"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main input row */}
            <form onSubmit={handleMagicSubmit}>

              {/* Text row */}
              <div className="flex items-end gap-2 mb-2.5">
                <Sparkles className="w-4 h-4 text-accent shrink-0 mb-0.5" />
                <textarea
                  ref={textareaRef}
                  value={magicInput}
                  onChange={(e) => setMagicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      e.currentTarget.form?.requestSubmit()
                    }
                  }}
                  placeholder="Pague 12000 en el super..."
                  rows={1}
                  maxLength={300}
                  className="flex-1 min-w-0 border-0 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none text-sm resize-none overflow-y-auto leading-5 py-0 max-h-[80px]"
                  disabled={isProcessing}
                />

                {/* Currency toggle */}
                <button
                  type="button"
                  className={`shrink-0 px-2 py-1 rounded-md text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    newCurrency === "USD"
                      ? "bg-chart-5/20 text-chart-5"
                      : "bg-secondary text-muted-foreground"
                  }`}
                  onClick={() => setNewCurrency((p) => (p === "ARS" ? "USD" : "ARS"))}
                  title="Cambiar moneda"
                >
                  {newCurrency}
                </button>

                {/* Send */}
                <Button
                  type="submit"
                  size="icon"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 rounded-lg h-9 w-9 cursor-pointer"
                  disabled={isProcessing}
                  aria-label="Enviar"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Character counter */}
              {magicInput.length > 0 && (
                <div className="flex justify-end mb-1 -mt-1">
                  <span className={`text-[10px] tabular-nums ${magicInput.length >= 270 ? "text-destructive" : "text-muted-foreground/50"}`}>
                    {magicInput.length}/300
                  </span>
                </div>
              )}

              {/* Multimodal toolbar */}
              <div className="grid grid-cols-5 gap-1 pt-2 border-t border-border/40">

                {/* Date picker */}
                <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        newTxDate
                          ? "bg-accent/15 text-accent"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                      aria-label="Seleccionar fecha"
                    >
                      <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {newTxDate
                          ? newTxDate.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
                          : "Fecha"}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-border" align="start" side="top">
                    <Calendar
                      mode="single"
                      selected={newTxDate ?? undefined}
                      onSelect={(date) => { setNewTxDate(date ?? null); setShowDatePicker(false) }}
                      disabled={(date) => date > new Date()}
                      locale={es}
                      initialFocus
                    />
                    {newTxDate && (
                      <div className="px-3 pb-3 border-t border-border pt-2">
                        <button
                          type="button"
                          className="w-full text-xs text-muted-foreground hover:text-foreground py-1.5 transition-colors cursor-pointer"
                          onClick={() => { setNewTxDate(null); setShowDatePicker(false) }}
                        >
                          Usar fecha de hoy
                        </button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Note */}
                <button
                  type="button"
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    showObservation
                      ? "bg-accent/15 text-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                  onClick={() => setShowObservation(!showObservation)}
                  aria-label="Agregar nota"
                >
                  <StickyNote className="w-3.5 h-3.5 shrink-0" />
                  <span>Nota</span>
                </button>

                {/* Gallery */}
                <button
                  type="button"
                  className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={isProcessing}
                  aria-label="Subir desde galeria"
                >
                  <ImagePlus className="w-3.5 h-3.5 shrink-0" />
                  <span>Galería</span>
                </button>

                {/* Camera */}
                <button
                  type="button"
                  className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={startCamera}
                  disabled={isProcessing}
                  aria-label="Escanear ticket"
                >
                  <Camera className="w-3.5 h-3.5 shrink-0" />
                  <span>Ticket</span>
                </button>

                {/* Audio */}
                <button
                  type="button"
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isRecording
                      ? "bg-destructive/15 text-destructive animate-pulse"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  aria-label={isRecording ? "Detener grabacion" : "Grabar audio"}
                >
                  {isRecording ? (
                    <MicOff className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{isRecording ? "Detener" : "Audio"}</span>
                </button>

              </div>
            </form>
          </div>
        </div>

        {/* AI error */}
        <AnimatePresence>
          {aiError && (
            <motion.div
              className="flex items-center gap-2 mt-2 text-xs text-destructive"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Settings className="w-3 h-3 shrink-0" />
              <span>{aiError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing indicator */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              className="flex items-center gap-2 mt-2 text-xs text-accent"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Analizando con IA...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
