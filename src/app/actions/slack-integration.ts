'use server'

import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// 暗号化キー（本番環境では環境変数から取得）
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-for-development'

/**
 * トークンを暗号化する（簡易版）
 * @param token 暗号化するトークン
 * @returns 暗号化されたトークン
 */
async function encryptToken(token: string): Promise<string> {
  // 本番環境では適切な暗号化方法を使用してください
  // この実装は簡易的なものです
  return Buffer.from(token).toString('base64')
}

/**
 * トークンを復号する（簡易版）
 * @param encryptedToken 暗号化されたトークン
 * @returns 復号されたトークン
 */
async function decryptToken(encryptedToken: string): Promise<string> {
  // 本番環境では適切な復号方法を使用してください
  // この実装は簡易的なものです
  return Buffer.from(encryptedToken, 'base64').toString('utf8')
}

/**
 * Slack連携情報を保存する
 * @param workspaceId ワークスペースID
 * @param slackTeamId SlackチームID
 * @param accessToken Slackアクセストークン
 * @param botUserId SlackボットユーザーID
 * @param teamName Slackチーム名
 * @returns 保存結果
 */
export async function saveSlackIntegration(
  workspaceId: string,
  slackTeamId: string,
  accessToken: string,
  botUserId: string,
  teamName: string
) {
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

    // アクセストークンを暗号化
    const encryptedToken = await encryptToken(accessToken)

    // 既存の連携情報を確認
    const { data: existingIntegration, error: checkError } = await supabaseAdmin
      .from('workspace_slack_integrations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('slack_team_id', slackTeamId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116は「結果が見つからない」エラー
      console.error('既存の連携情報確認エラー:', checkError)
      return {
        success: false,
        error: '連携情報の確認に失敗しました: ' + checkError.message,
        status: 500,
      }
    }

    let result

    if (existingIntegration) {
      // 既存の連携情報を更新
      const { data, error } = await supabaseAdmin
        .from('workspace_slack_integrations')
        .update({
          slack_access_token: encryptedToken,
          slack_bot_user_id: botUserId,
          slack_team_name: teamName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingIntegration.id)
        .select()
        .single()

      if (error) {
        console.error('Slack連携情報更新エラー:', error)
        return {
          success: false,
          error: 'Slack連携情報の更新に失敗しました: ' + error.message,
          status: 500,
        }
      }

      result = data
    } else {
      // 新しい連携情報を作成
      // ClerkのユーザーIDはUUID形式ではないため、created_byカラムに直接保存できない可能性がある
      // そのため、created_byカラムを省略するか、別の方法で処理する
      const { data, error } = await supabaseAdmin
        .from('workspace_slack_integrations')
        .insert({
          workspace_id: workspaceId,
          slack_team_id: slackTeamId,
          slack_access_token: encryptedToken,
          slack_bot_user_id: botUserId,
          slack_team_name: teamName,
          // created_by: userId, // UUIDエラーの原因となるため省略
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error('Slack連携情報保存エラー:', error)
        return {
          success: false,
          error: 'Slack連携情報の保存に失敗しました: ' + error.message,
          status: 500,
        }
      }

      result = data
    }

    // キャッシュの更新
    revalidatePath(`/workspace/${workspaceId}`)

    return { success: true, integration: result }
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

/**
 * Slack連携情報を取得する
 * @param workspaceId ワークスペースID
 * @returns 連携情報
 */
export async function getSlackIntegration(workspaceId: string) {
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

    // 連携情報を取得
    const { data, error } = await supabaseAdmin
      .from('workspace_slack_integrations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 結果が見つからない場合
        return { success: true, integration: null }
      }

      console.error('Slack連携情報取得エラー:', error)
      return {
        success: false,
        error: 'Slack連携情報の取得に失敗しました: ' + error.message,
        status: 500,
      }
    }

    // アクセストークンを復号化せずに返す（セキュリティ上の理由）
    const integrationWithoutToken = {
      ...data,
      slack_access_token: undefined,
    }

    return { success: true, integration: integrationWithoutToken }
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

/**
 * SlackチームIDからワークスペースIDを取得する
 * @param slackTeamId SlackチームID
 * @returns ワークスペースID
 */
export async function getWorkspaceIdBySlackTeamId(slackTeamId: string) {
  try {
    // Supabaseが設定されていない場合はエラーを返す
    if (!isSupabaseConfigured || !supabaseAdmin) {
      return { success: false, error: 'データベース接続が設定されていません', status: 500 }
    }

    // 連携情報を取得
    const { data, error } = await supabaseAdmin
      .from('workspace_slack_integrations')
      .select('workspace_id')
      .eq('slack_team_id', slackTeamId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 結果が見つからない場合
        return { success: true, workspaceId: null }
      }

      console.error('ワークスペースID取得エラー:', error)
      return {
        success: false,
        error: 'ワークスペースIDの取得に失敗しました: ' + error.message,
        status: 500,
      }
    }

    return { success: true, workspaceId: data.workspace_id }
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

/**
 * Slack連携情報を削除する
 * @param workspaceId ワークスペースID
 * @returns 削除結果
 */
export async function deleteSlackIntegration(workspaceId: string) {
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

    // 連携情報を削除
    const { error } = await supabaseAdmin
      .from('workspace_slack_integrations')
      .delete()
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error('Slack連携情報削除エラー:', error)
      return {
        success: false,
        error: 'Slack連携情報の削除に失敗しました: ' + error.message,
        status: 500,
      }
    }

    // キャッシュの更新
    revalidatePath(`/workspace/${workspaceId}`)

    return { success: true }
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

/**
 * Slackアクセストークンを取得する（内部使用のみ）
 * @param workspaceId ワークスペースID
 * @returns アクセストークン
 */
export async function getSlackAccessToken(workspaceId: string) {
  try {
    // Supabaseが設定されていない場合はエラーを返す
    if (!isSupabaseConfigured || !supabaseAdmin) {
      return { success: false, error: 'データベース接続が設定されていません', status: 500 }
    }

    // 連携情報を取得
    const { data, error } = await supabaseAdmin
      .from('workspace_slack_integrations')
      .select('slack_access_token')
      .eq('workspace_id', workspaceId)
      .single()

    if (error) {
      console.error('アクセストークン取得エラー:', error)
      return {
        success: false,
        error: 'アクセストークンの取得に失敗しました: ' + error.message,
        status: 500,
      }
    }

    // アクセストークンを復号化
    const decryptedToken = await decryptToken(data.slack_access_token)

    return { success: true, accessToken: decryptedToken }
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
