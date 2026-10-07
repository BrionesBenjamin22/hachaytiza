"use client";
import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronsUpDown, Search, MapPin } from "lucide-react";
import { useLocations } from "./hooks";
import { errorMessage } from "@/lib/http";
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
export function LocationCombobox({ id, value, onChange, label, invalid = false, describedBy, disabled = false }: { id: string; value: string; onChange: (value: string) => void; label: string; invalid?: boolean; describedBy?: string; disabled?: boolean }) {
  const locations = useLocations(); const [open, setOpen] = useState(false);
  const selected = locations.data?.find(location => location.id === value);
  return <div className="location-control"><label htmlFor={id}>{label}</label><Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger asChild><button id={id} type="button" className="combobox-trigger" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-options`} aria-invalid={invalid} aria-describedby={describedBy} disabled={disabled || locations.isPending || locations.isError}><MapPin size={18} aria-hidden="true" /><span>{locations.isPending ? "Cargando localidades…" : selected?.name ?? "Elegí una localidad"}</span><ChevronsUpDown size={16} aria-hidden="true" /></button></Popover.Trigger><Popover.Portal><Popover.Content className="combo-popover glass" align="start" sideOffset={8}><Command label="Localidades" filter={(value, search) => normalize(value).includes(normalize(search)) ? 1 : 0}><div className="combo-search"><Search size={18} aria-hidden="true" /><Command.Input placeholder="Buscar localidad…" aria-label="Buscar localidad" /></div><Command.List id={`${id}-options`} className="combo-options"><Command.Empty className="combo-empty">No encontramos localidades. Probá con otro nombre.</Command.Empty><Command.Group>{locations.data?.map(location => <Command.Item key={location.id} value={location.name} className="combo-option" onSelect={() => { onChange(location.id); setOpen(false); }}><span>{location.name}</span>{location.id === value ? <Check size={16} aria-hidden="true" /> : null}</Command.Item>)}</Command.Group></Command.List></Command></Popover.Content></Popover.Portal></Popover.Root>
    {locations.isPending ? <p className="muted" role="status">Cargando localidades…</p> : null}{locations.isError ? <><p className="error" role="alert">{errorMessage(locations.error)}</p><button type="button" className="button secondary" onClick={() => void locations.refetch()}>Reintentar localidades</button></> : null}{locations.data?.length === 0 ? <p role="status">No hay localidades disponibles. Intente nuevamente más tarde.</p> : null}
  </div>;
}
