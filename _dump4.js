var P = require(process.argv[2]);
console.log("PL.length=" + P.length);
for (var i = 128; i < P.length; i++) {
  var f = P[i];
  console.log("--- idx" + i + " ---");
  for (var k in f) console.log("  " + k + " = " + JSON.stringify(f[k]));
}
