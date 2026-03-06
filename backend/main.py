from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TradeRequest(BaseModel):
    pair: str
    capital: float
    risk: float
    lot_size: float
    pips: float
    entry_price: float
    stop_loss_pips: float
    trade_type: str

@app.get("/")
def home():
    return {"message": "Backend running successfully"}

@app.post("/calculate-risk")
def calculate_risk(trade: TradeRequest):

    risk_amount = trade.capital * (trade.risk / 100)

    return {
        "risk_amount": round(risk_amount, 2)
    }

@app.post("/estimate-trade")
def estimate_trade(trade: TradeRequest):

    if trade.trade_type not in ["BUY", "SELL"]:
        return {"error": "Trade type must be BUY or SELL"}

    profit_loss = trade.pips * trade.lot_size * 10

    return {
        "pair": trade.pair,
        "trade_type": trade.trade_type,
        "profit_loss": round(profit_loss, 2)
    }

@app.post("/calculate-stop-loss")
def calculate_stop_loss(trade: TradeRequest):

    if trade.trade_type == "BUY":
        stop_loss_price = trade.entry_price - trade.stop_loss_pips

    elif trade.trade_type == "SELL":
        stop_loss_price = trade.entry_price + trade.stop_loss_pips

    else:
        return {"error": "Trade type must be BUY or SELL"}

    return {
        "stop_loss_price": round(stop_loss_price, 5)
    }