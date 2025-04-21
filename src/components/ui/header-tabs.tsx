"use client"

import { usePathname } from "next/navigation"
import { WorkspaceTabs } from "./workspace-tabs"

export function HeaderTabs() {
  const pathname = usePathname()
  const isWorkspacePage = pathname?.startsWith("/workspace")
  
  // パスからワークスペースIDを抽出
  const workspaceIdMatch = pathname?.match(/\/workspace\/([^\/]+)/)
  const workspaceId = workspaceIdMatch ? workspaceIdMatch[1] : undefined

  if (!isWorkspacePage || !workspaceId) {
    return null
  }

  return <WorkspaceTabs workspaceId={workspaceId} />
}
