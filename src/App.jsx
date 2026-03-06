import { useState } from "react";

function App() {

  const BACKEND_URL = "https://cuddly-space-succotash-69p4w9jj4rv35454-8000.app.github.dev";

  const [pair, setPair] = useState("EUR/USD");
  const [capital, setCapital] = useState("");
  const [risk, setRisk] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [pips, setPips] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLossPips, setStopLossPips] = useState("");
  const [tradeType, setTradeType] = useState("");
  const [result, setResult] = useState("");

  const sendRequest = async (endpoint) => {

    const body = {
      pair,
      capital: Number(capital),
      risk: Number(risk),
      lot_size: Number(lotSize),
      pips: Number(pips),
      entry_price: Number(entryPrice),
      stop_loss_pips: Number(stopLossPips),
      trade_type: tradeType
    };

    try {

      const res = await fetch(`${BACKEND_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (endpoint === "calculate-risk") {
        setResult("Risk Amount: $" + data.risk_amount);
      }

      if (endpoint === "estimate-trade") {
        setResult(`Profit/Loss: $${data.profit_loss}`);
      }

      if (endpoint === "calculate-stop-loss") {
        setResult("Stop Loss Price: " + data.stop_loss_price);
      }

    } catch (err) {
      setResult("Backend connection failed");
      console.log(err);
    }
  };

  return (
    <div style={{padding:"40px",fontFamily:"Arial"}}>

      <h1>Forex Trading Calculator</h1>

      <br/>

      <select value={pair} onChange={(e)=>setPair(e.target.value)}>
        <option>EUR/USD</option>
        <option>GBP/USD</option>
        <option>USD/JPY</option>
        <option>XAU/USD</option>
      </select>

      <br/><br/>

      <input placeholder="Capital" type="number"
      value={capital}
      onChange={(e)=>setCapital(e.target.value)}/>

      <br/><br/>

      <input placeholder="Risk %" type="number"
      value={risk}
      onChange={(e)=>setRisk(e.target.value)}/>

      <br/><br/>

      <input placeholder="Lot Size" type="number"
      value={lotSize}
      onChange={(e)=>setLotSize(e.target.value)}/>

      <br/><br/>

      <input placeholder="Pips" type="number"
      value={pips}
      onChange={(e)=>setPips(e.target.value)}/>

      <br/><br/>

      <input placeholder="Entry Price" type="number"
      value={entryPrice}
      onChange={(e)=>setEntryPrice(e.target.value)}/>

      <br/><br/>

      <input placeholder="Stop Loss Pips" type="number"
      value={stopLossPips}
      onChange={(e)=>setStopLossPips(e.target.value)}/>

      <br/><br/>

      <button onClick={()=>setTradeType("BUY")}>BUY</button>
      <button onClick={()=>setTradeType("SELL")}>SELL</button>

      <p>Trade: {tradeType}</p>

      <br/>

      <button onClick={()=>sendRequest("calculate-risk")}>Calculate Risk</button>

      <button onClick={()=>sendRequest("estimate-trade")}>
        Estimate Profit
      </button>

      <button onClick={()=>sendRequest("calculate-stop-loss")}>
        Stop Loss
      </button>

      <br/><br/>

      <h2>{result}</h2>

    </div>
  );
}

export default App;