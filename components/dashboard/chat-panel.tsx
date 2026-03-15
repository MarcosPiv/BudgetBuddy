"use client"

import { useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Bot, User, Send, Mic, Loader2, Trash2, Lock, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ChatMessage } from "./shared"

interface ChatPanelProps {
  chatOpen: boolean
  setChatOpen: (v: boolean) => void
  chatMessages: ChatMessage[]
  chatInput: string
  setChatInput: (v: string) => void
  isChatProcessing: boolean
  isChatRecording: boolean
  chatAudioStream: MediaStream | null
  chatEndRef: React.RefObject<HTMLDivElement>
  handleChatSubmit: (e: React.FormEvent) => void
  startChatRecording: () => void
  stopChatRecording: (opts?: { cancel?: boolean }) => void
}

// Canvas-based real-time waveform — no React state re-renders during animation
const AudioWaveform = ({ audioStream }: { audioStream: MediaStream | null }) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap || !audioStream) return

    const w = Math.max(wrap.clientWidth || 0, 40)
    const h = 22
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")!

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 128
    analyser.smoothingTimeConstant = 0.65
    audioCtx.createMediaStreamSource(audioStream).connect(analyser)

    const bufLen = analyser.frequencyBinCount
    const data = new Uint8Array(bufLen)
    const BAR = 28
    const gap = 2
    const barW = Math.max(2, (w - (BAR - 1) * gap) / BAR)
    const step = Math.max(1, Math.floor(bufLen / BAR))

    const draw = () => {
      analyser.getByteFrequencyData(data)
      ctx.clearRect(0, 0, w, h)
      for (let i = 0; i < BAR; i++) {
        let sum = 0
        for (let j = 0; j < step; j++) sum += data[i * step + j] || 0
        const avg = sum / step
        const pct = 0.07 + (avg / 255) * 0.93
        const bh = Math.max(3, h * pct)
        const x = i * (barW + gap)
        const y = (h - bh) / 2
        ctx.fillStyle = `rgba(52,211,153,${0.38 + (avg / 255) * 0.62})`
        ctx.beginPath()
        if (ctx.roundRect) ctx.roundRect(x, y, barW, bh, 1)
        else ctx.rect(x, y, barW, bh)
        ctx.fill()
      }
      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      audioCtx.close().catch(() => {})
    }
  }, [audioStream])

  return (
    <div ref={wrapRef} className="flex-1 min-w-0 h-[22px]">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}

export function ChatPanel({
  chatOpen,
  setChatOpen,
  chatMessages,
  chatInput,
  setChatInput,
  isChatProcessing,
  isChatRecording,
  chatAudioStream,
  chatEndRef,
  handleChatSubmit,
  startChatRecording,
  stopChatRecording,
}: ChatPanelProps) {
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Recording gesture state
  const [isLocked, setIsLocked] = useState(false)
  const [isClickMode, setIsClickMode] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [dragY, setDragY] = useState(0)
  const [recordingTime, setRecordingTime] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  // Reset lock/drag when recording stops
  useEffect(() => {
    if (!isChatRecording) {
      setIsLocked(false)
      setIsClickMode(false)
      setDragX(0)
      setDragY(0)
    }
  }, [isChatRecording])

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isChatRecording) {
      interval = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } else {
      setRecordingTime(0)
    }
    return () => clearInterval(interval)
  }, [isChatRecording])

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`

  useEffect(() => {
    const ta = chatTextareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 144)}px`
  }, [chatInput])

  const lockProgress = Math.min(dragY / 100, 1)
  const cancelProgress = Math.min(dragX / 100, 1)

  return (
    <AnimatePresence>
      {chatOpen && (
        <motion.aside
          className="fixed inset-y-0 right-0 w-full sm:w-96 lg:w-80 xl:w-96 flex flex-col z-50 lg:top-[57px] bg-card border-l border-border shadow-2xl lg:shadow-none"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 32, stiffness: 280 }}
        >
          {/* Chat header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-accent/8 via-transparent to-transparent shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent/15 ring-1 ring-accent/20">
                  <Bot className="w-4.5 h-4.5 text-accent" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground leading-none mb-1">BudgetBuddy AI</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  En línea
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
              onClick={() => setChatOpen(false)}
              aria-label="Cerrar chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {chatMessages.map((msg, i) => (
              <motion.div
                key={i}
                className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-lg shrink-0 mt-0.5 ${msg.role === "bot" ? "bg-accent/15" : "bg-primary/15"
                    }`}
                >
                  {msg.role === "bot" ? (
                    <Bot className="w-3 h-3 text-accent" />
                  ) : (
                    <User className="w-3 h-3 text-primary" />
                  )}
                </div>
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === "bot"
                    ? "bg-secondary text-foreground rounded-tl-md"
                    : "bg-primary text-primary-foreground rounded-tr-md"
                    }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}
            {isChatProcessing && (
              <motion.div
                className="flex gap-2.5"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0 mt-0.5 bg-accent/15">
                  <Bot className="w-3 h-3 text-accent" />
                </div>
                <div className="bg-secondary text-foreground rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="px-4 py-3 border-t border-border shrink-0">
            <form
              onSubmit={handleChatSubmit}
              className="flex items-end gap-2 bg-secondary/50 rounded-xl px-3 py-2 border border-border/60 focus-within:border-accent/50 transition-colors"
            >
              {isChatRecording ? (
                /* ── Recording row ── */
                <div className="flex-1 flex items-center gap-2 min-w-0 py-0.5">
                  {/* Pulse dot + timer */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse shrink-0" />
                    <span className="font-mono text-xs tabular-nums text-foreground">{formatTime(recordingTime)}</span>
                  </div>

                  {/* Canvas waveform */}
                  <AudioWaveform audioStream={chatAudioStream} />

                  {/* Slide-to-cancel hint */}
                  {!isClickMode && !isLocked && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: Math.max(0, 1 - cancelProgress * 1.2) }}
                      className="flex items-center gap-0.5 shrink-0 text-muted-foreground/60 pointer-events-none"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      <span className="text-[10px] font-medium whitespace-nowrap">Cancelar</span>
                    </motion.div>
                  )}
                </div>
              ) : (
                /* ── Normal text input ── */
                <div className="flex-1 min-w-0 flex flex-col">
                  <textarea
                    ref={chatTextareaRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        e.currentTarget.form?.requestSubmit()
                      }
                    }}
                    placeholder="Pregunta sobre tus finanzas..."
                    disabled={isChatProcessing}
                    rows={1}
                    maxLength={400}
                    className="w-full border-0 bg-transparent text-foreground placeholder:text-muted-foreground/40 focus:outline-none text-sm resize-none overflow-hidden leading-5 py-0.5"
                  />
                  {chatInput.length > 0 && (
                    <span className={`text-[10px] tabular-nums text-right mt-0.5 ${chatInput.length >= 360 ? "text-destructive" : "text-muted-foreground/40"}`}>
                      {chatInput.length}/400
                    </span>
                  )}
                </div>
              )}

              {/* Right-side buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <AnimatePresence mode="popLayout">
                  {isLocked ? (
                    /* Locked: show trash (cancel) */
                    <motion.div
                      key="trash"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                    >
                      <Button
                        type="button"
                        size="icon"
                        onClick={() => {
                          stopChatRecording({ cancel: true })
                          setIsLocked(false)
                          setIsClickMode(false)
                        }}
                        className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 cursor-pointer"
                        aria-label="Cancelar grabación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </motion.div>
                  ) : !isChatRecording ? null : null}
                </AnimatePresence>

                {/* Mic button — hold-to-record on mobile, click-to-toggle on desktop */}
                <div className="relative">
                  {/* Lock indicator — rises and highlights with drag */}
                  <AnimatePresence>
                    {isChatRecording && !isClickMode && !isLocked && (
                      <motion.div
                        key="lock-ind"
                        initial={{ opacity: 0, y: 0, scale: 0.6 }}
                        animate={{
                          opacity: 0.35 + lockProgress * 0.65,
                          y: -(28 + dragY * 0.65),
                          scale: 0.8 + lockProgress * 0.2,
                        }}
                        exit={{ opacity: 0, scale: 0.4, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none mb-0.5"
                      >
                        <div
                          className="p-1 rounded-full transition-colors duration-75"
                          style={{
                            background: lockProgress > 0.6 ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.08)",
                          }}
                        >
                          <Lock
                            className="w-3 h-3 transition-colors duration-75"
                            style={{ color: lockProgress > 0.6 ? "rgb(52,211,153)" : "rgba(255,255,255,0.4)" }}
                          />
                        </div>
                        <div
                          className="w-px transition-all duration-75"
                          style={{
                            height: Math.max(2, 8 - lockProgress * 6),
                            background: lockProgress > 0.6 ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.15)",
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    type="button"
                    size="icon"
                    disabled={isChatProcessing}
                    /* Desktop: click to toggle */
                    onPointerDown={(e) => {
                      e.preventDefault()
                      if (e.pointerType === "mouse") {
                        setIsClickMode(true)
                        if (isChatRecording) {
                          stopChatRecording()
                          setIsLocked(false)
                        } else {
                          startChatRecording()
                        }
                        return
                      }
                      // Touch: hold-to-record
                      setIsClickMode(false)
                      if (isLocked) {
                        stopChatRecording()
                        setIsLocked(false)
                      } else {
                        startChatRecording()
                        setIsLocked(false)
                        setDragX(0)
                        setDragY(0)
                        touchStartX.current = e.clientX
                        touchStartY.current = e.clientY
                        e.currentTarget.setPointerCapture(e.pointerId)
                      }
                    }}
                    onPointerMove={(e) => {
                      if (e.pointerType === "mouse") return
                      if (!isChatRecording || isLocked || touchStartX.current === null || touchStartY.current === null) return

                      const deltaX = touchStartX.current - e.clientX
                      const deltaY = touchStartY.current - e.clientY
                      setDragX(Math.max(0, deltaX))
                      setDragY(Math.max(0, deltaY))

                      if (deltaY > 100) {
                        setIsLocked(true)
                        setDragX(0)
                        setDragY(0)
                        touchStartX.current = null
                        touchStartY.current = null
                      } else if (deltaX > 100) {
                        stopChatRecording({ cancel: true })
                        setIsLocked(false)
                        setDragX(0)
                        setDragY(0)
                        touchStartX.current = null
                        touchStartY.current = null
                      }
                    }}
                    onPointerUp={(e) => {
                      if (e.pointerType !== "mouse") {
                        e.currentTarget.releasePointerCapture(e.pointerId)
                        if (!isLocked) {
                          stopChatRecording()
                        }
                        setDragX(0)
                        setDragY(0)
                        touchStartX.current = null
                        touchStartY.current = null
                      }
                    }}
                    onPointerLeave={(e) => {
                      if (e.pointerType !== "mouse" && isChatRecording && !isLocked) {
                        stopChatRecording({ cancel: true })
                      }
                      setDragX(0)
                      setDragY(0)
                    }}
                    onPointerCancel={(e) => {
                      if (e.pointerType !== "mouse") {
                        if (!isLocked) stopChatRecording({ cancel: true })
                        setDragX(0)
                        setDragY(0)
                        touchStartX.current = null
                        touchStartY.current = null
                      }
                    }}
                    style={{
                      transform: isChatRecording && !isLocked
                        ? dragY > 0
                          ? `translateY(-${dragY}px)`
                          : dragX > 0
                            ? `translateX(-${dragX}px)`
                            : "none"
                        : "none",
                      transition: dragX === 0 && dragY === 0 ? "transform 0.2s ease" : "none",
                    }}
                    className={`shrink-0 rounded-lg h-8 w-8 cursor-pointer disabled:opacity-50 select-none touch-none transition-colors ${isChatRecording
                      ? isLocked
                        ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-md"
                        : "bg-destructive text-destructive-foreground hover:bg-destructive/90 scale-110 shadow-[0_0_14px_rgba(239,68,68,0.5)]"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                      }`}
                    aria-label={
                      isChatRecording
                        ? isLocked ? "Enviar grabación" : "Soltar para enviar"
                        : "Mantener para grabar"
                    }
                  >
                    {isChatRecording && isLocked
                      ? <Send className="w-3.5 h-3.5" />
                      : isChatRecording
                        ? <Mic className="w-3.5 h-3.5 animate-pulse" />
                        : <Mic className="w-3.5 h-3.5" />
                    }
                  </Button>
                </div>

                {/* Send text button — hidden while recording */}
                {!isChatRecording && (
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isChatProcessing}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 rounded-lg h-8 w-8 cursor-pointer disabled:opacity-50"
                    aria-label="Enviar"
                  >
                    {isChatProcessing
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Send className="w-3.5 h-3.5" />
                    }
                  </Button>
                )}
              </div>
            </form>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
