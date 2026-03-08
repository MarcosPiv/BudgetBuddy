"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Wallet,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserRound,
  KeyRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApp } from "@/lib/app-context"
import { supabase } from "@/lib/supabase"

type Mode = "login" | "register" | "forgot"

export function AuthPage() {
  const { setView, isPasswordRecovery, setIsPasswordRecovery } = useApp()

  const [mode, setMode] = useState<Mode>("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState("")

  // Recovery form (PASSWORD_RECOVERY event)
  const [recoveryPassword, setRecoveryPassword] = useState("")
  const [recoveryConfirm, setRecoveryConfirm] = useState("")
  const [showRecovery, setShowRecovery] = useState(false)
  const [showRecoveryConfirm, setShowRecoveryConfirm] = useState(false)

  const clearMessages = () => {
    setError(null)
    setSuccessMsg(null)
  }

  const switchMode = (next: Mode) => {
    clearMessages()
    setName("")
    setEmail("")
    setPassword("")
    setShowPassword(false)
    setMode(next)
  }

  // ── Login / Register ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()

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
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        // Navigation handled by onAuthStateChange in AppProvider
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          },
        })
        if (err) throw err

        // Save name to profile immediately after signup
        if (data.user && name.trim()) {
          await supabase
            .from("profiles")
            .upsert({ id: data.user.id, user_name: name.trim() }, { onConflict: "id" })
        }

        if (!data.session) {
          // Email confirmation required
          setSuccessMsg("¡Cuenta creada! Revisá tu email para confirmar y luego iniciá sesión.")
        }
        // If session exists, onAuthStateChange fires → loads profile with real name → dashboard
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ocurrió un error."
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

  // ── Forgot password ─────────────────────────────────────────────────────────
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()

    if (!forgotEmail.trim()) {
      setError("Ingresá tu email.")
      return
    }

    setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined,
      })
      if (err) throw err
      setSuccessMsg("Te enviamos un email con el link para restablecer tu contraseña. Revisá tu bandeja de entrada.")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ocurrió un error."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Password recovery ───────────────────────────────────────────────────────
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()

    if (recoveryPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }
    if (recoveryPassword !== recoveryConfirm) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password: recoveryPassword })
      if (err) throw err
      setIsPasswordRecovery(false)
      // USER_UPDATED event fires → onAuthStateChange navigates to dashboard
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ocurrió un error."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Shared feedback block ───────────────────────────────────────────────────
  const FeedbackBlock = () => (
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
  )

  // ── Recovery form (after clicking reset link in email) ──────────────────────
  if (isPasswordRecovery) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />

        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="glass rounded-2xl border border-border p-8">
            <div className="flex flex-col items-center gap-3 mb-8">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary">
                <KeyRound className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Nueva contraseña</h1>
              <p className="text-sm text-muted-foreground text-center">
                Elegí una nueva contraseña para tu cuenta.
              </p>
            </div>

            <form onSubmit={handleRecoverySubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="rec-pw" className="text-sm text-muted-foreground">
                  Nueva contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="rec-pw"
                    type={showRecovery ? "text" : "password"}
                    placeholder="Min. 6 caracteres"
                    value={recoveryPassword}
                    onChange={(e) => setRecoveryPassword(e.target.value)}
                    className="pl-10 pr-10 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecovery(!showRecovery)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showRecovery ? "Ocultar" : "Mostrar"}
                  >
                    {showRecovery ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="rec-confirm" className="text-sm text-muted-foreground">
                  Confirmar contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="rec-confirm"
                    type={showRecoveryConfirm ? "text" : "password"}
                    placeholder="Repetí la contraseña"
                    value={recoveryConfirm}
                    onChange={(e) => setRecoveryConfirm(e.target.value)}
                    className="pl-10 pr-10 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryConfirm(!showRecoveryConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showRecoveryConfirm ? "Ocultar" : "Mostrar"}
                  >
                    {showRecoveryConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <FeedbackBlock />

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 font-semibold rounded-xl cursor-pointer mt-1"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Guardar nueva contraseña"
                )}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Main auth card ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-1/4 left-1/3 w-[400px] h-[300px] rounded-full bg-accent/5 blur-[100px]" />

      <motion.button
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        onClick={() => {
          if (mode === "forgot") {
            switchMode("login")
          } else {
            setView("landing")
          }
        }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">{mode === "forgot" ? "Iniciar sesión" : "Volver"}</span>
      </motion.button>

      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="glass rounded-2xl border border-border p-8">

          {/* ── Logo ───────────────────────────────────────────── */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {mode === "login" && "Bienvenido de vuelta"}
              {mode === "register" && "Crea tu cuenta"}
              {mode === "forgot" && "Recuperar contraseña"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login" && "Inicia sesion para continuar"}
              {mode === "register" && "Registrate para empezar a trackear"}
              {mode === "forgot" && "Te enviamos un link a tu email"}
            </p>
          </div>

          {/* ── Forgot password form ────────────────────────────── */}
          <AnimatePresence mode="wait">
            {mode === "forgot" ? (
              <motion.form
                key="forgot"
                onSubmit={handleForgotSubmit}
                className="flex flex-col gap-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="forgot-email" className="text-sm text-muted-foreground">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="pl-10 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11"
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <FeedbackBlock />

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 font-semibold rounded-xl cursor-pointer mt-1"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Enviar link de recuperacion"
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium cursor-pointer"
                    onClick={() => switchMode("login")}
                  >
                    Volver al inicio de sesion
                  </button>
                </p>
              </motion.form>
            ) : (

              /* ── Login / Register form ─────────────────────────── */
              <motion.form
                key="auth"
                onSubmit={handleSubmit}
                className="flex flex-col gap-4"
                initial={{ opacity: 0, x: mode === "register" ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Name field — only on signup */}
                <AnimatePresence initial={false}>
                  {mode === "register" && (
                    <motion.div
                      className="flex flex-col gap-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Label htmlFor="name" className="text-sm text-muted-foreground">
                        Tu nombre
                      </Label>
                      <div className="relative">
                        <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="name"
                          type="text"
                          placeholder="Juan García"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-10 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11"
                          disabled={loading}
                          autoComplete="name"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email */}
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

                {/* Password */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password" className="text-sm text-muted-foreground">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11"
                      disabled={loading}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Forgot password link */}
                  {mode === "login" && (
                    <button
                      type="button"
                      className="self-end text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      onClick={() => switchMode("forgot")}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>

                <FeedbackBlock />

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 font-semibold rounded-xl cursor-pointer mt-1"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : mode === "login" ? (
                    "Iniciar sesion"
                  ) : (
                    "Crear cuenta"
                  )}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Switch mode link */}
          {mode !== "forgot" && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              {mode === "login" ? "No tienes cuenta? " : "Ya tienes cuenta? "}
              <button
                type="button"
                className="text-primary hover:underline font-medium cursor-pointer"
                onClick={() => switchMode(mode === "login" ? "register" : "login")}
              >
                {mode === "login" ? "Registrate" : "Inicia sesion"}
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
