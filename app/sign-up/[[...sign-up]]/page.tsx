import { SignUp } from "@clerk/nextjs";
import { authAppearance } from "@/components/AuthAppearance";
import AuthPageShell from "@/components/AuthPageShell";

export default function SignUpPage() {
  return (
    <AuthPageShell eyebrow="" title="Create your account" intro="Join Homely to discover thoughtful stays.">
      <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/"
          appearance={authAppearance}
      />
    </AuthPageShell>
  );
}
