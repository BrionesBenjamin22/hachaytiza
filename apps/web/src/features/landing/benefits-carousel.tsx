"use client";

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { CalendarCheck, MapPin, Users } from "lucide-react";

const slides = [
  {
    title: "Elegí dónde jugar",
    body: "Podrás buscar partidos en las localidades disponibles y consultar todo lo que necesitás saber: cancha, fecha, horario, formato, precio y lugares libres.",
    Icon: MapPin,
  },
  {
    title: "Anotate a un partido",
    body: "Tenés ganas de jugar? Elegí un partido y reservá tu lugar, no necesitás conocer a los jugadores para participar.",
    Icon: CalendarCheck,
  },
  {
    title: "Sumá a tus compañeros",
    body: "Si vas con amigos, podrás reservar también sus lugares en el mismo partido. Vos te anotás y sumás a los que se prenden.",
    Icon: Users,
  },
] as const;

export function BenefitsCarousel() {
  const id = useId();
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const [active, setActive] = useState(0);

  function goTo(index: number) {
    setActive(Math.max(0, Math.min(slides.length - 1, index)));
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    gesture.current = null;
    if (!start || start.id !== event.pointerId) return;
    const distance = event.clientX - start.x;
    if (Math.abs(distance) < 40 || Math.abs(distance) <= Math.abs(event.clientY - start.y)) return;
    setActive(current => Math.max(0, Math.min(slides.length - 1, current + (distance < 0 ? 1 : -1))));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const destinations: Record<string, number> = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: slides.length - 1 };
    if (event.key in destinations) { event.preventDefault(); goTo(destinations[event.key]); }
  }

  return (
    <section className="benefits" aria-roledescription="carrusel" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Más fácil juntarse a jugar</h2>
      <div
        id={`${id}-track`}
        className="benefits-track"
        role="group"
        aria-label="Beneficios de Hacha y Tiza"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={event => {
          if (event.button !== 0 || event.isPrimary === false) return;
          gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { gesture.current = null; }}
      >
        {slides.map(({ title, body, Icon }, index) => (
          <article key={title} className="benefit-slide glass" data-position={index === active ? "active" : (index - active + slides.length) % slides.length === 1 ? "right" : "left"} role="group" aria-roledescription="diapositiva" aria-label={`${index + 1} de ${slides.length}`} aria-hidden={active !== index} inert={active !== index}>
            <Icon className="benefit-icon" size={30} aria-hidden="true" />
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <div className="benefits-controls">
        <div className="benefits-indicators" role="group" aria-label="Elegir diapositiva">
          {slides.map(({ title }, index) => <button key={title} type="button" className="benefit-indicator" aria-label={`Ir a ${title}`} aria-controls={`${id}-track`} aria-current={active === index ? "true" : undefined} onClick={() => goTo(index)}><span aria-hidden="true" /></button>)}
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{active + 1} de {slides.length}</p>
    </section>
  );
}
