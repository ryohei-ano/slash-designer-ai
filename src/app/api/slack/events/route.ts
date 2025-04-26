import { NextRequest, NextResponse } from 'next/server'
import { verifySlackRequest } from '@/lib/slack/auth'
import {
  getChatSession,
  addMessageToSession,
  isSessionExpired,
  getSessionRemainingMinutes,
} from '@/lib/slack/session'
import { sendSlackMessage } from '@/lib/slack/message'
import {
  processAiMessageAndSendToSlack,
  createTaskFromJsonAndNotify,
} from '@/services/slack-ai-chat'
import { getWorkspaceIdBySlackTeamId } from '@/app/actions/slack-integration'

export const runtime = 'edge'

/**
 * Slackのイベントを処理する
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.text()
    const data = JSON.parse(body)

    // URL検証チャレンジに応答（署名検証の前に行う）
    if (data.type === 'url_verification') {
      console.log('URL検証チャレンジを受信しました:', data.challenge)
      return NextResponse.json({ challenge: data.challenge })
    }

    // Slackからのリクエストを検証
    const signature = request.headers.get('x-slack-signature')
    const timestamp = request.headers.get('x-slack-request-timestamp')

    const isValid = await verifySlackRequest(signature, timestamp, body)
    if (!isValid) {
      console.error('Slack署名の検証に失敗しました')
      return NextResponse.json({ error: '不正なリクエスト' }, { status: 401 })
    }

    // イベントコールバックの処理
    if (data.type === 'event_callback') {
      const event = data.event

      // メッセージイベントの処理
      if (event.type === 'message') {
        // ボットからのメッセージは無視（無限ループ防止）
        if (event.bot_id || event.subtype === 'bot_message') {
          return NextResponse.json({ success: true })
        }

        // チームIDを取得（イベントに含まれていない場合はdata.team_idを使用）
        const teamId = event.team || data.team_id

        if (!teamId) {
          console.error('チームIDが見つかりません')
          return NextResponse.json({ success: false, error: 'チームIDが見つかりません' })
        }

        // スレッドメッセージのみ処理
        if (event.thread_ts) {
          const threadTs = event.thread_ts
          const channelId = event.channel
          const _userId = event.user
          const text = event.text

          // セッションを取得
          const session = await getChatSession(threadTs)

          // セッションが存在しない場合
          if (!session) {
            await sendSlackMessage(channelId, {
              text: 'このスレッドのセッションが見つかりません。新しい依頼を開始するには `/designer` コマンドを使用してください。',
              thread_ts: threadTs,
            })
            return NextResponse.json({ success: true })
          }

          // セッションが期限切れの場合
          if (await isSessionExpired(threadTs)) {
            await sendSlackMessage(channelId, {
              text: 'セッションの有効期限が切れました。新しい依頼を開始するには `/designer` コマンドを使用してください。',
              thread_ts: threadTs,
            })
            return NextResponse.json({ success: true })
          }

          // 残り時間が2分未満の場合は警告
          const remainingMinutes = await getSessionRemainingMinutes(threadTs)
          if (remainingMinutes <= 2) {
            await sendSlackMessage(channelId, {
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
              await sendSlackMessage(channelId, {
                text: 'タスクを作成するための十分な情報がありません。もう少し詳細を教えてください。',
                thread_ts: threadTs,
              })
            }
            return NextResponse.json({ success: true })
          }

          // ユーザーメッセージをセッションに追加
          await addMessageToSession(threadTs, {
            role: 'user',
            content: text,
          })

          // AIにメッセージを送信し、応答をSlackに返す
          await processAiMessageAndSendToSlack(threadTs, channelId, session.messages)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('イベント処理エラー:', error)
    return NextResponse.json(
      { error: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}` },
      { status: 500 }
    )
  }
}
