$lines = Get-Content 'd:\github\contest\src\App.tsx' -Encoding UTF8
$before = $lines[0..2105]
$after = $lines[2493..($lines.Length - 1)]
$result = $before + $after
$result | Set-Content 'd:\github\contest\src\App.tsx' -Encoding UTF8
Write-Host "Done. Removed lines 2107-2493 ($(2493 - 2107 + 1) lines). New total: $($result.Length)"
