import { useState } from "react";
import "./App.css";

function App() {
  const [pair, setPair] = useState("EUR/USD");
  const [capital, setCapital] = useState("");
  const [risk, setRisk] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [pips, setPips] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLossPips, setStopLossPips] = useState("");
  const [tradeType, setTradeType] = useState("");
  const [result, setResult] = useState("");

  // -------------------------
  // Backend URL (Codespaces)
  // -------------------------
  const BACKEND_URL = "https://cuddly-space-succotash-69p4w9jj4rv35454-8000.githubpreview.dev";

  // -------------------------
  // Validation
  // -------------------------
  const validateFields = () => {
    if (!capital || !risk || !lotSize || !pips || !entryPrice || !stopLossPips) {
      setResult("Please fill all fields");
      return false;
    }
    if (!tradeType) {
      setResult("Select BUY or SELL first");
      return false;
    }
    return true;
  };

  // -------------------------
  // Helper function to POST to backend
  // -------------------------
  const postToBackend = async (endpoint, body) => {
    try {
      const response = await fetch(`${BACKEND_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }

      return await response.json();
    } catch (error) {
      setResult("Error: " + error.message);
      return null;
    }
  };

  // -------------------------
  // Button handlers
  // -------------------------
  const calculateRisk = async () => {
    if (!validateFields()) return;

    const data = await postToBackend("calculate-risk", {
      pair,
      capital: parseFloat(capital),
      risk: parseFloat(risk),
      lot_size: parseFloat(lotSize),
      pips: parseFloat(pips),
      entry_price: parseFloat(entryPrice),
      stop_loss_pips: parseFloat(stopLossPips),
      trade_type: tradeType,
    });

    if (data) setResult("Risk Amount: $" + data.risk_amount);
  };

  const estimateTrade = async () => {
    if (!validateFields()) return;

    const data = await postToBackend("estimate-trade", {
      pair,
      capital: parseFloat(capital),
      risk: parseFloat(risk),
      lot_size: parseFloat(lotSize),
      pips: parseFloat(pips),
      entry_price: parseFloat(entryPrice),
      stop_loss_pips: parseFloat(stopLossPips),
      trade_type: tradeType,
    });

    if (data) setResult(`${data.pair} ${data.trade_type} Profit/Loss: $${data.profit_loss}`);
  };

  const calculateStopLoss = async () => {
    if (!validateFields()) return;

    const data = await postToBackend("calculate-stop-loss", {
      pair,
      capital: parseFloat(capital),
      risk: parseFloat(risk),
      lot_size: parseFloat(lotSize),
      pips: parseFloat(pips),
      entry_price: parseFloat(entryPrice),
      stop_loss_pips: parseFloat(stopLossPips),
      trade_type: tradeType,
    });

    if (data) {
      if (data.error) setResult(data.error);
      else setResult(`Stop Loss Price: ${data.stop_loss_price}`);
    }
  };

  const resetFields = () => {
    setCapital(""); 
    setRisk(""); 
    setLotSize(""); 
    setPips(""); 
    setEntryPrice(""); 
    setStopLossPips(""); 
    setTradeType(""); 
    setResult("");
  };

  // -------------------------
  // JSX
  // -------------------------
  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>
      <h1>Forex Trading Calculator</h1>

      <div>
        <label>Currency Pair: </label>
        <select value={pair} onChange={(e) => setPair(e.target.value)}>
          <option>EUR/USD</option>
          <option>GBP/USD</option>
          <option>USD/JPY</option>
          <option>XAU/USD</option>
          <option>AUD/USD</option>
        </select>
      </div><br/>

      <div>
        <label>Account Balance ($): </label>
        <input type="number" value={capital} onChange={(e) => setCapital(e.target.value)} />
      </div><br/>

      <div>
        <label>Risk %: </label>
        <input type="number" value={risk} onChange={(e) => setRisk(e.target.value)} />
      </div><br/>

      <div>
        <label>Lot Size: </label>
        <input type="number" value={lotSize} onChange={(e) => setLotSize(e.target.value)} />
      </div><br/>

      <div>
        <label>Pips: </label>
        <input type="number" value={pips} onChange={(e) => setPips(e.target.value)} />
      </div><br/>

      <div>
        <label>Entry Price: </label>
        <input type="number" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
      </div><br/>

      <div>
        <label>Stop Loss Pips: </label>
        <input type="number" value={stopLossPips} onChange={(e) => setStopLossPips(e.target.value)} />
      </div><br/>

      <div>
        <button onClick={() => setTradeType("BUY")} style={{ marginRight: "10px" }}>BUY</button>
        <button onClick={() => setTradeType("SELL")} style={{ marginRight: "10px" }}>SELL</button>
        <span> Selected: {tradeType}</span>
      </div><br/>

      <div>
        <button onClick={calculateRisk} style={{ marginRight: "10px" }}>Calculate Risk</button>
        <button onClick={estimateTrade} style={{ marginRight: "10px" }}>Estimate Profit</button>
        <button onClick={calculateStopLoss} style={{ marginRight: "10px" }}>Calculate Stop Loss</button>
        <button onClick={resetFields}>Reset</button>
      </div><br/>

      <h2>{result}</h2>
    </div>
  );
}

export default App;
