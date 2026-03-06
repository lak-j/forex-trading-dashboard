from pydantic import BaseModel

class TradeRequest(BaseModel):
    pair: str
    capital: Optional[float] = 0
    risk: Optional[float] = 0
    lot_size: Optional[float] = 0
    pips: Optional[float] = 0
    entry_price: Optional[float] = 0
    stop_loss_pips: Optional[float] = 0
    trade_type: str
