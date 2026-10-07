"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { useLocations } from "@/features/locations/hooks";
import { errorMessage } from "@/lib/http";
import { useSession } from "./session";
import { authService } from "./service";
import { LocationCombobox } from "@/features/locations/location-combobox";
import { SessionLoading } from "./session-loading";

export function LocationForm() {
  const session = useSession(); const router = useRouter(); const locations = useLocations(); const [error, setError] = useState("");
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ locationId: string }>({ defaultValues: { locationId: "" } });
  useEffect(() => { if (!session.isPending && !session.isError && !session.session?.authenticated) router.replace("/auth/login"); else if (session.session?.user?.primaryLocation) router.replace("/"); }, [session.isPending, session.isError, session.session, router]);
  if (session.isPending) return <SessionLoading />;
  if (session.isError) return <><p role="alert">{errorMessage(session.error)}</p><button className="button" onClick={() => void session.refetch()}>Reintentar</button></>;
  if (!session.session?.authenticated) return <p role="status">Redirigiendo a ingreso…</p>;
  return <section className="auth-panel"><h1>Elegí tu localidad</h1><p className="muted">La usaremos para mostrarte partidos al ingresar.</p><form onSubmit={handleSubmit(async ({ locationId }) => { setError(""); try { await authService.setLocation(locationId); await session.synchronize(); router.replace("/?success=location"); } catch (cause) { setError(errorMessage(cause)); } })}>
    <div className="field"><Controller name="locationId" control={control} rules={{ required: "Seleccione su localidad." }} render={({ field }) => <LocationCombobox id="location" label="Localidad principal" value={field.value} onChange={field.onChange} invalid={!!errors.locationId} describedBy="location-error" disabled={isSubmitting} />} /><p id="location-error" className="error">{errors.locationId?.message}</p></div>
    {error ? <p role="alert" className="error">{error}</p> : null}<button className="button wide" disabled={isSubmitting || !locations.data?.length}>{isSubmitting ? "Guardando…" : "Guardar y continuar"}</button>
  </form></section>;
}
