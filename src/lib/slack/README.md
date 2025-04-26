# Slack連携機能

このディレクトリには、Slackとの連携機能が含まれています。デザイン依頼をSlack上で受け付け、AIとの会話を通じてタスクを作成する機能を提供します。

## 機能概要

- Slackのスラッシュコマンド（`/designer`）を使用してデザイン依頼を開始
- AIとの会話を通じて依頼内容を詳細化
- 会話の内容からタスクを自動生成
- タスク作成後にSlackに通知

## ハイブリッドアプローチ

この実装では、無料プランと有料プランの両方のSlackユーザーに対応するハイブリッドアプローチを採用しています：

1. **基本機能（すべてのユーザー向け）**

   - 従来のSlack APIを使用
   - スラッシュコマンドとイベントAPIを活用
   - セッション管理を自前で実装

2. **拡張機能（有料プランユーザー向け）**
   - Slack AI Appsを使用
   - より高度なUI体験
   - 自動セッション管理

## 設定方法

### 1. 環境変数の設定

以下の環境変数を`.env.local`ファイルに設定してください：

```
# Slack API設定
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_BOT_TOKEN=xoxb-your_bot_token
SLACK_APP_TOKEN=xapp-your_app_token

# OpenAI API設定
OPENAI_API_KEY=your_openai_api_key

# アプリURL設定
NEXT_PUBLIC_APP_URL=https://your-app-domain.com
```

### 2. Slackアプリの設定

#### 基本機能（従来のSlack API）

1. [Slack API](https://api.slack.com/apps)にアクセスし、新しいアプリを作成
2. 「Slash Commands」セクションで以下のコマンドを追加：

   - Command: `/designer`
   - Request URL: `https://your-app-domain.com/api/slack/command`
   - Short Description: デザイン依頼を開始
   - Usage Hint: バナー作りたい

3. 「Event Subscriptions」を有効化：

   - Request URL: `https://your-app-domain.com/api/slack/events`
   - Subscribe to bot events: `message.channels`, `message.groups`

4. 「OAuth & Permissions」で以下のスコープを追加：

   - `app_mentions:read`
   - `channels:history`
   - `channels:read`
   - `chat:write`
   - `commands`
   - `groups:history`
   - `groups:read`

5. アプリをワークスペースにインストール

#### 拡張機能（Slack AI Apps）

有料プランユーザー向けの拡張機能を設定するには：

1. [Slack API](https://api.slack.com/apps)にアクセス
2. 「App Manifest」タブを選択
3. `src/lib/slack/ai-app-manifest.json`の内容をコピー＆ペースト
4. マニフェスト内のURLを実際のアプリURLに更新
5. アプリをワークスペースにインストール

## 使用方法

### ユーザー向け

1. Slackで`/designer バナー作りたい`のようにコマンドを入力
2. AIとの会話を通じて依頼内容を詳細化
3. AIが十分な情報を収集すると、JSONデータが生成される
4. `!タスク作成`と入力してタスクを作成
5. タスク作成完了の通知が表示される

### 開発者向け

- `src/lib/slack/auth.ts` - Slack認証関連の機能
- `src/lib/slack/message.ts` - メッセージ送信関連の機能
- `src/lib/slack/session.ts` - セッション管理機能
- `src/app/api/slack/command/route.ts` - スラッシュコマンド処理
- `src/app/api/slack/events/route.ts` - イベント処理
- `src/app/api/slack/ai-handler/route.ts` - AI Apps拡張機能
- `src/services/slack-ai-chat.ts` - AIとの連携処理

## 注意事項

- セッションは15分で期限切れになります
- 本番環境では、セッション管理にRedisなどの外部ストレージを使用することを推奨します
- Slack AI Appsの機能は、有料プランのSlackワークスペースでのみ利用可能です

## トラブルシューティング

- Slack署名の検証に失敗する場合は、`SLACK_SIGNING_SECRET`が正しく設定されているか確認してください
- メッセージ送信に失敗する場合は、`SLACK_BOT_TOKEN`が正しく設定されているか、必要なスコープが付与されているか確認してください
- OpenAI APIエラーが発生する場合は、`OPENAI_API_KEY`が正しく設定されているか確認してください
