/* Página de Predicción IA — BANCA NEN */
import { useEffect, useState } from "react";
import { BrainCircuit, RefreshCw, TrendingUp, TrendingDown, Minus, Gauge, Cpu, Target } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import { iaService, type Prediction, type ModelInfo } from "../../services/ia";
import { C, FONT, fmt, fmtDate } from "../../theme";
import PredictionChart from "../../components/charts/PredictionChart";
import ScoreDisplay from "../../components/trading/ScoreDisplay";

const HORIZON_LABELS: Record<string, string> = { "24h": "Próximas 24 horas", "7d": "Próximos 7 días", "30d": "Próximos 30 días" };

export default function Prediction() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selected, setSelected] = useState<Prediction | null>(null);
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<Array<{ name: string; actual: number; predicted: number }>>([]);

  const load = async () => {
    setLoading(true);
    const [preds, modelInfo] = await Promise.all([iaService.getPredictions(), iaService.getModelInfo()]);
    setPredictions(preds);
    setModel(modelInfo);
    setSelected((prev) => prev || preds[0] || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selected) return;
    /* Comparación real: precio actual vs pronóstico IA por activo */
    const chartData = predictions
      .filter((p) => p.currentPrice > 0)
      .slice(0, 8)
      .map((p) => ({
        name: p.symbol,
        actual: Math.round(p.currentPrice * 100) / 100,
        predicted: Math.round(p.predictedPrice * 100) / 100,
      }));
    setChartData(chartData);
  }, [selected, predictions]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Predicción IA" subtitle="Modelos de machine learning que evalúan cada operación con score de acierto" icon={<BrainCircuit size={19} color={C.purple} />} />
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <Spinner size={30} label="Cargando modelo IA..." />
        </div>
      </div>
    );
  }

  const sorted = [...predictions].sort((a, b) => b.score - a.score);

  return (
    <div style={{ fontFamily: FONT }}>
      <PageHeader
        title="Predicción IA"
        subtitle="Ensamble LSTM + Random Forest + XGBoost · 32 variables · entrenamiento diario automático"
        icon={<BrainCircuit size={19} color={C.purple} />}
        actions={<button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 11, borderRadius: 7, backgroundColor: C.card, color: C.t1, border: "1px solid " + C.border, cursor: "pointer", fontFamily: FONT }}><RefreshCw size={13} /> Actualizar</button>}
      />

      {/* Modelo */}
      {model && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 16 }}>
          <Card padded={false}>
            <div style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.purple + "1F", display: "flex", alignItems: "center", justifyContent: "center" }}><Cpu size={15} color={C.purple} /></span>
              <div>
                <div style={{ fontSize: 9, color: C.t3 }}>Modelo activo</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{model.name}</div>
              </div>
            </div>
          </Card>
          <Card padded={false}>
            <div style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.green + "1F", display: "flex", alignItems: "center", justifyContent: "center" }}><Target size={15} color={C.green} /></span>
              <div>
                <div style={{ fontSize: 9, color: C.t3 }}>Precisión global</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{Math.round(model.accuracy * 100)}%</div>
              </div>
            </div>
          </Card>
          <Card padded={false}>
            <div style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.blue + "1F", display: "flex", alignItems: "center", justifyContent: "center" }}><Gauge size={15} color={C.blue} /></span>
              <div>
                <div style={{ fontSize: 9, color: C.t3 }}>Muestras de entrenamiento</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{model.samples.toLocaleString()}</div>
              </div>
            </div>
          </Card>
          <Card padded={false}>
            <div style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.gold + "1F", display: "flex", alignItems: "center", justifyContent: "center" }}><BrainCircuit size={15} color={C.gold} /></span>
              <div>
                <div style={{ fontSize: 9, color: C.t3 }}>Último entrenamiento</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t1 }}>{fmtDate(model.lastTraining)}</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 14, alignItems: "start" }}>
        {/* Ranking de activos */}
        <Card title="Ranking de activos" subtitle="Ordenados por score IA" padded={false} style={{ maxHeight: 560, overflowY: "auto" }}>
          {sorted.map((p, i) => (
            <button
              key={p.asset}
              onClick={() => setSelected(p)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", width: "100%", textAlign: "left",
                backgroundColor: selected?.asset === p.asset ? C.card : "transparent", border: "none",
                borderBottom: "1px solid " + C.border, cursor: "pointer", fontFamily: FONT,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 800, color: i < 3 ? C.gold : C.t3, width: 18 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t1 }}>{p.symbol}</div>
                <div style={{ fontSize: 9, color: C.t3 }}>{HORIZON_LABELS[p.horizon]}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: p.score >= 65 ? C.green : p.score >= 45 ? C.gold : C.red }}>
                {p.score}
              </span>
            </button>
          ))}
        </Card>

        {/* Detalle */}
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: C.purple + "1F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: C.purple }}>
                    {selected.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.t1 }}>{selected.name} <span style={{ color: C.t3, fontWeight: 600 }}>· {selected.symbol}/USD</span></div>
                    <div style={{ fontSize: 10, color: C.t3 }}>Horizonte: {HORIZON_LABELS[selected.horizon]}</div>
                  </div>
                </div>
                <ScoreDisplay score={selected.score} confidence={selected.confidence} size="lg" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginTop: 16 }}>
                <div style={{ padding: 12, borderRadius: 9, backgroundColor: C.bg2, border: "1px solid " + C.border }}>
                  <div style={{ fontSize: 9, color: C.t3 }}>Precio actual</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.t1 }}>{fmt(selected.currentPrice, selected.currentPrice < 1 ? 4 : 2)}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 9, backgroundColor: C.bg2, border: "1px solid " + C.border }}>
                  <div style={{ fontSize: 9, color: C.t3 }}>Precio pronosticado</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: selected.predictedChangePct >= 0 ? C.green : C.red }}>{fmt(selected.predictedPrice, selected.predictedPrice < 1 ? 4 : 2)}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 9, backgroundColor: C.bg2, border: "1px solid " + C.border }}>
                  <div style={{ fontSize: 9, color: C.t3 }}>Cambio esperado</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: selected.predictedChangePct >= 0 ? C.green : C.red }}>
                    {selected.predictedChangePct >= 0 ? "+" : ""}{selected.predictedChangePct.toFixed(2)}%
                  </div>
                </div>
                <div style={{ padding: 12, borderRadius: 9, backgroundColor: C.bg2, border: "1px solid " + C.border }}>
                  <div style={{ fontSize: 9, color: C.t3 }}>Señal</div>
                  <div style={{ marginTop: 4 }}>
                    {selected.signal === "buy" && <Badge tone="green" icon={<TrendingUp size={9} />}>COMPRAR</Badge>}
                    {selected.signal === "sell" && <Badge tone="red" icon={<TrendingDown size={9} />}>VENDER</Badge>}
                    {selected.signal === "hold" && <Badge tone="gold" icon={<Minus size={9} />}>MANTENER</Badge>}
                  </div>
                </div>
              </div>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>
              {/* SHAP */}
              <Card title="Explicabilidad SHAP" subtitle="Variables que más influyen en la decisión">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selected.features.slice(0, 6).map((f, i) => {
                    const pct = Math.min(100, Math.abs(f.impact) * 50);
                    const positive = f.impact >= 0;
                    return (
                      <div key={f.name + i}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
                          <span style={{ color: C.t2 }}>{f.name}</span>
                          <span style={{ color: positive ? C.green : C.red, fontWeight: 600 }}>
                            {positive ? "+" : ""}{f.impact.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ height: 5, borderRadius: 999, backgroundColor: C.border, overflow: "hidden", display: "flex" }}>
                          <div style={{ width: positive ? pct : 0, backgroundColor: C.green }} />
                          <div style={{ width: positive ? 0 : pct, backgroundColor: C.red, marginLeft: "auto" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 10, fontSize: 9, color: C.t3 }}>
                  Los valores SHAP muestran cómo cada variable empuja la predicción hacia arriba (verde) o abajo (rojo).
                </div>
              </Card>

              {/* Comparación */}
              <Card title="Actual vs Pronóstico" subtitle="Comparación de precios por activo (USD)">
                <PredictionChart data={chartData} />
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
