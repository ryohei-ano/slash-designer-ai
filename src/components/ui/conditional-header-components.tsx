'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import { WorkspaceSelector } from './workspace-selector'
import { HeaderTabs } from './header-tabs'

// 特定のパスでは表示しないコンポーネント
const HIDDEN_PATHS = ['/workspace/select', '/onboarding']

// ヘッダー全体を非表示にするパス
const HEADER_HIDDEN_PATHS = ['/onboarding']

export function WorkspaceSelectorWithCondition() {
  const pathname = usePathname()

  // 特定のパスでは非表示
  if (HIDDEN_PATHS.some((path) => pathname?.startsWith(path))) {
    return null
  }

  return <WorkspaceSelector />
}

export function HeaderTabsWithCondition() {
  const pathname = usePathname()

  // 特定のパスでは非表示
  if (HIDDEN_PATHS.some((path) => pathname?.startsWith(path))) {
    return null
  }

  return <HeaderTabs />
}

export function ConditionalHeader({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // 特定のパスではヘッダー全体を非表示
  if (HEADER_HIDDEN_PATHS.some((path) => pathname?.startsWith(path))) {
    return null
  }

  return (
    <header className="bg-white w-full fixed flex items-center p-4 gap-4 h-16 z-50">
      {children}
    </header>
  )
}
