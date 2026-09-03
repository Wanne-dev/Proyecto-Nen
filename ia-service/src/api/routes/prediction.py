"""Endpoint /predict: evalúa una operación y devuelve el score de IA."""

from fastapi import APIRouter

from src.api.models.request_models import PredictRequest
from src.api.models.response_models import PredictResponse
from src.models.utils import clamp, explain_features, score_trade

router = APIRouter(prefix="/predict", tags=["prediction"])


@router.post("", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    score, signal, risk_level = score_trade(
        symbol=req.symbol,
        side=req.side,
        change_24h=req.change_24h,
        change_7d=req.change_7d,
        volatility=req.volatility,
        volume_ratio=req.volume_ratio,
    )

    predicted_change = clamp(
        req.change_24h * (0.8 if req.horizon == "24h" else 1.4 if req.horizon == "7d" else 2.2)
        + (score - 50) * 0.12,
        -25,
        35,
    )

    features = explain_features(
        change_24h=req.change_24h,
        change_7d=req.change_7d,
        volatility=req.volatility,
        volume_ratio=req.volume_ratio,
        score=score,
    )

    return PredictResponse(
        symbol=req.symbol.upper(),
        score=score,
        signal=signal,
        risk_level=risk_level,
        confidence=round(0.6 + abs(score - 50) / 200, 2),
        predicted_change_pct=round(predicted_change, 2),
        horizon=req.horizon,
        features=features,
    )
