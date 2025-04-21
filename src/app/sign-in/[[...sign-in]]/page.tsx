import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md flex flex-col items-center">
        <h2 className="text-2xl font-bold text-center mb-6">ログイン</h2>
        <div className="w-full flex justify-center">
          <SignIn
            path="/sign-in"
            routing="path"
            signUpUrl="/sign-up"
            redirectUrl="/"
            afterSignInUrl="/"
          />
        </div>
      </div>
    </div>
  )
}
