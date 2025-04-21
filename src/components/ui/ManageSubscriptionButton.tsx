'use client'

import { Button } from '@/components/ui/button'
import { createCustomerPortalSession } from '@/app/actions/subscription'
import { useToast } from '@/components/ui/use-toast'

export function ManageSubscriptionButton() {
  const { toast } = useToast()

  const handleClick = async () => {
    try {
      const { url, error } = await createCustomerPortalSession()

      if (error || !url) {
        console.error('エラー:', error)
        toast({
          variant: 'destructive',
          title: 'エラーが発生しました',
          description: error || 'カスタマーポータルの作成に失敗しました',
        })
        return
      }

      window.location.href = url
    } catch (err) {
      console.error('エラー:', err)
      toast({
        variant: 'destructive',
        title: 'エラーが発生しました',
        description: '予期せぬエラーが発生しました',
      })
    }
  }

  return <Button onClick={handleClick}>プランを管理</Button>
}
