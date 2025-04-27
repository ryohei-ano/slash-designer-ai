import { NextRequest, NextResponse } from 'next/server'
import { App } from '@slack/bolt'
import { auth } from '@clerk/nextjs/server'
import { NextConnectReceiver } from '@/utils/NextConnectReceiver'
import {
  createChatSession,
  getChatSession,
  isSessionExpired,
  getSessionRemainingMinutes,
  addMessageToSession,
} from '@/lib/slack/session'
import {
  processAiMessageAndSendToSlack,
  createTaskFromJsonAndNotify,
} from '@/services/slack-ai-chat'
import { getWorkspaceIdBySlackTeamId, saveSlackIntegration } from '@/app/actions/slack-integration'
import { formatAiResponseBlocks, sendResponseToUrl } from '@/lib/slack/message'

export const runtime = 'nodejs'

// Slack Boltアプリケーションの初期化
const receiver = new NextConnectReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET || '',
  processEventTimeoutMillis: 2500, // 3秒以内にackを返す必要があるため、余裕を持って2.5秒に設定
})

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
})

// レシーバーを初期化
receiver.init(app)

// スラッシュコマンドのリスナー
app.command('/designer', async ({ command, ack, respond }) => {
  try {
    // 即時応答（3秒以内に応答する必要がある）
    await ack({
      text: 'デザイン依頼を処理しています...',
      response_type: 'ephemeral',
    })

    const { text, channel_id, user_id, team_id, response_url } = command

    // テキストが空の場合はヘルプメッセージを表示
    if (!text.trim()) {
      await respond({
        text: 'デザイン依頼の内容を入力してください。例: `/designer バナー作りたい`',
        response_type: 'ephemeral',
      })
      return
    }

    // ワークスペースIDを取得
    const workspaceResult = await getWorkspaceIdBySlackTeamId(team_id)
    let workspaceId: string | undefined = undefined

    if (workspaceResult.success && workspaceResult.workspaceId) {
      workspaceId = workspaceResult.workspaceId
      console.log(`Slackチーム ${team_id} に紐づくワークスペース ${workspaceId} を検出しました`)
    } else {
      console.log(`Slackチーム ${team_id} に紐づくワークスペースが見つかりません`)
    }

    // 非同期処理を開始
    setTimeout(async () => {
      try {
        // 初期メッセージをresponse_urlに送信
        await sendResponseToUrl(response_url, {
          text: 'デザイン依頼を受け付けました。詳細をお聞かせください。',
          blocks: await formatAiResponseBlocks(
            'デザイン依頼を受け付けました。詳細をお聞かせください。'
          ),
          response_type: 'in_channel', // チャンネル内に表示
        })

        // スレッドのタイムスタンプを取得（初期メッセージのタイムスタンプ）
        // 実際の実装では、Slack APIからレスポンスを取得してタイムスタンプを取得する必要がある
        // ここでは仮のタイムスタンプを生成
        const threadTs = `${Date.now() / 1000}.000000`

        // チャットセッションを作成
        const session = await createChatSession(
          threadTs,
          channel_id,
          user_id,
          team_id,
          text,
          response_url,
          workspaceId
        )

        // AIにメッセージを送信し、応答をSlackに返す
        await processAiMessageAndSendToSlack(threadTs, channel_id, session.messages, response_url)
      } catch (error) {
        console.error('非同期処理エラー:', error)

        // エラーメッセージをresponse_urlに送信
        await sendResponseToUrl(response_url, {
          text: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
          response_type: 'ephemeral',
        })
      }
    }, 0)
  } catch (error) {
    console.error('コマンド処理エラー:', error)
    await ack({
      text: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
      response_type: 'ephemeral',
    })
  }
})

// メッセージイベントのリスナー
app.message(async ({ message, say }) => {
  // 型アサーションを使用して、messageオブジェクトのプロパティにアクセス
  const msg = message as {
    subtype?: string
    bot_id?: string
    thread_ts?: string
    text?: string
    channel: string
    user: string
    team?: string
  }

  // ボットからのメッセージは無視（無限ループ防止）
  if (msg.subtype === 'bot_message' || msg.bot_id) {
    return
  }

  // スレッドメッセージのみ処理
  if (msg.thread_ts && msg.text) {
    const threadTs = msg.thread_ts
    const channelId = msg.channel
    const _userId = msg.user
    const teamId = msg.team || ''
    const text = msg.text

    try {
      // セッションを取得
      const session = await getChatSession(threadTs)

      // セッションが存在しない場合
      if (!session) {
        await say({
          text: 'このスレッドのセッションが見つかりません。新しい依頼を開始するには `/designer` コマンドを使用してください。',
          thread_ts: threadTs,
        })
        return
      }

      // セッションが期限切れの場合
      if (await isSessionExpired(threadTs)) {
        await say({
          text: 'セッションの有効期限が切れました。新しい依頼を開始するには `/designer` コマンドを使用してください。',
          thread_ts: threadTs,
        })
        return
      }

      // 残り時間が2分未満の場合は警告
      const remainingMinutes = await getSessionRemainingMinutes(threadTs)
      if (remainingMinutes <= 2) {
        await say({
          text: `⚠️ セッションの有効期限まであと約${remainingMinutes}分です。まもなくセッションが終了します。`,
          thread_ts: threadTs,
        })
      }

      // 特殊コマンドの処理
      if (
        text.trim().toLowerCase() === '!create_task' ||
        text.trim().toLowerCase() === '!タスク作成'
      ) {
        // JSONデータが存在する場合はタスクを作成
        if (session.jsonData) {
          // セッションにワークスペースIDがない場合は、チームIDから取得を試みる
          let workspaceId = session.workspaceId

          if (!workspaceId && teamId) {
            const workspaceResult = await getWorkspaceIdBySlackTeamId(teamId)
            if (workspaceResult.success && workspaceResult.workspaceId) {
              workspaceId = workspaceResult.workspaceId
              console.log(
                `Slackチーム ${teamId} に紐づくワークスペース ${workspaceId} を検出しました`
              )
            }
          }

          await createTaskFromJsonAndNotify(threadTs, channelId, session.jsonData, workspaceId)
        } else {
          await say({
            text: 'タスクを作成するための十分な情報がありません。もう少し詳細を教えてください。',
            thread_ts: threadTs,
          })
        }
        return
      }

      // ユーザーメッセージをセッションに追加
      await addMessageToSession(threadTs, {
        role: 'user',
        content: text,
      })

      // AIにメッセージを送信し、応答をSlackに返す
      await processAiMessageAndSendToSlack(threadTs, channelId, session.messages)
    } catch (error) {
      console.error('メッセージ処理エラー:', error)
      await say({
        text: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        thread_ts: threadTs,
      })
    }
  }
})

/**
 * すべてのSlackリクエストを処理するキャッチオールルート
 */
export async function GET(request: NextRequest) {
  // URLパスを確認
  const path = request.nextUrl.pathname.replace('/api/slack/', '')

  // OAuth認証コールバックの処理
  if (path === 'oauth') {
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
        // Base64デコード（Edge Runtimeと互換性のある方法）
        const base64Decoded = atob(state)
        const stateData = JSON.parse(base64Decoded)
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
      const redirectUri = `${request.nextUrl.origin}/api/slack/oauth` // 現在のオリジンを使用

      console.log('Slack OAuth処理:', { clientId, redirectUri, workspaceId })

      const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: clientId || '',
          client_secret: clientSecret || '',
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
      const result = await saveSlackIntegration(
        workspaceId,
        teamId,
        accessToken,
        botUserId,
        teamName
      )

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

  // その他のGETリクエストは404を返す
  return NextResponse.json({ error: 'Not Found' }, { status: 404 })
}

export async function POST(request: NextRequest) {
  try {
    return await receiver.handleRequest(request)
  } catch (error) {
    console.error('Slackリクエスト処理エラー:', error)
    return NextResponse.json(
      { error: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}` },
      { status: 500 }
    )
  }
}
