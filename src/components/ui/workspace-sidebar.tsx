'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Plus, Settings } from 'lucide-react'
import { Workspace } from '@/app/actions/workspace'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useChatStore } from '@/store/chatStore'
import Link from 'next/link'
import { WorkspaceSelector } from './workspace-selector'

export function WorkspaceSidebar() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const [_isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Zustandストアから状態とアクションを取得
  const { workspaces, currentWorkspace, isLoading, error, fetchWorkspaces, switchWorkspace } =
    useWorkspaceStore()
  const { clearWorkspaceChats, setActiveWorkspaceId } = useChatStore()

  // ユーザーのワークスペースを取得（初回のみ）
  useEffect(() => {
    if (!isLoaded || !user) return

    // ワークスペース一覧を取得
    fetchWorkspaces(user.id)
  }, [user, isLoaded, fetchWorkspaces])

  // ワークスペースを切り替えてページ遷移
  const handleSwitchWorkspace = (workspace: Workspace) => {
    // 現在のワークスペースと異なる場合のみ処理を実行
    if (!currentWorkspace || currentWorkspace.id !== workspace.id) {
      // 現在のワークスペースのチャットデータをクリア
      if (currentWorkspace) {
        clearWorkspaceChats(currentWorkspace.id)
      }

      // アクティブなワークスペースIDを設定
      setActiveWorkspaceId(workspace.id)

      // ワークスペースを切り替え
      switchWorkspace(workspace)

      // 新しいワークスペースページに遷移
      router.push(`/workspace/${workspace.id}`)
    }
  }

  // 新しいワークスペースを作成
  const handleCreateWorkspace = () => {
    router.push('/onboarding')
  }

  // ワークスペース編集ダイアログを開く
  const openEditDialog = (workspace: Workspace) => {
    if (workspace) {
      switchWorkspace(workspace)
      setIsEditDialogOpen(true)
    }
  }

  // 現在のワークスペースIDを取得
  const currentWorkspaceId = pathname.match(/\/workspace\/([^\/]+)/)?.[1]

  // ワークスペースが読み込み中または存在しない場合
  if (isLoading) {
    return (
      <div className="w-64 h-full bg-gray-50 border-r flex flex-col">
        <div className="p-4">
          <div className="h-8 bg-gray-200 animate-pulse rounded-md mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-200 animate-pulse rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || workspaces.length === 0) {
    return (
      <div className="w-64 h-full bg-gray-50 border-r flex flex-col">
        <div className="p-4 flex-1">
          <h3 className="font-medium mb-4">ワークスペース</h3>
          <div className="text-sm text-muted-foreground mb-4">ワークスペースがありません</div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleCreateWorkspace}
          >
            <Plus className="mr-2 h-4 w-4" />
            ワークスペースを追加
          </Button>
        </div>
        <div className="p-4 mt-auto">
          <Separator className="my-4" />
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <Link href="/plan">
              <Settings className="mr-2 h-4 w-4" />
              お支払いプランを管理
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start mt-2" asChild>
            <Link href="/">使い方</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 h-full bg-gray-50 border-r flex flex-col">
      <div className="p-4 flex-1">
        <h3 className="font-medium mb-4">ワークスペース</h3>
        <div className="space-y-1">
          {workspaces.map((workspace) => (
            <div key={workspace.id} className="flex items-center">
              <Button
                variant={currentWorkspaceId === workspace.id ? 'secondary' : 'ghost'}
                size="sm"
                className="w-full justify-start"
                onClick={() => handleSwitchWorkspace(workspace)}
              >
                <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                <span className="truncate">{workspace.name}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-1"
                onClick={() => openEditDialog(workspace)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* 新しいワークスペースを作成（3つ未満の場合のみ表示） */}
        {workspaces.length < 3 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start mt-4"
            onClick={handleCreateWorkspace}
          >
            <Plus className="mr-2 h-4 w-4" />
            ワークスペースを追加
          </Button>
        )}
      </div>

      <div className="p-4 mt-auto">
        <Separator className="my-4" />
        <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
          <Link href="/plan">
            <Settings className="mr-2 h-4 w-4" />
            お支払いプランを管理
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start mt-2" asChild>
          <Link href="/">使い方</Link>
        </Button>
      </div>

      {/* ワークスペース編集ダイアログ */}
      <WorkspaceSelector />
    </div>
  )
}
