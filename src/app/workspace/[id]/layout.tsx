import { ReactNode } from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserWorkspaces } from '@/app/actions/workspace'

export default async function WorkspaceIdLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { id: string }
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const workspaceId = params.id

  try {
    // ユーザーのワークスペース情報を取得
    const { workspaces, error } = await getUserWorkspaces(userId)

    if (error || workspaces.length === 0) {
      redirect('/onboarding')
    }

    // 指定されたIDのワークスペースを検索
    const currentWorkspace = workspaces.find((w) => w.id === workspaceId)

    // 指定されたワークスペースが見つからない場合
    if (!currentWorkspace) {
      // 複数のワークスペースがある場合は選択画面にリダイレクト
      if (workspaces.length > 1) {
        redirect('/workspace/select')
      }
      // 1つだけの場合はそのワークスペースのページにリダイレクト
      else {
        redirect(`/workspace/${workspaces[0].id}/designer`)
      }
    }
  } catch (error) {
    console.error('ワークスペース初期化中にエラーが発生しました:', error)
    // エラーが発生した場合でも、ワークスペースを表示
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
