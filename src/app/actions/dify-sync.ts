'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { auth } from '@clerk/nextjs/server'

// Dify APIクライアント
const DIFY_API_KEY = process.env.DIFY_API_KEY
const DIFY_API_URL = process.env.DIFY_API_URL

// ワークスペースデータをDifyに同期する関数
export async function syncWorkspaceWithDify(workspaceId: string) {
  try {
    // 認証チェック
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: '認証エラー: ユーザーが認証されていません' }
    }

    // ワークスペース情報の取得
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single()

    if (workspaceError) {
      console.error('ワークスペース情報取得エラー:', workspaceError)
      return { success: false, error: 'ワークスペース情報の取得に失敗しました' }
    }

    // ワークスペースのURLを取得
    const { data: urls, error: urlsError } = await supabaseAdmin
      .from('workspace_urls')
      .select('url')
      .eq('workspace_id', workspaceId)

    if (urlsError) {
      console.error('ワークスペースURL取得エラー:', urlsError)
      // URLの取得エラーは同期の失敗とはしない
    }

    // ワークスペースのファイル情報を取得
    const { data: files, error: filesError } = await supabaseAdmin
      .from('workspace_files')
      .select('*')
      .eq('workspace_id', workspaceId)

    if (filesError) {
      console.error('ワークスペースファイル取得エラー:', filesError)
      // ファイルの取得エラーは同期の失敗とはしない
    }

    // Difyにデータを送信
    // 1. テキストデータの同期
    const textSyncResult = await syncTextData({
      workspaceId,
      name: workspace.name,
      industry: workspace.industry,
      overview: workspace.business_overview,
      urls: urls?.map((u) => u.url) || [],
    })

    if (!textSyncResult.success) {
      console.error('テキストデータ同期エラー:', textSyncResult.error)
      return {
        success: false,
        error: `テキストデータの同期に失敗しました: ${textSyncResult.error}`,
      }
    }

    // 2. ファイルデータの同期
    if (files && files.length > 0) {
      const fileSyncResult = await syncFileData(files, workspaceId)
      if (!fileSyncResult.success) {
        console.error('ファイルデータ同期エラー:', fileSyncResult.error)
        return {
          success: false,
          error: `ファイルデータの同期に失敗しました: ${fileSyncResult.error}`,
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Dify同期エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラーが発生しました',
    }
  }
}

// テキストデータをDifyに同期
async function syncTextData(data: {
  workspaceId: string
  name: string
  industry: string
  overview: string | null
  urls: string[]
}) {
  try {
    if (!DIFY_API_KEY || !DIFY_API_URL) {
      return { success: false, error: 'Dify API設定が見つかりません' }
    }

    // ワークスペース情報をテキストとして整形
    const workspaceText = `
ワークスペース名: ${data.name}
業種: ${data.industry}
${data.overview ? `ビジネス概要: ${data.overview}` : ''}
${data.urls.length > 0 ? `関連URL: ${data.urls.join(', ')}` : ''}
    `.trim()

    // Dify Document APIを使用してテキストデータを同期
    const response = await fetch(`${DIFY_API_URL}/knowledge-bases/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DIFY_API_KEY}`,
      },
      body: JSON.stringify({
        knowledge_base_id: process.env.DIFY_KNOWLEDGE_BASE_ID,
        documents: [
          {
            text: workspaceText,
            metadata: {
              source: 'workspace_info',
              workspace_id: data.workspaceId,
            },
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, error: `Dify API エラー: ${JSON.stringify(errorData)}` }
    }

    const responseData = await response.json()
    return { success: true, data: responseData }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'テキストデータ同期中に不明なエラーが発生しました',
    }
  }
}

// ファイルをDifyに同期
async function syncFileData(files: any[], workspaceId: string) {
  try {
    if (!DIFY_API_KEY || !DIFY_API_URL) {
      return { success: false, error: 'Dify API設定が見つかりません' }
    }

    // ファイルごとに処理
    const syncPromises = files.map(async (file) => {
      // ファイルのURLからデータを取得
      const fileResponse = await fetch(file.public_url)
      if (!fileResponse.ok) {
        return {
          success: false,
          fileId: file.id,
          error: `ファイルの取得に失敗しました: ${fileResponse.statusText}`,
        }
      }

      const fileBlob = await fileResponse.blob()
      const formData = new FormData()
      formData.append('knowledge_base_id', process.env.DIFY_KNOWLEDGE_BASE_ID || '')
      formData.append('file', fileBlob, file.file_name)
      formData.append(
        'metadata',
        JSON.stringify({
          source: 'workspace_file',
          workspace_id: workspaceId,
          file_id: file.id,
        })
      )

      // Dify Document APIを使用してファイルを同期
      const uploadResponse = await fetch(`${DIFY_API_URL}/knowledge-bases/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${DIFY_API_KEY}`,
        },
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        return {
          success: false,
          fileId: file.id,
          error: `Dify API エラー: ${JSON.stringify(errorData)}`,
        }
      }

      const responseData = await uploadResponse.json()
      return { success: true, fileId: file.id, data: responseData }
    })

    const results = await Promise.all(syncPromises)
    const failedUploads = results.filter((result) => !result.success)

    if (failedUploads.length > 0) {
      console.warn(`${failedUploads.length}個のファイル同期に失敗しました:`, failedUploads)
      return {
        success: false,
        error: `${failedUploads.length}個のファイル同期に失敗しました`,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'ファイルデータ同期中に不明なエラーが発生しました',
    }
  }
}
