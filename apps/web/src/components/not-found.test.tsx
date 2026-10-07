import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import NotFound from "@/app/not-found";

const motionPreference = vi.hoisted(() => ({ reduced: false as boolean | null }));
vi.mock("motion/react", () => ({ useReducedMotion: () => motionPreference.reduced }));
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let requestFrame: ReturnType<typeof vi.fn>;
let cancelFrame: ReturnType<typeof vi.fn>;

beforeEach(() => {
  motionPreference.reduced = false;
  frames = new Map();
  nextFrame = 0;
  requestFrame = vi.fn((callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  cancelFrame = vi.fn((id: number) => frames.delete(id));
  vi.stubGlobal("requestAnimationFrame", requestFrame);
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);
  vi.spyOn(performance, "now").mockReturnValue(0);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function advanceFrame(now: number) {
  const callbacks = [...frames.values()];
  frames.clear();
  act(() => callbacks.forEach((callback) => callback(now)));
}

it("provides a useful not-found page without duplicating the application shell", () => {
  render(<NotFound />);
  expect(screen.getByRole("heading", { name: "404", level: 1 })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Acá no hay partido", level: 2 })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
  expect(screen.getByRole("link", { name: "Buscar un partido" })).toHaveAttribute("href", "/partidos");
  expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  expect(screen.queryByRole("main")).not.toBeInTheDocument();
});

it("shares one finite animation while keeping the accessible code stable", () => {
  const { container } = render(<NotFound />);
  expect(requestFrame).toHaveBeenCalledTimes(1);
  vi.spyOn(Math, "random").mockReturnValue(0);
  advanceFrame(350);
  expect(screen.getByRole("heading", { name: "404", level: 1 })).toHaveTextContent("4AA");
  expect([...container.querySelectorAll(".not-found-code span")].every((span) => span.getAttribute("aria-hidden") === "true")).toBe(true);
  expect(container.querySelectorAll(".not-found-code span")).toHaveLength(3);
  advanceFrame(700);
  expect(screen.getByRole("heading", { name: "404", level: 1 })).toHaveTextContent("404");
  expect(frames.size).toBe(0);
});

it.each([true, null])("does not start decorative animation when reduced motion is %s", (preference) => {
  motionPreference.reduced = preference;
  render(<NotFound />);
  expect(screen.getByRole("heading", { name: "404", level: 1 })).toHaveTextContent("404");
  expect(requestFrame).not.toHaveBeenCalled();
});

it("cancels its pending animation frame on unmount", () => {
  const { unmount } = render(<NotFound />);
  advanceFrame(45);
  const pendingFrame = nextFrame;
  unmount();
  expect(cancelFrame).toHaveBeenCalledWith(pendingFrame);
  expect(frames.size).toBe(0);
});
