import { AuthForm } from "@/features/auth/auth-form";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) { const { success } = await searchParams; return <AuthForm mode="login" success={success} />; }
