"use client";
import { useSyncExternalStore } from "react";
export type ThemePreference = "light" | "dark" | "system";
const key = "hyt-theme-v1";
let memoryPreference: ThemePreference = "system";
function readPreference(): ThemePreference {
  try { const value = localStorage.getItem(key); return value === "light" || value === "dark" ? value : "system"; } catch { return memoryPreference; }
}
function apply(preference: ThemePreference) {
  const resolved = preference === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}
function subscribe(onChange: () => void) {
  function update() { apply(readPreference()); onChange(); }
  window.addEventListener("storage", update); window.addEventListener("hyt-theme-change", update);
  const media = window.matchMedia("(prefers-color-scheme: dark)"); media.addEventListener("change", update);
  return () => { window.removeEventListener("storage", update); window.removeEventListener("hyt-theme-change", update); media.removeEventListener("change", update); };
}
export function useTheme() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as const);
  function setPreference(value: ThemePreference) {
    memoryPreference = value;
    try { localStorage.setItem(key, value); } catch { /* Preference remains applied when storage is unavailable. */ }
    apply(value); window.dispatchEvent(new Event("hyt-theme-change"));
  }
  return { preference, setPreference };
}
