import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useMotionValue } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  ArrowRight,
  ChevronDown,
  Activity,
  ShieldCheck,
  Zap,
  BrainCircuit,
  Eye,
  Fingerprint,
  Smartphone,
} from "lucide-react";

function LiveCandlestick() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const cw = w / 4;
    const drawW = canvas.offsetWidth;
    const drawH = canvas.offsetHeight;
    let candles: { o: number; c: number; h: number; l: number; bull: boolean }[] = [];
    let price = 50;
    for (let i = 0; i < 30; i++) {
      const change = (Math.random() - 0.45) * 8;
      const o = price;
      const c = o + change;
      const h = Math.max(o, c) + Math.random() * 3;
      const l = Math.min(o, c) - Math.random() * 3;
      candles.push({ o, c, h, l, bull: c >= o });
      price = c;
    }
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, drawW, drawH);
      const allPrices = candles.flatMap((c) => [c.h, c.l]);
      const minP = Math.min(...allPrices);
      const maxP = Math.max(...allPrices);
      const range = maxP - minP || 1;
      const pad = 20;
      const chartH = drawH - pad * 2;
      const gap = (drawW - pad * 2) / candles.length;
      const candleW = gap * 0.6;
      candles.forEach((c, i) => {
        const x = pad + i * gap + gap / 2;
        const yH = pad + ((maxP - c.h) / range) * chartH;
        const yL = pad + ((maxP - c.l) / range) * chartH;
        const yO = pad + ((maxP - c.o) / range) * chartH;
        const yC = pad + ((maxP - c.c) / range) * chartH;
        ctx.strokeStyle = c.bull ? "#00d4aa" : "#ef4444";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yH);
        ctx.lineTo(x, yL);
        ctx.stroke();
        ctx.fillStyle = c.bull ? "#00d4aa" : "#ef4444";
        if (c.bull) {
          ctx.fillRect(x - candleW / 2, yC, candleW, yO - yC);
        } else {
          ctx.fillRect(x - candleW / 2, yO, candleW, yC - yO);
        }
      });
      const lastCandle = candles[candles.length - 1];
      const lastY = pad + ((maxP - lastCandle.c) / range) * chartH;
      const lastX = pad + (candles.length - 1) * gap + gap / 2;
      ctx.beginPath();
      ctx.strokeStyle = "#00d4aa";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(drawW, lastY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#00d4aa";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`$${(67000 + lastCandle.c * 100).toFixed(0)}`, drawW - 70, lastY - 6);
      frame++;
      if (frame % 60 === 0) {
        const change = (Math.random() - 0.45) * 8;
        const o = lastCandle.c;
        const c = o + change;
        const h = Math.max(o, c) + Math.random() * 3;
        const l = Math.min(o, c) - Math.random() * 3;
        candles.push({ o, c, h, l, bull: c >= o });
        if (candles.length > 30) candles.shift();
      }
      requestAnimationFrame(animate);
    };
    animate();
  }, []);
  return <canvas ref={canvasRef} className="w-full h-full" style={{ imageRendering: "auto" }} />;
}

function TickerBar() {
  const items = [
    { symbol: "BTC/USD", price: "67,432", change: "+2.34%", up: true },
    { symbol: "ETH/USD", price: "3,521", change: "+1.12%", up: true },
    { symbol: "EUR/USD", price: "1.0845", change: "-0.12%", up: false },
    { symbol: "AAPL", price: "198.45", change: "+0.67%", up: true },
    { symbol: "SPX", price: "5,432", change: "+0.89%", up: true },
    { symbol: "GOLD", price: "2,412", change: "+0.45%", up: true },
    { symbol: "NVDA", price: "892", change: "+5.21%", up: true },
    { symbol: "TSLA", price: "248", change: "+3.67%", up: true },
  ];
  return (
    <div className="w-full overflow-hidden bg-[#080808] border-b border-white/5 py-2">
      <motion.div
        className="flex gap-10 whitespace-nowrap"
        animate={{ x: [0, -1600] }}
        transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
      >
        {[...items, ...items, ...items].map((item, i) => (
          <span key={i} className="flex items-center gap-2 text-xs font-mono">
            <span className="text-gray-500">{item.symbol}</span>
            <span className="text-gray-300">${item.price}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.up ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"}`}>{item.change}</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-20 bg-gradient-to-r from-[#00d4aa]/10 via-[#0a84ff]/10 to-[#a855f7]/10 rounded-full blur-3xl" />
      <div className="relative w-[280px] h-[560px] bg-[#0a0a0a] rounded-[3rem] border-[3px] border-gray-800 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-[#0a0a0a] rounded-b-2xl z-10" />
        <div className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden">
          <div className="p-4 pt-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-gray-500">Portfolio</span>
              <span className="text-[10px] text-emerald-400 font-mono">+12.4%</span>
            </div>
            <p className="text-2xl font-bold tracking-tight">$127,432</p>
            <p className="text-[10px] text-gray-500 mt-1">Balance total</p>
            <div className="mt-4 h-20 rounded-2xl overflow-hidden bg-[#111]">
              <LiveCandlestick />
            </div>
            <div className="mt-4 space-y-2">
              {[
                { name: "BTC", val: "$67,432", ch: "+2.3%", up: true },
                { name: "ETH", val: "$3,521", ch: "+1.1%", up: true },
                { name: "NVDA", val: "$892", ch: "+5.2%", up: true },
              ].map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + i * 0.2 }}
                  className="flex items-center justify-between py-1.5 border-b border-white/5"
                >
                  <span className="text-[11px] font-mono text-gray-400">{a.name}</span>
                  <span className="text-[11px] font-mono text-gray-300">{a.val}</span>
                  <span className={`text-[9px] font-mono ${a.up ? "text-emerald-400" : "text-red-400"}`}>{a.ch}</span>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-[#00d4aa] rounded-xl py-2 text-center">
                <span className="text-[10px] font-bold text-black">Comprar</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl py-2 text-center">
                <span className="text-[10px] font-medium text-gray-300">Vender</span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-1">
              {["IA", "Mercado", "Portfolio"].map((t, i) => (
                <span key={i} className={`text-[9px] px-2 py-1 rounded-full ${i === 0 ? "bg-[#0a84ff]/20 text-[#0a84ff]" : "text-gray-600"}`}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <TickerBar />

      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className="sticky top-0 z-50 backdrop-blur-2xl bg-[#050505]/80 border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#0a84ff] flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">BANCA <span className="text-[#00d4aa]">NEN</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] text-gray-400">
            <a href="#platform" className="hover:text-white transition-colors">Plataforma</a>
            <a href="#ai" className="hover:text-white transition-colors">IA</a>
            <a href="#security" className="hover:text-white transition-colors">Seguridad</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/login")} className="text-[13px] text-gray-300 hover:text-white transition-colors px-4 py-2">Iniciar sesion</button>
            <button onClick={() => navigate("/register")} className="text-[13px] bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold px-5 py-2 rounded-full transition-colors">Abrir cuenta</button>
          </div>
        </div>
      </motion.nav>

      <motion.section style={{ opacity: heroOpacity }} className="relative min-h-[92vh] flex items-center overflow-hidden">
        <div className="absolute w-[800px] h-[800px] bg-[#00d4aa]/5 rounded-full blur-[200px] -top-40 -left-40" />
        <div className="absolute w-[600px] h-[600px] bg-[#0a84ff]/5 rounded-full blur-[200px] top-40 -right-40" />

        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8">
                <Activity className="w-3.5 h-3.5 text-[#00d4aa]" />
                <span className="text-xs text-gray-300">Mercados abiertos — Vol. $24.5B en las ultimas 24h</span>
              </div>

              <h1 className="text-[3.5rem] md:text-[4.5rem] lg:text-[5.5rem] font-bold tracking-[-0.03em] leading-[0.92]">
                Opera.
                <br />
                <span className="text-[#00d4aa]">Analiza.</span>
                <br />
                <span className="text-gray-500">Crece.</span>
              </h1>

              <p className="mt-6 text-[17px] text-gray-400 leading-relaxed max-w-md">
                Plataforma de trading con analisis impulsado por inteligencia artificial. Ejecucion en milisegundos. Datos en tiempo real. Sin intermediarios.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
                <button onClick={() => navigate("/register")} className="group flex items-center gap-2 bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold px-8 py-4 rounded-full text-[15px] transition-all hover:shadow-[0_0_40px_rgba(0,212,170,0.25)]">
                  Empezar a operar
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="flex items-center gap-2 text-gray-300 hover:text-white px-6 py-4 rounded-full text-[15px] transition-colors border border-white/10 hover:border-white/20">
                  <Activity className="w-4 h-4" />
                  Ver mercados en vivo
                </button>
              </div>

              <div className="mt-12 flex items-center gap-8 text-sm text-gray-500">
                <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#00d4aa]" /><span>Regulado</span></div>
                <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-[#00d4aa]" /><span>12ms latencia</span></div>
                <div className="flex items-center gap-2"><BrainCircuit className="w-4 h-4 text-[#00d4aa]" /><span>IA integrada</span></div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="flex justify-center">
              <PhoneMockup />
            </motion.div>
          </div>
        </div>

        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <ChevronDown className="w-5 h-5 text-gray-600" />
        </motion.div>
      </motion.section>

      {/* Live Chart Section */}
      <section className="py-24 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <span className="text-[#00d4aa] text-[13px] font-medium tracking-widest uppercase">Mercado en vivo</span>
            <h2 className="text-[2.5rem] md:text-[3.5rem] font-bold tracking-[-0.02em] mt-4 leading-tight">
              BTC/USD
              <span className="text-emerald-400 ml-3 text-[2rem]">+2.34%</span>
            </h2>
            <p className="text-gray-500 text-sm font-mono mt-1">Simulacion en tiempo real — datos ilustrativos</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-8 h-[300px] md:h-[400px] rounded-3xl overflow-hidden bg-[#080808]">
            <LiveCandlestick />
          </motion.div>
        </div>
      </section>

      {/* Platform - Typography driven, no boxes */}
      <section id="platform" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-24">
            <span className="text-[#00d4aa] text-[13px] font-medium tracking-widest uppercase">Plataforma</span>
            <h2 className="text-[2.5rem] md:text-[3.5rem] font-bold tracking-[-0.02em] mt-4 leading-tight">
              Construida para traders,
              <br />
              <span className="text-gray-500">no para turistas.</span>
            </h2>
          </motion.div>

          <div className="space-y-0">
            {[
              { title: "Ejecucion directa al mercado", subtitle: "DMA / STP", desc: "Sin mesa de operaciones. Tus ordenes van directo al liquidity provider. Sin requotes, sin manipulacion, sin conflicto de intereses.", metrics: ["<12ms", "99.9% fill rate", "0 slippage"] },
              { title: "Analisis tecnico avanzado", subtitle: "100+ indicadores", desc: "Candlesticks, Heikin Ashi, Renko. Indicadores personalizados. Alertas de precio. Multi-timeframe. Todo lo que necesitas para leer el mercado.", metrics: ["100+ indicadores", "12 timeframes", "Plantillas"] },
              { title: "Order flow profesional", subtitle: "Book & Tape", desc: "Visualiza el flujo de dinero real. Order book con profundidad, time & sales, volumen delta. Ve lo que los grandes hacen.", metrics: ["Level 2", "Heatmap", "Volumen delta"] },
              { title: "Gestion de riesgo integrada", subtitle: "Risk Management", desc: "Stop loss automatico, take profit parcial, trailing stop, calculadora de posicion size. Protege tu capital en cada operacion.", metrics: ["Auto SL/TP", "Position sizing", "Trailing stop"] },
            ].map((feature, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="group border-t border-white/5 py-12 last:border-b hover:bg-white/[0.01] transition-colors cursor-default">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-1"><span className="text-[13px] text-gray-600 font-mono">0{i + 1}</span></div>
                  <div className="lg:col-span-3">
                    <span className="text-[#00d4aa] text-[13px] font-medium">{feature.subtitle}</span>
                    <h3 className="text-2xl md:text-3xl font-bold mt-1 tracking-tight">{feature.title}</h3>
                  </div>
                  <div className="lg:col-span-5"><p className="text-gray-400 leading-relaxed">{feature.desc}</p></div>
                  <div className="lg:col-span-3 flex flex-wrap gap-2">
                    {feature.metrics.map((m, j) => (
                      <span key={j} className="text-[11px] font-mono text-gray-500 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full">{m}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section id="ai" className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a84ff]/3 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="text-[#0a84ff] text-[13px] font-medium tracking-widest uppercase">Inteligencia Artificial</span>
              <h2 className="text-[2.5rem] md:text-[3.5rem] font-bold tracking-[-0.02em] mt-4 leading-tight">
                No es magia.
                <br />
                <span className="text-gray-500">Es matematica.</span>
              </h2>
              <p className="text-gray-400 mt-6 text-[17px] leading-relaxed max-w-lg">
                Nuestros modelos de machine learning analizan millones de datos de mercado en tiempo real. Patrones estadisticos, correlaciones, y anomalias que el ojo humano no detecta.
              </p>
              <p className="text-gray-500 mt-4 text-[15px] leading-relaxed max-w-lg">
                No predice el futuro. Identifica probabilidades con datos historicos. Tu decides si operar o no.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  "Analisis de patrones en 50+ timeframes simultaneos",
                  "Deteccion de anomalias en order flow en tiempo real",
                  "Scoring de probabilidad basado en datos historicos",
                  "Alertas personalizadas configurables por activo",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0a84ff]" />
                    <span className="text-gray-300 text-[15px]">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="bg-[#080808] rounded-3xl border border-white/5 overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5">
                  <BrainCircuit className="w-4 h-4 text-[#0a84ff]" />
                  <span className="text-xs text-gray-400 font-medium">NEN AI — Analisis en vivo</span>
                  <span className="ml-auto w-2 h-2 rounded-full bg-[#0a84ff] animate-pulse" />
                </div>
                <div className="p-6 space-y-0">
                  {[
                    { symbol: "BTC/USD", signal: "ALCISTA", prob: "73.2%", tf: "4H", conf: "Alta" },
                    { symbol: "ETH/USD", signal: "NEUTRAL", prob: "52.1%", tf: "1D", conf: "Media" },
                    { symbol: "SPX", signal: "ALCISTA", prob: "68.7%", tf: "1H", conf: "Alta" },
                    { symbol: "GOLD", signal: "BAJISTA", prob: "61.4%", tf: "4H", conf: "Media" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                      <span className="text-sm font-mono text-gray-300">{item.symbol}</span>
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded ${item.signal === "ALCISTA" ? "text-emerald-400 bg-emerald-400/10" : item.signal === "BAJISTA" ? "text-red-400 bg-red-400/10" : "text-yellow-400 bg-yellow-400/10"}`}>{item.signal}</span>
                      <span className="text-xs text-gray-500 font-mono">{item.prob}</span>
                      <span className="text-[11px] text-gray-600">{item.tf}</span>
                    </div>
                  ))}
                </div>
                <div className="px-6 py-3 border-t border-white/5 bg-white/[0.02]">
                  <p className="text-[10px] text-gray-600 font-mono">Los signals son probabilidades estadisticas, no recomendaciones de inversion. Opera bajo tu propio criterio.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Security - Clean, no boxes */}
      <section id="security" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-20">
            <span className="text-gray-500 text-[13px] font-medium tracking-widest uppercase">Seguridad</span>
            <h2 className="text-[2.5rem] md:text-[3.5rem] font-bold tracking-[-0.02em] mt-4">Tu capital, protegido.</h2>
            <p className="text-gray-400 mt-4 text-[17px] max-w-xl mx-auto">Encriptacion AES-256. Autenticacion 2FA. Fondos segregados. Monitoreo 24/7.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {[
              { icon: ShieldCheck, title: "Fondos segregados", desc: "Tu dinero esta separado de los fondos operativos de la empresa. No se usa para nada mas." },
              { icon: Fingerprint, title: "Anti-fraude con IA", desc: "Monitoreo de actividad en tiempo real. Deteccion de accesos no autorizados y retiros sospechosos." },
              { icon: Smartphone, title: "Recuperacion rapida", desc: "Si detectamos actividad sospechosa, congelamos la cuenta al instante y te notificamos de inmediato." },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                <item.icon className="w-8 h-8 text-[#00d4aa] mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-gray-400 text-[15px] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#00d4aa]/3 via-transparent to-transparent" />
        <div className="max-w-3xl mx-auto px-6 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-[2.5rem] md:text-[4rem] font-bold tracking-[-0.03em] leading-tight">
              Deja de observar.
              <br />
              <span className="text-[#00d4aa]">Empieza a operar.</span>
            </h2>
            <p className="mt-6 text-gray-400 text-[17px] max-w-md mx-auto">
              Cuenta gratuita. Sin saldo minimo. Acceso inmediato a todos los mercados.
            </p>
            <button onClick={() => navigate("/register")} className="group mt-10 inline-flex items-center gap-2 bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold px-10 py-4 rounded-full text-[16px] transition-all hover:shadow-[0_0_40px_rgba(0,212,170,0.25)]">
              Abrir cuenta gratuita
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#00d4aa] to-[#0a84ff] flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-bold">BANCA NEN</span>
            </div>
            <p className="text-[11px] text-gray-600">El trading conlleva riesgo. Los resultados pasados no garantizan resultados futuros. Opera responsablemente.</p>
            <p className="text-[11px] text-gray-600">2026 BANCA NEN. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
