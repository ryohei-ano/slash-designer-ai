'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Plus } from 'lucide-react'
import { Workspace, getUserWorkspaces } from '@/app/actions/workspace'
import { WorkspaceEditForm } from './workspace-edit-form'

export function WorkspaceSelector() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // URLからワークスペースIDを取得
  const workspaceIdFromUrl = searchParams.get('workspace')

  // ユーザーのワークスペースを取得
  useEffect(() => {
    async function fetchWorkspaces() {
      if (!isLoaded || !user) return

      setIsLoading(true)
      try {
        const result = await getUserWorkspaces(user.id)
        if (result.error) {
          setError(result.error)
        } else if (result.workspaces.length > 0) {
          setWorkspaces(result.workspaces)

          // URLからワークスペースIDが指定されている場合はそれを使用
          if (workspaceIdFromUrl) {
            const workspaceFromUrl = result.workspaces.find((w) => w.id === workspaceIdFromUrl)
            if (workspaceFromUrl) {
              setCurrentWorkspace(workspaceFromUrl)
              // 最後に選択したワークスペースとして保存
              localStorage.setItem('lastSelectedWorkspace', workspaceFromUrl.id)
              return
            }
          }

          // ローカルストレージから最後に選択したワークスペースIDを取得
          const lastSelectedId = localStorage.getItem('lastSelectedWorkspace')
          if (lastSelectedId) {
            const lastWorkspace = result.workspaces.find((w) => w.id === lastSelectedId)
            if (lastWorkspace) {
              setCurrentWorkspace(lastWorkspace)
              return
            }
          }

          // 上記に該当しない場合は最初のワークスペースを使用
          setCurrentWorkspace(result.workspaces[0])
        } else {
          setError('ワークスペースが見つかりません')
        }
      } catch (err) {
        setError('ワークスペース情報の取得に失敗しました')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkspaces()
  }, [user, isLoaded, workspaceIdFromUrl])

  // ワークスペースを切り替える
  const switchWorkspace = (workspace: Workspace) => {
    // 最後に選択したワークスペースとして保存
    localStorage.setItem('lastSelectedWorkspace', workspace.id)

    // 現在のワークスペースを更新
    setCurrentWorkspace(workspace)

    // 現在のURLパスを取得
    const currentPath = window.location.pathname

    // 新しいワークスペースページに遷移
    router.push(`/workspace/${workspace.id}/designer`)
  }

  // ワークスペースが読み込み中または存在しない場合
  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className="ml-2">
        読み込み中...
      </Button>
    )
  }

  if (error || !currentWorkspace) {
    return (
      <Button variant="ghost" size="sm" disabled className="ml-2">
        ワークスペースなし
      </Button>
    )
  }

  // ワークスペースセレクターを表示（ワークスペース数に関わらず同じUIを使用）
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="ml-2">
            {currentWorkspace.name.length > 12
              ? `${currentWorkspace.name.substring(0, 12)}...`
              : currentWorkspace.name}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {/* 現在のワークスペース */}
          <DropdownMenuLabel>現在のワークスペース</DropdownMenuLabel>

          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm">{currentWorkspace.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation()
                setIsEditDialogOpen(true)
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-settings"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </Button>
          </div>

          {/* 他のワークスペース */}
          {workspaces.filter((workspace) => workspace.id !== currentWorkspace.id).length > 0 && (
            <>
              <DropdownMenuSeparator />
              {workspaces
                .filter((workspace) => workspace.id !== currentWorkspace.id)
                .map((workspace) => (
                  <DropdownMenuItem key={workspace.id} onClick={() => switchWorkspace(workspace)}>
                    {workspace.name}
                  </DropdownMenuItem>
                ))}

              {/* 新しいワークスペースを作成（3つ未満の場合のみ表示） */}
              {workspaces.length < 3 && (
                <DropdownMenuItem
                  onClick={() => router.push('/workspace/select?create=true')}
                  className="text-primary"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  <span>新しいワークスペースを作成</span>
                </DropdownMenuItem>
              )}
            </>
          )}

          {/* 他のワークスペースがない場合でも、新しいワークスペース作成オプションを表示（3つ未満の場合） */}
          {workspaces.filter((workspace) => workspace.id !== currentWorkspace.id).length === 0 &&
            workspaces.length < 3 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push('/workspace/select?create=true')}
                  className="text-primary"
                >
                  <Plus className="h-4 w-4" />
                  <span>新しいワークスペースを作成</span>
                </DropdownMenuItem>
              </>
            )}

          {/* 管理オプション */}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/workspace/select')}>
            ワークスペースを管理
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[780px]">
          <DialogHeader>
            <DialogTitle>ワークスペース編集</DialogTitle>
            <DialogDescription>ワークスペース情報の編集ができます</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <WorkspaceEditForm
              workspace={currentWorkspace}
              onWorkspaceUpdate={(updatedWorkspace) => {
                setCurrentWorkspace(updatedWorkspace)
                // ワークスペースリストも更新
                setWorkspaces((prev) =>
                  prev.map((w) => (w.id === updatedWorkspace.id ? updatedWorkspace : w))
                )
              }}
            />
          </div>
          <DialogFooter>
            <p className="text-xs text-muted-foreground">
              ワークスペースの情報は、サービス利用時の各種機能に活用されます。
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
