# Server Actions vs API Routes

このドキュメントでは、Next.jsアプリケーションにおけるServer ActionsとAPI Routesの使い分けについて説明します。

## Server Actions

Server Actionsは、Next.js 13以降で導入された機能で、クライアントコンポーネントからサーバー上の関数を直接呼び出すことができます。

### メリット

1. **型安全性**: TypeScriptとの統合が優れており、関数の引数や戻り値に型を適用できます。
2. **認証の一貫性**: `auth()` 関数を使った認証が一貫して行えます。
3. **キャッシュと再検証**: `revalidatePath` や `revalidateTag` を使ったキャッシュ制御が容易です。
4. **プログレッシブエンハンスメント**: JavaScriptが無効でも動作し、徐々に機能を向上させられます。
5. **コード整理**: 関連するロジックを一箇所にまとめやすくなります。
6. **パフォーマンス**: クライアント側のJavaScriptバンドルサイズを削減できます。

### 使用例

```typescript
"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

export async function getUserData() {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: "認証されていません" }
  }
  
  // データ取得処理
  
  // キャッシュの更新
  revalidatePath("/dashboard")
  
  return { success: true, data }
}
```

## API Routes

API Routesは、Next.jsの従来からある機能で、RESTful APIエンドポイントを作成できます。

### メリット

1. **ストリーミングレスポンス**: チャットのようなストリーミングレスポンスが必要な場合に適しています。
2. **外部サービスからのWebhook**: Stripeのwebhookなど、外部からのリクエストを受け付ける場合に必要です。
3. **RESTful API**: 他のクライアント（モバイルアプリなど）からもアクセスする必要がある場合に適しています。
4. **互換性**: 既存のRESTful APIクライアントとの互換性が必要な場合に適しています。

### 使用例

```typescript
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function GET() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json(
      { error: "認証されていません" },
      { status: 401 }
    )
  }
  
  // データ取得処理
  
  return NextResponse.json({ data })
}
```

## 推奨アプローチ

以下のガイドラインに従って、Server ActionsとAPI Routesを使い分けることを推奨します：

### Server Actionsを使用する場合

- データの取得や更新など、基本的なCRUD操作
- フォーム送信処理
- 認証が必要な操作
- サーバーサイドでのデータ検証が必要な場合
- キャッシュの再検証が必要な場合

### API Routesを使用する場合

- ストリーミングレスポンスが必要な場合（チャットなど）
- 外部サービスからのWebhook受信
- 複数のクライアント（Webアプリ、モバイルアプリなど）から共通のAPIにアクセスする必要がある場合
- 既存のRESTful APIとの互換性が必要な場合

## 移行戦略

既存のAPI Routesから徐々にServer Actionsに移行する場合は、以下の戦略を検討してください：

1. **段階的な移行**: 新しい機能はServer Actionsで実装し、既存の機能は徐々に移行する
2. **互換性レイヤー**: API RouteからServer Actionを呼び出す互換性レイヤーを作成する
3. **並行運用**: 移行期間中は両方のアプローチを並行して運用する

## 実装例

このプロジェクトでは、以下のように実装しています：

### タスク一覧（/tasks）

- Server Actionsを使用してデータを取得
- `src/app/actions/tasks.ts` でServer Actionを定義
- `src/components/ui/tasks-table.tsx` でServer Actionを呼び出し

### デザイナー（/designer）

- チャット機能はストリーミングが必要なため、API Routesを使用
- デザイン依頼の保存はServer Actionsを使用
- `src/app/actions/design-requests.ts` でServer Actionを定義
- `src/components/ui/design-chat.tsx` でServer Actionを呼び出し

## 結論

基本的には、可能な限りServer Actionsを使用することを推奨します。ただし、ストリーミングレスポンスが必要な場合や外部サービスからのWebhookを受け付ける場合など、API Routesが適している場合もあります。

プロジェクトの要件に応じて、適切なアプローチを選択してください。
