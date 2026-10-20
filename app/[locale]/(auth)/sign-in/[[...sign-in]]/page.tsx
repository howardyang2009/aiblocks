import { SignIn } from "@clerk/nextjs";
import { pageMetadata } from "@/i18n/metadata";

export function generateMetadata() {
  return pageMetadata("signIn");
}

// Prerender the bare /{locale}/sign-in page; Clerk's own sub-steps
// (e.g. /sign-in/factor-one) still render on demand.
export function generateStaticParams() {
  return [{ "sign-in": [] }];
}

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-shell px-5 py-20 flex justify-center">
      <SignIn />
    </div>
  );
}
