import { SignUp } from "@clerk/nextjs";

// Prerender the bare /{locale}/sign-up page; Clerk's own sub-steps
// (e.g. /sign-up/factor-one) still render on demand.
export function generateStaticParams() {
  return [{ "sign-up": [] }];
}

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-shell px-5 py-20 flex justify-center">
      <SignUp />
    </div>
  );
}
