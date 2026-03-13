from fastapi import FastAPI, Query, HTTPException, Depends, status
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import urllib.request
import urllib.parse
import json
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from backend.models import Trade, User, UserLogin, Token

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
# Authentication Configuration
# -----------------------
SECRET_KEY = "your-secret-key-here"  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# In-memory user storage (use database in production)
fake_users_db = {
    "admin": {
        "username": "admin",
        "email": "admin@lake.com",
        "password": "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",  # SHA256 hash of "admin123"
        "is_admin": True,
    }
}

import hashlib

def get_password_hash(password):
    # For demo purposes, using a simple hash. In production, use proper password hashing
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password, hashed_password):
    return get_password_hash(plain_password) == hashed_password

def get_user(username: str):
    if username in fake_users_db:
        user_dict = fake_users_db[username]
        return User(**user_dict)

def authenticate_user(username: str, password: str):
    user = get_user(username)
    if not user:
        return False
    if not verify_password(password, user.password):
        return False
    return user

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user(username)
    if user is None:
        raise credentials_exception
    return user

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
    spread_pips: float = 0.0


@app.get("/")
def home():
    return {"message": "Forex Trading API Running 🚀"}

# -----------------------
# Authentication Endpoints
# -----------------------
@app.post("/register", response_model=Token)
async def register(user: User):
    if user.username in fake_users_db:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    fake_users_db[user.username] = {
        "username": user.username,
        "email": user.email,
        "password": hashed_password,
        "is_admin": False,  # New users are not admin by default
    }
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/admin/users", response_model=User)
async def create_user(user: User, current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if user.username in fake_users_db:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_password = get_password_hash(user.password)
    fake_users_db[user.username] = {
        "username": user.username,
        "email": user.email,
        "password": hashed_password,
        "is_admin": user.is_admin,
    }
    return User(**fake_users_db[user.username])

@app.get("/admin/users")
async def get_users(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    return list(fake_users_db.values())

@app.delete("/admin/users/{username}")
async def delete_user(username: str, current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    if username not in fake_users_db:
        raise HTTPException(status_code=404, detail="User not found")
    if username == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin user")
    del fake_users_db[username]
    return {"message": "User deleted"}

@app.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "email": current_user.email,
        "is_admin": current_user.is_admin
    }


price_history = {}


def _fetch_live_rate(base: str, quote: str):
    """Fetches a live forex rate using a free public API (open.er-api.com)."""
    base = base.upper()
    quote = quote.upper()

    if base == quote:
        return {"rate": 1.0, "source": "self"}

    url = f"https://open.er-api.com/v6/latest/{base}"

    try:
        with urllib.request.urlopen(url, timeout=6) as resp:
            raw = resp.read().decode("utf-8")
            data = json.loads(raw)
    except Exception as e:
        return {"error": f"Failed to fetch rate: {e}"}

    if data.get("result") != "success":
        return {"error": data.get("error-type", "Unknown API error")}

    rates = data.get("rates") or {}
    rate = rates.get(quote)

    if rate is None:
        return {"error": f"Rate for {base}/{quote} not found"}

    return {
        "rate": round(rate, 6),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "source": "open.er-api.com",
    }


def _record_price(pair: str, price: float, max_points: int = 60):
    """Store the most recent close prices for the given pair."""
    if not isinstance(price, (int, float)):
        return

    key = pair.upper()
    history = price_history.get(key, [])

    now = datetime.utcnow()
    # If the latest entry is within 60 seconds, replace it to avoid duplicates
    if history and (now - history[-1][0]).total_seconds() < 60:
        history[-1] = (now, price)
    else:
        history.append((now, price))

    price_history[key] = history[-max_points:]


def _get_price_history(pair: str):
    return [p for (_, p) in price_history.get(pair.upper(), [])]




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
def quote(pair: str = Query(..., description="Currency pair in the format BASE/QUOTE"), current_user: User = Depends(get_current_user)):
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
def risk(trade: Trade, current_user: User = Depends(get_current_user)):

    risk_amount = trade.capital * trade.risk_percent / 100

    return {
        "risk_amount": round(risk_amount,2)
    }


# -----------------------
# Profit / Loss
# -----------------------
@app.post("/profit")
def profit(trade: Trade, current_user: User = Depends(get_current_user)):

    pip_value = 10 * trade.lot_size
    profit_loss = trade.pips * pip_value

    return {
        "profit_loss": round(profit_loss,2)
    }


# -----------------------
# Stop Loss Price
# -----------------------
@app.post("/stoploss")
def stoploss(trade: Trade, current_user: User = Depends(get_current_user)):

    if trade.trade_type == "BUY":
        price = trade.entry_price - trade.stop_loss_pips
    else:
        price = trade.entry_price + trade.stop_loss_pips

    return {"stop_loss": round(price,5)}


# -----------------------
# Take Profit
# -----------------------
@app.post("/takeprofit")
def takeprofit(trade: Trade, current_user: User = Depends(get_current_user)):

    if trade.trade_type == "BUY":
        price = trade.entry_price + trade.pips
    else:
        price = trade.entry_price - trade.pips

    return {"take_profit": round(price,5)}


# -----------------------
# Risk Reward
# -----------------------
@app.post("/riskreward")
def riskreward(trade: Trade, current_user: User = Depends(get_current_user)):

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
def position_size(trade: Trade, current_user: User = Depends(get_current_user)):

    risk_amount = trade.capital * trade.risk_percent / 100

    if trade.stop_loss_pips == 0:
        return {"error":"Stop loss cannot be zero"}

    lot = risk_amount / (trade.stop_loss_pips * 10)

    return {"lot_size": round(lot,2)}


# -----------------------
# Pip Value
# -----------------------
@app.post("/pipvalue")
def pipvalue(trade: Trade, current_user: User = Depends(get_current_user)):

    value = trade.lot_size * 10

    return {"pip_value": round(value,2)}


# -----------------------
# Margin Requirement
# -----------------------
@app.post("/margin")
def margin(trade: Trade, current_user: User = Depends(get_current_user)):

    leverage = trade.leverage or 100
    margin = (trade.lot_size * 100000) / leverage

    return {"required_margin": round(margin,2), "leverage": leverage}


# -----------------------
# Risk per pip
# -----------------------
@app.post("/riskperpip")
def risk_per_pip(trade: Trade, current_user: User = Depends(get_current_user)):
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
def advice(trade: Trade, current_user: User = Depends(get_current_user)):

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


def _compute_sma(prices: list[float], period: int):
    if len(prices) < period:
        return None
    return sum(prices[-period:]) / period


def _compute_rsi(prices: list[float], period: int = 14):
    """Compute RSI using Wilder's smoothing method."""
    if len(prices) < period + 1:
        return None

    gains = []
    losses = []
    for i in range(1, len(prices)):
        delta = prices[i] - prices[i - 1]
        gains.append(max(delta, 0))
        losses.append(max(-delta, 0))

    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


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
# Break-even price
# -----------------------
@app.post("/breakeven")
def breakeven(trade: Trade, current_user: User = Depends(get_current_user)):
    """Return the price at which the trade would break even (after spread)."""

    # In forex, the spread is typically quoted in pips.
    # For a BUY trade you need the price to move up by the spread to cover the cost.
    # For a SELL trade you need the price to move down by the spread to cover the cost.
    if trade.trade_type == "BUY":
        price = trade.entry_price + trade.spread_pips
    else:
        price = trade.entry_price - trade.spread_pips

    return {"break_even_price": round(price, 5), "spread_pips": round(trade.spread_pips, 2)}


# -----------------------
# Full trade summary
# -----------------------
@app.post("/signal")
def signal(trade: Trade, current_user: User = Depends(get_current_user)):
    """Return a lightweight signal based on the current trade inputs."""

    return ai_signal(trade)


@app.post("/ta")
def ta(trade: Trade, current_user: User = Depends(get_current_user)):
    """Provide basic technical indicators (SMA, RSI) based on recent price history."""

    if "/" not in trade.pair:
        return {"error": "Pair must be in BASE/QUOTE format"}

    pair = trade.pair.strip().upper()
    base, quote_symbol = pair.split("/", 1)

    live = _fetch_live_rate(base, quote_symbol)
    if "error" in live:
        return {"error": live["error"]}

    live_price = live.get("rate")
    _record_price(pair, live_price)

    closes = _get_price_history(pair)
    sma_5 = _compute_sma(closes, 5)
    sma_10 = _compute_sma(closes, 10)
    sma_20 = _compute_sma(closes, 20)
    rsi_14 = _compute_rsi(closes, 14)

    latest = closes[-1] if closes else live_price

    recommendation = "Neutral"
    if rsi_14 is not None:
        if rsi_14 > 70:
            recommendation = "Overbought – consider selling or waiting"
        elif rsi_14 < 30:
            recommendation = "Oversold – consider buying or waiting"

    history = []
    for ts, price in price_history.get(pair, []):
        history.append({"timestamp": ts.isoformat() + "Z", "close": price})

    return {
        "pair": pair,
        "latest_price": latest,
        "live_price": live_price,
        "sma": {
            "5": sma_5,
            "10": sma_10,
            "20": sma_20,
        },
        "rsi": rsi_14,
        "recommendation": recommendation,
        "history": history,
    }


@app.post("/summary")
def summary(trade: Trade, current_user: User = Depends(get_current_user)):
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
