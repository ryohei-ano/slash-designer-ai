"use client"

import { Button } from "@/components/ui/button"
import { createCheckoutSession } from "@/app/actions/subscription"
import { useToast } from "@/components/ui/use-toast"

export function SubscribeButton({ priceId }: { priceId: string }) {
  const { toast } = useToast()

  const handleClick = async () => {
    try {
      const { url, error } = await createCheckoutSession(priceId)
      
      if (error || !url) {
        console.error("エラー:", error)
        toast({
          variant: "destructive",
          title: "エラーが発生しました",
          description: error || "チェックアウトセッションの作成に失敗しました",
        })
        return
      }
      
      window.location.href = url
    } catch (err) {
      console.error("エラー:", err)
      toast({
        variant: "destructive",
        title: "エラーが発生しました",
        description: "予期せぬエラーが発生しました",
      })
    }
  }

  return <Button onClick={handleClick}>このプランを選ぶ</Button>
}
