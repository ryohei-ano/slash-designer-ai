'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const getTabs = (workspaceId?: string) => [
  {
    name: 'デザイナー',
    href: workspaceId ? `/workspace/${workspaceId}/designer` : '/workspace/select',
  },
  { name: 'タスク', href: workspaceId ? `/workspace/${workspaceId}/tasks` : '/workspace/select' },
  { name: 'チャット', href: workspaceId ? `/workspace/${workspaceId}/chat` : '/workspace/select' },
  {
    name: 'お支払い',
    href: workspaceId ? `/workspace/${workspaceId}/billing` : '/workspace/select',
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  // パスからワークスペースIDを抽出
  // /workspace/[id] 形式のパスからIDを取得
  const workspaceIdMatch = pathname.match(/\/workspace\/([^\/]+)/)
  const workspaceId = workspaceIdMatch ? workspaceIdMatch[1] : undefined
  const tabs = getTabs(workspaceId)
  const [isOpen, setIsOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Check if the screen is mobile on mount and when window is resized
  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // Auto-close sidebar on mobile
      if (mobile) {
        setIsOpen(false)
      }
    }

    // Check on mount
    checkIfMobile()

    // Add event listener for resize
    window.addEventListener('resize', checkIfMobile)

    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  // Store sidebar state in localStorage
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebarOpen', isOpen.toString())
    }
  }, [isOpen, isMobile])

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const storedState = localStorage.getItem('sidebarOpen')
    if (storedState !== null && !isMobile) {
      setIsOpen(storedState === 'true')
    }
  }, [isMobile])

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed bg-white left-0 top-16 z-40 h-[calc(100vh-4rem)] text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out',
          isOpen ? 'w-64' : 'w-16',
          isMobile && !isOpen && '-translate-x-full'
        )}
      >
        {/* Sidebar header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          {isOpen && <h2 className="text-lg font-semibold">ダッシュボード</h2>}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-md bg-sidebar-accent hover:bg-sidebar-primary hover:text-sidebar-primary-foreground text-sidebar-foreground transition-colors"
            aria-label={isOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
          >
            <span className="text-lg font-bold">{isOpen ? '←' : '→'}</span>
          </button>
        </div>

        {/* Navigation links */}
        <nav className="p-4">
          <ul className="space-y-2">
            {tabs.map((tab) => {
              const isActive =
                pathname === tab.href ||
                (pathname === '/workspace' &&
                  tab.href.includes('/workspace/') &&
                  tab.href.endsWith('/designer'))

              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    className={cn(
                      'flex items-center rounded-md p-2 transition-colors',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <span className={cn('text-xl', isOpen ? 'mr-3' : 'mx-auto')}>
                      {/* No icons as requested */}
                    </span>
                    {isOpen && <span>{tab.name}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Toggle button for mobile (outside sidebar) */}
      {isMobile && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-20 left-4 z-50 p-2 rounded-md bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
          aria-label="サイドバーを開く"
        >
          <span className="text-lg font-bold">→</span>
        </button>
      )}
    </>
  )
}

export function DashboardTabs() {
  const pathname = usePathname()
  // パスからワークスペースIDを抽出
  // /workspace/[id] 形式のパスからIDを取得
  const workspaceIdMatch = pathname.match(/\/workspace\/([^\/]+)/)
  const workspaceId = workspaceIdMatch ? workspaceIdMatch[1] : undefined
  const tabs = getTabs(workspaceId)

  return (
    <nav className="flex justify-center">
      <div className="flex space-x-6">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'text-sm font-medium border-b-2 transition-colors',
              pathname === tab.href ||
                (pathname === '/workspace' &&
                  tab.href.includes('/workspace/') &&
                  tab.href.endsWith('/designer'))
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            )}
          >
            {tab.name}
          </Link>
        ))}
      </div>
    </nav>
  )
}
