import { NextRequest, NextResponse } from 'next/server'
import { verifySlackRequest } from '@/lib/slack/auth'
import { saveDesignRequest } from '@/app/actions/design-requests'
import { createTaskCompletionBlocks } from '@/lib/slack/message'

export const runtime = 'edge'

/**
 * Slack AI Appsのコールバックを処理する
 * 有料プランユーザー向けの拡張機能
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.text()

    // Slackからのリクエストを検証
    const signature = request.headers.get('x-slack-signature')
    const timestamp = request.headers.get('x-slack-request-timestamp')

    const isValid = await verifySlackRequest(signature, timestamp, body)
    if (!isValid) {
      console.error('Slack署名の検証に失敗しました')
      return NextResponse.json({ error: '不正なリクエスト' }, { status: 401 })
    }

    const data = JSON.parse(body)

    // 関数呼び出しの処理
    if (data.type === 'function_execution') {
      const {
        function_execution_id,
        function_name,
        inputs,
        bot_access_token: _bot_access_token,
      } = data

      // create_design_task 関数の処理
      if (function_name === 'create_design_task') {
        try {
          // 入力パラメータを取得
          const { title, description, category, urgency, workspace_id } = inputs

          // タスクを作成
          const result = await saveDesignRequest(
            {
              title,
              description,
              category,
              urgency,
            },
            workspace_id
          )

          if (!result.success) {
            throw new Error(result.error || 'タスクの作成に失敗しました')
          }

          // 成功レスポンスを返す
          return NextResponse.json({
            function_execution_id,
            status: 'success',
            outputs: {
              task_id: result.request.id,
              status: 'created',
              message: 'デザイン依頼がタスクとして登録されました',
              blocks: createTaskCompletionBlocks(result.request.id, title, workspace_id),
            },
          })
        } catch (error) {
          console.error('タスク作成エラー:', error)

          // エラーレスポンスを返す
          return NextResponse.json({
            function_execution_id,
            status: 'error',
            error: {
              message: `タスクの作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
            },
          })
        }
      }

      // サポートされていない関数の場合
      return NextResponse.json({
        function_execution_id,
        status: 'error',
        error: {
          message: `サポートされていない関数です: ${function_name}`,
        },
      })
    }

    // サポートされていないイベントタイプの場合
    return NextResponse.json(
      {
        error: `サポートされていないイベントタイプです: ${data.type}`,
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('AI Handler エラー:', error)
    return NextResponse.json(
      { error: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}` },
      { status: 500 }
    )
  }
}
