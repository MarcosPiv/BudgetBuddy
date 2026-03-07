"use client"

import { AppProvider, useApp } from "@/lib/app-context"
import { LandingPage } from "@/components/landing-page"
import { AuthPage } from "@/components/auth-page"
import { SettingsPage } from "@/components/settings-page"
import { DashboardPage } from "@/components/dashboard-page"
import { ProfilePage } from "@/components/profile-page"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2 } from "lucide-react"

function AppRouter() {
  const { currentView, loadingAuth } = useApp()

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="min-h-screen"
      >
        {currentView === "landing" && <LandingPage />}
        {currentView === "auth" && <AuthPage />}
        {currentView === "settings" && <SettingsPage />}
        {currentView === "dashboard" && <DashboardPage />}
        {currentView === "profile" && <ProfilePage />}
      </motion.div>
    </AnimatePresence>
  )
}

export default function Home() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  )
}
