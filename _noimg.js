varfs = require("fs");
var P = "C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html";
var l = fs.readFileSync(P, "utf8").split("\n");
var t0 = -1, t1 = -1;
for (var i = 0; i < l.length; i++) {
  if (l[i].indexOf("<tbody") >= 0 && l[i].indexOf("middle-eastern") >= 0 && t0 < 0) t0 = i;
  if (t0 >= 0 && l[i].indexOf("</tbody>") >= 0) { t1 = i; break }
}
console.log("ME tbody L" + (t0 + 1) + "..L" + (t1 + 1));
var noImg = [];
for (var i = t0; i <= t1; i++) {
  if (l[i].indexOf("brand-sep") >= 0) {
    var m = l[i].match(/<td class="brand-cell"[^>]*>(.*?)<\/td>/);
    if (m) {
      var hasImg = m[1].indexOf("<img") >= 0;
      var name = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (!hasImg) noImg.push({ line: i, name: name });
    }
  }
}
console.log("brand-sep without <img>: " + noImg.length);
noImg.forEach(function(o) { console.log("  L" + (o.line + 1) + "  {" + o.name + "}") });
console.log("");
var out = noImg.map(function(o) { return (o.line + 1) + "\t" + o.name }).join("\n");
fs.writeFileSync("C:/Users/Fateh/Downloads/models/_noimg.txt", out ✱
func delay(ms) { return new Promise(r => setTimeout(r, ms)) }
async function main() {
  var files = ["C:/Users/Fateh/Downloads/models/index.html", "C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html"];
  for (var f = 0; f < files.length; f++) {
    var P = files[f];
    var l = fs.readFileSync(P, "utf8").split("\n");
    var brands = {};
    for (var i = 0; i < l.length; i++) {
      if (l[i].indexOf("brand-sep") >= 0) {
        var im = l[i].match(/class="brand-cell"[^>]*>(.*?)<\/td>/);
        if (im) {
          var hasImg = im[1].indexOf("<img") >= 0;
          var nm = im[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
          if (!hasImg) {
            if (!brands[f]) brands[f] = [];
            brands[f].push((i + 1) + ": " + nm);
          }
        }
      }
    }
    console.log((f === 0 ? "MODELS" : "TEMP  ") + " no-img brands: " + (brands[f] ? brands[f].length : 0));
    if (brands[f]) brands[f].forEach(function(s) { console.log("    " + s) });
    console.log("");
  }
  await delay(50);
}
main();