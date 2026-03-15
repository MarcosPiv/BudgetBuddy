import type { LucideIcon } from "lucide-react"
import { ShoppingCart, Dumbbell, Code, Car, Coffee, ArrowDownLeft } from "lucide-react"

export const iconMap: Record<string, LucideIcon> = {
  ShoppingCart,
  Dumbbell,
  Code,
  Car,
  Coffee,
  ArrowDownLeft,
}

export const VALID_CATEGORIES = [
  "Comida", "Transporte", "Salidas", "Suscripciones", "Deporte",
  "Educacion", "Salud", "Trabajo", "General",
]

export const CATEGORY_ICON_MAP: Record<string, string> = {
  Comida: "ShoppingCart",
  Transporte: "Car",
  Salidas: "Coffee",
  Suscripciones: "Code",
  Deporte: "Dumbbell",
  Educacion: "Dumbbell",
  Salud: "Dumbbell",
  Trabajo: "ArrowDownLeft",
  General: "ShoppingCart",
}

export const ONBOARDING_KEY = "bb_onboarding_v1"

export interface ChatMessage {
  role: "bot" | "user"
  text: string
}

export interface Attachment {
  type: "image" | "audio" | "file"
  name: string
  url: string
  file: File
}

export function formatDate(d: Date): string {
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return "Hoy"
  if (diff === 1) return "Ayer"
  if (diff < 7) return `Hace ${diff} días`
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "long" })
}

export function formatDateShort(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "")
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function compressImage(file: File, maxPx = 1200, quality = 0.78): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext("2d")
      if (!ctx) { reject(new Error("Canvas not supported")); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Compression failed")),
        "image/jpeg",
        quality,
      )
    }
    img.onerror = reject
    img.src = objectUrl
  })
}
