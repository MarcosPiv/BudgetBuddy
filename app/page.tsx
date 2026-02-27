"use client"

import { AppProvider, useApp } from "@/lib/app-context"
import { LandingPage } from "@/components/landing-page"
import { AuthPage } from "@/components/auth-page"
import { SettingsPage } from "@/components/settings-page"
import { DashboardPage } from "@/components/dashboard-page"
import { ProfilePage } from "@/components/profile-page"
import { AnimatePresence, motion } from "framer-motion"

function AppRouter() {
  const { currentView } = useApp()

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
