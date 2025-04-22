import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'

// 動的レンダリングを強制する
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // 認証状態を取得（try-catchで囲んで例外処理）
  let userId: string | null = null
  try {
    const authState = await auth()
    userId = authState.userId
    console.log('Auth state:', userId ? 'Logged in' : 'Not logged in')
  } catch (error) {
    console.error('Auth error:', error)
  }

  // 未ログインならウェルカムページ表示
  if (!userId) {
    return (
      <main className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-center">
        <Image
          src="/logo.png"
          alt="Welcome to /designer"
          width={200}
          height={40}
          className="mb-4"
        />
        <p className="mb-8 text-lg text-gray-600">ログイン、または新規登録してください</p>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/sign-in">ログイン</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">新規登録</Link>
          </Button>
        </div>
      </main>
    )
  }

  // ログイン直後は少し待機し、認証情報が反映されるのを待つ
  // この遅延は認証が完了するのを待つための措置
  await new Promise((resolve) => setTimeout(resolve, 500))

  try {
    // 詳細なログ出力を追加
    console.log('Checking subscription for userId:', userId)

    // Supabase から契約状態を取得（is_active条件なし）
    const { data: allSubscriptions, error: listError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('clerk_user_id', userId)

    // すべての契約情報をログ出力（デバッグ用）
    console.log('All subscriptions:', allSubscriptions, listError)

    // ユーザーのワークスペース情報を取得
    const { data: userWorkspaces, error: workspaceError } = await supabase
      .from('user_workspaces')
      .select('workspace_id')
      .eq('user_id', userId)

    console.log('User workspaces:', userWorkspaces, workspaceError)

    // ワークスペースが存在しない場合はオンボーディングにリダイレクト
    if (workspaceError || !userWorkspaces || userWorkspaces.length === 0) {
      console.log('No workspaces found, redirecting to /onboarding')
      redirect('/onboarding')
    }

    // 複数のワークスペースがある場合は選択画面にリダイレクト
    if (userWorkspaces.length > 1) {
      console.log('Multiple workspaces found, redirecting to /workspace/select')
      redirect('/workspace/select')
    }

    // 1つだけの場合はそのワークスペースのページにリダイレクト
    console.log(
      `Single workspace found, redirecting to /workspace/${userWorkspaces[0].workspace_id}/designer`
    )
    redirect(`/workspace/${userWorkspaces[0].workspace_id}/designer`)
  } catch (error) {
    console.error('Error during workspace check:', error)
    console.log('Error during workspace check, redirecting to /workspace/select')
    // エラーが発生した場合はワークスペース選択画面へリダイレクト
    redirect('/workspace/select')
  }
}
