import { useEffect, useRef, useState } from "react";
import { ArrowUp, LockKeyhole, X } from "lucide-react";
import BrandLogo from "../../components/common/BrandLogo";
import { iaService, type AssistantMethod } from "../../services/ia";
import { useAuthStore } from "../../store/auth.slice";
import "./assistant.css";

const DRAFT_LIMIT = 1000;

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
}

export default function Assistant() {
  const firstName = useAuthStore((state) => state.user?.firstName.trim());
  const isAdmin = useAuthStore((state) => state.user?.role === "admin");
  const [draft, setDraft] = useState("");
  const [method, setMethod] = useState<AssistantMethod | null>(null);
  const [checking, setChecking] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const composer = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const sequence = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    iaService.getMethod(controller.signal)
      .then((info) => {
        if (controller.signal.aborted) return;
        setMethod(info.assistant ?? null);
        setChecking(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setMethod(null);
        setChecking(false);
        setError("No se pudo comprobar el estado del asistente.");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const element = log.current;
    element?.scrollTo?.({ top: element.scrollHeight });
  }, [messages]);

  const connected = method?.status === "connected";

  function clearDraft() {
    setDraft("");
    composer.current?.focus();
  }

  async function send() {
    const text = draft.trim();
    if (!text || !connected || sending) return;
    setDraft("");
    setError("");
    setSending(true);
    setMessages((previous) => [...previous, { id: ++sequence.current, role: "user", text }]);
    try {
      const answer = await iaService.chat(text);
      setMessages((previous) => [...previous, { id: ++sequence.current, role: "assistant", text: answer.reply }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo obtener una respuesta.");
    } finally {
      setSending(false);
      composer.current?.focus();
    }
  }

  return (
    <section className="nen-assistant" aria-labelledby="assistant-title">
      <div className="nen-assistant__inner">
        <div className="nen-assistant__intro">
          <span className="nen-assistant__mark" aria-hidden="true"><BrandLogo variant="mark" className="nen-assistant__logo" alt="" /></span>
          <p className="nen-assistant__eyebrow">BANCA NEN <span aria-hidden="true">·</span> ASISTENTE</p>
          <p className="nen-assistant__greeting">{firstName ? `Hola, ${firstName}` : "Bienvenido a BANCA NEN"}</p>
          <h1 id="assistant-title">¿En qué te puedo ayudar?</h1>
          <p className="nen-assistant__description">Pregunta por tu billetera, tus movimientos o el mercado. Para precios y noticias, el asistente consulta fuentes públicas en tiempo real.</p>
        </div>

        {messages.length > 0 && (
          <div className="nen-assistant__log" ref={log} role="log" aria-label="Conversación" aria-live="polite">
            {messages.map((message) => (
              <article key={message.id} className={`nen-assistant__message nen-assistant__message--${message.role}`}>
                <span className="nen-assistant__message-label">{message.role === "user" ? "Tú" : "BANCA NEN IA"}</span>
                <p>{message.text}</p>
              </article>
            ))}
          </div>
        )}

        {error && <p className="nen-assistant__error" role="alert">{error}</p>}

        <div className="nen-assistant__composer" role="group" aria-labelledby="assistant-draft-label">
          <label id="assistant-draft-label" htmlFor="assistant-draft">Tu consulta</label>
          <textarea id="assistant-draft" ref={composer} rows={2} maxLength={DRAFT_LIMIT} value={draft}
            onChange={(event) => setDraft(event.target.value)} placeholder="Escribe una pregunta…"
            aria-describedby="assistant-model-state assistant-privacy" />
          <div className="nen-assistant__actions">
            <span className={`nen-assistant__state${connected ? " nen-assistant__state--online" : ""}`} id="assistant-model-state">
              <i aria-hidden="true" />
              {checking ? "Comprobando IA…" : connected ? `IA conectada · ${method?.model}` : "IA sin conectar"}
            </span>
            <div className="nen-assistant__buttons">
              {draft && <button className="nen-assistant__clear" type="button" onClick={clearDraft}><X size={14} aria-hidden="true" /> Limpiar</button>}
              <span className="nen-assistant__length" aria-label={`${draft.length} de ${DRAFT_LIMIT} caracteres`}>{draft.length}/{DRAFT_LIMIT}</span>
              <button className="nen-assistant__send" type="button" onClick={() => void send()}
                disabled={!connected || !draft.trim() || sending}
                title={connected ? "Enviar consulta" : "Disponible cuando se conecte un modelo"}>
                {sending ? "Enviando…" : "Enviar"} <ArrowUp size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <p className="nen-assistant__privacy" id="assistant-privacy"><LockKeyhole size={13} aria-hidden="true" /> {isAdmin
          ? "Como administrador puedes consultar métricas agregadas de la plataforma."
          : "Puedes consultar mercado y tu billetera; los datos de administración requieren otro perfil."} Las consultas se envían al proveedor de IA sin datos personales; no se guardan en BANCA NEN. Texto generado por IA; no es asesoramiento financiero.</p>
      </div>
    </section>
  );
}
