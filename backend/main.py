from fastapi import FastAPI, Query
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import urllib.request
import urllib.parse
import json
from datetime import datetime

app = FastAPI()

# -----------------------
# Enable CORS
# -----------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------
# Request Model
# -----------------------
class Trade(BaseModel):
    pair: str
    capital: float
    risk_percent: float
    lot_size: float
    pips: float
    entry_price: float
    stop_loss_pips: float
    trade_type: str
    leverage: int = 100


@app.get("/")
def home():
    return {"message": "Forex Trading API Running 🚀"}


def _fetch_live_rate(base: str, quote: str):
    """Fetches a live forex rate using a free public API (exchangerate.host)."""
    base = base.upper()
    quote = quote.upper()

    if base == quote:
        return {"rate": 1.0, "source": "self"}

    url = (
        "https://api.exchangerate.host/convert?"
        + urllib.parse.urlencode({"from": base, "to": quote, "places": 6})
    )

    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            raw = resp.read().decode("utf-8")
            data = json.loads(raw)
    except Exception as e:
        return {"error": f"Failed to fetch rate: {e}"}

    if not data.get("success"):
        return {"error": data.get("error", "Unknown API error")}

    rate = data.get("result")
    timestamp = data.get("timestamp")
    return {
        "rate": round(rate, 6) if isinstance(rate, (int, float)) else None,
        "timestamp": datetime.utcfromtimestamp(timestamp).isoformat() + "Z" if timestamp else None,
        "source": "exchangerate.host",
    }


def _market_sessions():
    """Return the major forex session windows and whether they are currently open (UTC)."""
    now = datetime.utcnow()
    hour = now.hour

    sessions = [
        {"name": "Sydney", "start": 22, "end": 7, "label": "22:00–07:00 UTC"},
        {"name": "Tokyo", "start": 0, "end": 9, "label": "00:00–09:00 UTC"},
        {"name": "London", "start": 7, "end": 16, "label": "07:00–16:00 UTC"},
        {"name": "New York", "start": 12, "end": 21, "label": "12:00–21:00 UTC"},
    ]

    def is_open(h, start, end):
        if start < end:
            return start <= h < end
        return h >= start or h < end

    for s in sessions:
        s["open"] = is_open(hour, s["start"], s["end"])

    return sessions


@app.get("/quote")
def quote(pair: str = Query(..., description="Currency pair in the format BASE/QUOTE")):
    """Return a live quote for the requested forex pair."""

    if "/" not in pair:
        return {"error": "Pair must be in BASE/QUOTE format"}

    base, quote_symbol = pair.strip().upper().split("/", 1)
    result = _fetch_live_rate(base, quote_symbol)
    if "error" in result:
        return {"error": result["error"]}

    return {
        "pair": f"{base}/{quote_symbol}",
        "rate": result["rate"],
        "timestamp": result.get("timestamp"),
        "source": result.get("source"),
    }


# -----------------------
# Risk Amount
# -----------------------
@app.post("/risk")
def risk(trade: Trade):

    risk_amount = trade.capital * trade.risk_percent / 100

    return {
        "risk_amount": round(risk_amount,2)
    }


# -----------------------
# Profit / Loss
# -----------------------
@app.post("/profit")
def profit(trade: Trade):

    pip_value = 10 * trade.lot_size
    profit_loss = trade.pips * pip_value

    return {
        "profit_loss": round(profit_loss,2)
    }


# -----------------------
# Stop Loss Price
# -----------------------
@app.post("/stoploss")
def stoploss(trade: Trade):

    if trade.trade_type == "BUY":
        price = trade.entry_price - trade.stop_loss_pips
    else:
        price = trade.entry_price + trade.stop_loss_pips

    return {"stop_loss": round(price,5)}


# -----------------------
# Take Profit
# -----------------------
@app.post("/takeprofit")
def takeprofit(trade: Trade):

    if trade.trade_type == "BUY":
        price = trade.entry_price + trade.pips
    else:
        price = trade.entry_price - trade.pips

    return {"take_profit": round(price,5)}


# -----------------------
# Risk Reward
# -----------------------
@app.post("/riskreward")
def riskreward(trade: Trade):

    risk_amount = trade.capital * trade.risk_percent / 100
    reward = trade.pips * trade.lot_size * 10

    ratio = reward / risk_amount if risk_amount else 0

    return {
        "risk": round(risk_amount,2),
        "reward": round(reward,2),
        "ratio": round(ratio,2)
    }


# -----------------------
# Position Size
# -----------------------
@app.post("/positionsize")
def position_size(trade: Trade):

    risk_amount = trade.capital * trade.risk_percent / 100

    if trade.stop_loss_pips == 0:
        return {"error":"Stop loss cannot be zero"}

    lot = risk_amount / (trade.stop_loss_pips * 10)

    return {"lot_size": round(lot,2)}


# -----------------------
# Pip Value
# -----------------------
@app.post("/pipvalue")
def pipvalue(trade: Trade):

    value = trade.lot_size * 10

    return {"pip_value": round(value,2)}


# -----------------------
# Margin Requirement
# -----------------------
@app.post("/margin")
def margin(trade: Trade):

    leverage = trade.leverage or 100
    margin = (trade.lot_size * 100000) / leverage

    return {"required_margin": round(margin,2), "leverage": leverage}


# -----------------------
# Risk per pip
# -----------------------
@app.post("/riskperpip")
def risk_per_pip(trade: Trade):
    """Return how much $ risk each pip represents for the current stop-loss."""

    risk_amount = trade.capital * trade.risk_percent / 100

    if trade.stop_loss_pips == 0:
        return {"error": "Stop loss cannot be zero"}

    risk_per_pip = risk_amount / trade.stop_loss_pips
    pip_value = 10 * trade.lot_size

    return {
        "risk_per_pip": round(risk_per_pip, 2),
        "pip_value": round(pip_value, 2),
    }


# -----------------------
# Helpers
# -----------------------

def _compute_risk_reward(trade: Trade):
    risk_amount = trade.capital * trade.risk_percent / 100
    reward = trade.pips * trade.lot_size * 10
    ratio = reward / risk_amount if risk_amount else 0
    return risk_amount, reward, ratio


# -----------------------
# Trade Advice
# -----------------------
@app.post("/advice")
def advice(trade: Trade):

    risk_amount, reward, rr = _compute_risk_reward(trade)

    if risk_amount == 0:
        return {"advice": "Invalid trade"}

    if rr < 1.5:
        text = "Bad Trade ❌"
    elif rr < 2:
        text = "Average Trade ⚠️"
    else:
        text = "Good Trade ✅"

    return {"advice": text}


def ai_signal(trade: Trade):
    """Generate a simple rule-based 'AI' signal for the trade."""

    risk_amount, reward, rr = _compute_risk_reward(trade)
    sessions = _market_sessions()
    open_sessions = [s["name"] for s in sessions if s["open"]]

    if risk_amount == 0 or trade.pips == 0:
        return {
            "signal": "No signal",
            "confidence": 0,
            "notes": "Check your risk and pip values.",
            "model": "MockAI v1",
            "trend": "Neutral",
            "momentum": "N/A",
            "sessions": sessions,
            "open_sessions": open_sessions,
        }

    base_seed = hash(trade.pair + trade.trade_type)
    confidence = min(100, max(30, int(rr * 20)))

    # A basic “signal” based on risk-reward and trade direction
    if rr >= 2:
        signal = "Strong " + trade.trade_type
        notes = "The risk/reward profile is favorable."
    elif rr >= 1.25:
        signal = "Hold / Watch"
        notes = "The trade is borderline; consider the wider market context."
    else:
        signal = "Avoid"
        notes = "The risk/reward is weak; consider adjusting your stop or target."

    # Small random variation in confidence to feel “AI-like”
    noise = (base_seed % 11) - 5
    confidence = max(20, min(98, confidence + noise))

    # Simple trend / momentum estimation (pseudo-random but stable per pair/type)
    trend_seed = (base_seed % 3)
    trend = ["Bullish", "Neutral", "Bearish"][trend_seed]

    momentum_seed = (base_seed % 4)
    momentum = ["Strong", "Moderate", "Weak", "Volatile"][momentum_seed]

    return {
        "signal": signal,
        "confidence": confidence,
        "notes": notes,
        "model": "MockAI v1",
        "trend": trend,
        "momentum": momentum,
        "sessions": sessions,
        "open_sessions": open_sessions,
    }


# -----------------------
# Full trade summary
# -----------------------
@app.post("/signal")
def signal(trade: Trade):
    """Return a lightweight signal based on the current trade inputs."""

    return ai_signal(trade)


@app.post("/summary")
def summary(trade: Trade):
    """Return a full set of calculated values so the UI can render a single summary."""

    risk_amount = trade.capital * trade.risk_percent / 100
    pip_value = 10 * trade.lot_size
    profit_loss = trade.pips * pip_value

    if trade.trade_type == "BUY":
        stop_loss_price = trade.entry_price - trade.stop_loss_pips
        take_profit_price = trade.entry_price + trade.pips
    else:
        stop_loss_price = trade.entry_price + trade.stop_loss_pips
        take_profit_price = trade.entry_price - trade.pips

    reward = profit_loss
    ratio = reward / risk_amount if risk_amount else 0

    lot = None
    if trade.stop_loss_pips != 0:
        lot = risk_amount / (trade.stop_loss_pips * 10)

    leverage = trade.leverage or 100
    required_margin = (trade.lot_size * 100000) / leverage

    risk_per_pip = 0
    if trade.stop_loss_pips != 0:
        risk_per_pip = risk_amount / trade.stop_loss_pips

    return {
        "risk_amount": round(risk_amount, 2),
        "profit_loss": round(profit_loss, 2),
        "stop_loss": round(stop_loss_price, 5),
        "take_profit": round(take_profit_price, 5),
        "risk_reward_ratio": round(ratio, 2),
        "position_size": round(lot, 2) if lot is not None else None,
        "pip_value": round(pip_value, 2),
        "risk_per_pip": round(risk_per_pip, 2),
        "required_margin": round(required_margin, 2),
        "leverage": leverage,
        "advice": advice(trade)["advice"],
        "signal": ai_signal(trade),
    }
