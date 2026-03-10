"use client"

import dynamic from "next/dynamic"
import { AppProvider, useApp } from "@/lib/app-context"
import { LandingPage } from "@/components/landing-page"
import { AuthPage } from "@/components/auth-page"
import { NotificationManager } from "@/components/notification-manager"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2 } from "lucide-react"

// Code-split heavy pages — only load the JS chunk when the view is active
const DashboardPage = dynamic(
  () => import("@/components/dashboard-page").then((m) => ({ default: m.DashboardPage })),
  { ssr: false }
)
const SettingsPage = dynamic(
  () => import("@/components/settings-page").then((m) => ({ default: m.SettingsPage })),
  { ssr: false }
)
const ProfilePage = dynamic(
  () => import("@/components/profile-page").then((m) => ({ default: m.ProfilePage })),
  { ssr: false }
)
const AnalyticsPage = dynamic(
  () => import("@/components/analytics-page").then((m) => ({ default: m.AnalyticsPage })),
  { ssr: false }
)

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
        {currentView === "analytics" && <AnalyticsPage />}
      </motion.div>
    </AnimatePresence>
  )
}

export default function Home() {
  return (
    <AppProvider>
      <NotificationManager />
      <AppRouter />
    </AppProvider>
  )
}
