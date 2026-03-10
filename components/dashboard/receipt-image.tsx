"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export function ReceiptImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    supabase.storage
      .from("receipts")
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) { setErr(true); return }
        setUrl(data.signedUrl)
      })
  }, [path])

  if (err) return (
    <p className="text-xs text-muted-foreground/60 italic">No se pudo cargar el comprobante.</p>
  )
  if (!url) return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      <span>Cargando comprobante...</span>
    </div>
  )
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block mb-2">
      <img
        src={url}
        alt="Comprobante"
        className="w-full rounded-xl max-h-52 object-cover border border-border hover:opacity-90 transition-opacity"
      />
      <p className="text-[10px] text-muted-foreground/50 mt-1 text-center">Tocá para ver completo</p>
    </a>
  )
}
