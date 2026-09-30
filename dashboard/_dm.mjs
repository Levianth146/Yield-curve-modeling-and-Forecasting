import fs from "fs"; import {dieboldMariano} from "./js/engine/dm.js";
const c=JSON.parse(fs.readFileSync("/tmp/dmcase.json"));
for (const h of [1,3,12]){const r=dieboldMariano(Float64Array.from(c.a),Float64Array.from(c.p1),Float64Array.from(c.p2),h); console.log(h,r.DM_stat.toFixed(6));}
