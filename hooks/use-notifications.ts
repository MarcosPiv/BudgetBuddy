"use client"

import { useCallback } from "react"

export function useNotifications() {
  const isSupported = typeof window !== "undefined" && "Notification" in window

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false
    if (Notification.permission === "granted") return true
    if (Notification.permission === "denied") return false
    const result = await Notification.requestPermission()
    return result === "granted"
  }, [isSupported])

  const showNotification = useCallback(async (title: string, body: string, tag?: string) => {
    if (!isSupported || Notification.permission !== "granted") return
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification(title, {
          body,
          icon: "/icon.svg",
          badge: "/icon-maskable.svg",
          tag: tag ?? "budgetbuddy",
          renotify: true,
        })
      } else {
        new Notification(title, { body, icon: "/icon.svg" })
      }
    } catch {
      // Silently fail — notifications are non-critical
    }
  }, [isSupported])

  return {
    isSupported,
    permission: isSupported ? Notification.permission : ("denied" as NotificationPermission),
    requestPermission,
    showNotification,
  }
}
