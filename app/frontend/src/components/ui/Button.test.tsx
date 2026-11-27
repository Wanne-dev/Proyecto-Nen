import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Button from "./Button";

describe("Button", () => {
  it("renderiza su contenido", () => {
    render(<Button>Depositar</Button>);
    expect(screen.getByRole("button", { name: "Depositar" })).toBeInTheDocument();
  });

  it("queda deshabilitado con la prop disabled", () => {
    render(<Button disabled>Retirar</Button>);
    expect(screen.getByRole("button", { name: "Retirar" })).toBeDisabled();
  });

  it("aplica fullWidth al estilo", () => {
    render(<Button fullWidth>Comprar</Button>);
    const btn = screen.getByRole("button", { name: "Comprar" });
    expect(btn.style.width).toBe("100%");
  });

  it("renderiza un icono junto al texto", () => {
    render(<Button icon={<span data-testid="icono">★</span>}>Guardar</Button>);
    expect(screen.getByTestId("icono")).toBeInTheDocument();
  });
});
