"use server"

import { supabaseAdmin, supabase } from "@/lib/supabase"
import { OnboardingFormValues } from "@/components/ui/onboarding-flow"
import { revalidatePath } from "next/cache"
import { auth } from "@clerk/nextjs/server"
import { uploadWorkspaceFile } from "./upload-file"
import { assignFreeSubscription } from "./subscription"
import { syncWorkspaceWithDify } from "./dify-sync"

/**
 * ワークスペース情報の型定義
 */
export type Workspace = {
  id: string;
  name: string;
  industry: string;
  business_overview: string | null;
  created_by: string;
  created_at: string;
};

/**
 * ユーザーのワークスペース一覧を取得する
 */
export async function getUserWorkspaces(userId: string): Promise<{ workspaces: Workspace[], error?: string }> {
  try {
    // ユーザー認証の確認
    const { userId: authUserId } = await auth();
    if (!authUserId || authUserId !== userId) {
      return { workspaces: [], error: "認証エラー: ユーザーIDが一致しません" };
    }

    // ユーザーのワークスペース一覧を取得
    const { data: userWorkspaces, error: userWorkspacesError } = await supabaseAdmin
      .from("user_workspaces")
      .select("workspace_id")
      .eq("user_id", userId);

    if (userWorkspacesError) {
      console.error("Error fetching user workspaces:", userWorkspacesError);
      return { workspaces: [], error: `ワークスペース取得エラー: ${userWorkspacesError.message}` };
    }

    if (!userWorkspaces || userWorkspaces.length === 0) {
      return { workspaces: [] };
    }

    // ワークスペースIDの配列を作成
    const workspaceIds = userWorkspaces.map(uw => uw.workspace_id);

    // ワークスペース情報を取得
    const { data: workspaces, error: workspacesError } = await supabaseAdmin
      .from("workspaces")
      .select("*")
      .in("id", workspaceIds);

    if (workspacesError) {
      console.error("Error fetching workspaces:", workspacesError);
      return { workspaces: [], error: `ワークスペース情報取得エラー: ${workspacesError.message}` };
    }

    return { workspaces: workspaces || [] };
  } catch (error) {
    console.error("Unexpected error in getUserWorkspaces:", error);
    const errorMessage = error instanceof Error ? error.message : "不明なエラーが発生しました";
    return { workspaces: [], error: errorMessage };
  }
}

/**
 * ワークスペース情報を更新する
 */
export async function updateWorkspace(
  workspaceId: string,
  data: { name: string; industry: string; business_overview?: string | null },
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // ユーザー認証の確認
    const { userId: authUserId } = await auth();
    if (!authUserId || authUserId !== userId) {
      return { success: false, error: "認証エラー: ユーザーIDが一致しません" };
    }

    // ユーザーがこのワークスペースにアクセス権があるか確認
    const { data: userWorkspace, error: userWorkspaceError } = await supabaseAdmin
      .from("user_workspaces")
      .select("role")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .single();

    if (userWorkspaceError) {
      console.error("Error checking workspace access:", userWorkspaceError);
      return { success: false, error: "このワークスペースへのアクセス権がありません" };
    }

    // ワークスペース情報を更新
    const { error: updateError } = await supabaseAdmin
      .from("workspaces")
      .update({
        name: data.name,
        industry: data.industry,
        business_overview: data.business_overview || null,
      })
      .eq("id", workspaceId);

    if (updateError) {
      console.error("Error updating workspace:", updateError);
      return { success: false, error: `ワークスペース更新エラー: ${updateError.message}` };
    }

    // キャッシュの更新
    revalidatePath("/dashboard");

    // Difyとデータを同期
    try {
      console.log(`[updateWorkspace] Difyとのデータ同期を開始: workspaceId=${workspaceId}`)
      const syncResult = await syncWorkspaceWithDify(workspaceId)
      if (syncResult.success) {
        console.log(`[updateWorkspace] Difyとのデータ同期完了: workspaceId=${workspaceId}`)
      } else {
        console.warn(`[updateWorkspace] Difyとのデータ同期に失敗: ${syncResult.error}`)
        // 同期エラーはワークスペース更新の失敗とはしない
      }
    } catch (syncError) {
      console.error("Dify同期エラー:", syncError)
      console.warn("Difyとの同期に失敗しましたが、ワークスペースは更新されました")
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error in updateWorkspace:", error);
    const errorMessage = error instanceof Error ? error.message : "不明なエラーが発生しました";
    return { success: false, error: errorMessage };
  }
}

/**
 * ワークスペースを作成し、ユーザーと紐づける
 */
export async function createWorkspace(
  data: OnboardingFormValues,
  userId: string
): Promise<{ success: boolean; workspaceId?: string; error?: string }> {
  try {
    console.log("Creating workspace for user:", userId, "with data:", data)

    // ユーザー認証の確認
    const { userId: authUserId } = await auth()
    if (!authUserId || authUserId !== userId) {
      return { success: false, error: "認証エラー: ユーザーIDが一致しません" }
    }

    // ワークスペースの作成
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .insert({
        name: data.workspace_name,
        industry: data.industry,
        business_overview: data.business_overview || null,
        created_by: userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (workspaceError) {
      console.error("Error creating workspace:", workspaceError)
      return { success: false, error: `ワークスペース作成エラー: ${workspaceError.message}` }
    }

    // URLsの保存（存在する場合）
    if (data.urls && data.urls.length > 0) {
      const validUrls = data.urls.filter(item => item.url.trim() !== "")
      
      if (validUrls.length > 0) {
        const urlsToInsert = validUrls.map(item => ({
          workspace_id: workspace.id,
          url: item.url,
        }))

        const { error: urlsError } = await supabaseAdmin
          .from("workspace_urls")
          .insert(urlsToInsert)

        if (urlsError) {
          console.error("Error saving URLs:", urlsError)
          // URLの保存エラーはワークスペース作成の失敗とはしない
          console.warn("Failed to save URLs, but workspace was created")
        }
      }
    }

    // ファイルの処理（存在する場合）
    if (data.files && data.files.length > 0) {
      console.log(`${data.files.length}個のファイルをアップロードします`)
      
      const filePromises = data.files.map(async (file) => {
        return await uploadWorkspaceFile(file, workspace.id)
      })
      
      try {
        const fileResults = await Promise.all(filePromises)
        const failedUploads = fileResults.filter(result => !result.success)
        
        if (failedUploads.length > 0) {
          // Log detailed error information for debugging
          console.warn(`${failedUploads.length}個のファイルアップロードに失敗しました`, JSON.stringify(failedUploads))
          
          // Add more detailed error logging
          failedUploads.forEach((result, index) => {
            console.warn(`失敗したアップロード ${index + 1}:`, {
              error: result.error,
              errorType: result.error ? typeof result.error : 'undefined'
            })
          })
        }
        
        console.log(`${fileResults.length - failedUploads.length}個のファイルが正常にアップロードされました`)
      } catch (fileError) {
        console.error("ファイルアップロード中にエラーが発生しました:", fileError)
        // ファイルアップロードエラーはワークスペース作成の失敗とはしない
      }
    }

    // ユーザーとワークスペースの紐づけ
    const { error: userWorkspaceError } = await supabaseAdmin
      .from("user_workspaces")
      .insert({
        user_id: userId,
        workspace_id: workspace.id,
        role: "owner",
      })

    if (userWorkspaceError) {
      console.error("Error linking user to workspace:", userWorkspaceError)
      return { 
        success: false, 
        error: `ユーザーとワークスペースの紐づけエラー: ${userWorkspaceError.message}` 
      }
    }

    // キャッシュの更新
    revalidatePath("/dashboard")
    
    // Difyとデータを同期
    try {
      console.log(`[createWorkspace] Difyとのデータ同期を開始: workspaceId=${workspace.id}`)
      const syncResult = await syncWorkspaceWithDify(workspace.id)
      if (syncResult.success) {
        console.log(`[createWorkspace] Difyとのデータ同期完了: workspaceId=${workspace.id}`)
      } else {
        console.warn(`[createWorkspace] Difyとのデータ同期に失敗: ${syncResult.error}`)
        // 同期エラーはワークスペース作成の失敗とはしない
      }
    } catch (syncError) {
      console.error("Dify同期エラー:", syncError)
      console.warn("Difyとの同期に失敗しましたが、ワークスペースは作成されました")
    }

    // フリープランを割り当て（サーバーアクションを使用）
    try {
      const { success, error } = await assignFreeSubscription(userId)
      if (success) {
        console.log(`[createWorkspace] フリープランの割り当て完了: userId=${userId}`)
      } else {
        console.warn(`[createWorkspace] フリープランの割り当てに失敗: ${error}`)
      }
    } catch (subscriptionError) {
      // サブスクリプション作成エラーはワークスペース作成の失敗とはしない
      console.error("フリープラン割り当てエラー:", subscriptionError)
      console.warn("フリープランの割り当てに失敗しましたが、ワークスペースは作成されました")
    }

    return {
      success: true,
      workspaceId: workspace.id,
    }
  } catch (error) {
    console.error("Unexpected error in createWorkspace:", error)
    const errorMessage = error instanceof Error ? error.message : "不明なエラーが発生しました"
    return { success: false, error: errorMessage }
  }
}
