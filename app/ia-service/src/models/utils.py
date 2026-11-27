"""Puntaje determinista a partir de los datos proporcionados por el cliente.

Este servicio opcional no suministra las estimaciones de la web. Comparte el
criterio base de mercado, pero aquí se ajusta el resultado por lado de orden.
El puntaje no mide acierto ni riesgo validado.
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
        {"name": "Rango 24 h (informativo)", "value": volatility, "impact": 0.0, "direction": 1},
        {"name": "Volumen relativo", "value": volume_ratio, "impact": vol_score,
         "direction": 1 if vol_score >= 0 else -1},
        {"name": "Momentum", "value": abs(change_24h), "impact": momentum,
         "direction": 1 if momentum >= 0 else -1},
    ]
    return sorted(features, key=lambda f: abs(f["impact"]), reverse=True)
