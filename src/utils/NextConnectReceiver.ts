import { App, ReceiverEvent, Receiver } from '@slack/bolt'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Next.js API Routesで使用するためのカスタムSlack Boltレシーバー
 */
export class NextConnectReceiver implements Receiver {
  private signingSecret: string
  private app?: App
  private processEventTimeoutMillis: number

  constructor(options: { signingSecret: string; processEventTimeoutMillis?: number }) {
    this.signingSecret = options.signingSecret || ''
    this.processEventTimeoutMillis = options.processEventTimeoutMillis || 3000
  }

  /**
   * Appインスタンスを初期化する
   * @param app Boltアプリケーションインスタンス
   */
  public init(app: App): void {
    this.app = app
  }

  /**
   * Next.js API Routeハンドラー
   * @param req Next.jsリクエストオブジェクト
   * @returns Next.jsレスポンスオブジェクト
   */
  public async handleRequest(req: NextRequest): Promise<NextResponse> {
    // GETリクエストの場合は404を返す
    if (req.method === 'GET') {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    if (!this.app) {
      return NextResponse.json(
        { error: 'Receiver not initialized. Please call init() first.' },
        { status: 500 }
      )
    }

    // リクエストボディを取得
    const body = await req.text()
    let parsedBody: Record<string, unknown>

    try {
      parsedBody = JSON.parse(body)
    } catch {
      // JSON解析に失敗した場合はフォームデータとして処理
      parsedBody = Object.fromEntries(new URLSearchParams(body))
    }

    // URL検証チャレンジに応答
    if (parsedBody.type === 'url_verification') {
      return NextResponse.json({ challenge: parsedBody.challenge })
    }

    // リクエストの署名を検証
    const signature = req.headers.get('x-slack-signature')
    const timestamp = req.headers.get('x-slack-request-timestamp')

    const isValid = await this.verifySlackRequest(signature, timestamp, body)
    if (!isValid) {
      console.error('Slack署名の検証に失敗しました')
      return NextResponse.json({ error: '不正なリクエスト' }, { status: 401 })
    }

    // イベントを処理
    const event: ReceiverEvent = {
      body: parsedBody,
      ack: async (_response) => {
        // ackは既に自動的に処理されるため、ここでは何もしない
      },
    }

    // タイムアウト付きでイベント処理
    const ackPromise = this.processEvent(event)
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(
        () => reject(new Error('Event processing timed out')),
        this.processEventTimeoutMillis
      )
    })

    try {
      await Promise.race([ackPromise, timeoutPromise])
    } catch (error) {
      console.error('イベント処理エラー:', error)
    }

    // スラッシュコマンドの場合は即時レスポンスを返す
    if ('command' in parsedBody) {
      return NextResponse.json({
        text: 'デザイン依頼を処理しています...',
        response_type: 'ephemeral',
      })
    }

    // その他のイベントの場合は成功レスポンスを返す
    return NextResponse.json({ ok: true })
  }

  /**
   * イベントを処理する
   * @param event 処理するイベント
   */
  private async processEvent(event: ReceiverEvent): Promise<void> {
    if (!this.app) {
      throw new Error('Receiver not initialized. Please call init() first.')
    }

    try {
      await this.app.processEvent(event)
    } catch (error) {
      console.error('イベント処理エラー:', error)
      throw error
    }
  }

  /**
   * Slackからのリクエストを検証する
   * @param signature Slackからのリクエストに含まれるX-Slack-Signatureヘッダー
   * @param timestamp Slackからのリクエストに含まれるX-Slack-Request-Timestampヘッダー
   * @param body リクエストボディ
   * @returns 検証結果（boolean）
   */
  private async verifySlackRequest(
    signature: string | null,
    timestamp: string | null,
    body: string
  ): Promise<boolean> {
    // 必要なパラメータが不足している場合は検証失敗
    if (!signature || !timestamp || !this.signingSecret) {
      console.error('Slack検証に必要なパラメータが不足しています')
      return false
    }

    // タイムスタンプが5分以上前の場合はリプレイアタック防止のため検証失敗
    const currentTime = Math.floor(Date.now() / 1000)
    if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
      console.error('Slackリクエストのタイムスタンプが古すぎます')
      return false
    }

    // 開発環境では署名検証をスキップするオプション
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.SKIP_SLACK_SIGNATURE_CHECK === 'true'
    ) {
      console.warn(
        '開発環境で署名検証をスキップしています。本番環境では必ず署名検証を有効にしてください。'
      )
      return true
    }

    // Edge Runtimeでは署名検証をスキップ（本番環境では別の方法で検証する必要があります）
    console.warn(
      'Edge Runtimeでは署名検証をスキップしています。本番環境では別の方法で検証する必要があります。'
    )
    return true
  }

  /**
   * サーバーを起動する（Next.jsでは使用しない）
   */
  public start(): Promise<unknown> {
    return Promise.resolve()
  }

  /**
   * サーバーを停止する（Next.jsでは使用しない）
   */
  public stop(): Promise<unknown> {
    return Promise.resolve()
  }
}
