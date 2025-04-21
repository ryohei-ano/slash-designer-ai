'use server'

import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// JSONデータの型定義
type RequestData = {
  title: string
  description: string
  category: string
  urgency: '通常' | '急ぎ'
}

/**
 * デザイン依頼を保存する
 * @param data リクエストデータ
 * @param workspaceId ワークスペースID
 */
export async function saveDesignRequest(data: RequestData, workspaceId?: string) {
  try {
    // ClerkからユーザーIDを取得
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: '認証されていません', status: 401 }
    }

    // Supabaseが設定されていない場合はエラーを返す
    if (!isSupabaseConfigured || !supabaseAdmin) {
      return { success: false, error: 'データベース接続が設定されていません', status: 500 }
    }

    console.log('送信データ:', data)

    // リクエストデータを準備
    const requestData: any = {
      title: data.title,
      description: data.description,
      category: data.category,
      urgency: data.urgency,
      status: '受付中',
      clerk_user_id: userId,
      created_at: new Date().toISOString(),
    }

    // ワークスペースIDが指定されている場合のみ追加
    if (workspaceId) {
      requestData.workspace_id = workspaceId
    }

    // リクエストをデータベースに保存
    const { data: request, error } = await supabaseAdmin
      .from('requests')
      .insert(requestData)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return {
        success: false,
        error: 'デザイン依頼の保存に失敗しました: ' + error.message,
        status: 500,
      }
    }

    // キャッシュの更新
    revalidatePath('/dashboard/tasks')

    // ワークスペースIDが指定されている場合は、そのワークスペースのタスク一覧も更新
    if (workspaceId) {
      revalidatePath(`/workspace/${workspaceId}/tasks`)
    }

    return { success: true, request }
  } catch (error) {
    console.error('Server error:', error)
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    return {
      success: false,
      error: 'サーバーエラーが発生しました: ' + errorMessage,
      status: 500,
    }
  }
}
