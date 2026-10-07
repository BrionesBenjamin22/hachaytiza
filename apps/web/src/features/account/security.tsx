"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSession } from "@/features/auth/session";
import { passwordSchema } from "@/features/auth/validation";
import { accountService } from "./service";
import { errorMessage } from "@/lib/http";
const schema = z.object({ currentPassword: passwordSchema, newPassword: passwordSchema, confirmation: z.string() }).refine(values => values.newPassword === values.confirmation, { path: ["confirmation"], message: "Las contraseñas no coinciden." });
type PasswordInput = z.infer<typeof schema>;
export function Security() {
  const session = useSession(); const router = useRouter(); const [error, setErrorMessage] = useState("");
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<PasswordInput>();
  async function submit(values: PasswordInput) {
    setErrorMessage(""); const result = schema.safeParse(values);
    if (!result.success) { result.error.issues.forEach(issue => setError(issue.path[0] as keyof PasswordInput, { message: issue.message })); return; }
    try { await accountService.changePassword({ currentPassword: result.data.currentPassword, newPassword: result.data.newPassword }); reset(); await session.clearRevokedSession(); router.replace("/auth/login?success=password-changed"); }
    catch (error) { setErrorMessage(errorMessage(error)); }
  }
  return <section className="panel glass"><h1>Seguridad</h1><h2>Cambiar contraseña</h2>{session.session?.user?.hasLocalPassword === false ? <p>Esta cuenta no tiene una contraseña local.</p> : <><p className="muted">Al cambiarla se cerrarán todas tus sesiones. Después tendrás que ingresar nuevamente.</p><form onSubmit={handleSubmit(submit)} noValidate>{[["currentPassword", "Contraseña actual", "current-password"], ["newPassword", "Nueva contraseña", "new-password"], ["confirmation", "Confirmar nueva contraseña", "new-password"]].map(([name, label, autocomplete]) => <div className="field" key={name}><label htmlFor={name}>{label}</label><input id={name} type="password" autoComplete={autocomplete} {...register(name as keyof PasswordInput)} aria-invalid={!!errors[name as keyof PasswordInput]} aria-describedby={`${name}-error`} /><p className="error" id={`${name}-error`}>{errors[name as keyof PasswordInput]?.message}</p></div>)}<p className="muted">Entre 8 y 128 caracteres.</p>{error ? <p className="error" role="alert">{error}</p> : null}<button className="button" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : "Cambiar contraseña"}</button></form></>}<p className="mt-6"><Link href="/auth/forgot-password">Olvidé mi contraseña</Link></p></section>;
}
