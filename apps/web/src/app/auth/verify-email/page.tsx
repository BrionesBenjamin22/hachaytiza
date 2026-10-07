import type { Metadata } from "next";
import { EmailAction } from "@/features/auth/email-action";
export const metadata: Metadata = { referrer: "no-referrer", robots: { index: false, follow: false } };
export default function VerifyPage() { return <EmailAction mode="verify" />; }
