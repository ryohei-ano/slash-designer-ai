import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md flex flex-col items-center">
        <h2 className="text-2xl font-bold text-center mb-6">新規登録</h2>
        <div className="w-full flex justify-center">
          <SignUp 
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
            redirectUrl="/onboarding"
            afterSignUpUrl="/onboarding" 
          />
        </div>
      </div>
    </div>
  );
}
