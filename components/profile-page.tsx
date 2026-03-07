"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  User,
  Lock,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useApp } from "@/lib/app-context"
import { supabase } from "@/lib/supabase"

export function ProfilePage() {
  const { setView, userName, setUserName, saveProfile } = useApp()
  const [localName, setLocalName] = useState(userName)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savedName, setSavedName] = useState(false)
  const [savedPassword, setSavedPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")

  const handleSaveName = async () => {
    if (!localName.trim()) return
    setUserName(localName.trim())
    await saveProfile()
    setSavedName(true)
    setTimeout(() => setSavedName(false), 2000)
  }

  const handleSavePassword = async () => {
    setPasswordError("")
    if (newPassword.length < 6) {
      setPasswordError("La nueva contraseña debe tener al menos 6 caracteres")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden")
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordError(error.message)
      return
    }
    setSavedPassword(true)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setTimeout(() => setSavedPassword(false), 2000)
  }

  const initials = localName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U"

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />

      <motion.button
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        onClick={() => setView("dashboard")}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Dashboard</span>
      </motion.button>

      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="glass rounded-2xl border border-border p-8">
          {/* Avatar & Title */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
            <p className="text-sm text-muted-foreground text-center">
              Administra tu nombre y contrasena
            </p>
          </div>

          {/* Name Section */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <User className="w-4 h-4 text-muted-foreground" />
              Nombre
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profileName" className="sr-only">
                Nombre
              </Label>
              <Input
                id="profileName"
                type="text"
                placeholder="Tu nombre"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11"
              />
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 font-semibold rounded-xl cursor-pointer"
                onClick={handleSaveName}
                disabled={!localName.trim() || localName.trim() === userName}
              >
                {savedName ? (
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4" /> Guardado
                  </span>
                ) : (
                  "Guardar nombre"
                )}
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border mb-8" />

          {/* Password Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Lock className="w-4 h-4 text-muted-foreground" />
              Cambiar contrasena
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="currentPw" className="text-xs text-muted-foreground">
                  Contrasena actual
                </Label>
                <div className="relative">
                  <Input
                    id="currentPw"
                    type={showCurrent ? "text" : "password"}
                    placeholder="********"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-10 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showCurrent ? "Ocultar" : "Mostrar"}
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newPw" className="text-xs text-muted-foreground">
                  Nueva contrasena
                </Label>
                <div className="relative">
                  <Input
                    id="newPw"
                    type={showNew ? "text" : "password"}
                    placeholder="Min. 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showNew ? "Ocultar" : "Mostrar"}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPw" className="text-xs text-muted-foreground">
                  Confirmar nueva contrasena
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPw"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeti la nueva contrasena"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/50 h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showConfirm ? "Ocultar" : "Mostrar"}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {passwordError && (
                <motion.div
                  className="flex items-center gap-2 text-sm text-destructive"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {passwordError}
                </motion.div>
              )}

              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 font-semibold rounded-xl cursor-pointer mt-1"
                onClick={handleSavePassword}
                disabled={!currentPassword || !newPassword || !confirmPassword}
              >
                {savedPassword ? (
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4" /> Contrasena actualizada
                  </span>
                ) : (
                  "Cambiar contrasena"
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
