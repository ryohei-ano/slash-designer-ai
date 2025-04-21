"use server"

import { supabaseAdmin } from "@/lib/supabase"
import { auth } from "@clerk/nextjs/server"
import { v4 as uuidv4 } from "uuid"

export async function uploadWorkspaceFile(file: File, workspaceId: string) {
  try {
    // ユーザー認証の確認
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "認証エラー: ユーザーが認証されていません" }
    }

    // ファイル名の作成（一意にするためにUUIDを追加）
    const fileExtension = file.name.split('.').pop()
    const uniqueFileName = `${uuidv4()}.${fileExtension}`
    const filePath = `${workspaceId}/${uniqueFileName}`

    // ファイルをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // Supabase Storageにファイルをアップロード
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('workspace-files')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error("ファイルアップロードエラー:", uploadError)
      return { success: false, error: `ファイルアップロードエラー: ${uploadError.message}` }
    }

    // 公開URLを取得
    const { data: publicUrlData } = supabaseAdmin
      .storage
      .from('workspace-files')
      .getPublicUrl(filePath)

    // ファイルメタデータをデータベースに保存
    const { data: fileData, error: fileError } = await supabaseAdmin
      .from('workspace_files')
      .insert({
        workspace_id: workspaceId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        public_url: publicUrlData.publicUrl,
        uploaded_by: userId,
      })
      .select()
      .single()

    if (fileError) {
      console.error("ファイルメタデータ保存エラー:", fileError)
      // Ensure we have a meaningful error message even if fileError.message is undefined
      const errorMessage = fileError.message || JSON.stringify(fileError) || "不明なデータベースエラー"
      return { success: false, error: `ファイルメタデータ保存エラー: ${errorMessage}` }
    }

    return {
      success: true,
      fileId: fileData.id,
      publicUrl: publicUrlData.publicUrl,
    }
  } catch (error) {
    console.error("予期せぬエラー:", error)
    const errorMessage = error instanceof Error ? error.message : "不明なエラーが発生しました"
    return { success: false, error: errorMessage }
  }
}
