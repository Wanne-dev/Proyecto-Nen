import { useState } from "react";
import { BrainCircuit, RefreshCw } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import PredictionChart from "../../components/charts/PredictionChart";
import ScoreDisplay, { scoreColor } from "../../components/trading/ScoreDisplay";
import { useIA } from "../../hooks/useIA";
import type { Prediction as AssetProjection, ProjectionHorizon } from "../../services/ia";
import { C, fmt } from "../../theme";

const HORIZON_LABELS: Record<ProjectionHorizon, string> = { "24h": "24 horas", "7d": "7 días", "30d": "30 días" };
const SIGNALS = { buy: { label: "Alcista", tone: "green" }, sell: { label: "Bajista", tone: "red" }, hold: { label: "Neutral", tone: "gold" } } as const;
const price = (value: number) => fmt(value, value < 1 ? 6 : 2);
const signed = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2)}`;

function ProjectionDetails({ asset }: { asset: AssetProjection }) {
  const signal = SIGNALS[asset.signal];
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-bold" style={{ color: C.t1 }}>{asset.name} · {asset.symbol}/USD</h2>
          <p className="text-sm" style={{ color: C.t3 }}>Horizonte ilustrativo: {HORIZON_LABELS[asset.horizon]}</p>
        </div>
        <ScoreDisplay score={asset.score} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Precio de referencia", value: price(asset.currentPrice) },
          { label: "Precio estimado", value: price(asset.predictedPrice) },
          { label: "Variación estimada", value: `${signed(asset.predictedChangePct)}%` },
          { label: "Señal orientativa", value: <Badge tone={signal.tone}>{signal.label}</Badge> },
        ].map(({ label, value }) => (
          <div className="min-w-0 rounded-lg border p-3" key={label} style={{ background: C.bg2, borderColor: C.border }}>
            <dt className="mb-1 text-xs" style={{ color: C.t3 }}>{label}</dt>
            <dd className="break-words text-sm font-semibold" style={{ color: C.t1 }}>{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export default function Prediction({ embedded = false }: { embedded?: boolean } = {}) {
  const { state, reload } = useIA();
  const [assetId, setAssetId] = useState<string>();
  const assets = state.status === "ready" ? [...state.predictions].sort((a, b) => b.score - a.score) : [];
  const chosen = assets.find(({ asset }) => asset === assetId) ?? assets[0];

  return (
    <div className={embedded ? "" : "mx-auto max-w-6xl"}>
      {embedded ? (
        <div className="nen-news-page__heading">
          <div>
            <h2><BrainCircuit size={17} aria-hidden="true" /> Estimaciones orientativas</h2>
            <p>Reglas fijas sobre precios reales: no son predicciones calibradas ni recomendaciones de inversión.</p>
          </div>
          <button type="button" onClick={reload} disabled={state.status === "loading"}
            className="nen-news__icon-button" aria-label="Actualizar estimaciones" title="Actualizar estimaciones">
            <RefreshCw size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <PageHeader
          title="Análisis de mercado"
          subtitle="Estimaciones por reglas fijas, sin un modelo entrenado. No son recomendaciones de inversión."
          icon={<BrainCircuit size={19} color={C.purple} />}
          actions={
            <button type="button" onClick={reload} disabled={state.status === "loading"}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm disabled:opacity-50">
              <RefreshCw size={14} aria-hidden="true" /> Actualizar
            </button>
          }
        />
      )}
      {state.status === "loading" && <div className="flex justify-center py-14" role="status"><Spinner label="Cargando análisis…" /></div>}
      {state.status === "error" && <Card><p role="alert" style={{ color: C.red }}>{state.message}</p></Card>}
      {state.status === "ready" && !chosen && (
        <Card title="Sin estimaciones disponibles">
          <p role="status" style={{ color: C.t2 }}>{state.method.status === "offline"
            ? "El mercado está desconectado en esta instalación. No se calculan estimaciones con precios simulados."
            : `No hay datos suficientes de ${state.method.source} para calcular estimaciones. Prueba actualizar más tarde.`}</p>
        </Card>
      )}
      {state.status === "ready" && chosen && (
        <>
          <p className="mb-4 text-sm" style={{ color: C.t3 }}>{state.method.name} · Referencias de {state.method.source}</p>
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(180px,250px)_minmax(0,1fr)]">
            <Card title="Activos" subtitle="Ordenados por puntaje" padded={false} className="max-h-96 overflow-y-auto">
              {assets.map((asset) => (
                <button key={asset.asset} type="button" onClick={() => setAssetId(asset.asset)} aria-pressed={chosen.asset === asset.asset}
                  className="flex w-full items-center justify-between gap-4 border-t border-white/10 px-4 py-3 text-left hover:bg-white/5 aria-pressed:bg-white/10">
                  <span className="truncate text-sm font-semibold" style={{ color: C.t1 }}>{asset.symbol}</span>
                  <span className="text-sm font-bold" style={{ color: scoreColor(asset.score) }}>{asset.score}</span>
                </button>
              ))}
            </Card>
            <div className="grid min-w-0 gap-4">
              <ProjectionDetails asset={chosen} />
              <Card title="Factores del puntaje" subtitle="Aportes de las reglas antes de aplicar el límite final del puntaje">
                <dl className="grid gap-2 text-sm">
                  {chosen.features.map(({ name, impact }) => (
                    <div key={name} className="flex justify-between gap-4">
                      <dt>{name}</dt>
                      <dd className="font-medium tabular-nums" style={{ color: impact === 0 ? C.t3 : impact > 0 ? C.green : C.red }}>{signed(impact)}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
              <Card title="Referencia vs. estimación" subtitle="Comparación de precios en USD">
                <PredictionChart data={assets.slice(0, 8).map((asset) => ({ name: asset.symbol, actual: asset.currentPrice, predicted: asset.predictedPrice }))} />
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
