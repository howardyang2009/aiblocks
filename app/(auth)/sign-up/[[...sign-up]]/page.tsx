import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-shell px-5 py-20 flex justify-center">
      <SignUp />
    </div>
  );
}
