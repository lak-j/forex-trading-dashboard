import TradingChart from "./TradingChart";
import logo from "./logo.svg";
import "./App.css";
import { useEffect, useMemo, useRef, useState } from "react";

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

function ProfitChart({ history }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.clientWidth;
    const height = 220;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const points = history
      .filter((item) => typeof item.profitLoss === "number")
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((item) => item.profitLoss);

    if (points.length === 0) {
      ctx.fillStyle = "rgba(31, 41, 55, 0.75)";
      ctx.font = "14px system-ui";
      ctx.fillText("No profit history yet.", 14, 40);
      return;
    }

    const cumulative = [];
    let sum = 0;
    points.forEach((p) => {
      sum += p;
      cumulative.push(sum);
    });

    const min = Math.min(...cumulative, 0);
    const max = Math.max(...cumulative, 0);
    const range = max - min || 1;

    // grid
    ctx.strokeStyle = "rgba(31, 41, 55, 0.12)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, (height / 4) * i);
      ctx.lineTo(width, (height / 4) * i);
      ctx.stroke();
    }

    // line
    ctx.strokeStyle = "rgba(59, 130, 246, 1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    cumulative.forEach((value, index) => {
      const x = (index / (cumulative.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // axis labels
    ctx.fillStyle = "rgba(31, 41, 55, 0.75)";
    ctx.font = "12px system-ui";
    ctx.fillText(`Start: ${formatCurrency(cumulative[0])}`, 12, height - 12);
    ctx.fillText(`End: ${formatCurrency(cumulative[cumulative.length - 1])}`, width - 120, height - 12);
  }, [history]);

  return (
    <div className="profit-chart">
      <canvas ref={canvasRef} style={{ width: "100%" }} />
    </div>
  );
}

function App() {
  const [apiUrl] = useState(DEFAULT_API);
  const [pair, setPair] = useState("EUR/USD");
  const [capital, setCapital] = useState("100");
  const [risk, setRisk] = useState("1");
  const [lot, setLot] = useState("0.01");
  const [pips, setPips] = useState("20");
  const [entry, setEntry] = useState("1.1000");
  const [stop, setStop] = useState("2");
  const [type, setType] = useState("BUY");
  const [leverage, setLeverage] = useState("100");

  const [activeTab, setActiveTab] = useState("calculator");
  const [theme, setTheme] = useState("light");
  const [highContrast, setHighContrast] = useState(false);
  const [autoCalculate, setAutoCalculate] = useState(false);
  const [chartInterval, setChartInterval] = useState("15");
  const [chartTheme, setChartTheme] = useState("light");
  const [analytics, setAnalytics] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [resultLines, setResultLines] = useState(["No calculation yet."]);
  const [summaryData, setSummaryData] = useState(null);
  const [signalData, setSignalData] = useState(null);
  const [history, setHistory] = useState([]);

  const [touched, setTouched] = useState({
    capital: false,
    risk: false,
    lot: false,
    pips: false,
    entry: false,
    stop: false,
    leverage: false,
  });

  const [clipboardMessage, setClipboardMessage] = useState("");

  const isValidLeverage = (value) => {
    const num = Number(value);
    return Number.isInteger(num) && num > 0;
  };

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
      leverage: Number(leverage),
    }),
    [pair, capital, risk, lot, pips, entry, stop, type, leverage]
  );

  const computeAnalytics = (historyItems) => {
    const profits = historyItems
      .filter((item) => typeof item.profitLoss === "number")
      .map((item) => item.profitLoss);

    const totalProfit = profits.reduce((sum, value) => sum + value, 0);
    const wins = profits.filter((p) => p > 0).length;
    const losses = profits.filter((p) => p < 0).length;
    const avg = profits.length ? totalProfit / profits.length : 0;

    return {
      totalProfit,
      trades: profits.length,
      wins,
      losses,
      avg,
    };
  };

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("fx-trade-history");
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
        setAnalytics(computeAnalytics(parsed));
      }

      const storedSettings = window.localStorage.getItem("fx-trade-settings");
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        if (parsed.pair) setPair(parsed.pair);
        if (parsed.capital) setCapital(parsed.capital);
        if (parsed.risk) setRisk(parsed.risk);
        if (parsed.lot) setLot(parsed.lot);
        if (parsed.pips) setPips(parsed.pips);
        if (parsed.entry) setEntry(parsed.entry);
        if (parsed.stop) setStop(parsed.stop);
        if (parsed.type) setType(parsed.type);
        if (parsed.leverage) setLeverage(parsed.leverage);
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.highContrast) setHighContrast(parsed.highContrast);
        if (parsed.chartInterval) setChartInterval(parsed.chartInterval);
        if (parsed.chartTheme) setChartTheme(parsed.chartTheme);
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

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "fx-trade-settings",
        JSON.stringify({
          pair,
          capital,
          risk,
          lot,
          pips,
          entry,
          stop,
          type,
          leverage,
          theme,
          highContrast,
          chartInterval,
          chartTheme,
        })
      );
    } catch {
      // ignore
    }
  }, [
    pair,
    capital,
    risk,
    lot,
    pips,
    entry,
    stop,
    type,
    leverage,
    theme,
    highContrast,
    chartInterval,
    chartTheme,
  ]);

  const addHistoryEntry = (action, dataLines, meta = {}) => {
    const entry = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      action,
      pair,
      type,
      leverage,
      lines: dataLines,
      ...meta,
    };

    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 20);

      // Update analytics cache
      const profitRecords = next
        .filter((item) => typeof item.profitLoss === "number")
        .map((item) => item.profitLoss);

      const totalProfit = profitRecords.reduce((sum, v) => sum + v, 0);
      const wins = profitRecords.filter((v) => v > 0).length;
      const losses = profitRecords.filter((v) => v < 0).length;
      const avg = profitRecords.length ? totalProfit / profitRecords.length : 0;

      setAnalytics({
        totalProfit,
        trades: profitRecords.length,
        wins,
        losses,
        avg,
      });

      return next;
    });
  };

  const handleFetch = async (endpoint, label, options = {}) => {
    const { applyToForm = false } = options;

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

      let historyMeta = {};

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
          if (applyToForm && data.lot_size != null) {
            setLot(String(data.lot_size));
          }
          break;
        case "pipvalue":
          lines.push(`Pip Value: ${formatCurrency(data.pip_value)} per pip`);
          break;
        case "riskperpip":
          lines.push(`Risk per pip: ${formatCurrency(data.risk_per_pip)}`);
          lines.push(`Pip value: ${formatCurrency(data.pip_value)} per pip`);
          break;
        case "margin":
          lines.push(`Required Margin: ${formatCurrency(data.required_margin)}`);
          lines.push(`(Using ${leverage}x leverage)`);
          break;
        case "advice":
          lines.push(`Trade Advice: ${data.advice}`);
          break;
        case "signal":
          setSignalData(data);
          lines.push(`Signal: ${data.signal}`);
          if (data.confidence != null) {
            lines.push(`Confidence: ${data.confidence}%`);
          }
          if (data.trend) {
            lines.push(`Trend: ${data.trend}`);
          }
          if (data.momentum) {
            lines.push(`Momentum: ${data.momentum}`);
          }
          if (data.open_sessions) {
            lines.push(`Open sessions: ${data.open_sessions.join(", ") || "None"}`);
          }
          if (data.notes) {
            lines.push(`Notes: ${data.notes}`);
          }
          if (data.model) {
            lines.push(`Model: ${data.model}`);
          }
          break;
        case "summary":
          if (data.error) {
            lines.push(`Error: ${data.error}`);
            setSummaryData(null);
            setSignalData(null);
          } else {
            setSummaryData(data);
            setSignalData(data.signal ?? null);
            lines.push(`Risk Amount: ${formatCurrency(data.risk_amount)}`);
            lines.push(`Estimated Profit/Loss: ${formatCurrency(data.profit_loss)}`);
            lines.push(`Stop Loss Price: ${formatDecimal(data.stop_loss)}`);
            lines.push(`Take Profit Price: ${formatDecimal(data.take_profit)}`);
            lines.push(`Risk Reward Ratio: ${data.risk_reward_ratio}`);
            lines.push(`Position Size (lot): ${data.position_size}`);
            lines.push(`Pip Value: ${formatCurrency(data.pip_value)} per pip`);
            if (data.risk_per_pip != null) {
              lines.push(`Risk per pip: ${formatCurrency(data.risk_per_pip)}`);
            }
            lines.push(`Margin Needed: ${formatCurrency(data.required_margin)} (x${data.leverage})`);
            lines.push(`Advice: ${data.advice}`);
            if (data.signal) {
              lines.push(`Signal: ${data.signal}`);
              if (data.signal?.confidence != null) {
                lines.push(`Signal confidence: ${data.signal.confidence}%`);
              }
            }

            historyMeta = {
              profitLoss: data.profit_loss,
              riskAmount: data.risk_amount,
            };
          }
          break;
        default:
          lines.push("Unknown endpoint");
      }

      setResultLines(lines);
      addHistoryEntry(label, lines, historyMeta);
      setActiveTab("calculator");
    } catch (err) {
      setError("Unable to connect to the backend.");
      setResultLines(["❌ Backend connection failed"]);
      setSummaryData(null);
      setSignalData(null);
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
    setLeverage("100");
    setHighContrast(false);
    setResultLines(["No calculation yet."]);
    setSummaryData(null);
    setSignalData(null);
    setTouched({
      capital: false,
      risk: false,
      lot: false,
      pips: false,
      entry: false,
      stop: false,
      leverage: false,
    });
    setError("");
  };

  const clearHistory = () => {
    setHistory([]);
    setAnalytics(null);
  };

  const isValidNumber = (value, allowZero = false) => {
    const num = Number(value);
    if (Number.isNaN(num)) return false;
    if (!allowZero && num <= 0) return false;
    return true;
  };

  const sessions = useMemo(() => {
    const now = currentTime;
    const utcHour = now.getUTCHours();

    const ranges = [
      { name: "Sydney", start: 22, end: 7, label: "22:00–07:00 UTC" },
      { name: "Tokyo", start: 0, end: 9, label: "00:00–09:00 UTC" },
      { name: "London", start: 7, end: 16, label: "07:00–16:00 UTC" },
      { name: "New York", start: 12, end: 21, label: "12:00–21:00 UTC" },
    ];

    const isOpen = (hour, start, end) => {
      if (start < end) return hour >= start && hour < end;
      return hour >= start || hour < end;
    };

    return ranges.map((session) => ({
      ...session,
      open: isOpen(utcHour, session.start, session.end),
    }));
  }, [currentTime]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const canCalculate =
    isValidNumber(capital) &&
    isValidNumber(risk, true) &&
    isValidNumber(lot) &&
    isValidNumber(pips, true) &&
    isValidNumber(entry) &&
    isValidNumber(stop, true) &&
    isValidLeverage(leverage);

  useEffect(() => {
    if (!autoCalculate || !canCalculate) return;

    const timer = window.setTimeout(() => {
      handleFetch("summary", "Summary");
    }, 450);

    return () => window.clearTimeout(timer);
  }, [autoCalculate, canCalculate, payload]);

  return (
    <div className={`app ${theme} ${highContrast ? "high-contrast" : ""}`}>
      <header className="app-header">
        <div className="app-brand">
          <div className="app-logo" aria-hidden="true">
            <div className="logo-icon">
              <img src={logo} alt="App logo" className="logo-img" />
            </div>
          </div>

          <div className="app-title">
            <h1>Forex Trading App</h1>
            <p className="app-subtitle">
              Estimate risk, position size and profit for your next trade.
            </p>
          </div>
        </div>

        <div className="app-actions">
          <button
            className={`button ${theme === "dark" ? "button-primary" : "button-secondary"}`}
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>

          {theme === "dark" ? (
            <button
              className={`button ${highContrast ? "button-primary" : "button-secondary"}`}
              onClick={() => setHighContrast((v) => !v)}
            >
              {highContrast ? "High contrast ON" : "High contrast OFF"}
            </button>
          ) : null}

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
            <button
              className={`tab ${activeTab === "signals" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("signals")}
            >
              Signals
            </button>
            <button
              className={`tab ${activeTab === "analytics" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("analytics")}
            >
              Analytics
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
                    onChange={(e) => {
                      setCapital(e.target.value);
                      setSummaryData(null);
                      setSignalData(null);
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, capital: true }))}
                    className={
                      touched.capital && !isValidNumber(capital) ? "invalid" : ""
                    }
                    placeholder="e.g. 2000"
                    inputMode="decimal"
                  />
                  {touched.capital && !isValidNumber(capital) && (
                    <div className="field-error">Enter a valid amount</div>
                  )}
                </div>

                <div className="field">
                  <label>Risk (%)</label>
                  <input
                    value={risk}
                    onChange={(e) => {
                      setRisk(e.target.value);
                      setSummaryData(null);
                      setSignalData(null);
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, risk: true }))}
                    className={
                      touched.risk && !isValidNumber(risk, true) ? "invalid" : ""
                    }
                    placeholder="e.g. 1"
                    inputMode="decimal"
                  />
                  {touched.risk && !isValidNumber(risk, true) && (
                    <div className="field-error">Enter a valid risk %</div>
                  )}
                </div>

                <div className="field">
                  <label>Lot size</label>
                  <input
                    value={lot}
                    onChange={(e) => {
                      setLot(e.target.value);
                      setSummaryData(null);
                      setSignalData(null);
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, lot: true }))}
                    className={touched.lot && !isValidNumber(lot) ? "invalid" : ""}
                    placeholder="e.g. 0.10"
                    inputMode="decimal"
                  />
                  {touched.lot && !isValidNumber(lot) && (
                    <div className="field-error">Enter a valid lot size</div>
                  )}
                </div>

                <div className="field">
                  <label>Leverage</label>
                  <select
                    value={leverage}
                    onChange={(e) => {
                      setLeverage(e.target.value);
                      setSummaryData(null);
                      setSignalData(null);
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, leverage: true }))}
                    className={
                      touched.leverage && !isValidLeverage(leverage) ? "invalid" : ""
                    }
                  >
                    <option value="10">10x</option>
                    <option value="20">20x</option>
                    <option value="50">50x</option>
                    <option value="100">100x</option>
                    <option value="200">200x</option>
                    <option value="500">500x</option>
                  </select>
                  {touched.leverage && !isValidLeverage(leverage) && (
                    <div className="field-error">Choose a leverage</div>
                  )}
                </div>

                <div className="field">
                  <label>Target pips</label>
                  <input
                    value={pips}
                    onChange={(e) => {
                      setPips(e.target.value);
                      setSummaryData(null);
                      setSignalData(null);
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, pips: true }))}
                    className={
                      touched.pips && !isValidNumber(pips, true) ? "invalid" : ""
                    }
                    placeholder="e.g. 20"
                    inputMode="decimal"
                  />
                  {touched.pips && !isValidNumber(pips, true) && (
                    <div className="field-error">Enter a valid pip count</div>
                  )}
                </div>

                <div className="field">
                  <label>Entry price</label>
                  <input
                    value={entry}
                    onChange={(e) => {
                      setEntry(e.target.value);
                      setSummaryData(null);
                      setSignalData(null);
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, entry: true }))}
                    className={
                      touched.entry && !isValidNumber(entry) ? "invalid" : ""
                    }
                    placeholder="e.g. 1.1000"
                    inputMode="decimal"
                  />
                  {touched.entry && !isValidNumber(entry) && (
                    <div className="field-error">Enter a valid price</div>
                  )}
                </div>

                <div className="field">
                  <label>Stop loss (pips)</label>
                  <input
                    value={stop}
                    onChange={(e) => {
                      setStop(e.target.value);
                      setSummaryData(null);
                      setSignalData(null);
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, stop: true }))}
                    className={
                      touched.stop && !isValidNumber(stop, true) ? "invalid" : ""
                    }
                    placeholder="e.g. 20"
                    inputMode="decimal"
                  />
                  {touched.stop && !isValidNumber(stop, true) && (
                    <div className="field-error">Enter a valid stop loss</div>
                  )}
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
                <button
                  className="button"
                  onClick={() => handleFetch("positionsize", "Auto-size lot", { applyToForm: true })}
                  disabled={!canCalculate || loading}
                >
                  Auto-size
                </button>
                <button
                  className="button"
                  onClick={() => handleFetch("advice", "Advice")}
                  disabled={!canCalculate || loading}
                >
                  Advice
                </button>
                <button
                  className="button"
                  onClick={() => handleFetch("signal", "Signal")}
                  disabled={!canCalculate || loading}
                >
                  Signal
                </button>
              </div>

              {summaryData && (
                <div className="stat-grid" aria-label="Quick trade insights">
                  <div className="stat-card">
                    <div className="stat-title">Risk</div>
                    <div className="stat-value">{formatCurrency(summaryData.risk_amount)}</div>
                    <div className="stat-sub">at {risk}% of balance</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-title">Reward</div>
                    <div className="stat-value">{formatCurrency(summaryData.profit_loss)}</div>
                    <div className="stat-sub">Target • {pips} pips</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-title">R/R ratio</div>
                    <div className="stat-value">{summaryData.risk_reward_ratio}</div>
                    <div className="stat-sub">better than 2:1?</div>
                  </div>

                  {summaryData.risk_per_pip != null && (
                    <div className="stat-card">
                      <div className="stat-title">Risk / pip</div>
                      <div className="stat-value">
                        {formatCurrency(summaryData.risk_per_pip)}
                      </div>
                      <div className="stat-sub">per stop‑loss pip</div>
                    </div>
                  )}

                  <div className="stat-card">
                    <div className="stat-title">Margin</div>
                    <div className="stat-value">{formatCurrency(summaryData.required_margin)}</div>
                    <div className="stat-sub">approx. requirement</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-title">Leverage</div>
                    <div className="stat-value">x{leverage}</div>
                    <div className="stat-sub">used for margin</div>
                  </div>

                  {summaryData.signal && (
                    <div className="stat-card">
                      <div className="stat-title">AI Signal</div>
                      <div className="stat-value">{summaryData.signal.signal}</div>
                      {summaryData.signal.confidence != null ? (
                        <div className="stat-sub">
                          {summaryData.signal.confidence}% confidence
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              <div className="result-box">
                <div className="result-header">
                  <h3>Result</h3>
                  <div className="result-actions">
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(resultLines.join("\n"));
                          setClipboardMessage("Copied!");
                          window.setTimeout(() => setClipboardMessage(""), 1800);
                        } catch {
                          setClipboardMessage("Unable to copy");
                          window.setTimeout(() => setClipboardMessage(""), 1800);
                        }
                      }}
                    >
                      Copy
                    </button>
                    {clipboardMessage ? (
                      <span className="clipboard-badge">{clipboardMessage}</span>
                    ) : null}
                  </div>
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
                          <strong>{item.action}</strong> • {item.pair} • {item.type} • x{item.leverage ?? 100}
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

          {activeTab === "signals" && (
            <div className="card-content">
              <h3>Signal dashboard</h3>

              {!signalData ? (
                <p className="empty">
                  No signal generated yet — click the Signal button in Calculator.
                </p>
              ) : (
                <div className="profit-analytics">
                  <div className="stat-row">
                    <div className="stat-card">
                      <div className="stat-title">Signal</div>
                      <div className="stat-value">{signalData.signal}</div>
                      <div className="stat-sub">
                        {signalData.notes ?? ""}
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-title">Confidence</div>
                      <div className="stat-value">{signalData.confidence ?? "—"}%</div>
                      <div className="stat-sub">Model: {signalData.model}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-title">Trend</div>
                      <div className="stat-value">{signalData.trend ?? "—"}</div>
                      <div className="stat-sub">Basic direction estimate</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-title">Momentum</div>
                      <div className="stat-value">{signalData.momentum ?? "—"}</div>
                      <div className="stat-sub">Action pace</div>
                    </div>
                  </div>

                  {signalData.sessions ? (
                    <div className="session-grid" style={{ marginTop: "18px" }}>
                      {signalData.sessions.map((s) => (
                        <div
                          key={s.name}
                          className={`session-card ${s.open ? "open" : ""}`}
                        >
                          <div className="session-name">{s.name}</div>
                          <div className="session-meta">{s.label}</div>
                          <div className="session-status">
                            {s.open ? "Open now" : "Closed"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="card-content">
              <h3>Profit analytics</h3>

              {!analytics || analytics.trades === 0 ? (
                <p className="empty">No trade profits saved yet — calculate a summary to start tracking.</p>
              ) : (
                <div className="profit-analytics">
                  <div className="stat-row">
                    <div className="stat-card">
                      <div className="stat-title">Total P/L</div>
                      <div className="stat-value">{formatCurrency(analytics.totalProfit)}</div>
                      <div className="stat-sub">Across {analytics.trades} trades</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-title">Average P/L</div>
                      <div className="stat-value">{formatCurrency(analytics.avg)}</div>
                      <div className="stat-sub">Per trade</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-title">Win rate</div>
                      <div className="stat-value">
                        {analytics.trades > 0
                          ? `${Math.round((analytics.wins / analytics.trades) * 100)}%`
                          : "—"}
                      </div>
                      <div className="stat-sub">Wins / total</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-title">Loss count</div>
                      <div className="stat-value">{analytics.losses}</div>
                      <div className="stat-sub">Trades below breakeven</div>
                    </div>
                  </div>

                  <ProfitChart history={history} />
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="card card-aside">
          <h3>Market sessions</h3>
          <div className="session-grid" aria-label="Forex market sessions">
            {sessions.map((session) => (
              <div
                key={session.name}
                className={`session-card ${session.open ? "open" : ""}`}
              >
                <div className="session-name">{session.name}</div>
                <div className="session-meta">{session.label}</div>
                <div className="session-status">
                  {session.open ? "Open now" : "Closed"}
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: "20px" }}>Quick tips</h3>
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
