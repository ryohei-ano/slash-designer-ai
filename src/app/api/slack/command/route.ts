import { NextRequest, NextResponse } from 'next/server'
import { verifySlackRequest, detectSlackPlan } from '@/lib/slack/auth'
import {
  createCommandResponse,
  formatAiResponseBlocks,
  sendResponseToUrl,
} from '@/lib/slack/message'
import { createChatSession } from '@/lib/slack/session'
import { processAiMessageAndSendToSlack } from '@/services/slack-ai-chat'
import { getWorkspaceIdBySlackTeamId } from '@/app/actions/slack-integration'

export const runtime = 'edge'

/**
 * Slackのスラッシュコマンドを処理する
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.text()

    // フォームデータをパース（署名検証の前に行う）
    const formData = new URLSearchParams(body)
    const command = formData.get('command')
    const text = formData.get('text') || ''
    const channelId = formData.get('channel_id') || ''
    const userId = formData.get('user_id') || ''
    const teamId = formData.get('team_id') || ''
    const responseUrl = formData.get('response_url') || ''

    // コマンドが /designer でない場合はエラー
    if (command !== '/designer') {
      console.log('無効なコマンド:', command)
      return await createCommandResponse({
        text: '無効なコマンドです。/designer コマンドのみサポートしています。',
        response_type: 'ephemeral',
      })
    }

    // Slackからのリクエストを検証
    const signature = request.headers.get('x-slack-signature')
    const timestamp = request.headers.get('x-slack-request-timestamp')

    const isValid = await verifySlackRequest(signature, timestamp, body)
    if (!isValid) {
      console.error('Slack署名の検証に失敗しました')
      return NextResponse.json({ error: '不正なリクエスト' }, { status: 401 })
    }

    // テキストが空の場合はヘルプメッセージを表示
    if (!text.trim()) {
      return await createCommandResponse({
        text: 'デザイン依頼の内容を入力してください。例: `/designer バナー作りたい`',
        response_type: 'ephemeral',
      })
    }

    // ワークスペースIDを取得
    const workspaceResult = await getWorkspaceIdBySlackTeamId(teamId)
    let workspaceId: string | undefined = undefined

    if (workspaceResult.success && workspaceResult.workspaceId) {
      workspaceId = workspaceResult.workspaceId
      console.log(`Slackチーム ${teamId} に紐づくワークスペース ${workspaceId} を検出しました`)
    } else {
      console.log(`Slackチーム ${teamId} に紐づくワークスペースが見つかりません`)
    }

    // プラン情報を取得
    const planInfo = await detectSlackPlan(teamId)

    // 有料プランの場合はAI Appsを使用（将来的な実装）
    if (planInfo.isPaid) {
      // 将来的にはここでAI Appsの処理を行う
      console.log('有料プラン検出: AI Apps機能を使用します（将来的な実装）')
    }

    // 即時レスポンスを返す（3秒以内にレスポンスを返す必要がある）
    setTimeout(async () => {
      try {
        // 初期メッセージをresponse_urlに送信
        await sendResponseToUrl(responseUrl, {
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
          channelId,
          userId,
          teamId,
          text,
          responseUrl,
          workspaceId
        )

        // AIにメッセージを送信し、応答をSlackに返す
        await processAiMessageAndSendToSlack(threadTs, channelId, session.messages, responseUrl)
      } catch (error) {
        console.error('非同期処理エラー:', error)

        // エラーメッセージをresponse_urlに送信
        await sendResponseToUrl(responseUrl, {
          text: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
          response_type: 'ephemeral',
        })
      }
    }, 0)

    // 即時レスポンスを返す
    console.log('コマンド処理完了:', command, text)
    return await createCommandResponse({
      text: 'デザイン依頼を処理しています...',
      response_type: 'ephemeral', // ユーザーにのみ表示
    })
  } catch (error) {
    console.error('コマンド処理エラー:', error)
    return NextResponse.json(
      { error: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}` },
      { status: 500 }
    )
  }
}
