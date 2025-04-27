# Slack統合

このディレクトリには、Slackとの統合に関連するコードが含まれています。

## 概要

Slack統合は、Slack Boltフレームワークを使用して実装されています。これにより、Slackからのイベント（スラッシュコマンド、メッセージなど）を処理し、AIを活用したデザイン依頼の作成と管理を行うことができます。

## アーキテクチャ

### キャッチオールルート

すべてのSlackリクエストは、単一のキャッチオールルート `/api/slack/[[...route]]/route.ts` で処理されます。このルートは、以下のエンドポイントを処理します：

- `/api/slack/oauth` - OAuth認証コールバック
- `/api/slack/command` - スラッシュコマンド（/designer）
- `/api/slack/events` - イベントAPI（メッセージなど）

### カスタムレシーバー

Next.jsのAPI Routesで動作するカスタムレシーバー `NextConnectReceiver` を実装しています。このレシーバーは、Slack Boltフレームワークと連携して、リクエストの処理とレスポンスの生成を行います。

## 主要コンポーネント

### NextConnectReceiver (`/src/utils/NextConnectReceiver.ts`)

Next.jsのAPI Routesで動作するカスタムSlack Boltレシーバー。リクエストの検証、処理、レスポンスの生成を担当します。

### 認証 (`/src/lib/slack/auth.ts`)

Slackからのリクエストの署名検証とプラン情報の取得を行います。HMAC-SHA256を使用した署名検証を実装しています。

### メッセージ処理 (`/src/lib/slack/message.ts`)

Slackへのメッセージ送信、ブロックの生成、レスポンスの作成などを行います。

### セッション管理 (`/src/lib/slack/session.ts`)

チャットセッションの作成、取得、更新、削除などを行います。セッションはメモリ内に保存されます（本番環境ではRedisなどの外部ストレージの使用を推奨）。

### AIチャット処理 (`/src/services/slack-ai-chat.ts`)

OpenAI APIを使用したAIチャットの処理、JSONデータの抽出、タスクの作成などを行います。

## 使用方法

### スラッシュコマンド

Slackで `/designer [依頼内容]` と入力することで、デザイン依頼を開始できます。例：

```
/designer バナー作りたい
```

### タスク作成

AIとの会話の中で、`!create_task` または `!タスク作成` と入力することで、会話内容からタスクを作成できます。

## 環境変数

以下の環境変数が必要です：

- `SLACK_SIGNING_SECRET` - Slackアプリの署名シークレット
- `SLACK_BOT_TOKEN` - Slackボットのトークン
- `SLACK_CLIENT_ID` - SlackアプリのクライアントID
- `SLACK_CLIENT_SECRET` - Slackアプリのクライアントシークレット
- `OPENAI_API_KEY` - OpenAI APIキー

## 開発環境での注意点

開発環境では、`SKIP_SLACK_SIGNATURE_CHECK=true` を設定することで、署名検証をスキップできます。本番環境では必ず署名検証を有効にしてください。

## Node.js Runtimeでの注意点

このアプリケーションはNode.js Runtimeで動作するように設計されています：

1. 署名検証には、Web Crypto API（`crypto.subtle`）を使用しています。
2. Base64エンコード/デコードには、クライアントサイドでは`btoa`/`atob`を使用しています。
3. サーバーサイドでは、Node.jsのコアモジュールを使用できるようになりました。

これらの対応のために、以下の設定を行っています：

1. `next.config.ts`でポリフィルを設定（crypto, path, fs, stream, querystring, buffer, util, zlib, url）
2. `NextConnectReceiver`でWeb Crypto APIを使用した署名検証を実装
3. OAuth認証コールバックで`atob`を使用してBase64デコードを行う
4. `transpilePackages`に`@slack/bolt`を追加して、外部パッケージとして処理
5. `runtime = 'nodejs'`を設定して、Node.jsランタイムを使用
