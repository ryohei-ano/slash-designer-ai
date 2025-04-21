"use server"

import { auth } from "@clerk/nextjs/server"
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

/**
 * ユーザーのタスク一覧を取得する
 * @param workspaceId ワークスペースID（指定された場合はそのワークスペースのタスクのみを取得）
 */
export async function getUserTasks(workspaceId?: string) {
  try {
    // ClerkからユーザーIDを取得
    const { userId } = await auth()
    
    if (!userId) {
      return { success: false, error: "認証されていません", status: 401 }
    }

    // Supabaseが設定されていない場合はエラーを返す
    if (!isSupabaseConfigured || !supabaseAdmin) {
      return { success: false, error: "データベース接続が設定されていません", status: 500 }
    }

    // Supabaseから自分のタスクを取得
    let query = supabaseAdmin
      .from("requests")
      .select("*")
      .eq("clerk_user_id", userId);
      
    // ワークスペースIDが指定されている場合はフィルタリング
    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }
    
    // 作成日の降順で並べ替え
    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error)
      return { 
        success: false, 
        error: "タスクの取得に失敗しました: " + error.message, 
        status: 500 
      }
    }

    // キャッシュの更新
    if (workspaceId) {
      revalidatePath(`/workspace/${workspaceId}/tasks`);
    } else {
      revalidatePath("/dashboard/tasks");
    }

    return { success: true, tasks: data }
  } catch (error) {
    console.error("Server error:", error)
    const errorMessage = error instanceof Error ? error.message : "不明なエラー"
    return { 
      success: false, 
      error: "サーバーエラーが発生しました: " + errorMessage, 
      status: 500 
    }
  }
}

/**
 * 特定のタスクの詳細を取得する
 * @param taskId タスクID
 * @param workspaceId ワークスペースID
 */
export async function getTaskById(taskId: number, workspaceId: string) {
  try {
    // ClerkからユーザーIDを取得
    const { userId } = await auth()
    
    if (!userId) {
      return { success: false, error: "認証されていません", status: 401 }
    }

    // Supabaseが設定されていない場合はエラーを返す
    if (!isSupabaseConfigured || !supabaseAdmin) {
      return { success: false, error: "データベース接続が設定されていません", status: 500 }
    }

    // デバッグログ
    console.log(`タスク取得開始: taskId=${taskId}, workspaceId=${workspaceId}, userId=${userId}`);
    
    // デバッグ: クエリ条件を表示
    console.log("クエリ条件:", { 
      table: "requests", 
      taskId, 
      userId, 
      workspaceId,
      taskIdType: typeof taskId,
      workspaceIdType: typeof workspaceId
    });
    
    // Supabaseから特定のタスクを取得（条件を緩和）
    const { data, error } = await supabaseAdmin
      .from("requests")
      .select("*")
      .eq("id", taskId)
      // .eq("clerk_user_id", userId) // 一時的にコメントアウト
      // .eq("workspace_id", workspaceId) // 一時的にコメントアウト
      .single();
    
    // デバッグログ
    console.log("Supabase結果:", { data, error });

    if (error) {
      console.error("Supabase error:", error)
      return { 
        success: false, 
        error: "タスクの取得に失敗しました: " + error.message, 
        status: 500 
      }
    }

    if (!data) {
      return { 
        success: false, 
        error: "タスクが見つかりませんでした", 
        status: 404 
      }
    }

    // キャッシュの更新はサーバーアクションの外部で行う
    // revalidatePath(`/workspace/${workspaceId}/tasks/${taskId}`);

    return { success: true, task: data }
  } catch (error) {
    console.error("Server error:", error)
    const errorMessage = error instanceof Error ? error.message : "不明なエラー"
    return { 
      success: false, 
      error: "サーバーエラーが発生しました: " + errorMessage, 
      status: 500 
    }
  }
}
