"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Wallet, Mail, Lock, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApp } from "@/lib/app-context"

export function AuthPage() {
  const { setView } = useApp()
  const [isLogin, setIsLogin] = useState(true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setView("settings")
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
        {/* Glass card */}
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
                  className="pl-10 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-sm text-muted-foreground">
                Contrasena
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  className="pl-10 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 font-semibold rounded-xl cursor-pointer"
            >
              {isLogin ? "Iniciar sesion" : "Crear cuenta"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">o continuar con</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-border bg-secondary/30 text-foreground hover:bg-secondary/60 h-11 rounded-xl cursor-pointer"
              onClick={() => setView("settings")}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-border bg-secondary/30 text-foreground hover:bg-secondary/60 h-11 rounded-xl cursor-pointer"
              onClick={() => setView("settings")}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2 fill-current" aria-hidden="true">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </Button>
          </div>

          {/* Toggle */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "No tienes cuenta? " : "Ya tienes cuenta? "}
            <button
              className="text-primary hover:underline font-medium cursor-pointer"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Registrate" : "Inicia sesion"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
