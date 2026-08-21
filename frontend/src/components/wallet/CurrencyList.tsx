/* Lista de monedas de la billetera — BANCA NEN */
import type { WalletData } from "../../services/wallet";
import { C, FONT } from "../../theme";
import { getCurrencyMeta } from "../../constants/currencies";

interface Props {
  wallet: WalletData | null;
  onSelectCurrency?: (currency: string) => void;
  selectedCurrency?: string;
}

export default function CurrencyList({ wallet, onSelectCurrency, selectedCurrency }: Props) {
  const balances = wallet?.balances || [];
  const total = Number(wallet?.totalBalanceUsd || 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: FONT }}>
      {balances.map((b) => {
        const meta = getCurrencyMeta(b.currency);
        const amount = Number(b.balance);
        const locked = Number(b.lockedAmount);
        const usd = amount * Number(b.usdRate);
        const pct = total > 0 ? (usd / total) * 100 : 0;
        const selected = selectedCurrency === b.currency;
        return (
          <div
            key={b.currency}
            onClick={() => onSelectCurrency?.(b.currency)}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
              borderRadius: 10, cursor: onSelectCurrency ? "pointer" : "default",
              backgroundColor: selected ? C.card : C.bg2,
              border: "1px solid " + (selected ? C.gold + "66" : C.border),
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: meta.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: meta.color, flexShrink: 0 }}>
              {meta.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{b.currency}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{amount.toLocaleString(undefined, { maximumFractionDigits: b.currency === "BTC" || b.currency === "ETH" ? 6 : 2 })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                <span style={{ fontSize: 9, color: C.t3 }}>{meta.name}</span>
                <span style={{ fontSize: 9, color: C.t2 }}>≈ {usd.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ height: 3, borderRadius: 999, backgroundColor: C.border, marginTop: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", backgroundColor: meta.color, borderRadius: 999 }} />
              </div>
            </div>
            {locked > 0 && (
              <span style={{ fontSize: 8, color: C.gold, backgroundColor: C.gold + "12", padding: "2px 6px", borderRadius: 999, whiteSpace: "nowrap" }}>
                {locked} congelado
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
