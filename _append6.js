// append3.js — add 3 NEW bottles of EXISTING catalog frags. Catalog price-list.js UNTOUCHED (still 132).
// sell30 REUSED from catalog rows (idx4, idx28, idx63). data.json BOM-safe round-trip.
var fs = require("fs"), path = require("path");
var app = process.argv[2] || "C:/Users/Fateh/Downloads/models/orders-app";
var ts  = process.argv[3];

function stripBOMBuf(b){ if(b.length>=3 && b[0]===0xef && b[1]===0xbb && b[2]===0xbf) return b.slice(3); return b; }
function hasBOM(b){ return b.length>=3 && b[0]===0xef && b[1]===0xbb && b[2]===0xbf; }

// ---------- 1) catalog (require = same loader the app uses; BOM torn off by require) ----------
var PRICE_LIST = require(path.join(app, "price-list.js"));
console.log("CATALOG PRICE_LIST.length =", PRICE_LIST.length);
for (var i of [4, 28, 63]) {
  var f = PRICE_LIST[i];
  if (!f) { console.log("  idx"+i, "MISSING !!"); continue; }
  console.log("  idx"+i, f.brand+"|"+f.name, "| buy="+f.buyPrice, "sell30="+f.sell30, "bottleML="+f.bottleML);
}

// ---------- 2) data.json: read raw bytes, detect BOM, parse ----------
var raw = fs.readFileSync(path.join(app, "data.json"));
var bom = hasBOM(raw);
var body = bom ? raw.slice(3) : raw;
var d = JSON.parse(body.toString("utf8"));
var inv = d.inventory || [];
console.log("data.json BOM="+bom, "| orders="+(d.orders||[]).length, "| inventory="+inv.length);
console.log("  last bottle (proto):", JSON.stringify(inv[inv.length-1]).slice(0, 300));

// ---------- 3) backup (byte-exact incl BOM) ----------
var bak = path.join(app, "data.json.before-add3."+ts+".json");
fs.writeFileSync(bak, raw);
console.log("backup ->", path.basename(bak), "("+raw.length+" bytes)");

// ---------- 4) append 3 bottles; sell30 from catalog ----------
function makeBottle(fragIdx, buyPrice) {
  var f = PRICE_LIST[fragIdx];
  var nowMs = Date.now();
  var fk = f.brand + "|" + f.name;
  return {
    id: "s"+nowMs,
    fragIdx: fragIdx,
    fragKey: fk,
    fragBrand: f.brand,
    fragName: f.name,
    buyPrice: buyPrice,
    sell30: f.sell30,
    addedAt: nowMs,
    totalML: (f.bottleML||100),
    remainingML: (f.bottleML||100)
  };
}
var adds = [
  makeBottle(4,  3300),   // Afnan Supremacy Collector's Edition  (buy 3300)
  makeBottle(28, 1900),   // Davidoff Cool Water EDT              (buy 1900)
  makeBottle(63, 1450)    // Paris Corner Rifaqaat (plain)        (buy 1450)
];
for (var b of adds) inv.push(b);

// ---------- 5) write back preserving BOM ----------
var out = JSON.stringify(d, null, 2) + "\n";
var buf = Buffer.from(out, "utf8");
if (bom) buf = Buffer.concat([Buffer.from([0xef,0xbb,0xbf]), buf]);
fs.writeFileSync(path.join(app, "data.json"), buf);

// ---------- 6) verify ----------
var raw2 = fs.readFileSync(path.join(app, "data.json"));
var bom2 = hasBOM(raw2);
var d2 = JSON.parse((bom2?raw2.slice(3):raw2).toString("utf8"));
console.log("[verify] BOM="+bom2, "| orders="+(d2.orders||[]).length, "| inventory="+(d2.inventory||[]).length);
console.log("[verify] tail:");
for (var b of (d2.inventory||[]).slice(-3)) console.log("   ", JSON.stringify(b).slice(0, 280));
