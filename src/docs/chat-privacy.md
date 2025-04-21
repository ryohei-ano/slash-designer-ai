# チャット履歴のプライバシー対策

## 問題点

以前の実装では、チャット履歴がlocalStorageに固定キー名で保存されていたため、同じデバイスで別のユーザーがログインした場合に前のユーザーのチャット履歴が見えてしまう問題がありました。

## 解決策

以下の変更を行い、ユーザー間でチャット履歴が共有されないようにしました：

1. **ユーザー固有のストレージキーの使用**
   - localStorageのキー名にユーザーIDを含めることで、各ユーザーが独自のストレージ領域を持つようにしました
   - `design_chat_data` → `design_chat_data_[userId]`

2. **ユーザー情報の確認**
   - ユーザー情報がロードされるまでデータの読み込み・保存を行わないようにしました
   - これにより、未認証状態でのデータ漏洩を防止します

3. **ログアウト時のデータクリア**
   - ユーザーがログアウトする際にチャット履歴を自動的にクリアする機能を追加しました
   - `clearUserChatData` 関数と `handleUserLogout` ユーティリティを実装

## 実装の詳細

### 1. ユーザー固有のストレージキー

```typescript
// localStorageキーのベース名
const STORAGE_KEY_BASE = "design_chat_data";

// ユーザー固有のlocalStorageキーを生成する関数
const getUserStorageKey = (userId: string | null | undefined): string => {
  return userId ? `${STORAGE_KEY_BASE}_${userId}` : STORAGE_KEY_BASE;
};
```

### 2. データの読み込み・保存時のユーザー確認

```typescript
// 保存データを復元
useEffect(() => {
  // ユーザー情報がロードされるまで待機
  if (!user) return;
  
  // 以下、データ読み込み処理
  // ...
}, [user, storageKey]);

// データ変更時に保存
useEffect(() => {
  // ユーザーがロードされていない場合は保存しない
  if (messages.length === 0 || !user) return;
  
  // 以下、データ保存処理
  // ...
}, [messages, input, jsonData, user, storageKey]);
```

### 3. ログアウト時のデータクリア

```typescript
// ユーザーのチャットデータをクリアする関数
export const clearUserChatData = (userId: string | null | undefined): void => {
  if (userId) {
    localStorage.removeItem(getUserStorageKey(userId));
  }
};

// ログアウト処理用のユーティリティ関数
export const handleUserLogout = (userId: string | null | undefined): void => {
  // チャット履歴をクリア
  clearUserChatData(userId);
  
  // 将来的に他のクリーンアップ処理が必要な場合はここに追加
};
```

## 使用方法

ログアウト処理を実装する際に、`handleUserLogout` 関数を呼び出すことで、ユーザーのチャット履歴を自動的にクリアできます：

```typescript
import { handleUserLogout } from "@/lib/utils/auth-utils";
import { useUser } from "@clerk/nextjs";

// ログアウトボタンのクリックハンドラなどで
const handleLogout = async () => {
  const { user } = useUser();
  
  // ログアウト前にクリーンアップ処理を実行
  handleUserLogout(user?.id);
  
  // Clerkのログアウト処理
  await signOut();
};
