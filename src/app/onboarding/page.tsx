import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import OnboardingFlow from '@/components/ui/onboarding-flow'
import { supabaseAdmin } from '@/lib/supabase'

export default async function OnboardingPage() {
  // ユーザー認証情報の取得
  const { userId } = await auth()

  // 未認証の場合はサインインページにリダイレクト
  if (!userId) {
    redirect('/sign-in')
  }

  try {
    // ユーザーが既にワークスペースを持っているか確認
    const { data: userWorkspaces, error } = await supabaseAdmin
      .from('user_workspaces')
      .select('workspace_id')
      .eq('user_id', userId)

    // エラーがある場合はログに記録
    if (error) {
      console.error('ワークスペース取得エラー:', error)
    }

    // ワークスペースが存在する場合
    if (userWorkspaces && userWorkspaces.length > 0) {
      // 複数のワークスペースがある場合は選択画面にリダイレクト
      if (userWorkspaces.length > 1) {
        redirect('/workspace/select')
      }
      // 1つだけの場合はそのワークスペースのダッシュボードにリダイレクト
      else {
        redirect(`/workspace/${userWorkspaces[0].workspace_id}/designer`)
      }
    }
  } catch (error) {
    console.error('ワークスペース確認中にエラーが発生しました:', error)
    // エラーが発生した場合でも、オンボーディングを表示（新規ユーザーとして扱う）
  }

  // ワークスペースがない場合はオンボーディングを表示
  return <OnboardingFlow userId={userId} />
}
