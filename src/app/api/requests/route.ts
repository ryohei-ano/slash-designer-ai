import { NextResponse } from 'next/server'
import { saveDesignRequest } from '@/app/actions/design-requests'

// 【非推奨】この API ルートは Server Action への移行期間中の互換性のために残しています
// 将来的には削除され、完全に Server Action に移行します
// 新しい実装では src/app/actions/design-requests.ts の saveDesignRequest を直接使用してください
export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Server Action を使用してリクエストを保存
    const result = await saveDesignRequest(data)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status || 500 })
    }

    return NextResponse.json({ success: true, request: result.request })
  } catch (error) {
    console.error('API error:', error)
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    return NextResponse.json(
      { error: 'リクエスト処理中にエラーが発生しました: ' + errorMessage },
      { status: 500 }
    )
  }
}
