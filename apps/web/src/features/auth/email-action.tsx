"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { authService } from "./service";
import { emailSchema, passwordSchema } from "./validation";
import { errorMessage } from "@/lib/http";
import { useSession } from "./session";

export function EmailAction({ mode }: { mode: "forgot" | "reset" | "verify" }) {
  const token = useRef("");
  const linkVersion = useRef(0);
  const [feedback, setFeedback] = useState(""); const [failed, setFailed] = useState(false); const [done, setDone] = useState(false);
  const session = useSession();
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<{ email: string; password: string }>({ defaultValues: { email: "", password: "" } });
  useEffect(() => {
    if (mode === "forgot") return;
    function capture() {
      const captured = new URLSearchParams(window.location.hash.slice(1)).get("token");
      if (!captured) return false;
      token.current = captured;
      linkVersion.current += 1;
      window.history.replaceState(window.history.state, "", window.location.pathname);
      return true;
    }
    function onHashChange() {
      if (capture()) { reset({ email: "", password: "" }); setFeedback(""); setFailed(false); setDone(false); }
    }
    capture();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [mode, reset]);
  const titles = { forgot: "Recuperá tu contraseña", reset: "Elegí una nueva contraseña", verify: "Verificá tu email" };
  async function submit(values: { email: string; password: string }) {
    const submittedVersion = linkVersion.current;
    const submittedToken = token.current;
    setFeedback(""); setFailed(false);
    if (mode !== "forgot" && !token.current) { setFailed(true); setFeedback("Falta el enlace de confirmación. Abra el enlace recibido por email."); return; }
    const field = mode === "forgot" ? "email" : "password";
    if (mode !== "verify") {
      const parsed = (mode === "forgot" ? emailSchema : passwordSchema).safeParse(values[field]);
      if (!parsed.success) { setError(field, { message: parsed.error.issues[0].message }); return; }
    }
    try {
      let message: string;
      if (mode === "forgot") { await authService.requestReset(values.email.trim()); message = "Si el email corresponde a una cuenta, recibirá un enlace para restablecer su contraseña."; }
      else if (mode === "reset") { await authService.reset(submittedToken, values.password); await session.synchronize(); message = "Contraseña actualizada correctamente. Ingrese con su nueva contraseña."; }
      else { await authService.verify(submittedToken); await session.synchronize(); message = "Email verificado correctamente."; }
      if (linkVersion.current !== submittedVersion) return;
      if (mode !== "forgot" && token.current === submittedToken) token.current = "";
      setFeedback(message);
      setDone(true);
    } catch (error) { if (linkVersion.current === submittedVersion) { setFailed(true); setFeedback(errorMessage(error)); } }
  }
  return <section className="auth-panel"><h1>{titles[mode]}</h1><form onSubmit={event => void handleSubmit(submit)(event)} noValidate>
    {mode === "forgot" ? <div className="field"><label htmlFor="recovery-email">Email</label><input id="recovery-email" type="email" autoComplete="email" placeholder="nombre@ejemplo.com" {...register("email")} aria-invalid={!!errors.email} aria-describedby="recovery-error" /><p id="recovery-error" className="error">{errors.email?.message}</p></div> : mode === "reset" ? <div className="field"><label htmlFor="new-password">Nueva contraseña</label><input id="new-password" type="password" autoComplete="new-password" {...register("password")} aria-invalid={!!errors.password} aria-describedby="reset-help reset-error" /><p id="reset-help" className="muted">Entre 8 y 128 caracteres.</p><p id="reset-error" className="error">{errors.password?.message}</p></div> : <p>Confirme su dirección de email para completar la verificación.</p>}
    <button className="button wide" disabled={isSubmitting || done}>{isSubmitting ? "Un momento…" : mode === "forgot" ? "Enviar enlace" : mode === "reset" ? "Guardar contraseña" : "Verificar email"}</button>
  </form>{feedback ? <p className={failed ? "error mt-4" : "notice mt-4"} role={failed ? "alert" : "status"}>{feedback}</p> : null}<p className="mt-6"><Link href={mode === "verify" ? "/" : "/auth/login"}>{mode === "verify" ? "Volver al Home" : "Volver a ingresar"}</Link></p></section>;
}
