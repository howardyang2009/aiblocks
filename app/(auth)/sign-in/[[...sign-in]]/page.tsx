import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-shell px-5 py-20 flex justify-center">
      <SignIn />
    </div>
  );
}
