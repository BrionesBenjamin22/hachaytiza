"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { User } from "@/features/auth/service";
import { useSession } from "@/features/auth/session";
import { LocationCombobox } from "@/features/locations/location-combobox";
import { errorMessage } from "@/lib/http";
import { accountService } from "./service";
import { ProfileHistory } from "./profile-history";
import { ProfileLoading } from "./profile-loading";
const profileSchema = z.object({ name: z.string().trim().min(2, "Ingrese al menos 2 caracteres.").max(100, "Utilice hasta 100 caracteres."), primaryLocationId: z.string().uuid("Seleccione su localidad.") });
export function Profile() {
  const session = useSession();
  const query = useQuery({ queryKey: ["profile", session.session?.user?.id], queryFn: accountService.profile, enabled: !!session.session?.authenticated });
  if (query.isPending) return <ProfileLoading />;
  if (query.isError) return <><p className="error" role="alert">{errorMessage(query.error)}</p><button className="button" onClick={() => void query.refetch()}>Reintentar</button></>;
  return <><ProfileForm key={query.data.id} user={query.data} /><section className="panel glass"><h2>Auditoría</h2><dl className="audit-data"><dt>Cuenta creada</dt><dd>{new Date(query.data.createdAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</dd><dt>Última actualización</dt><dd>{new Date(query.data.updatedAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</dd></dl></section><ProfileHistory key={query.data.id} /></>;
}
function ProfileForm({ user }: { user: User }) {
  const session = useSession(); const client = useQueryClient(); const [feedback, setFeedback] = useState(""); const [failed, setFailed] = useState(false);
  const { register, control, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<{ name: string; primaryLocationId: string }>({ defaultValues: { name: user.name, primaryLocationId: user.primaryLocation?.id ?? "" } });
  async function submit(values: { name: string; primaryLocationId: string }) {
    setFeedback(""); setFailed(false);
    const result = profileSchema.safeParse(values);
    if (!result.success) { result.error.issues.forEach(issue => setError(issue.path[0] as "name" | "primaryLocationId", { message: issue.message })); return; }
    const input: { name?: string; primaryLocationId?: string } = {};
    if (result.data.name !== user.name) input.name = result.data.name;
    if (result.data.primaryLocationId !== user.primaryLocation?.id) input.primaryLocationId = result.data.primaryLocationId;
    if (Object.keys(input).length === 0) { setFeedback("No hay cambios para guardar."); return; }
    try { const updated = await accountService.updateProfile(input); reset({ name: updated.name, primaryLocationId: updated.primaryLocation?.id ?? "" }); await session.synchronize(); await client.invalidateQueries({ queryKey: ["profile-history", user.id] }); setFeedback("Perfil actualizado correctamente."); client.setQueryData(["profile", user.id], updated); }
    catch (error) { setFailed(true); setFeedback(errorMessage(error)); }
  }
  return <section className="panel glass"><h1>Mi perfil</h1><p className="muted">Tu localidad principal se usa al ingresar. Podés explorar otras zonas desde los partidos.</p><form onSubmit={handleSubmit(submit)} noValidate><div className="field"><label htmlFor="profile-name">Nombre</label><input id="profile-name" autoComplete="name" {...register("name")} aria-invalid={!!errors.name} aria-describedby="profile-name-error" /><p className="error" id="profile-name-error">{errors.name?.message}</p></div><div className="field"><label htmlFor="profile-email">Email</label><input id="profile-email" type="email" value={user.email} readOnly aria-describedby="email-readonly" /><p id="email-readonly" className="muted">Tu email no se modifica desde esta pantalla.</p></div><div className="field"><Controller name="primaryLocationId" control={control} render={({ field }) => <LocationCombobox id="profile-location" label="Localidad principal" value={field.value} onChange={field.onChange} invalid={!!errors.primaryLocationId} describedBy="profile-location-error" disabled={isSubmitting} />} /><p id="profile-location-error" className="error">{errors.primaryLocationId?.message}</p></div>{feedback ? <p className={failed ? "error" : "notice"} role={failed ? "alert" : "status"}>{feedback}</p> : null}<div className="actions"><button className="button" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : "Guardar cambios"}</button><Link href="/" className="button secondary">Volver</Link></div></form></section>;
}
