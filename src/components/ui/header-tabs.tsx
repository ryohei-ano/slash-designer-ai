'use client'

import { usePathname } from 'next/navigation'
import { WorkspaceTabs } from './workspace-tabs'
import { memo, useMemo } from 'react'

// メモ化したHeaderTabsコンポーネント
export const HeaderTabs = memo(() => {
  const pathname = usePathname()

  // パスからワークスペースIDを抽出（メモ化）
  const workspaceInfo = useMemo(() => {
    const isWorkspacePage = pathname?.startsWith('/workspace')

    if (!isWorkspacePage) {
      return { isWorkspacePage: false }
    }

    const workspaceIdMatch = pathname?.match(/\/workspace\/([^\/]+)/)
    const workspaceId = workspaceIdMatch ? workspaceIdMatch[1] : undefined

    return { isWorkspacePage, workspaceId }
  }, [pathname])

  // ワークスペースページでない、またはIDが取得できない場合は何も表示しない
  if (!workspaceInfo.isWorkspacePage || !workspaceInfo.workspaceId) {
    return null
  }

  return <WorkspaceTabs workspaceId={workspaceInfo.workspaceId} />
})
HeaderTabs.displayName = 'HeaderTabs'
