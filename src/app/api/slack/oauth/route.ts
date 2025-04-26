import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { saveSlackIntegration } from '@/app/actions/slack-integration'

/**
 * Slack OAuth認証コールバックを処理する
 */
export async function GET(request: NextRequest) {
  try {
    // ClerkからユーザーIDを取得
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    // URLパラメータを取得
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // エラーチェック
    if (error) {
      console.error('Slack OAuth エラー:', error)
      return NextResponse.redirect(
        new URL(`/workspace/select?error=slack_oauth_error&message=${error}`, request.url)
      )
    }

    // 必要なパラメータのチェック
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/workspace/select?error=invalid_oauth_params', request.url)
      )
    }

    // stateパラメータからワークスペースIDを取得
    let workspaceId: string
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'))
      workspaceId = stateData.workspaceId

      if (!workspaceId) {
        throw new Error('ワークスペースIDが見つかりません')
      }
    } catch (error) {
      console.error('State パラメータ解析エラー:', error)
      return NextResponse.redirect(
        new URL('/workspace/select?error=invalid_state_param', request.url)
      )
    }

    // Slack APIを呼び出してアクセストークンを取得
    const clientId = process.env.SLACK_CLIENT_ID
    const clientSecret = process.env.SLACK_CLIENT_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/slack/oauth`

    if (!clientId || !clientSecret) {
      console.error('Slack API 設定エラー: クライアントIDまたはシークレットが設定されていません')
      return NextResponse.redirect(
        new URL(`/workspace/${workspaceId}?error=slack_api_config_error`, request.url)
      )
    }

    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.ok) {
      console.error('Slack アクセストークン取得エラー:', tokenData.error)
      return NextResponse.redirect(
        new URL(
          `/workspace/${workspaceId}?error=slack_token_error&message=${tokenData.error}`,
          request.url
        )
      )
    }

    // 必要な情報を取得
    const accessToken = tokenData.access_token
    const teamId = tokenData.team?.id
    const teamName = tokenData.team?.name
    const botUserId = tokenData.bot_user_id

    if (!accessToken || !teamId || !teamName || !botUserId) {
      console.error('Slack レスポンスエラー: 必要な情報が不足しています', tokenData)
      return NextResponse.redirect(
        new URL(`/workspace/${workspaceId}?error=slack_response_error`, request.url)
      )
    }

    // Slack連携情報を保存
    const result = await saveSlackIntegration(workspaceId, teamId, accessToken, botUserId, teamName)

    if (!result.success) {
      console.error('Slack連携情報保存エラー:', result.error)
      return NextResponse.redirect(
        new URL(
          `/workspace/${workspaceId}?error=slack_integration_save_error&message=${result.error}`,
          request.url
        )
      )
    }

    // 成功した場合はワークスペース設定ページにリダイレクト
    return NextResponse.redirect(
      new URL(`/workspace/${workspaceId}?success=slack_integration_complete`, request.url)
    )
  } catch (error) {
    console.error('Slack OAuth エラー:', error)
    return NextResponse.redirect(
      new URL('/workspace/select?error=slack_oauth_unknown_error', request.url)
    )
  }
}
