"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { useSession } from "./session";
import { authService, type RegisterInput } from "./service";
import { loginSchema, registerSchema } from "./validation";
import { useLocations } from "@/features/locations/hooks";
import { errorMessage } from "@/lib/http";
import { LocationCombobox } from "@/features/locations/location-combobox";

export function AuthForm({ mode, success }: { mode: "login" | "register"; success?: string }) {
  const registerMode = mode === "register";
  const router = useRouter();
  const session = useSession();
  const locations = useLocations();
  const [error, setError] = useState("");
  const { register, control, handleSubmit, setError: fieldError, formState: { errors, isSubmitting } } = useForm<RegisterInput>({ defaultValues: { primaryLocationId: "" } });
  useEffect(() => { if (session.session?.authenticated) router.replace(session.session.user?.primaryLocation ? "/" : "/auth/location"); }, [session.session, router]);
  async function submit(values: RegisterInput) {
    setError("");
    const parsed = (registerMode ? registerSchema : loginSchema).safeParse(values);
    if (!parsed.success) { parsed.error.issues.forEach(issue => fieldError(issue.path[0] as keyof RegisterInput, { message: issue.message })); return; }
    try {
      if (registerMode) await authService.register(registerSchema.parse(values)); else await authService.login(loginSchema.parse(values));
      await session.synchronize();
      router.replace(registerMode ? "/?success=registered" : "/?success=login");
    } catch (cause) { setError(errorMessage(cause)); }
  }
  return <section className={`auth-panel auth-form-panel auth-form-${mode}`}>
    <header className="auth-form-header"><h1>{registerMode ? "Creá tu cuenta" : "Volvé a la cancha"}</h1><p className="muted">{registerMode ? "Elegí tu localidad para encontrar partidos cerca." : "Ingresá para encontrar partidos en tu localidad."}</p></header>
    {success === "password-changed" ? <p className="notice" role="status">Contraseña actualizada correctamente. Se cerraron todas tus sesiones. Ingresá nuevamente.</p> : null}<form className="auth-form-body" onSubmit={handleSubmit(submit)} noValidate>
      {registerMode ? <div className="field"><label htmlFor="name">Nombre</label><input id="name" autoComplete="name" placeholder="Tu nombre" {...register("name")} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />{errors.name ? <p id="name-error" className="error">{errors.name.message}</p> : null}</div> : null}
      <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" placeholder="nombre@ejemplo.com" {...register("email")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />{errors.email ? <p id="email-error" className="error">{errors.email.message}</p> : null}</div>
      <div className="field"><label htmlFor="password">Contraseña</label><input id="password" type="password" autoComplete={registerMode ? "new-password" : "current-password"} {...register("password")} aria-invalid={!!errors.password} aria-describedby={[registerMode ? "password-help" : "", errors.password ? "password-error" : ""].filter(Boolean).join(" ") || undefined} />{registerMode ? <span id="password-help" className="muted">Entre 8 y 128 caracteres.</span> : null}{errors.password ? <p id="password-error" className="error">{errors.password.message}</p> : null}</div>
      {registerMode ? <div className="field"><Controller name="primaryLocationId" control={control} render={({ field }) => <LocationCombobox id="primaryLocationId" label="Localidad principal" value={field.value} onChange={field.onChange} invalid={!!errors.primaryLocationId} describedBy={errors.primaryLocationId ? "location-error" : undefined} disabled={isSubmitting} />} />{errors.primaryLocationId ? <p id="location-error" className="error">{errors.primaryLocationId.message}</p> : null}</div> : null}
      {error ? <p role="alert" className="error auth-form-error">{error}</p> : null}
      <button className="button wide" disabled={isSubmitting || (registerMode && !locations.data?.length)}>{isSubmitting ? "Un momento…" : registerMode ? "Crear cuenta" : "Ingresar"}</button>
    </form><footer className="auth-form-footer"><p>{registerMode ? <>Ya tenés cuenta? <Link href="/auth/login">Ingresar</Link></> : <>Todavía no tenés cuenta? <Link href="/auth/register">Crear cuenta</Link></>}</p>{!registerMode ? <Link className="auth-form-recovery" href="/auth/forgot-password">Olvidé mi contraseña</Link> : null}</footer>
  </section>;
}
