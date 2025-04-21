import { createClient } from '@supabase/supabase-js'

// 環境変数の取得
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey =
  process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// 環境変数のログ出力（機密情報は一部マスク）
console.log('Supabase環境変数チェック:', {
  supabaseUrl,
  supabaseAnonKeyExists: !!supabaseAnonKey,
  supabaseServiceKeyExists: !!supabaseServiceKey,
})

// 環境変数チェックのフラグ
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// 設定状態のログ出力
console.log(`Supabase設定状態: ${isSupabaseConfigured ? '✅ 設定済み' : '❌ 未設定'}`)

// クライアントの作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 管理者権限のクライアント（サーバーサイド用）
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : createClient(supabaseUrl, supabaseAnonKey)

console.log(`Supabaseクライアント初期化: ${supabase ? '✅ 成功' : '❌ 失敗'}`)
console.log(`SupabaseAdminクライアント初期化: ${supabaseAdmin ? '✅ 成功' : '❌ 失敗'}`)

// テーブル構造の型定義
export type Request = {
  id: number
  clerk_user_id: string
  title: string
  description: string
  category?: string
  urgency: string
  status: string
  created_at: string
}

// サブスクリプションを取得する関数
export const getUserSubscription = async (clerkUserId: string) => {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    console.warn('Supabase環境変数が設定されていません。サブスクリプション確認はスキップされます。')
    return { isActive: true } // 設定がない場合はアクティブとみなす
  }

  console.log(
    `[getUserSubscription] 検索開始: clerkUserId=${clerkUserId}, supabaseUrl=${supabaseUrl}`
  )

  try {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .eq('is_active', true)
      .single()

    console.log(
      `[getUserSubscription] 検索結果: clerkUserId=${clerkUserId}, data=`,
      data,
      'error=',
      error
    )

    if (error) throw error

    return {
      isActive: !!data,
      subscription: data,
    }
  } catch (error) {
    console.error('サブスクリプション確認エラー:', error)
    return { isActive: false }
  }
}
