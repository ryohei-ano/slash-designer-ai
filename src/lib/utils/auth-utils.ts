import { clearUserChatData } from '@/components/ui/design-chat'

/**
 * ユーザーのログアウト時に実行する処理をまとめた関数
 * - チャット履歴のクリア
 * - その他のユーザー固有のデータのクリア
 *
 * @param userId ログアウトするユーザーのID
 */
export const handleUserLogout = (userId: string | null | undefined): void => {
  // チャット履歴をクリア
  clearUserChatData(userId)

  // 将来的に他のクリーンアップ処理が必要な場合はここに追加
}
