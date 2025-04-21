import { supabase } from "@/lib/supabase"

type UpdateSubscriptionArgs = {
  nextBillingDate: Date | null
  isActive: boolean
}

export async function updateSubscriptionStatus(
  clerkUserId: string,
  args: UpdateSubscriptionArgs
): Promise<void> {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      next_billing_date: args.nextBillingDate,
      is_active: args.isActive,
    })
    .eq("clerk_user_id", clerkUserId)

  if (error) {
    console.error("❌ Supabase更新失敗:", error)
    throw new Error("Supabase更新失敗: " + error.message)
  }
}
