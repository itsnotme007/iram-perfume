$p="C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html"
$l = Select-String -Path $p -Pattern 'class="brand-sep"'
$total = $l.Count
$lines = Get-Content $p
$totalLines = $lines.Count
$out = @()
$bad = 0
for($s=0;$s -lt $total;$s++){
  $rs=1
  if($l[$s].Line -match 'rowspan="(\d+)"'){ $rs=[int]$matches[1] }
  $start=$l[$s].LineNumber
  $end = if($s+1 -lt $total){ $l[$s+1].LineNumber } else { $totalLines }
  $f=0
  for($k=$start+1;$k -le $end-1;$k++){
    if($lines[$k-1] -match 'frag-cell' -and $lines[$k-1] -notmatch 'brand-cell'){ $f++ }
  }
  $brand='?'
  if($l[$s].Line -match '<td class="brand-cell"[^>]*>(.*?)</td>'){ $bn=$matches[1]; $brand=($bn -replace '<[^>]+>','' -replace '\s+',' ').Trim() }
  $exp=$f+1
  if($rs -eq $exp){ $tag='OK  ' } else { $tag='BAD '; $bad++ }
  $out += ("{0} rowspan={1,-3} exp={2,-3} brand={3} L{4}" -f $tag,$rs,$exp,$brand.Substring(0,[Math]::Min(18,$brand.Length)),$l[$s].LineNumber)
}
$out | Write-Output
Write-Output ""
Write-Output ("Total BAD: " + $bad)
if($bad -eq 0){ Write-Output "TEMP FILE TABLE CONSISTENT — live render issue is NOT rowspans" }
