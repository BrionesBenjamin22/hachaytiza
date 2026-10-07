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
  return <section className="auth-panel"><h1>{registerMode ? "Creá tu cuenta" : "Volvé a la cancha"}</h1><p className="muted">{registerMode ? "Elegí tu localidad para encontrar partidos cerca." : "Ingresá para encontrar partidos en tu localidad."}</p>
    {success === "password-changed" ? <p className="notice" role="status">Contraseña actualizada correctamente. Se cerraron todas tus sesiones. Ingresá nuevamente.</p> : null}<form onSubmit={handleSubmit(submit)} noValidate>
      {registerMode ? <div className="field"><label htmlFor="name">Nombre</label><input id="name" autoComplete="name" placeholder="Tu nombre" {...register("name")} aria-invalid={!!errors.name} aria-describedby="name-error" /><p id="name-error" className="error">{errors.name?.message}</p></div> : null}
      <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" placeholder="nombre@ejemplo.com" {...register("email")} aria-invalid={!!errors.email} aria-describedby="email-error" /><p id="email-error" className="error">{errors.email?.message}</p></div>
      <div className="field"><label htmlFor="password">Contraseña</label><input id="password" type="password" autoComplete={registerMode ? "new-password" : "current-password"} {...register("password")} aria-invalid={!!errors.password} aria-describedby="password-help password-error" />{registerMode ? <span id="password-help" className="muted">Entre 8 y 128 caracteres.</span> : null}<p id="password-error" className="error">{errors.password?.message}</p></div>
      {registerMode ? <div className="field"><Controller name="primaryLocationId" control={control} render={({ field }) => <LocationCombobox id="primaryLocationId" label="Localidad principal" value={field.value} onChange={field.onChange} invalid={!!errors.primaryLocationId} describedBy="location-error" disabled={isSubmitting} />} /><p id="location-error" className="error">{errors.primaryLocationId?.message}</p></div> : null}
      {error ? <p role="alert" className="error">{error}</p> : null}
      <button className="button wide" disabled={isSubmitting || (registerMode && !locations.data?.length)}>{isSubmitting ? "Un momento…" : registerMode ? "Crear cuenta" : "Ingresar"}</button>
    </form><p className="mt-6">{registerMode ? <>Ya tenés cuenta? <Link href="/auth/login">Ingresar</Link></> : <>Todavía no tenés cuenta? <Link href="/auth/register">Crear cuenta</Link></>}</p>{!registerMode ? <Link href="/auth/forgot-password">Olvidé mi contraseña</Link> : null}
  </section>;
}
