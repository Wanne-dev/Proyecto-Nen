"""Modelos Pydantic de entrada del servicio de IA."""

from typing import Literal, Optional

from pydantic import BaseModel, Field

Side = Literal["buy", "sell"]


class PredictRequest(BaseModel):
    """Datos de una operación a evaluar."""

    symbol: str = Field(..., description="Símbolo del activo (ej. BTC, ETH, AAPL)", max_length=20)
    side: Side = Field("buy", description="Lado de la operación: buy o sell")
    current_price: float = Field(..., gt=0, description="Precio actual del activo")
    change_24h: float = Field(0, description="Cambio porcentual en 24h")
    change_7d: float = Field(0, description="Cambio porcentual en 7d")
    volatility: float = Field(0, ge=0, description="Volatilidad (rango alto-bajo en %)")
    volume_ratio: float = Field(0, ge=0, description="Volumen relativo al market cap")
    horizon: Literal["24h", "7d", "30d"] = "24h"
    extra: Optional[dict] = Field(None, description="Variables adicionales opcionales")
