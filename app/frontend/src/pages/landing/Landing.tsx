import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  Activity,
  ShieldCheck,
  Zap,
  BrainCircuit,
  Fingerprint,
  Smartphone,
} from "lucide-react";

import BrandLogo from "../../components/common/BrandLogo";
import { MarketTicker } from "../../components/common/MarketTicker";
import MarketStatus, { marketMessage } from "../../components/common/MarketStatus";
import { useSpotQuotes } from "../../hooks/useMarketFeed";
import { MARKET_ASSETS, formatDelta, formatQuote, type MarketSnapshot, type Quotes } from "../../services/market";
import { getCurrencyMeta } from "../../constants/currencies";

function PhoneMockup({ snapshot }: { snapshot?: MarketSnapshot<Quotes> }) {
  return (
    <div className="relative w-[280px] max-w-full">
      <div className="pointer-events-none absolute -inset-14 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden="true" />
      <div className="relative rounded-[2.6rem] border-[3px] border-[#29353b] bg-[#0b1013] px-5 pb-14 pt-12 shadow-2xl">
        <div className="absolute left-1/2 top-3 h-2.5 w-16 -translate-x-1/2 rounded-full bg-[#232b31]" aria-hidden="true" />
        <Activity size={23} className="mb-3 text-emerald-300" aria-hidden="true" />
        <h2 className="text-xl font-bold">Mercado spot</h2>
        <div className="mt-1 text-xs"><MarketStatus snapshot={snapshot} /></div>
        <ul className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[.025] px-3">
          {MARKET_ASSETS.map((asset) => {
            const value = snapshot?.data?.[asset];
            return <li key={asset} className="flex items-center justify-between gap-2 py-3 text-sm tabular-nums">
              <span className="font-semibold">{asset}</span><span className="text-gray-300">{value ? `$${formatQuote(value.price, asset)}` : "—"}</span>
            </li>;
          })}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-gray-400">Mercado en USD; el saldo de la plataforma es virtual.</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { snapshot } = useSpotQuotes();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <MarketTicker snapshot={snapshot} />

      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className="sticky top-0 z-50 backdrop-blur-2xl bg-[#050505]/80 border-b border-white/5"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center">
            <BrandLogo className="h-9 w-auto" />
          </div>
          <div className="hidden md:flex items-center gap-8 text-[15px] text-gray-400">
            <a href="#platform" className="hover:text-white transition-colors">Plataforma</a>
            <a href="#ai" className="hover:text-white transition-colors">IA</a>
            <a href="#security" className="hover:text-white transition-colors">Seguridad</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/login")} className="text-[15px] text-gray-300 hover:text-white transition-colors px-4 py-2">Iniciar sesión</button>
            <button onClick={() => navigate("/register")} className="text-[15px] bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold px-5 py-2 rounded-full transition-colors">Abrir cuenta</button>
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
                <span className="text-xs text-gray-300">Saldo virtual · sin fondos reales</span>
              </div>

              <h1 className="text-[3.5rem] md:text-[4.5rem] lg:text-[5.5rem] font-bold tracking-[-0.03em] leading-[0.92]">
                Opera.
                <br />
                <span className="text-[#00d4aa]">Analiza.</span>
                <br />
                <span className="text-gray-500">Crece.</span>
              </h1>

              <p className="mt-6 text-[17px] text-gray-400 leading-relaxed max-w-md">
                Consulta tu billetera, registra operaciones simuladas y explora referencias del mercado. No necesitas transferir dinero ni conectar una cuenta bancaria.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
                <button onClick={() => navigate("/register")} className="group flex items-center gap-2 bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold px-8 py-4 rounded-full text-[17px] transition-all hover:shadow-[0_0_40px_rgba(0,212,170,0.25)]">
                  Crear cuenta
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <a href="#mercado" className="flex items-center gap-2 text-gray-300 hover:text-white px-6 py-4 rounded-full text-[17px] transition-colors border border-white/10 hover:border-white/20">
                  <Activity className="w-4 h-4" />
                  Ver cotizaciones
                </a>
              </div>

              <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-gray-400">
                <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#00d4aa]" /><span>Verificación y 2FA</span></div>
                <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-[#00d4aa]" /><span>Operaciones virtuales</span></div>
                <div className="flex items-center gap-2"><BrainCircuit className="w-4 h-4 text-[#00d4aa]" /><span>Start IA</span></div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="flex justify-center">
              <PhoneMockup snapshot={snapshot} />
            </motion.div>
          </div>
        </div>

        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <ChevronDown className="w-5 h-5 text-gray-600" />
        </motion.div>
      </motion.section>

      <section id="mercado" className="border-y border-white/10 bg-[#0b1013] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">Mercado · USD</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">Cotizaciones de referencia</h2>
          <p className="mt-3 text-sm"><MarketStatus snapshot={snapshot} /></p>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {MARKET_ASSETS.map((asset) => {
              const value = snapshot?.data?.[asset];
              return <div key={asset} className="min-w-0 rounded-2xl border border-white/10 bg-[#131a1f] p-5">
                <h3 className="font-semibold text-slate-200">{asset}/USD · {getCurrencyMeta(asset).name}</h3>
                <p className="mt-3 text-2xl font-bold tabular-nums">{value ? `$${formatQuote(value.price, asset)}` : "—"}</p>
                <p className="mt-1 text-xs text-slate-400">{value ? `${formatDelta(value.changeDayPct)} desde 00:00 UTC` : marketMessage(snapshot)}</p>
              </div>;
            })}
          </div>
        </div>
      </section>

      {/* Platform - Typography driven, no boxes */}
      <section id="platform" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-24">
            <span className="text-[#00d4aa] text-[15px] font-medium tracking-widest uppercase">Plataforma</span>
            <h2 className="text-[2.5rem] md:text-[3.5rem] font-bold tracking-[-0.02em] mt-4 leading-tight">
              Explora la plataforma,
              <br />
              <span className="text-gray-500">sin mover dinero real.</span>
            </h2>
          </motion.div>

          <div className="space-y-0">
            {[
              { title: "Billetera virtual", subtitle: "Saldo y movimientos", desc: "Consulta el efectivo disponible, los activos y los movimientos guardados en tu cuenta.", metrics: ["Depósitos simulados", "Retiros simulados"] },
              { title: "Órdenes de mercado", subtitle: "Trading simulado", desc: "Compra o vende BTC, ETH y USDC con saldo virtual. El servidor determina la cotización y registra la comisión.", metrics: ["BTC", "ETH", "USDC"] },
              { title: "Historial y reportes", subtitle: "Consulta de operaciones", desc: "Revisa tus operaciones completadas y exporta los datos disponibles desde el portal.", metrics: ["Historial", "CSV", "JSON"] },
            ].map((feature, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="group border-t border-white/5 py-12 last:border-b hover:bg-white/[0.01] transition-colors cursor-default">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-1"><span className="text-[15px] text-gray-600 font-mono">0{i + 1}</span></div>
                  <div className="lg:col-span-3">
                    <span className="text-[#00d4aa] text-[15px] font-medium">{feature.subtitle}</span>
                    <h3 className="text-2xl md:text-3xl font-bold mt-1 tracking-tight">{feature.title}</h3>
                  </div>
                  <div className="lg:col-span-5"><p className="text-gray-400 leading-relaxed">{feature.desc}</p></div>
                  <div className="lg:col-span-3 flex flex-wrap gap-2">
                    {feature.metrics.map((m, j) => (
                      <span key={j} className="text-[13px] font-mono text-gray-500 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full">{m}</span>
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
              <span className="text-[#0a84ff] text-[15px] font-medium tracking-widest uppercase">Start IA</span>
              <h2 className="mt-4 text-[2.5rem] font-bold leading-tight tracking-tight md:text-[3.5rem]">Un espacio para tus preguntas</h2>
              <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-gray-400">
                Al iniciar sesión encontrarás sugerencias y un campo para preparar consultas. El modelo no está conectado: las consultas no se envían ni se guardan.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="rounded-3xl border border-white/10 bg-[#080808] p-6">
                <BrainCircuit className="mb-4 h-6 w-6 text-[#0a84ff]" aria-hidden="true" />
                <h3 className="text-xl font-semibold">Análisis de mercado, por separado</h3>
                <p className="mt-3 leading-relaxed text-gray-400">
                  Cuando hay datos de CoinGecko, la plataforma calcula estimaciones con reglas fijas de tendencia y volumen, no con un modelo entrenado. No son recomendaciones de inversión.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Security - Clean, no boxes */}
      <section id="security" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-20">
            <span className="text-gray-500 text-[15px] font-medium tracking-widest uppercase">Seguridad</span>
            <h2 className="text-[2.5rem] md:text-[3.5rem] font-bold tracking-[-0.02em] mt-4">Seguridad de tu cuenta</h2>
            <p className="text-gray-400 mt-4 text-[17px] max-w-xl mx-auto">Verificación de contacto, autenticador opcional para usuarios y gestión de sesiones.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {[
              { icon: ShieldCheck, title: "Sesiones revocables", desc: "Consulta tus sesiones y cierra las que ya no uses desde tu perfil." },
              { icon: Fingerprint, title: "Acceso con 2FA", desc: "Activa un segundo factor con una app autenticadora. Se exige para acceder al panel de personal." },
              { icon: Smartphone, title: "Recuperación de cuenta", desc: "Solicita un código o un enlace para restablecer tu contraseña." },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                <item.icon className="w-8 h-8 text-[#00d4aa] mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-gray-400 text-[17px] leading-relaxed">{item.desc}</p>
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
              Crea una cuenta para probar los flujos con saldo virtual. No se reciben depósitos reales.
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
            <div className="flex items-center">
              <BrandLogo className="h-7 w-auto opacity-90" />
            </div>
            <p className="text-[13px] text-gray-600">Las operaciones son simuladas y no representan inversiones ni movimientos de dinero real.</p>
            <p className="text-[13px] text-gray-600">{new Date().getFullYear()} BANCA NEN. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
