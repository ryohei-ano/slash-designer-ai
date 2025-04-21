"use client"

import { useEffect, useState } from "react"
import { LoadingSpinner } from "./loading-spinner"

interface LoadingProps {
  delay?: number // ミリ秒単位のディレイ（短い読み込みならスピナーを表示しない）
}

export function Loading({ delay = 500 }: LoadingProps) {
  const [showSpinner, setShowSpinner] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSpinner(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  if (!showSpinner) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" className="text-primary" />
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    </div>
  )
}