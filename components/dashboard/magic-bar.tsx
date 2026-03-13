"use client"

import { useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles, Send, StickyNote, ImagePlus, Camera,
  Mic, MicOff, Loader2, DollarSign, Trash2, Settings,
  CalendarIcon, PenLine, Paperclip, Lock
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
  stopRecording: (opts?: { cancel?: boolean; autoSubmit?: boolean }) => void
  aiError: string | null
  onManualEntry: () => void
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
  onManualEntry,
}: MagicBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [isClickMode, setIsClickMode] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [dragX, setDragX] = useState(0)
  const touchStartY = useRef<number | null>(null)
  const touchStartX = useRef<number | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } else {
      setRecordingTime(0)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 80)}px`
  }, [magicInput])

  return (
    <div
      className={`fixed bottom-0 left-0 z-40 bg-background/95 backdrop-blur-md border-t border-border transition-[right] duration-300 ease-out ${chatOpen ? "right-0 lg:right-80 xl:right-96" : "right-0"
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
                          className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${isSelected
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

            {/* Attach expand menu */}
            <AnimatePresence>
              {showAttachMenu && (
                <motion.div
                  className="flex gap-2 mb-3 pb-2.5 border-b border-border/40 overflow-hidden"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <button
                    type="button"
                    onClick={() => { galleryInputRef.current?.click(); setShowAttachMenu(false) }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <ImagePlus className="w-4 h-4 text-primary" />
                    <span>Galería</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { startCamera(); setShowAttachMenu(false) }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-primary" />
                    <span>Ticket</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main form */}
            <form onSubmit={handleMagicSubmit}>

              {/* Input row */}
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-4 h-4 text-accent shrink-0" />
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

                {/* Currency toggle has been moved below */}

                {/* Attach / Cancel Slide text / Lock Trash */}
                <div className="flex items-center shrink-0 min-w-8">
                  <AnimatePresence mode="popLayout">
                    {isRecording && !isClickMode && !isLocked ? (
                      <motion.div
                        key="cancel-text"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{
                          opacity: dragX > 0 ? Math.max(0, 1 - (dragX / 80)) : 1,
                          x: dragX > 0 ? -Math.min(dragX, 100) : 0
                        }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="text-[11px] font-medium text-muted-foreground whitespace-nowrap overflow-hidden pointer-events-none pr-1 tracking-wider uppercase"
                      >
                        ◄ Desliza para cancelar
                      </motion.div>
                    ) : isLocked ? (
                      <motion.button
                        key="trash-btn"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        type="button"
                        onClick={() => {
                          stopRecording({ cancel: true });
                          setIsLocked(false);
                          setIsClickMode(false);
                        }}
                        className="shrink-0 p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        aria-label="Eliminar grabación"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    ) : (
                      <motion.button
                        key="attach-btn"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        type="button"
                        onClick={() => setShowAttachMenu((v) => !v)}
                        className={`shrink-0 p-1.5 rounded-lg transition-colors cursor-pointer ${showAttachMenu
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                          }`}
                        aria-label="Adjuntar archivo"
                      >
                        <Paperclip className="w-4 h-4" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* Action Buttons (Record or Send) */}
                <div className="relative flex items-center shrink-0">
                  {/* MOBILE VIEW: Single shared container for instant swap without layout shift */}
                  <div className="flex md:hidden relative w-9 h-9 items-center justify-center">
                    {magicInput.trim().length === 0 ? (
                      /* Audio — hold to record (Visible only when empty on mobile) */
                      <>
                        <AnimatePresence>
                          {isRecording && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="absolute bottom-full mb-3 right-0 whitespace-nowrap bg-destructive/15 backdrop-blur-md border border-destructive/30 text-destructive text-[11px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 pointer-events-none"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                              <span className="font-mono">{formatTime(recordingTime)}</span>
                              {isClickMode
                                ? " (Pulsa para detener)"
                                : isLocked
                                  ? " (Pulsa para detener)"
                                  : " (Desliza ↑)"}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Lock Indicator Animation when not locked yet on touch */}
                        <AnimatePresence>
                          {isRecording && !isClickMode && !isLocked && (
                            <motion.div
                              initial={{ opacity: 0, y: 0 }}
                              animate={{ opacity: 1, y: -45 - (dragY * 0.5) }}
                              exit={{ opacity: 0, scale: 0 }}
                              className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none text-muted-foreground"
                            >
                              <Lock className="w-4 h-4 text-destructive/70 mb-1" />
                              <span className="text-[9px] font-bold tracking-widest text-destructive/70 opacity-50">↑</span>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <Button
                          type="button"
                          size="icon"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            if (e.pointerType === "mouse") {
                              setIsClickMode(true);
                              if (isRecording) {
                                stopRecording({ autoSubmit: true });
                                setIsLocked(false);
                              } else {
                                startRecording();
                              }
                            } else {
                              // Touch behavior
                              setIsClickMode(false);
                              if (isLocked) {
                                stopRecording({ autoSubmit: true });
                                setIsLocked(false);
                              } else {
                                startRecording();
                                setIsLocked(false);
                                setDragY(0);
                                setDragX(0);
                                touchStartY.current = e.clientY;
                                touchStartX.current = e.clientX;
                                e.currentTarget.setPointerCapture(e.pointerId);
                              }
                            }
                          }}
                          onPointerMove={(e) => {
                            if (e.pointerType === "mouse") return;
                            if (!isRecording || isLocked || touchStartY.current === null || touchStartX.current === null) return;

                            const deltaY = touchStartY.current - e.clientY;
                            const currentDrag = Math.max(0, deltaY);
                            setDragY(currentDrag);

                            const deltaX = touchStartX.current - e.clientX;
                            const currentDragX = Math.max(0, deltaX);
                            setDragX(currentDragX);

                            if (deltaY > 100) { // Slide up threshold 100px
                              setIsLocked(true);
                              setDragY(0);
                              setDragX(0);
                              touchStartY.current = null;
                              touchStartX.current = null;
                            } else if (deltaX > 100) { // Slide left threshold 100px
                              stopRecording({ cancel: true });
                              setIsLocked(false);
                              setDragY(0);
                              setDragX(0);
                              touchStartY.current = null;
                              touchStartX.current = null;
                            }
                          }}
                          onPointerUp={(e) => {
                            if (e.pointerType !== "mouse") {
                              e.currentTarget.releasePointerCapture(e.pointerId);
                              if (!isLocked) {
                                if (dragX <= 100) stopRecording({ autoSubmit: true });
                                else stopRecording({ cancel: true });
                              }
                              setDragY(0);
                              setDragX(0);
                              touchStartY.current = null;
                              touchStartX.current = null;
                            }
                          }}
                          onPointerLeave={(e) => {
                            if (e.pointerType !== "mouse" && isRecording && !isLocked) {
                              stopRecording({ cancel: true });
                            }
                            setDragY(0);
                            setDragX(0);
                          }}
                          onPointerCancel={(e) => {
                            if (e.pointerType !== "mouse") {
                              if (!isLocked) stopRecording({ cancel: true });
                              setDragY(0);
                              setDragX(0);
                              touchStartY.current = null;
                              touchStartX.current = null;
                            }
                          }}
                          disabled={isProcessing}
                          style={{
                            transform: dragY > 0 && !isLocked ? `translateY(-${dragY}px)` : dragX > 0 && !isLocked ? `translateX(-${dragX}px)` : 'none'
                          }}
                          className={`absolute inset-0 w-full h-full transition-colors select-none touch-none cursor-pointer z-10 ${isRecording
                            ? (isLocked ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md" : "bg-destructive text-destructive-foreground hover:bg-destructive/90 scale-110 shadow-[0_0_15px_rgba(239,68,68,0.5)]")
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                          aria-label={isRecording ? (isLocked ? "Enviar grabación" : "Detener o cancelar grabación") : "Grabar audio"}
                        >
                          {isLocked ? <Send className="w-4 h-4 ml-0.5" /> : isRecording ? <Mic className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
                        </Button>
                      </>
                    ) : (
                      /* Send Button (Visible only when text is entered on mobile) */
                      <Button
                        type="submit"
                        size="icon"
                        className="absolute inset-0 w-full h-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer transition-all"
                        disabled={isProcessing}
                        aria-label="Enviar"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>

                  {/* DESKTOP VIEW: Both buttons always visible */}

                  {/* Desktop Only Audio Recording Button */}
                  <div className="hidden md:flex relative items-center shrink-0 mr-1.5">
                    <AnimatePresence>
                      {isRecording && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="absolute bottom-full mb-3 right-0 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 whitespace-nowrap bg-destructive/15 backdrop-blur-md border border-destructive/30 text-destructive text-[11px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 pointer-events-none"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                          <span className="font-mono">{formatTime(recordingTime)}</span>
                          {isClickMode ? " (Pulsa para detener)" : ""}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Button
                      type="button"
                      size="icon"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setIsClickMode(true);
                        if (isRecording) {
                          stopRecording({ autoSubmit: true });
                        } else {
                          startRecording();
                        }
                      }}
                      disabled={isProcessing}
                      className={`transition-all select-none touch-none cursor-pointer z-10 ${isRecording
                        ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 scale-110 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                      aria-label={isRecording ? "Detener grabación" : "Grabar audio"}
                    >
                      {isRecording ? <Mic className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Desktop Only Send Button */}
                  <Button
                    type="submit"
                    size="icon"
                    className="hidden md:flex bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 cursor-pointer"
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
              </div>



              {/* Extras: Fecha + Nota chips */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
                {/* Currency toggle */}
                <button
                  type="button"
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium font-mono border transition-colors cursor-pointer ${newCurrency === "USD"
                    ? "border-chart-5/40 bg-chart-5/10 text-chart-5"
                    : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  onClick={() => setNewCurrency((p) => (p === "ARS" ? "USD" : "ARS"))}
                  title="Cambiar moneda"
                >
                  {newCurrency}
                </button>
                <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${newTxDate
                        ? "border-accent/40 bg-accent/10 text-accent"
                        : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
                        }`}
                      aria-label="Seleccionar fecha"
                    >
                      <CalendarIcon className="w-3 h-3 shrink-0" />
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

                <button
                  type="button"
                  onClick={() => setShowObservation(!showObservation)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${showObservation
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  aria-label="Agregar nota"
                >
                  <StickyNote className="w-3 h-3 shrink-0" />
                  <span>Nota</span>
                </button>

                {/* Character counter moved here */}
                {magicInput.length > 0 && (
                  <div className="ml-auto flex items-center pr-1">
                    <span className={`text-[10px] tabular-nums font-medium ${magicInput.length >= 270 ? "text-destructive" : "text-muted-foreground/60"}`}>
                      {magicInput.length}/300
                    </span>
                  </div>
                )}
              </div>

            </form>
          </div>
        </div>

        {/* Ir a carga manual */}
        <div className="flex justify-center mt-1.5">
          <button
            type="button"
            onClick={onManualEntry}
            className="flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer py-1"
          >
            <PenLine className="w-3 h-3" />
            <span>Ir a carga manual</span>
          </button>
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
