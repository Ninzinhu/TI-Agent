param([string]$Path = "dist")
Get-ChildItem -LiteralPath $Path -File | Where-Object { $_.Name -ne "SHA256SUMS.txt" } | Get-FileHash -Algorithm SHA256 | ForEach-Object { "{0}  {1}" -f $_.Hash.ToLowerInvariant(), $_.Path.Substring((Resolve-Path $Path).Path.Length + 1) } | Set-Content -LiteralPath (Join-Path $Path "SHA256SUMS.txt") -Encoding ascii
