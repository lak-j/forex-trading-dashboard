import { useEffect, useRef } from "react";

function TradingChart({ pair }) {

const container = useRef();

const symbolMap = {
"EUR/USD": "FX:EURUSD",
"GBP/USD": "FX:GBPUSD",
"USD/JPY": "FX:USDJPY",
"AUD/USD": "FX:AUDUSD",
"XAU/USD": "OANDA:XAUUSD"
};

useEffect(() => {

container.current.innerHTML = "";

const script = document.createElement("script");

script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

script.type = "text/javascript";

script.async = true;

script.innerHTML = JSON.stringify({
symbol: symbolMap[pair],
interval: "15",
timezone: "Etc/UTC",
theme: "light",
style: "1",
locale: "en",
allow_symbol_change: true,
studies: ["RSI@tv-basicstudies","MACD@tv-basicstudies"],
autosize: true
});

container.current.appendChild(script);

}, [pair]);

return (

<div style={{marginTop:"20px"}}>

<div
className="tradingview-widget-container"
ref={container}
style={{height:"400px"}}
/>

</div>

);

}

export default TradingChart;