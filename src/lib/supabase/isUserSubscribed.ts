// lib/supabase/isUserSubscribed.ts
import { supabase } from "@/lib/supabase"

export async function isUserSubscribed(clerkUserId: string): Promise<boolean> {
    console.log(`[isUserSubscribed] 検索開始: clerkUserId=${clerkUserId}`);
    
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .eq("is_active", true)
      .maybeSingle()
  
    console.log(`[isUserSubscribed] 検索結果: clerkUserId=${clerkUserId}, data=`, data, "error=", error)
  
    return !!data && !error
  }
