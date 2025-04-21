"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

const getTabs = (workspaceId: string) => [
  { name: "デザイナー", href: `/workspace/${workspaceId}/designer` },
  { name: "タスク", href: `/workspace/${workspaceId}/tasks` },
  { name: "チャット", href: `/workspace/${workspaceId}/chat` },
  { name: "お支払い", href: `/workspace/${workspaceId}/billing` },
]

export function WorkspaceTabs({ workspaceId }: { workspaceId: string }) {
  const pathname = usePathname()
  const tabs = getTabs(workspaceId)

  return (
    <nav className="flex justify-center">
      <div className="flex space-x-6">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "text-sm font-medium border-b-2 transition-colors",
              pathname === tab.href
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            )}
          >
            {tab.name}
          </Link>
        ))}
      </div>
    </nav>
  )
}
