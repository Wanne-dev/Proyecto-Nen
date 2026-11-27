"""Modelos Pydantic de salida del servicio de IA."""

from typing import List, Literal

from pydantic import BaseModel


class FeatureImpact(BaseModel):
    name: str
    value: float
    impact: float
    direction: Literal[1, -1]


class PredictResponse(BaseModel):
    symbol: str
    score: int
    signal: Literal["buy", "sell", "hold"]
    risk_level: Literal["low", "medium", "high"]
    confidence: float
    predicted_change_pct: float
    horizon: str
    features: List[FeatureImpact]
