"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$?/\\";
type NotFoundGlitchProps = {
  code?: string; title?: string; description?: string;
  homeHref?: string; homeLabel?: string; browseHref?: string; browseLabel?: string;
  className?: string;
};

export function NotFoundGlitch({
  code = "404",
  title = "Acá no hay partido",
  description = "La página que buscás no existe o cambió de dirección. Podés volver al inicio o buscar un partido para jugar.",
  homeHref = "/", homeLabel = "Volver al inicio",
  browseHref = "/partidos", browseLabel = "Buscar un partido", className,
}: NotFoundGlitchProps) {
  const reducedMotion = useReducedMotion();
  const [scrambled, setScrambled] = useState(code);
  useEffect(() => {
    if (reducedMotion !== false) return;
    const characters = code.split("");
    const startedAt = performance.now();
    let lastTick = -45;
    let frame: number;
    const tick = (now: number) => {
      const elapsed = now - startedAt;
      if (elapsed >= 700) { setScrambled(code); return; }
      if (elapsed - lastTick >= 45) {
        lastTick = elapsed;
        const settled = Math.floor((elapsed / 700) * characters.length);
        setScrambled(characters.map((character, index) =>
          index < settled || character === " " ? character : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        ).join(""));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [code, reducedMotion]);
  const displayedCode = reducedMotion !== false ? code : scrambled;
  return (
    <section className={twMerge(clsx("not-found", className))}>
      <div className="not-found-code">
        <span className="not-found-glitch not-found-glitch-red" aria-hidden="true">{displayedCode}</span>
        <span className="not-found-glitch not-found-glitch-cyan" aria-hidden="true">{displayedCode}</span>
        <h1 aria-label={code}><span aria-hidden="true">{displayedCode}</span></h1>
      </div>
      <div className="not-found-copy"><h2>{title}</h2><p className="muted">{description}</p></div>
      <div className="not-found-actions">
        <Link className="button" href={homeHref}>{homeLabel}</Link>
        <Link className="button secondary" href={browseHref}>{browseLabel}</Link>
      </div>
    </section>
  );
}
