import { AccountLayout } from "@/features/account/account-layout";
import type { ReactNode } from "react";
export default function Layout({ children }: { children: ReactNode }) { return <AccountLayout>{children}</AccountLayout>; }
