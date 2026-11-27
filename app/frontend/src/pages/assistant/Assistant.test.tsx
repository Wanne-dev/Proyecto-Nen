import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { iaService, type AnalysisMethod, type AssistantMethod } from "../../services/ia";
import { useAuthStore } from "../../store/auth.slice";
import type { User } from "../../types/User.types";
import Assistant from "./Assistant";

vi.mock("../../services/ia", () => ({ iaService: { getMethod: vi.fn(), chat: vi.fn() } }));

const method = vi.mocked(iaService.getMethod);
const chat = vi.mocked(iaService.chat);
const assistant: AssistantMethod = {
  provider: "Google Gemini", model: "gemini-3.5-flash-lite", status: "connected", tools: ["getMarketPrice", "searchFinancialNews"],
};
const info = (status: AssistantMethod["status"]): AnalysisMethod => ({
  name: "Reglas de mercado", source: "CoinGecko", kind: "heuristic", status: "available",
  assistant: { ...assistant, status },
});

afterEach(() => {
  vi.resetAllMocks();
  act(() => useAuthStore.setState({ user: null }));
});

describe("asistente conectado", () => {
  it("muestra el estado real, habilita el envío y pinta la respuesta", async () => {
    method.mockResolvedValue(info("connected"));
    chat.mockResolvedValue({ reply: "BTC cotiza a 50.000 USD según Binance.", usedTools: ["getMarketPrice"] });
    render(<Assistant />);
    expect(await screen.findByText(/IA conectada · gemini-3.5-flash-lite/)).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: "Tu consulta" }), { target: { value: "¿Cuánto vale BTC?" } });
    const send = screen.getByRole("button", { name: "Enviar" });
    expect(send).toBeEnabled();
    fireEvent.click(send);
    expect(await screen.findByText("BTC cotiza a 50.000 USD según Binance.")).toBeVisible();
    expect(chat).toHaveBeenCalledWith("¿Cuánto vale BTC?");
  });

  it("no habilita el envío cuando el backend no tiene configurado el proveedor", async () => {
    method.mockResolvedValue(info("disconnected"));
    render(<Assistant />);
    expect(await screen.findByText("IA sin conectar")).toBeVisible();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });

  it("muestra el error del proveedor sin guardar la conversación", async () => {
    method.mockResolvedValue(info("connected"));
    chat.mockRejectedValue(new Error("Cuota gratuita agotada"));
    render(<Assistant />);
    await screen.findByRole("button", { name: "Enviar" });
    fireEvent.change(screen.getByRole("textbox", { name: "Tu consulta" }), { target: { value: "Noticias de hoy" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cuota gratuita agotada");
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("no muestra las antiguas tarjetas de preguntas sugeridas", async () => {
    method.mockResolvedValue(info("connected"));
    render(<Assistant />);
    await screen.findByText(/IA conectada · gemini-3.5-flash-lite/);
    expect(screen.getByRole("heading", { name: "¿En qué te puedo ayudar?" })).toBeInTheDocument();
    expect(screen.queryByText("Ideas para empezar")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Preguntas sugeridas" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Tu consulta" })).toBeInTheDocument();
  });

  it("explica al usuario que no puede consultar datos de administración", async () => {
    method.mockResolvedValue(info("connected"));
    act(() => useAuthStore.setState({ user: { role: "user", firstName: "Prueba" } as User }));
    render(<Assistant />);
    expect(await screen.findByText(/los datos de administración requieren otro perfil/i)).toBeInTheDocument();
  });

  it("informa al administrador que puede consultar métricas agregadas", async () => {
    method.mockResolvedValue(info("connected"));
    act(() => useAuthStore.setState({ user: { role: "admin", firstName: "Prueba" } as User }));
    render(<Assistant />);
    expect(await screen.findByText(/como administrador puedes consultar métricas agregadas/i)).toBeInTheDocument();
  });

  it("limpia el borrador localmente", async () => {
    method.mockResolvedValue(info("connected"));
    render(<Assistant />);
    await screen.findByText(/IA conectada · gemini-3.5-flash-lite/);
    const draft = screen.getByRole("textbox", { name: "Tu consulta" });
    fireEvent.change(draft, { target: { value: "¿Qué es una orden de mercado?" } });
    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(draft).toHaveValue("");
    expect(draft).toHaveFocus();
    expect(screen.getByText("0/1000")).toBeInTheDocument();
  });
});
