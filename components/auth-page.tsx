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
  Github,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApp } from "@/lib/app-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

type Mode = "login" | "register" | "forgot"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

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

  const handleOAuth = async (provider: "google" | "github") => {
    setLoading(true)
    setError(null)
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      })
      if (err) throw err
      // Supabase redirige al proveedor; onAuthStateChange maneja el SIGNED_IN al volver
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ocurrió un error."
      setError(msg)
      setLoading(false)
    }
  }

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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError("El email no tiene un formato válido.")
      return
    }
    if (mode === "register" && name.trim().length > 50) {
      setError("El nombre no puede tener más de 50 caracteres.")
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
        toast.success("¡Bienvenido de vuelta!", { description: email })
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
        } else {
          toast.success("¡Cuenta creada!", { description: `Bienvenido${name.trim() ? `, ${name.trim()}` : ""}` })
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
      } else if (msg.includes("email rate limit exceeded") || msg.includes("rate limit")) {
        setError("Demasiados intentos. Esperá unos minutos antes de volver a intentar.")
      } else if (msg.includes("over_email_send_rate_limit")) {
        setError("Límite de emails alcanzado. Intentá de nuevo en unos minutos.")
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(forgotEmail.trim())) {
      setError("El email no tiene un formato válido.")
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
        className="fixed z-50 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        style={{ top: "max(1.5rem, env(safe-area-inset-top))", left: "max(1.5rem, env(safe-area-inset-left))" }}
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

          {/* OAuth buttons */}
          {mode !== "forgot" && (
            <div className="mt-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border/60" />
                <span className="text-xs text-muted-foreground">o continuá con</span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 h-11 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/70 text-foreground text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <GoogleIcon />
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuth("github")}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 h-11 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/70 text-foreground text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Github className="w-4 h-4 shrink-0" />
                  GitHub
                </button>
              </div>
            </div>
          )}

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
