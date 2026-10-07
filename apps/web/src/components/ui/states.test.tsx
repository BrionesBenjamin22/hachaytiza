import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Skeleton } from "./skeleton";
import { LoadingState } from "./loading-state";
import { EmptyState } from "./empty-state";

it("announces loading once while keeping skeleton placeholders out of the accessible tree", () => {
  const { container } = render(<LoadingState label="Cargando partidos…"><Skeleton className="skeleton-card" /><Skeleton /></LoadingState>);
  expect(screen.getByRole("status")).toHaveTextContent("Cargando partidos…");
  expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  expect(container.querySelectorAll('.skeleton[aria-hidden="true"]')).toHaveLength(2);
  expect(container.querySelector(".skeleton-card")).toBeInTheDocument();
});

it("explains an empty state and provides an optional usable action without loading placeholders", () => {
  const { container } = render(<EmptyState title="Todavía no hay partidos" description="Probá con otra localidad." action={<button>Elegir otra localidad</button>} />);
  expect(screen.getByRole("status")).toHaveTextContent("Todavía no hay partidos");
  expect(screen.getByText("Probá con otra localidad.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Elegir otra localidad" })).toBeEnabled();
  expect(container.querySelector(".skeleton")).not.toBeInTheDocument();
});

it("supports an empty state without inventing an action", () => {
  render(<EmptyState title="Sin cambios" description="El historial aparecerá cuando actualices tu perfil." />);
  expect(screen.getByRole("heading", { name: "Sin cambios" })).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
