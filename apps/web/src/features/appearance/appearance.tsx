"use client";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemePreference } from "./theme";
export function Appearance() {
  const { preference, setPreference } = useTheme();
  const options = [{ value: "light", label: "Claro", Icon: Sun }, { value: "dark", label: "Oscuro", Icon: Moon }, { value: "system", label: "Sistema", Icon: Monitor }] as const;
  return <section className="panel glass"><h1>Apariencia</h1><p className="muted">Elegí el tema que te resulte más cómodo. Se recordará en este navegador.</p><fieldset className="theme-options"><legend>Tema</legend>{options.map(({ value, label, Icon }) => <label className="theme-option" key={value}><input type="radio" name="theme" value={value} checked={preference === value} onChange={() => setPreference(value as ThemePreference)} /><Icon size={24} aria-hidden="true" /><span>{label}</span></label>)}</fieldset><p className="muted mt-6">Sistema sigue la preferencia de tu dispositivo.</p></section>;
}
