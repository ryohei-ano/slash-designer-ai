'use client'

import { useEffect, useState } from 'react'
import { useSignUp } from '@clerk/nextjs'
import { Loading } from './loading'

export function SignUpReloader() {
  const { isLoaded, signUp } = useSignUp()
  const [isReloading, setIsReloading] = useState(false)

  useEffect(() => {
    // ローカルストレージで確認し、すでにリロード済みかどうかチェック
    const reloadStatus = localStorage.getItem('signUpReloaded')

    if (isLoaded && signUp?.status === 'complete' && !reloadStatus) {
      // サインアップ完了かつまだリロードしていない場合
      console.log('サインアップ完了を検出しました。ページをリロードします...')

      // リロード済みとマーク
      localStorage.setItem('signUpReloaded', 'true')

      // ローディング表示
      setIsReloading(true)

      // 少し遅延を入れてリロード
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }

    // 次回のサインアップのためにクリーンアップ
    return () => {
      if (signUp?.status !== 'complete') {
        localStorage.removeItem('signUpReloaded')
      }
    }
  }, [isLoaded, signUp?.status])

  if (isReloading) {
    return <Loading delay={0} />
  }

  // 通常時は何も表示しない
  return null
}
