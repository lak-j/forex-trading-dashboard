import { useEffect, useRef, useState } from "react";

// Ensure we only ever load the TradingView script once per app lifetime.
let tradingViewPromise;

function loadTradingViewScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window object"));
  if (window.TradingView) return Promise.resolve(window.TradingView);
  if (tradingViewPromise) return tradingViewPromise;

  tradingViewPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-tradingview]");
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.TradingView) resolve(window.TradingView);
        else reject(new Error("TradingView library loaded but window.TradingView is missing."));
      });
      existing.addEventListener("error", () => reject(new Error("Unable to load TradingView library. Check your network and browser console.")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    // Don’t set crossOrigin here; TradingView’s CDN does not set Access-Control-Allow-Origin,
    // and adding crossOrigin can trigger CORS failures even though the script is usable.
    script.setAttribute("data-tradingview", "true");

    script.onload = () => {
      if (!window.TradingView) {
        reject(new Error("TradingView library loaded but widget constructor is missing."));
        return;
      }
      resolve(window.TradingView);
    };

    script.onerror = () => {
      reject(new Error("Unable to load TradingView library. Check your network and browser console."));
    };

    document.body.appendChild(script);
  });

  return tradingViewPromise;
}

function FallbackChart({ pair, interval }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth;
    const height = 260;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const points = Array.from({ length: 60 }, (_, i) => {
      const base = Math.sin((i / 60) * Math.PI * 2) * 0.02;
      const noise = (Math.random() - 0.5) * 0.015;
      return 1.12 + base + noise;
    });

    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    for (let y = 0; y <= 4; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, (height / 4) * y);
      ctx.lineTo(width, (height / 4) * y);
      ctx.stroke();
    }

    // line
    ctx.strokeStyle = "rgba(56, 189, 248, 1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - (value - 1.1) * (height * 3);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // header text
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "14px system-ui";
    ctx.fillText(`${pair} • ${interval}m`, 14, 24);
  }, [pair, interval]);

  return (
    <div
      style={{
        borderRadius: "14px",
        overflow: "hidden",
        background: "rgba(15, 23, 42, 0.8)",
        marginTop: "18px",
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%" }} />
    </div>
  );
}

function TradingChart({ pair, interval = "15", theme = "light" }) {
  const container = useRef();
  const [chartError, setChartError] = useState("");

  const symbolMap = {
    "EUR/USD": "FX:EURUSD",
    "GBP/USD": "FX:GBPUSD",
    "USD/JPY": "FX:USDJPY",
    "AUD/USD": "FX:AUDUSD",
    "USD/CAD": "FX:USDCAD",
    "USD/CHF": "FX:USDCHF",
    "NZD/USD": "FX:NZDUSD",
    "XAU/USD": "OANDA:XAUUSD",
  };

useEffect(() => {
    const symbol = symbolMap[pair] ?? "FX:EURUSD";

    if (!container.current) return;

    setChartError("");
    container.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.id = "tradingview-widget";
    widgetDiv.style.height = "400px";
    container.current.appendChild(widgetDiv);

    loadTradingViewScript()
      .then(() => {
        try {
          new window.TradingView.widget({
            container_id: "tradingview-widget",
            width: "100%",
            height: "100%",
            symbol,
            interval,
            timezone: "Etc/UTC",
            theme,
            style: "1",
            locale: "en",
            enable_publishing: false,
            allow_symbol_change: true,
            studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies"],
          });
        } catch (e) {
          setChartError(`TradingView initialization error: ${e.message}`);
        }
      })
      .catch((err) => {
        setChartError(err.message);
      });

    return () => {
      if (container.current) container.current.innerHTML = "";
    };
  }, [pair, interval, theme]);
return (
    <div style={{ marginTop: "20px" }}>
      {chartError ? (
        <>
          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "rgba(220,38,38,0.08)",
              color: "#b91c1c",
              border: "1px solid rgba(220,38,38,0.2)",
            }}
          >
            <strong>Chart failed to load</strong>
            <p style={{ margin: "8px 0 0" }}>{chartError}</p>
            <p style={{ margin: "8px 0 0", fontSize: "0.85rem", color: "rgba(0,0,0,0.6)" }}>
              The app is showing a simplified fallback chart while we recover.
            </p>
          </div>
          <FallbackChart pair={pair} interval={interval} />
        </>
      ) : (
        <div
          className="tradingview-widget-container"
          ref={container}
          style={{ height: "400px" }}
        />
      )}
    </div>
  );
}

export default TradingChart;