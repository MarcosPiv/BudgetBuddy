"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export interface DolarRate {
  nombre: string
  compra: number
  venta: number
  fechaActualizacion: string
}

export interface ExchangeRates {
  blue: DolarRate | null
  oficial: DolarRate | null
  tarjeta: DolarRate | null
  mep: DolarRate | null
}

interface UseExchangeRateOptions {
  enabled: boolean
  refreshInterval?: number // ms, default 5 minutes
}

interface UseExchangeRateReturn {
  rates: ExchangeRates
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => void
}

const EMPTY_RATES: ExchangeRates = {
  blue: null,
  oficial: null,
  tarjeta: null,
  mep: null,
}

const CASA_MAP: Record<string, keyof ExchangeRates> = {
  blue: "blue",
  oficial: "oficial",
  tarjeta: "tarjeta",
  mep: "mep",
  bolsa: "mep",
}

export function useExchangeRate({
  enabled,
  refreshInterval = 5 * 60 * 1000,
}: UseExchangeRateOptions): UseExchangeRateReturn {
  const [rates, setRates] = useState<ExchangeRates>(EMPTY_RATES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchRates = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("https://dolarapi.com/v1/dolares", {
        cache: "no-store",
      })

      if (!res.ok) throw new Error(`Error ${res.status}`)

      const data: Array<{ casa: string; nombre: string; compra: number; venta: number; fechaActualizacion: string }> =
        await res.json()

      const next: ExchangeRates = { ...EMPTY_RATES }

      for (const item of data) {
        const key = CASA_MAP[item.casa.toLowerCase()]
        if (key) {
          next[key] = {
            nombre: item.nombre,
            compra: item.compra,
            venta: item.venta,
            fechaActualizacion: item.fechaActualizacion,
          }
        }
      }

      setRates(next)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al obtener cotizaciones")
    } finally {
      setLoading(false)
    }
  }, [enabled])

  // Fetch on mount and when enabled changes
  useEffect(() => {
    if (!enabled) {
      setRates(EMPTY_RATES)
      setError(null)
      return
    }

    fetchRates()

    intervalRef.current = setInterval(fetchRates, refreshInterval)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [enabled, fetchRates, refreshInterval])

  return { rates, loading, error, lastUpdated, refresh: fetchRates }
}
