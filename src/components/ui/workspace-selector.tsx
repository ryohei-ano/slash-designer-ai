'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button as _Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Settings as _Settings } from 'lucide-react'
import { Workspace } from '@/app/actions/workspace'
import { WorkspaceEditForm } from './workspace-edit-form'
import SlackIntegrationSection from './slack-integration-section'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useChatStore } from '@/store/chatStore'

export function WorkspaceSelector() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Zustandストアから状態とアクションを取得
  const {
    workspaces: _workspaces,
    currentWorkspace,
    isLoading: _isLoading,
    error: _error,
    fetchWorkspaces,
    switchWorkspace,
  } = useWorkspaceStore()
  const { clearWorkspaceChats, setActiveWorkspaceId } = useChatStore()

  // ユーザーのワークスペースを取得（初回のみ）
  useEffect(() => {
    if (!isLoaded || !user) return

    // ワークスペース一覧を取得（fetchWorkspaces内で既に取得済みの場合はスキップする）
    fetchWorkspaces(user.id)
  }, [user, isLoaded, fetchWorkspaces])

  // ワークスペースを切り替えてページ遷移
  const _handleSwitchWorkspace = (workspace: Workspace) => {
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
  const _handleCreateWorkspace = () => {
    router.push('/onboarding')
  }

  // ワークスペース編集ダイアログを開く
  const _openEditDialog = (workspace: Workspace) => {
    switchWorkspace(workspace)
    setIsEditDialogOpen(true)
  }

  return (
    <>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[780px]">
          <DialogHeader>
            <DialogTitle>ワークスペース編集</DialogTitle>
            <DialogDescription>ワークスペース情報の編集ができます</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-8">
            {currentWorkspace && (
              <>
                <WorkspaceEditForm
                  workspace={currentWorkspace}
                  onWorkspaceUpdate={(_updatedWorkspace) => {
                    // Zustandストアを通じて更新されるため、ここでの更新は不要
                    setIsEditDialogOpen(false)
                  }}
                />
                <SlackIntegrationSection workspaceId={currentWorkspace.id} />
              </>
            )}
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
