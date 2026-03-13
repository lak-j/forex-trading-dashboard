from pydantic import BaseModel
from typing import Optional

class Trade(BaseModel):
    pair: str
    capital: Optional[float] = 0
    risk_percent: Optional[float] = 0
    lot_size: Optional[float] = 0
    pips: Optional[float] = 0
    entry_price: Optional[float] = 0
    stop_loss_pips: Optional[float] = 0
    trade_type: str
    leverage: Optional[int] = 100
    spread_pips: Optional[float] = 0.0

class User(BaseModel):
    username: str
    email: str
    password: str
    is_admin: bool = False

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
