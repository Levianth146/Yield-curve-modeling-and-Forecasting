import fs from "fs";
import { selectArLag, runArVsRw, mse } from "./js/engine/ar.js";
import { dieboldMariano } from "./js/engine/dm.js";
const fm = JSON.parse(fs.readFileSync("data/factors_monthly.json"));
const py = fs.readFileSync("../outputs/rq2_ar_vs_rw.csv","utf8").trim().split("\n").slice(1).map(l=>{const c=l.split(",");return {f:c[0],h:+c[1],rmseAr:+c[3],rmseRw:+c[4],n:+c[7],p:+c[9]}});
let si=-1; fm.dates.forEach((d,i)=>{ if(String(d).slice(0,7)<="2015-12") si=i; });
console.log("splitIdx",si,fm.dates[si]);
let worst=0;
for (const r of py) {
  const y = Float64Array.from(fm.columns[r.f]);
  const p = selectArLag(y,12,si,"bic");
  const o = runArVsRw(y,si,p,[r.h],false,120)[r.h];
  const ra=Math.sqrt(mse(o.actual,o.arPred)), rr=Math.sqrt(mse(o.actual,o.rwPred));
  const dm=dieboldMariano(Float64Array.from(o.actual),Float64Array.from(o.arPred),Float64Array.from(o.rwPred),r.h);
  console.log(r.f.padEnd(9),r.h,"n",o.actual.length,"/",r.n,"| AR",ra.toFixed(3),"/",r.rmseAr.toFixed(3),"| RW",rr.toFixed(3),"/",r.rmseRw.toFixed(3),"| p",dm.p_value.toFixed(3),"/",r.p.toFixed(3));
  worst=Math.max(worst,Math.abs(ra-r.rmseAr),Math.abs(rr-r.rmseRw));
}
console.log("max abs RMSE diff",worst.toFixed(4));
