import { SignIn } from "@clerk/nextjs";
import { authAppearance } from "@/components/AuthAppearance";
import AuthPageShell from "@/components/AuthPageShell";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ redirect_url?: string }> }) {
  const { redirect_url: redirectUrl } = await searchParams;
  const fallbackRedirectUrl = redirectUrl?.startsWith("/") ? redirectUrl : "/";
  return (
    <AuthPageShell eyebrow="" title="Welcome back" intro="Sign in to manage your trips and listings.">
      <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl={fallbackRedirectUrl}
          appearance={authAppearance}
      />
    </AuthPageShell>
  );
}
