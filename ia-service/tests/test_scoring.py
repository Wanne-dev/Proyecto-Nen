"""Pruebas de la lógica de scoring del servicio de IA."""

from src.models.utils import clamp, explain_features, score_trade


def test_clamp():
    assert clamp(150, 0, 100) == 100
    assert clamp(-5, 0, 100) == 0
    assert clamp(42, 0, 100) == 42


def test_score_trade_returns_valid_ranges():
    for side in ("buy", "sell"):
        score, signal, risk_level = score_trade(
            symbol="BTC", side=side,
            change_24h=3.2, change_7d=8.1, volatility=5.0, volume_ratio=0.05,
        )
        assert 0 <= score <= 100
        assert signal in ("buy", "sell", "hold")
        assert risk_level in ("low", "medium", "high")


def test_score_trade_is_deterministic():
    args = dict(symbol="ETH", side="buy", change_24h=1.0, change_7d=-2.0,
                volatility=3.0, volume_ratio=0.02)
    a = score_trade(**args)
    b = score_trade(**args)
    assert a == b


def test_buy_has_higher_score_than_sell():
    common = dict(symbol="BTC", change_24h=2.0, change_7d=4.0, volatility=4.0, volume_ratio=0.04)
    buy = score_trade(side="buy", **common)[0]
    sell = score_trade(side="sell", **common)[0]
    assert buy > sell


def test_explain_features_are_sorted_by_impact():
    feats = explain_features(change_24h=5.0, change_7d=3.0, volatility=2.0,
                             volume_ratio=0.06, score=70)
    assert len(feats) == 5
    impacts = [abs(f["impact"]) for f in feats]
    assert impacts == sorted(impacts, reverse=True)
    for f in feats:
        assert f["direction"] in (1, -1)


def test_api_smoke():
    from fastapi.testclient import TestClient
    from src.api.main import app

    client = TestClient(app)
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

    r = client.post("/predict", json={
        "symbol": "BTC", "side": "buy", "current_price": 67000,
        "change_24h": 2.5, "change_7d": 5.0, "volatility": 3.0,
        "volume_ratio": 0.05, "horizon": "7d",
    })
    assert r.status_code == 200
    body = r.json()
    assert 0 <= body["score"] <= 100
    assert body["signal"] in ("buy", "sell", "hold")
    assert len(body["features"]) == 5
