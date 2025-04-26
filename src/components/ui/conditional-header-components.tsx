'use client'

import { usePathname } from 'next/navigation'
import { ReactNode, memo, useMemo, useEffect } from 'react'
import { WorkspaceSelector } from './workspace-selector'
import { HeaderTabs } from './header-tabs'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useChatStore } from '@/store/chatStore'

// 特定のパスでは表示しないコンポーネント
const HIDDEN_PATHS = ['/workspace/select', '/onboarding']

// ヘッダー全体を非表示にするパス
const HEADER_HIDDEN_PATHS = ['/onboarding']

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

// メモ化したWorkspaceSelectorWithConditionコンポーネント
export const WorkspaceSelectorWithCondition = memo(() => {
  const pathname = usePathname()

  // パスチェックをメモ化
  const shouldHide = useMemo(() => {
    return isPathMatching(pathname, HIDDEN_PATHS)
  }, [pathname])

  // 特定のパスでは非表示
  if (shouldHide) {
    return null
  }

  return <WorkspaceSelector />
})
WorkspaceSelectorWithCondition.displayName = 'WorkspaceSelectorWithCondition'

// メモ化したHeaderTabsWithConditionコンポーネント
export const HeaderTabsWithCondition = memo(() => {
  const pathname = usePathname()
  const { setActiveWorkspaceId } = useChatStore()
  const { currentWorkspace } = useWorkspaceStore()

  // パスチェックをメモ化
  const shouldHide = useMemo(() => {
    return isPathMatching(pathname, HIDDEN_PATHS)
  }, [pathname])

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

  // 現在のワークスペースとパスのワークスペースIDが一致しない場合の処理
  useEffect(() => {
    if (currentWorkspace && workspaceIdFromPath && currentWorkspace.id !== workspaceIdFromPath) {
      // ここでは何もしない（ワークスペースセレクターで処理される）
      console.log('Path workspace ID does not match current workspace')
    }
  }, [currentWorkspace, workspaceIdFromPath])

  // 特定のパスでは非表示
  if (shouldHide) {
    return null
  }

  return <HeaderTabs />
})
HeaderTabsWithCondition.displayName = 'HeaderTabsWithCondition'

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
