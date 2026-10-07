import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BenefitsCarousel } from "./benefits-carousel";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

function mountCarousel() {
  render(<BenefitsCarousel />);
  const track = screen.getByRole("group", { name: "Beneficios de Hacha y Tiza" });
  Object.defineProperty(track, "setPointerCapture", { value: vi.fn(), configurable: true });
  return { track };
}

it("keeps the approved copy and navigates with indicators without previous/next buttons", () => {
  mountCarousel();
  expect(screen.getByRole("region", { name: "Más fácil juntarse a jugar" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Anterior" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Siguiente" })).not.toBeInTheDocument();
  expect(within(screen.getByRole("group", { name: "1 de 3" })).getByText("Podrás buscar partidos en las localidades disponibles y consultar todo lo que necesitás saber: cancha, fecha, horario, formato, precio y lugares libres.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Ir a Anotate a un partido" }));
  expect(screen.getByRole("button", { name: "Ir a Anotate a un partido" })).toHaveAttribute("aria-current", "true");
  expect(within(screen.getByRole("group", { name: "2 de 3" })).getByText("Tenés ganas de jugar? Elegí un partido y reservá tu lugar, no necesitás conocer a los jugadores para participar.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Ir a Sumá a tus compañeros" }));
  expect(within(screen.getByRole("group", { name: "3 de 3" })).getByText("Si vas con amigos, podrás reservar también sus lugares en el mismo partido. Vos te anotás y sumás a los que se prenden.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Ir a Anotate a un partido" }));
  expect(screen.getByRole("group", { name: "2 de 3" })).toBeInTheDocument();
});

it("supports bounded keyboard navigation and keeps one accessible active slide", () => {
  const { track } = mountCarousel();
  fireEvent.keyDown(track, { key: "ArrowLeft" });
  expect(screen.getByRole("group", { name: "1 de 3" })).toBeInTheDocument();
  fireEvent.keyDown(track, { key: "End" });
  fireEvent.keyDown(track, { key: "ArrowRight" });
  expect(screen.getByRole("button", { name: "Ir a Sumá a tus compañeros" })).toHaveAttribute("aria-current", "true");
  expect(screen.queryByRole("group", { name: "1 de 3" })).not.toBeInTheDocument();
  fireEvent.keyDown(track, { key: "Home" });
  fireEvent.keyDown(track, { key: "ArrowRight" });
  expect(screen.getByRole("group", { name: "2 de 3" })).toHaveAttribute("data-position", "active");
});

it("changes slides only for horizontal pointer gestures and clears cancelled gestures", () => {
  const { track } = mountCarousel();
  function pointer(type: string, x: number, y: number) {
    const event = new Event(type, { bubbles: true });
    Object.defineProperties(event, { pointerId: { value: 1 }, button: { value: 0 }, isPrimary: { value: true }, clientX: { value: x }, clientY: { value: y } });
    fireEvent(track, event);
  }
  pointer("pointerdown", 200, 100);
  pointer("pointerup", 100, 110);
  expect(screen.getByRole("group", { name: "2 de 3" })).toBeInTheDocument();
  pointer("pointerdown", 100, 100);
  pointer("pointerup", 120, 220);
  expect(screen.getByRole("group", { name: "2 de 3" })).toBeInTheDocument();
  pointer("pointerdown", 100, 100);
  pointer("pointercancel", 100, 100);
  pointer("pointerup", 220, 100);
  expect(screen.getByRole("group", { name: "2 de 3" })).toBeInTheDocument();
  pointer("pointerdown", 100, 100);
  pointer("pointerup", 220, 100);
  expect(screen.getByRole("group", { name: "1 de 3" })).toBeInTheDocument();
});

it("does not advance automatically", () => {
  vi.useFakeTimers();
  mountCarousel();
  act(() => vi.advanceTimersByTime(30_000));
  expect(screen.getByRole("group", { name: "1 de 3" })).toBeInTheDocument();
});
