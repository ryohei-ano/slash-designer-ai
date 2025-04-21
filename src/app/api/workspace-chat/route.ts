import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabaseAdmin } from "@/lib/supabase"

// Dify API設定
const DIFY_API_KEY = process.env.DIFY_API_KEY
const DIFY_API_URL = process.env.DIFY_API_URL

export const runtime = "edge"

export async function POST(req: Request) {
  try {
    // 認証チェック
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "認証エラー" }, { status: 401 })
    }

    const { message, workspaceId, conversationId } = await req.json()

    // ユーザーがワークスペースにアクセスできるか確認
    const { data: userWorkspace, error: workspaceError } = await supabaseAdmin
      .from("user_workspaces")
      .select("role")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .single()

    if (workspaceError) {
      return NextResponse.json(
        { error: "このワークスペースへのアクセス権がありません" },
        { status: 403 }
      )
    }

    // Dify API設定のチェック
    if (!DIFY_API_KEY || !DIFY_API_URL) {
      return NextResponse.json(
        { error: "Dify API設定が見つかりません" },
        { status: 500 }
      )
    }

    // Dify Chat APIを呼び出す
    const difyResponse = await fetch(`${DIFY_API_URL}/chat-messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DIFY_API_KEY}`
      },
      body: JSON.stringify({
        inputs: {},
        query: message,
        response_mode: "streaming", // ストリーミングモードを使用
        conversation_id: conversationId,
        user: userId
      })
    })

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text()
      console.error("Dify APIエラー:", errorText)
      return NextResponse.json(
        { error: "Dify APIリクエストに失敗しました" },
        { status: 500 }
      )
    }

    // ストリーミングレスポンスを返す
    const stream = difyResponse.body
    
    if (!stream) {
      return NextResponse.json(
        { error: "ストリームの取得に失敗しました" },
        { status: 500 }
      )
    }

    // レスポンスヘッダーにメタデータを追加
    const headers = new Headers()
    headers.set('Content-Type', 'text/event-stream')
    headers.set('Cache-Control', 'no-cache')
    headers.set('Connection', 'keep-alive')
    
    // 会話IDがレスポンスヘッダーに含まれている場合は取得
    const responseConversationId = difyResponse.headers.get('x-conversation-id')
    if (responseConversationId) {
      headers.set('x-conversation-id', responseConversationId)
    }

    return new Response(stream, { headers })
  } catch (error) {
    console.error("ワークスペースチャットエラー:", error)
    return NextResponse.json(
      { error: "チャット処理中にエラーが発生しました" },
      { status: 500 }
    )
  }
}
