import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { DESIGN_CHAT_SYSTEM_PROMPT } from '@/lib/prompts'

// OpenAI APIの設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '', // APIキーが未設定の場合も処理する
})

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    // OpenAI APIキーのチェック
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        'OpenAIのAPIキーが設定されていません。環境変数OPENAI_API_KEYを設定してください。',
        {
          status: 500,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        }
      )
    }

    // システムプロンプトを追加したメッセージ配列を作成
    const messagesWithSystem = [{ role: 'system', content: DESIGN_CHAT_SYSTEM_PROMPT }, ...messages]

    try {
      // OpenAI APIを呼び出す
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        stream: true,
        messages: messagesWithSystem,
      })

      // レスポンスをテキストストリームに変換
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()

          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              controller.enqueue(encoder.encode(content))
            }
          }
          controller.close()
        },
      })

      // ストリーミングレスポンスを返す
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      })
    } catch (apiError) {
      console.error('OpenAI API error:', apiError)
      return new Response(
        `OpenAI APIエラー: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`,
        {
          status: 500,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        }
      )
    }
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'チャットAPIでエラーが発生しました' }, { status: 500 })
  }
}
