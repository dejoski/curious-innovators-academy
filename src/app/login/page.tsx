import LoginClient from "./LoginClient";

const errors: Record<string, string> = {
  configuration: "The demo is being prepared. Please try again shortly.",
  failed: "We couldn't open that demo workspace. Please try again shortly.",
  required: "Choose a role to open a demo workspace.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ auth?: string }> }) {
  const { auth } = await searchParams;
  return <LoginClient error={auth ? errors[auth] ?? errors.failed : undefined} />;
}
