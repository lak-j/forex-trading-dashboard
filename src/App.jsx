import TradingChart from "./TradingChart";
import "./App.css";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_API = "https://cuddly-space-succotash-69p4w9jj4rv35454-8000.app.github.dev";

const PAIRS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "XAU/USD",
  "USD/CAD",
  "USD/CHF",
  "NZD/USD",
  "EUR/GBP",
  "GBP/JPY",
  "AUD/JPY",
  "USD/SGD",
];

const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const formatDecimal = (value, digits = 5) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toFixed(digits);
};

function App() {
  const [apiUrl] = useState(DEFAULT_API);
  const [pair, setPair] = useState("EUR/USD");
  const [capital, setCapital] = useState("1000");
  const [risk, setRisk] = useState("1");
  const [lot, setLot] = useState("0.1");
  const [pips, setPips] = useState("20");
  const [entry, setEntry] = useState("1.1000");
  const [stop, setStop] = useState("20");
  const [type, setType] = useState("BUY");

  const [activeTab, setActiveTab] = useState("calculator");
  const [theme, setTheme] = useState("light");
  const [autoCalculate, setAutoCalculate] = useState(false);
  const [chartInterval, setChartInterval] = useState("15");
  const [chartTheme, setChartTheme] = useState("light");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [resultLines, setResultLines] = useState(["No calculation yet."]);
  const [history, setHistory] = useState([]);

  const payload = useMemo(
    () => ({
      pair,
      capital: Number(capital),
      risk_percent: Number(risk),
      lot_size: Number(lot),
      pips: Number(pips),
      entry_price: Number(entry),
      stop_loss_pips: Number(stop),
      trade_type: type,
    }),
    [pair, capital, risk, lot, pips, entry, stop, type]
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("fx-trade-history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("fx-trade-history", JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history]);

  const addHistoryEntry = (action, dataLines) => {
    const entry = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      action,
      pair,
      type,
      lines: dataLines,
    };
    setHistory((prev) => [entry, ...prev].slice(0, 20));
  };

  const handleFetch = async (endpoint, label) => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      const lines = [];

      switch (endpoint) {
        case "risk":
          lines.push(`Risk Amount: ${formatCurrency(data.risk_amount)}`);
          break;
        case "profit":
          lines.push(`Estimated Profit/Loss: ${formatCurrency(data.profit_loss)}`);
          break;
        case "stoploss":
          lines.push(`Stop Loss Price: ${formatDecimal(data.stop_loss)}`);
          break;
        case "takeprofit":
          lines.push(`Take Profit Price: ${formatDecimal(data.take_profit)}`);
          break;
        case "riskreward":
          lines.push(`Risk: ${formatCurrency(data.risk)}`);
          lines.push(`Reward: ${formatCurrency(data.reward)}`);
          lines.push(`Ratio: ${data.ratio}`);
          break;
        case "positionsize":
          lines.push(`Recommended Lot Size: ${data.lot_size}`);
          break;
        case "pipvalue":
          lines.push(`Pip Value: ${formatCurrency(data.pip_value)} per pip`);
          break;
        case "margin":
          lines.push(`Required Margin: ${formatCurrency(data.required_margin)}`);
          break;
        case "advice":
          lines.push(`Trade Advice: ${data.advice}`);
          break;
        case "summary":
          if (data.error) {
            lines.push(`Error: ${data.error}`);
          } else {
            lines.push(`Risk Amount: ${formatCurrency(data.risk_amount)}`);
            lines.push(`Estimated Profit/Loss: ${formatCurrency(data.profit_loss)}`);
            lines.push(`Stop Loss Price: ${formatDecimal(data.stop_loss)}`);
            lines.push(`Take Profit Price: ${formatDecimal(data.take_profit)}`);
            lines.push(`Risk Reward Ratio: ${data.risk_reward_ratio}`);
            lines.push(`Position Size (lot): ${data.position_size}`);
            lines.push(`Pip Value: ${formatCurrency(data.pip_value)} per pip`);
            lines.push(`Margin Needed: ${formatCurrency(data.required_margin)}`);
            lines.push(`Advice: ${data.advice}`);
          }
          break;
        default:
          lines.push("Unknown endpoint");
      }

      setResultLines(lines);
      addHistoryEntry(label, lines);
      setActiveTab("calculator");
    } catch (err) {
      setError("Unable to connect to the backend.");
      setResultLines(["❌ Backend connection failed"]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCapital("1000");
    setRisk("1");
    setLot("0.1");
    setPips("20");
    setEntry("1.1000");
    setStop("20");
    setType("BUY");
    setResultLines(["No calculation yet."]);
    setError("");
  };

  const clearHistory = () => setHistory([]);

  const isValidNumber = (value, allowZero = false) => {
    const num = Number(value);
    if (Number.isNaN(num)) return false;
    if (!allowZero && num <= 0) return false;
    return true;
  };

  const canCalculate =
    isValidNumber(capital) &&
    isValidNumber(risk, true) &&
    isValidNumber(lot) &&
    isValidNumber(pips, true) &&
    isValidNumber(entry) &&
    isValidNumber(stop, true);

  useEffect(() => {
    if (!autoCalculate || !canCalculate) return;

    const timer = window.setTimeout(() => {
      handleFetch("summary", "Summary");
    }, 450);

    return () => window.clearTimeout(timer);
  }, [autoCalculate, canCalculate, payload]);

  return (
    <div className={`app ${theme}`}>
      <header className="app-header">
        <div className="app-title">
          <h1>Forex Trading Calculator</h1>
          <p className="app-subtitle">
            Estimate risk, position size and profit for your next trade.
          </p>
        </div>

        <div className="app-actions">
          <button
            className={`button ${theme === "dark" ? "button-primary" : "button-secondary"}`}
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>

          <button className="button button-secondary" onClick={resetForm}>
            Reset fields
          </button>

          <button
            className="button button-secondary"
            onClick={() => setActiveTab("chart")}
          >
            View chart
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="card card-main">
          <div className="tab-bar">
            <button
              className={`tab ${activeTab === "calculator" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("calculator")}
            >
              Calculator
            </button>
            <button
              className={`tab ${activeTab === "chart" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("chart")}
            >
              Chart
            </button>
            <button
              className={`tab ${activeTab === "history" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("history")}
            >
              History
            </button>
          </div>

          {activeTab === "calculator" && (
            <div className="card-content">
              <div className="toggle" style={{ marginBottom: "18px", maxWidth: "280px" }}>
                <button
                  className={`toggle-btn ${autoCalculate ? "active" : ""}`}
                  type="button"
                  onClick={() => setAutoCalculate((v) => !v)}
                >
                  {autoCalculate ? "Auto calculate ON" : "Auto calculate OFF"}
                </button>
              </div>

              <div className="grid">
                <div className="field">
                  <label>Currency pair</label>
                  <select value={pair} onChange={(e) => setPair(e.target.value)}>
                    {PAIRS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Account balance ($)</label>
                  <input
                    value={capital}
                    onChange={(e) => setCapital(e.target.value)}
                    placeholder="e.g. 2000"
                    inputMode="decimal"
                  />
                </div>

                <div className="field">
                  <label>Risk (%)</label>
                  <input
                    value={risk}
                    onChange={(e) => setRisk(e.target.value)}
                    placeholder="e.g. 1"
                    inputMode="decimal"
                  />
                </div>

                <div className="field">
                  <label>Lot size</label>
                  <input
                    value={lot}
                    onChange={(e) => setLot(e.target.value)}
                    placeholder="e.g. 0.10"
                    inputMode="decimal"
                  />
                </div>

                <div className="field">
                  <label>Target pips</label>
                  <input
                    value={pips}
                    onChange={(e) => setPips(e.target.value)}
                    placeholder="e.g. 20"
                    inputMode="decimal"
                  />
                </div>

                <div className="field">
                  <label>Entry price</label>
                  <input
                    value={entry}
                    onChange={(e) => setEntry(e.target.value)}
                    placeholder="e.g. 1.1000"
                    inputMode="decimal"
                  />
                </div>

                <div className="field">
                  <label>Stop loss (pips)</label>
                  <input
                    value={stop}
                    onChange={(e) => setStop(e.target.value)}
                    placeholder="e.g. 20"
                    inputMode="decimal"
                  />
                </div>

                <div className="field field--full">
                  <label>Trade type</label>
                  <div className="toggle">
                    <button
                      type="button"
                      className={`toggle-btn ${type === "BUY" ? "active" : ""}`}
                      onClick={() => setType("BUY")}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn ${type === "SELL" ? "active" : ""}`}
                      onClick={() => setType("SELL")}
                    >
                      SELL
                    </button>
                  </div>
                </div>
              </div>

              <div className="button-row">
                <button
                  className="button button-primary"
                  onClick={() => handleFetch("summary", "Summary")}
                  disabled={!canCalculate || loading}
                >
                  Calculate all
                </button>
                <button
                  className="button"
                  onClick={() => handleFetch("risk", "Risk")}
                  disabled={!canCalculate || loading}
                >
                  Risk
                </button>
                <button
                  className="button"
                  onClick={() => handleFetch("profit", "Profit")}
                  disabled={!canCalculate || loading}
                >
                  Profit
                </button>
                <button
                  className="button"
                  onClick={() => handleFetch("riskreward", "Risk / Reward")}
                  disabled={!canCalculate || loading}
                >
                  R/R
                </button>
              </div>

              <div className="result-box">
                <div className="result-header">
                  <h3>Result</h3>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => {
                      navigator.clipboard
                        .writeText(resultLines.join("\n"))
                        .catch(() => {});
                    }}
                  >
                    Copy
                  </button>
                </div>

                {error && <p className="error">{error}</p>}

                <div className="result-list">
                  {resultLines.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>

                <div className="hint">
                  Tip: Use “Calculate all” to get a full trade breakdown in one click.
                </div>
              </div>
            </div>
          )}

          {activeTab === "chart" && (
            <div className="card-content">
              <div className="grid">
                <div className="field">
                  <label>Chart interval</label>
                  <select value={chartInterval} onChange={(e) => setChartInterval(e.target.value)}>
                    <option value="1">1m</option>
                    <option value="5">5m</option>
                    <option value="15">15m</option>
                    <option value="60">1h</option>
                    <option value="240">4h</option>
                    <option value="D">1d</option>
                  </select>
                </div>

                <div className="field">
                  <label>Chart theme</label>
                  <select value={chartTheme} onChange={(e) => setChartTheme(e.target.value)}>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </div>

              <TradingChart pair={pair} interval={chartInterval} theme={chartTheme} />
            </div>
          )}

          {activeTab === "history" && (
            <div className="card-content">
              <div className="history-header">
                <h3>Recent calculations</h3>
                <button className="button button-secondary" onClick={clearHistory}>
                  Clear
                </button>
              </div>

              {history.length === 0 ? (
                <p className="empty">No history yet — run a calculation.</p>
              ) : (
                <ul className="history-list">
                  {history.map((item) => (
                    <li key={item.id} className="history-item">
                      <div className="history-meta">
                        <div>
                          <strong>{item.action}</strong> • {item.pair} • {item.type}
                        </div>
                        <time dateTime={item.createdAt}>
                          {new Date(item.createdAt).toLocaleString()}
                        </time>
                      </div>
                      <div className="history-lines">
                        {item.lines.map((line, idx) => (
                          <p key={idx}>{line}</p>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <aside className="card card-aside">
          <h3>Quick tips</h3>
          <ul className="tips">
            <li>
              <strong>Keep risk low</strong> — most pros risk 1–2% per trade.
            </li>
            <li>
              <strong>Use stop-loss</strong> and adjust lot size to match your risk.
            </li>
            <li>
              Compare calculated <strong>R/R ratio</strong> to your target (e.g., 2:1).
            </li>
            <li>
              Switch to <strong>Chart</strong> tab to see the selected pair live.
            </li>
          </ul>
          <p className="footer-note">
             Calculations are estimates. Always confirm with your broker.
          </p>
        </aside>
      </main>

      
    </div>
  );
}

export default App;
