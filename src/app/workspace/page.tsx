import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export default async function WorkspacePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  try {
    // ユーザーのワークスペース情報を取得
    const { data: userWorkspaces, error } = await supabaseAdmin
      .from("user_workspaces")
      .select("workspace_id")
      .eq("user_id", userId);

    if (error) {
      console.error("ワークスペース取得エラー:", error);
    }

    // ワークスペースが存在しない場合はオンボーディングにリダイレクト
    if (!userWorkspaces || userWorkspaces.length === 0) {
      redirect("/onboarding");
    }

    // 複数のワークスペースがある場合は選択画面にリダイレクト
    if (userWorkspaces.length > 1) {
      redirect("/workspace/select");
    }
    
    // 1つだけの場合はそのワークスペースのページにリダイレクト
    redirect(`/workspace/${userWorkspaces[0].workspace_id}/designer`);
  } catch (error) {
    console.error("ワークスペースページ初期化中にエラーが発生しました:", error);
    // エラーが発生した場合は選択画面にリダイレクト
    redirect("/workspace/select");
  }

  // このコードは実行されませんが、TypeScriptの要件を満たすために必要
  return null;
}
