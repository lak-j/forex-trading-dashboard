from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/")
def home():
    return {"message": "Forex Trading API Running 🚀"}


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

    leverage = 100
    margin = (trade.lot_size * 100000) / leverage

    return {"required_margin": round(margin,2)}


# -----------------------
# Trade Advice
# -----------------------
@app.post("/advice")
def advice(trade: Trade):

    risk = trade.capital * trade.risk_percent / 100
    reward = trade.pips * trade.lot_size * 10

    if risk == 0:
        return {"advice":"Invalid trade"}

    rr = reward / risk

    if rr < 1.5:
        text = "Bad Trade ❌"
    elif rr < 2:
        text = "Average Trade ⚠️"
    else:
        text = "Good Trade ✅"

    return {"advice": text}