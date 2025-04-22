'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { memo } from 'react'

// タブ定義を定数化して再計算を防止
const TABS = [
  { name: 'デザイナー', path: '/designer' },
  { name: 'タスク', path: '/tasks' },
  { name: 'チャット', path: '/chat' },
  { name: 'お支払い', path: '/billing' },
]

// メモ化したタブコンポーネント
const TabLink = memo(
  ({
    href,
    isActive,
    children,
  }: {
    href: string
    isActive: boolean
    children: React.ReactNode
  }) => (
    <Link
      href={href}
      className={cn(
        'text-sm font-medium border-b-2 transition-colors',
        isActive
          ? 'border-primary text-primary font-semibold'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
      )}
    >
      {children}
    </Link>
  )
)
TabLink.displayName = 'TabLink'

// メモ化したWorkspaceTabsコンポーネント
export const WorkspaceTabs = memo(({ workspaceId }: { workspaceId: string }) => {
  const pathname = usePathname()

  return (
    <nav className="flex justify-center">
      <div className="flex space-x-6">
        {TABS.map((tab) => {
          const href = `/workspace/${workspaceId}${tab.path}`
          const isActive = pathname === href

          return (
            <TabLink key={href} href={href} isActive={isActive}>
              {tab.name}
            </TabLink>
          )
        })}
      </div>
    </nav>
  )
})
WorkspaceTabs.displayName = 'WorkspaceTabs'
