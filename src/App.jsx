import TradingChart from "./TradingChart";
import { useState } from "react";

function App(){

const API="https://cuddly-space-succotash-69p4w9jj4rv35454-8000.app.github.dev";

const [pair,setPair]=useState("EUR/USD");
const [capital,setCapital]=useState("");
const [risk,setRisk]=useState("");
const [lot,setLot]=useState("");
const [pips,setPips]=useState("");
const [entry,setEntry]=useState("");
const [stop,setStop]=useState("");
const [type,setType]=useState("BUY");
const [result,setResult]=useState("No calculation yet");
const [history,setHistory]=useState([]);

const body=()=>({
pair,
capital:Number(capital),
risk_percent:Number(risk),
lot_size:Number(lot),
pips:Number(pips),
entry_price:Number(entry),
stop_loss_pips:Number(stop),
trade_type:type
});

const callAPI=async(endpoint)=>{

try{

const res=await fetch(`${API}/${endpoint}`,{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify(body())
});

const data=await res.json();

let text="";

if(endpoint==="risk"){
text=`Risk Amount: $${data.risk_amount}`;
}

if(endpoint==="profit"){
text=`Estimated Profit/Loss: $${data.profit_loss}`;
}

if(endpoint==="stoploss"){
text=`Stop Loss Price: ${data.stop_loss}`;
}

if(endpoint==="takeprofit"){
text=`Take Profit Price: ${data.take_profit}`;
}

if(endpoint==="riskreward"){
text=`Risk: $${data.risk} | Reward: $${data.reward} | Ratio: ${data.ratio}`;
}

if(endpoint==="positionsize"){
text=`Recommended Lot Size: ${data.lot_size}`;
}

if(endpoint==="pipvalue"){
text=`Pip Value: $${data.pip_value} per pip`;
}

if(endpoint==="margin"){
text=`Required Margin: $${data.required_margin}`;
}

if(endpoint==="advice"){
text=`Trade Advice: ${data.advice}`;
}

setResult(text);

setHistory([...history,{
pair,
type,
result:text
}]);

}catch{
setResult("❌ Backend connection failed");
}

};

const inputStyle={
padding:"10px",
marginTop:"5px",
width:"100%",
borderRadius:"6px",
border:"1px solid #ccc"
};

const buttonStyle={
padding:"10px",
margin:"5px",
border:"none",
borderRadius:"6px",
cursor:"pointer",
color:"white"
};

return(

<div style={{
background:"#eef2f7",
minHeight:"100vh",
display:"flex",
justifyContent:"center",
alignItems:"center",
fontFamily:"Arial"
}}>

<div style={{
background:"white",
padding:"30px",
width:"420px",
borderRadius:"10px",
boxShadow:"0 0 20px rgba(0,0,0,0.1)"
}}>

<h2 style={{textAlign:"center"}}>Forex Trading For Beginners</h2>

<label>Currency Pair</label>
<select value={pair} onChange={e=>setPair(e.target.value)} style={inputStyle}>
<option>EUR/USD</option>
<option>GBP/USD</option>
<option>USD/JPY</option>
<option>XAU/USD</option>
</select>

<br/><br/>

<label>Account Balance ($)</label>
<input style={inputStyle} value={capital} onChange={e=>setCapital(e.target.value)}/>

<br/><br/>

<label>Risk %</label>
<input style={inputStyle} value={risk} onChange={e=>setRisk(e.target.value)}/>

<br/><br/>

<label>Lot Size</label>
<input style={inputStyle} value={lot} onChange={e=>setLot(e.target.value)}/>

<br/><br/>

<label>Target Pips</label>
<input style={inputStyle} value={pips} onChange={e=>setPips(e.target.value)}/>

<br/><br/>

<label>Entry Price</label>
<input style={inputStyle} value={entry} onChange={e=>setEntry(e.target.value)}/>

<br/><br/>

<label>Stop Loss (Pips)</label>
<input style={inputStyle} value={stop} onChange={e=>setStop(e.target.value)}/>

<br/><br/>

<h4>Select Trade Type</h4>

<div style={{display:"flex",justifyContent:"space-between"}}>

<button
onClick={()=>setType("BUY")}
style={{
...buttonStyle,
background:type==="BUY"?"green":"gray"
}}
>
BUY
</button>

<button
onClick={()=>setType("SELL")}
style={{
...buttonStyle,
background:type==="SELL"?"red":"gray"
}}
>
SELL
</button>

</div>

<p><b>Selected:</b> {type}</p>

<hr/>

<h4>Calculations</h4>

<button style={{...buttonStyle,background:"#007bff"}} onClick={()=>callAPI("risk")}>Risk</button>
<button style={{...buttonStyle,background:"#28a745"}} onClick={()=>callAPI("profit")}>Profit</button>
<button style={{...buttonStyle,background:"#dc3545"}} onClick={()=>callAPI("stoploss")}>Stop Loss</button>
<button style={{...buttonStyle,background:"#17a2b8"}} onClick={()=>callAPI("takeprofit")}>Take Profit</button>

<button style={{...buttonStyle,background:"#6f42c1"}} onClick={()=>callAPI("riskreward")}>Risk Reward</button>
<button style={{...buttonStyle,background:"#ff9800"}} onClick={()=>callAPI("positionsize")}>Position Size</button>
<button style={{...buttonStyle,background:"#009688"}} onClick={()=>callAPI("pipvalue")}>Pip Value</button>
<button style={{...buttonStyle,background:"#795548"}} onClick={()=>callAPI("margin")}>Margin</button>
<button style={{...buttonStyle,background:"#333"}} onClick={()=>callAPI("advice")}>Advice</button>

<hr/>

<div style={{
background:"#f4f6f9",
padding:"15px",
borderRadius:"6px"
}}>
<h3>Result</h3>
<p>{result}</p>
</div>

<hr/>

<h3>Trade History</h3>

<ul>

{history.map((h,i)=>(
<li key={i}>
{h.pair} {h.type} → {h.result}
</li>
))}

</ul>

</div>

</div>

);


}

export default App;