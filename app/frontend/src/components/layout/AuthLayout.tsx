import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import BrandLogo from "../common/BrandLogo";
import MarketTicker from "../common/MarketTicker";

export const authPanelClass = "rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8";

/** Carcasa pública común: el contenido y los flujos siguen a cargo de cada página. */
export default function AuthLayout({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f] text-white">
      <div className="absolute inset-0" aria-hidden="true">
        {!reduceMotion && (
          <video className="h-full w-full object-cover" src="/assets/videos/login-bg.mp4" autoPlay muted loop playsInline preload="metadata" />
        )}
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/40 via-transparent to-[#0a0a0f]/80" />
      </div>
      <header className="relative">
        <MarketTicker />
        <Link to="/" className="ml-4 mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200 backdrop-blur-md transition-colors hover:bg-white/10">
          <ArrowLeft size={16} aria-hidden="true" /> Volver al inicio
        </Link>
      </header>
      <main className="relative flex justify-center px-4 pb-10 pt-3">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <h1 className="sr-only">BANCA NEN</h1>
            <BrandLogo className="mb-4 h-12 w-auto max-w-[190px]" alt="" />
            {subtitle && <p className="mt-1 text-sm text-gray-400">{subtitle}</p>}
          </div>
          {children}
          <p className="mt-6 text-center text-xs text-gray-400">© {new Date().getFullYear()} BANCA NEN</p>
        </motion.div>
      </main>
    </div>
  );
}
