"use client"

import { useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Bot, User, Send, Mic, MicOff } from "lucide-react"
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
  chatEndRef: React.RefObject<HTMLDivElement>
  handleChatSubmit: (e: React.FormEvent) => void
  startChatRecording: () => void
  stopChatRecording: () => void
}

export function ChatPanel({
  chatOpen,
  setChatOpen,
  chatMessages,
  chatInput,
  setChatInput,
  isChatProcessing,
  isChatRecording,
  chatEndRef,
  handleChatSubmit,
  startChatRecording,
  stopChatRecording,
}: ChatPanelProps) {
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const ta = chatTextareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 144)}px`
  }, [chatInput])

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
                  className={`flex items-center justify-center w-6 h-6 rounded-lg shrink-0 mt-0.5 ${
                    msg.role === "bot" ? "bg-accent/15" : "bg-primary/15"
                  }`}
                >
                  {msg.role === "bot" ? (
                    <Bot className="w-3 h-3 text-accent" />
                  ) : (
                    <User className="w-3 h-3 text-primary" />
                  )}
                </div>
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "bot"
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

          {/* Input */}
          <div className="px-4 py-3 border-t border-border shrink-0">
            <form
              onSubmit={handleChatSubmit}
              className="flex items-end gap-2 bg-secondary/50 rounded-xl px-3 py-2 border border-border/60 focus-within:border-accent/50 transition-colors"
            >
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
                placeholder={isChatRecording ? "Grabando audio..." : "Pregunta sobre tus finanzas..."}
                disabled={isChatProcessing || isChatRecording}
                rows={1}
                className="flex-1 min-w-0 border-0 bg-transparent text-foreground placeholder:text-muted-foreground/40 focus:outline-none text-sm resize-none overflow-hidden leading-5 py-0.5"
              />
              <Button
                type="button"
                size="icon"
                disabled={isChatProcessing}
                onClick={() => isChatRecording ? stopChatRecording() : startChatRecording()}
                className={`shrink-0 rounded-lg h-8 w-8 cursor-pointer disabled:opacity-50 transition-colors ${
                  isChatRecording
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-pulse"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
                aria-label={isChatRecording ? "Detener grabación" : "Grabar audio"}
              >
                {isChatRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </Button>
              <Button
                type="submit"
                size="icon"
                disabled={isChatProcessing || isChatRecording}
                className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 rounded-lg h-8 w-8 cursor-pointer disabled:opacity-50"
                aria-label="Enviar"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
