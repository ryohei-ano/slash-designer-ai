'use client'

import { usePathname } from 'next/navigation'
import { ReactNode, memo, useMemo, useEffect } from 'react'
import { useChatStore } from '@/store/chatStore'

// 特定のパスでは表示しないコンポーネント
const _HIDDEN_PATHS = ['/workspace/select', '/onboarding']

// ヘッダー全体を非表示にするパス
const HEADER_HIDDEN_PATHS = ['/onboarding', '/workspace']

// パスが特定のパターンに一致するかチェックする関数
const isPathMatching = (pathname: string | null, patterns: string[]): boolean => {
  if (!pathname) return false
  return patterns.some((path) => pathname.startsWith(path))
}

// ワークスペースIDをパスから抽出する関数
const extractWorkspaceIdFromPath = (pathname: string | null): string | null => {
  if (!pathname) return null
  const match = pathname.match(/\/workspace\/([^\/]+)/)
  return match ? match[1] : null
}

// メモ化したActiveWorkspaceTrackerコンポーネント
export const ActiveWorkspaceTracker = memo(() => {
  const pathname = usePathname()
  const { setActiveWorkspaceId } = useChatStore()

  // パスからワークスペースIDを抽出
  const workspaceIdFromPath = useMemo(() => {
    return extractWorkspaceIdFromPath(pathname)
  }, [pathname])

  // ワークスペースIDが変更されたらchatStoreに設定
  useEffect(() => {
    if (workspaceIdFromPath) {
      setActiveWorkspaceId(workspaceIdFromPath)
    }
  }, [workspaceIdFromPath, setActiveWorkspaceId])

  return null
})
ActiveWorkspaceTracker.displayName = 'ActiveWorkspaceTracker'

// メモ化したConditionalHeaderコンポーネント
export const ConditionalHeader = memo(({ children }: { children: ReactNode }) => {
  const pathname = usePathname()

  // パスチェックをメモ化
  const shouldHide = useMemo(() => {
    return isPathMatching(pathname, HEADER_HIDDEN_PATHS)
  }, [pathname])

  // 特定のパスではヘッダー全体を非表示
  if (shouldHide) {
    return null
  }

  return (
    <header className="bg-white w-full fixed flex items-center p-4 gap-4 h-16 z-50">
      {children}
    </header>
  )
})
ConditionalHeader.displayName = 'ConditionalHeader'
