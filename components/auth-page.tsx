"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Wallet, Mail, Lock, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApp } from "@/lib/app-context"
import { supabase } from "@/lib/supabase"

export function AuthPage() {
  const { setView } = useApp()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!email.trim() || !password.trim()) {
      setError("Completá todos los campos.")
      return
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }

    setLoading(true)
    try {
      if (isLogin) {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        // Navigation handled by onAuthStateChange in AppProvider
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        setSuccessMsg("¡Cuenta creada! Revisá tu email para confirmar y luego iniciá sesión.")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ocurrió un error."
      // Translate common Supabase error messages to Spanish
      if (msg.includes("Invalid login credentials")) {
        setError("Email o contraseña incorrectos.")
      } else if (msg.includes("User already registered")) {
        setError("Ya existe una cuenta con ese email.")
      } else if (msg.includes("Email not confirmed")) {
        setError("Confirmá tu email antes de iniciar sesión.")
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-1/4 left-1/3 w-[400px] h-[300px] rounded-full bg-accent/5 blur-[100px]" />

      {/* Back button */}
      <motion.button
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        onClick={() => setView("landing")}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Volver</span>
      </motion.button>

      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="glass rounded-2xl border border-border p-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {isLogin ? "Bienvenido de vuelta" : "Crea tu cuenta"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLogin
                ? "Inicia sesion para continuar"
                : "Registrate para empezar a trackear"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm text-muted-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-sm text-muted-foreground">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11"
                  disabled={loading}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
              </div>
            </div>

            {/* Error / success feedback */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 px-3.5 py-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive leading-snug">{error}</p>
                </motion.div>
              )}
              {successMsg && (
                <motion.div
                  key="success"
                  className="flex items-start gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-500 leading-snug">{successMsg}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 font-semibold rounded-xl cursor-pointer"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLogin ? (
                "Iniciar sesion"
              ) : (
                "Crear cuenta"
              )}
            </Button>
          </form>

          {/* Toggle login / register */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "No tienes cuenta? " : "Ya tienes cuenta? "}
            <button
              type="button"
              className="text-primary hover:underline font-medium cursor-pointer"
              onClick={() => {
                setIsLogin(!isLogin)
                setError(null)
                setSuccessMsg(null)
              }}
            >
              {isLogin ? "Registrate" : "Inicia sesion"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
