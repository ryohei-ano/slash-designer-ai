'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Workspace, getUserWorkspaces, updateWorkspace } from '@/app/actions/workspace'

// ワークスペースストアの状態の型定義
interface WorkspaceState {
  // 状態
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  isLoading: boolean
  error: string | null

  // アクション
  fetchWorkspaces: (userId: string) => Promise<void>
  switchWorkspace: (workspace: Workspace) => void
  updateCurrentWorkspace: (
    data: {
      name: string
      industry: string
      business_overview?: string | null
    },
    userId: string
  ) => Promise<boolean>
  setError: (error: string | null) => void
  clearWorkspaces: () => void
}

// Zustandストアの作成
export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      // 初期状態
      workspaces: [],
      currentWorkspace: null,
      isLoading: false,
      error: null,

      // ワークスペース一覧を取得するアクション
      fetchWorkspaces: async (userId: string) => {
        // すでにワークスペースが読み込まれている場合は再取得しない
        const { workspaces, isLoading } = get()
        if (workspaces.length > 0 && !isLoading) {
          return
        }

        set({ isLoading: true, error: null })
        try {
          const result = await getUserWorkspaces(userId)

          if (result.error) {
            set({ error: result.error, isLoading: false })
            return
          }

          // 現在のワークスペースの状態を取得
          const { currentWorkspace } = get()

          // 取得したワークスペース一覧を設定
          set({ workspaces: result.workspaces })

          // 現在のワークスペースが設定されていない場合、または
          // 現在のワークスペースが取得したワークスペース一覧に存在しない場合
          if (!currentWorkspace || !result.workspaces.some((w) => w.id === currentWorkspace.id)) {
            // ローカルストレージから最後に選択したワークスペースIDを取得
            const lastSelectedId = localStorage.getItem('lastSelectedWorkspace')

            if (lastSelectedId) {
              const lastWorkspace = result.workspaces.find((w) => w.id === lastSelectedId)
              if (lastWorkspace) {
                set({ currentWorkspace: lastWorkspace, isLoading: false })
                return
              }
            }

            // 上記に該当しない場合は最初のワークスペースを使用（存在する場合）
            if (result.workspaces.length > 0) {
              set({ currentWorkspace: result.workspaces[0], isLoading: false })
            } else {
              set({ isLoading: false })
            }
          } else {
            // 現在のワークスペースが有効な場合、最新の情報で更新
            const updatedCurrentWorkspace = result.workspaces.find(
              (w) => w.id === currentWorkspace.id
            )
            if (updatedCurrentWorkspace) {
              set({ currentWorkspace: updatedCurrentWorkspace, isLoading: false })
            } else {
              set({ isLoading: false })
            }
          }
        } catch (error) {
          console.error('ワークスペース取得エラー:', error)
          set({
            error: error instanceof Error ? error.message : '不明なエラーが発生しました',
            isLoading: false,
          })
        }
      },

      // ワークスペースを切り替えるアクション
      switchWorkspace: (workspace: Workspace) => {
        // 最後に選択したワークスペースとして保存
        localStorage.setItem('lastSelectedWorkspace', workspace.id)

        // 現在のワークスペースを更新
        set({ currentWorkspace: workspace })

        // イベントを発行してワークスペース切り替えを通知
        window.dispatchEvent(
          new CustomEvent('workspace-switched', {
            detail: { workspaceId: workspace.id },
          })
        )
      },

      // 現在のワークスペースを更新するアクション
      updateCurrentWorkspace: async (data, userId: string) => {
        const { currentWorkspace } = get()
        if (!currentWorkspace) {
          set({ error: 'ワークスペースが選択されていません' })
          return false
        }

        set({ isLoading: true, error: null })

        try {
          const result = await updateWorkspace(currentWorkspace.id, data, userId)

          if (!result.success) {
            set({ error: result.error || 'ワークスペースの更新に失敗しました', isLoading: false })
            return false
          }

          // ワークスペース一覧と現在のワークスペースを更新
          const updatedWorkspace = { ...currentWorkspace, ...data }
          set((state) => ({
            workspaces: state.workspaces.map((w) =>
              w.id === currentWorkspace.id ? updatedWorkspace : w
            ),
            currentWorkspace: updatedWorkspace,
            isLoading: false,
          }))

          return true
        } catch (error) {
          console.error('ワークスペース更新エラー:', error)
          set({
            error: error instanceof Error ? error.message : '不明なエラーが発生しました',
            isLoading: false,
          })
          return false
        }
      },

      // エラーを設定するアクション
      setError: (error: string | null) => set({ error }),

      // ワークスペース情報をクリアするアクション
      clearWorkspaces: () => set({ workspaces: [], currentWorkspace: null, error: null }),
    }),
    {
      name: 'workspace-storage',
      // 永続化する状態のみを選択
      partialize: (state) => ({
        workspaces: state.workspaces,
        currentWorkspace: state.currentWorkspace,
      }),
    }
  )
)
