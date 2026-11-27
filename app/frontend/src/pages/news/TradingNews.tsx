import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ExternalLink, Minus, Newspaper, RefreshCw, Search, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import { newsService, type NewsCategory, type NewsImpact, type TradingNewsFeed, type TradingNewsItem } from "../../services/news";
import { C, timeAgo } from "../../theme";
import "./news.css";

const CHIPS: ReadonlyArray<{ id: NewsCategory; label: string }> = [
  { id: "all", label: "Todo" },
  { id: "crypto", label: "Cripto" },
  { id: "forex", label: "Forex" },
  { id: "stocks", label: "Bolsa" },
  { id: "macro", label: "Macro" },
];

const SENTIMENT = {
  alcista: { tone: "green" as const, icon: <TrendingUp size={13} aria-hidden="true" /> },
  bajista: { tone: "red" as const, icon: <TrendingDown size={13} aria-hidden="true" /> },
  neutral: { tone: "gold" as const, icon: <Minus size={13} aria-hidden="true" /> },
};

type FeedState =
  | { status: "loading" }
  | { status: "ready"; feed: TradingNewsFeed }
  | { status: "error"; message: string };

export default function TradingNews() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [category, setCategory] = useState<NewsCategory>("all");
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<FeedState>({ status: "loading" });
  const [analyses, setAnalyses] = useState<Record<string, NewsImpact>>({});
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(async (term: string, selected: NewsCategory) => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setState({ status: "loading" });
    setAnalysisError(null);
    try {
      const feed = await newsService.search(term, selected, request.signal);
      if (!request.signal.aborted) setState({ status: "ready", feed });
    } catch (error) {
      if (request.signal.aborted) return;
      setState({ status: "error", message: error instanceof Error ? error.message : "No se pudieron cargar las noticias." });
    }
  }, []);

  useEffect(() => {
    void load(submitted, category);
    return () => controller.current?.abort();
  }, [load, submitted, category, nonce]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(query.trim());
    setAnalyses({});
    setNonce((value) => value + 1);
  };

  const chooseCategory = (next: NewsCategory) => {
    setCategory(next);
    setAnalyses({});
  };

  const analyze = async (item: TradingNewsItem) => {
    setAnalyzing(item.id);
    setAnalysisError(null);
    try {
      const result = await newsService.analyze(item.title, item.snippet);
      setAnalyses((current) => ({ ...current, [item.id]: result }));
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "No se pudo analizar la noticia.");
    } finally {
      setAnalyzing(null);
    }
  };

  return (
    <section className="nen-news" aria-labelledby="nen-news-title">
      <PageHeader
        title="Noticias de trading"
        subtitle="Titulares reales de Google News, siempre filtrados a mercados, trading y economía."
        icon={<Newspaper size={19} color={C.gold} />}
        actions={
          <button type="button" className="nen-news__icon-button" onClick={() => setNonce((value) => value + 1)}
            disabled={state.status === "loading"} aria-label="Actualizar noticias" title="Actualizar noticias">
            <RefreshCw size={16} aria-hidden="true" />
          </button>
        }
      />
      <h2 id="nen-news-title" className="sr-only">Buscador de noticias financieras</h2>

      <form className="nen-news__search" onSubmit={submit} role="search">
        <Search size={18} color={C.t3} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={120}
          aria-label="Buscar noticias financieras"
          placeholder="Buscar activo, empresa o evento económico (ej. BTC, FED, Dólar)..."
        />
        <button type="submit" disabled={state.status === "loading"}>Buscar</button>
      </form>

      <div className="nen-news__chips" role="group" aria-label="Categorías de noticias">
        {CHIPS.map((chip) => (
          <button key={chip.id} type="button" aria-pressed={category === chip.id} onClick={() => chooseCategory(chip.id)}>
            {chip.label}
          </button>
        ))}
      </div>

      <p className="nen-news__scope">Búsquedas condicionadas a trading, mercados y economía · Fuente: Google News RSS</p>

      {analysisError && <p className="nen-news__error" role="alert">{analysisError}</p>}

      {state.status === "loading" && (
        <div className="nen-news__state" role="status"><Spinner label="Buscando noticias en la web…" /></div>
      )}
      {state.status === "error" && (
        <div className="nen-news__state" role="alert">
          <p style={{ color: C.red }}>{state.message}</p>
          <button type="button" onClick={() => setNonce((value) => value + 1)}>Reintentar</button>
        </div>
      )}
      {state.status === "ready" && state.feed.items.length === 0 && (
        <div className="nen-news__state" role="status">
          <Newspaper size={26} color={C.gold} aria-hidden="true" />
          <p>No hay noticias recientes para esa búsqueda. Prueba otro activo o categoría.</p>
        </div>
      )}
      {state.status === "ready" && state.feed.items.length > 0 && (
        <>
          <p className="nen-news__result-count">
            {state.feed.items.length} titulares · consulta: <span>{state.feed.query}</span>
            {state.feed.cached && <em> · en caché</em>}
          </p>
          <div className="nen-news__grid">
            {state.feed.items.map((item) => {
              const impact = analyses[item.id];
              const sentiment = impact ? SENTIMENT[impact.sentiment] : null;
              return (
                <article className="nen-news__card" key={item.id}>
                  <div className="nen-news__card-head">
                    <span className="nen-news__thumb" aria-hidden="true">
                      <span>{item.source.slice(0, 2).toUpperCase()}</span>
                      <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer"
                        onError={(event) => { event.currentTarget.style.display = "none"; }} />
                    </span>
                    <span className="nen-news__byline">
                      <strong>{item.source}</strong>
                      <time dateTime={item.pubDate}>{timeAgo(item.pubDate)}</time>
                    </span>
                    <ExternalLink size={14} color={C.t3} aria-hidden="true" />
                  </div>
                  <h3 className="nen-news__title">
                    <a href={item.link} target="_blank" rel="noopener noreferrer">{item.title}</a>
                  </h3>
                  {item.snippet && item.snippet !== item.title && (
                    <p className="nen-news__snippet">{item.snippet}</p>
                  )}
                  <div className="nen-news__card-foot">
                    <button type="button" className="nen-news__analyze" onClick={() => void analyze(item)}
                      disabled={analyzing === item.id} aria-label={`Analizar impacto IA de: ${item.title}`}>
                      <Sparkles size={14} aria-hidden="true" />
                      {analyzing === item.id ? "Analizando…" : "Analizar impacto IA"}
                    </button>
                  </div>
                  {impact && sentiment && (
                    <div className="nen-news__analysis" role="status">
                      <Badge tone={sentiment.tone} icon={sentiment.icon}>Sentimiento {impact.sentiment}</Badge>
                      {impact.assets.length > 0 && (
                        <div className="nen-news__assets">
                          {impact.assets.map((asset) => <span key={asset}>{asset}</span>)}
                        </div>
                      )}
                      <p>{impact.impactSummary}</p>
                      <small>Texto generado por IA · no es una recomendación financiera.</small>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
