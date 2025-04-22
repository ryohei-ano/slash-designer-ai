import { ReactNode } from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserWorkspaces } from '@/app/actions/workspace'
import { cache } from 'react'

// ワークスペース情報を取得する関数をキャッシュ
const getWorkspaceInfo = cache(async (userId: string, workspaceId: string) => {
  try {
    // ユーザーのワークスペース情報を取得
    const { workspaces, error } = await getUserWorkspaces(userId)

    if (error || workspaces.length === 0) {
      return { redirect: '/onboarding' }
    }

    // 指定されたIDのワークスペースを検索
    const currentWorkspace = workspaces.find((w) => w.id === workspaceId)

    // 指定されたワークスペースが見つからない場合
    if (!currentWorkspace) {
      // 複数のワークスペースがある場合は選択画面にリダイレクト
      if (workspaces.length > 1) {
        return { redirect: '/workspace/select' }
      }
      // 1つだけの場合はそのワークスペースのページにリダイレクト
      else {
        return { redirect: `/workspace/${workspaces[0].id}/designer` }
      }
    }

    return { currentWorkspace }
  } catch (error) {
    console.error('ワークスペース初期化中にエラーが発生しました:', error)
    // エラーが発生した場合でも、ワークスペースを表示
    return { error }
  }
})

export default async function WorkspaceIdLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ id: string }>
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const { id: workspaceId } = await params

  // キャッシュされた関数を使用してワークスペース情報を取得
  const result = await getWorkspaceInfo(userId, workspaceId)

  // リダイレクトが必要な場合
  if (result.redirect) {
    redirect(result.redirect)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
