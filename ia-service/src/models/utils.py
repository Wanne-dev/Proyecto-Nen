"""Lógica de scoring determinista del servicio de IA.

Calcula un score de acierto (0-100) a partir de variables de mercado reales:
tendencia 24h/7d, volatilidad, volumen relativo y momentum. Es el mismo
enfoque compuesto que usa el backend (src/services/ia.service.ts), de modo
que ambos servicios devuelvan resultados coherentes.

Cuando se disponga de datos históricos, este módulo se sustituye por el
ensemble entrenado (LSTM + Random Forest + XGBoost) sin cambiar la API.
"""

from typing import Dict, List, Tuple


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def score_trade(
    symbol: str,
    side: str,
    change_24h: float,
    change_7d: float,
    volatility: float,
    volume_ratio: float,
) -> Tuple[int, str, str]:
    """Devuelve (score 0-100, señal, nivel de riesgo)."""
    trend_score = clamp(change_24h * 3 + change_7d * 1.2, -40, 40)
    vol_score = clamp((volume_ratio - 0.03) * 400, -15, 15)
    momentum = clamp(change_24h, -10, 10) * 1.5
    score = round(clamp(50 + trend_score + vol_score + momentum, 8, 97))

    # Compra con leve bonificación, venta con leve penalización
    score = round(clamp(score + (3 if side == "buy" else -3), 8, 97))

    signal = "buy" if score >= 62 else "sell" if score <= 42 else "hold"
    risk_level = "low" if score >= 62 else "high" if score <= 42 else "medium"
    return score, signal, risk_level


def explain_features(
    change_24h: float,
    change_7d: float,
    volatility: float,
    volume_ratio: float,
    score: int,
) -> List[Dict[str, float]]:
    """Construye la lista ordenada de variables influyentes."""
    vol_score = clamp((volume_ratio - 0.03) * 400, -15, 15)
    momentum = clamp(change_24h, -10, 10) * 1.5

    features = [
        {"name": "Tendencia 24h", "value": abs(change_24h), "impact": change_24h,
         "direction": 1 if change_24h >= 0 else -1},
        {"name": "Tendencia 7d", "value": abs(change_7d), "impact": change_7d * 0.6,
         "direction": 1 if change_7d >= 0 else -1},
        {"name": "Volatilidad", "value": volatility, "impact": (score - 50) * 0.1, "direction": 1},
        {"name": "Volumen relativo", "value": volume_ratio, "impact": vol_score,
         "direction": 1 if vol_score >= 0 else -1},
        {"name": "Momentum", "value": abs(change_24h), "impact": momentum,
         "direction": 1 if momentum >= 0 else -1},
    ]
    return sorted(features, key=lambda f: abs(f["impact"]), reverse=True)
