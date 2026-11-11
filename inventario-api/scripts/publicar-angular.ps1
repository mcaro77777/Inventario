param([Parameter(Mandatory=$true)][string]$Origen)
$ErrorActionPreference = 'Stop'
$destino = Join-Path $PSScriptRoot '..\ClientApp'
if (-not (Test-Path -LiteralPath (Join-Path $Origen 'index.html'))) { throw 'El origen no contiene index.html' }
Get-ChildItem -LiteralPath $destino -Force | Where-Object { $_.Name -ne 'README.md' } | Remove-Item -Recurse -Force
Get-ChildItem -LiteralPath $Origen -Force | Copy-Item -Destination $destino -Recurse -Force
Write-Host "Angular publicado en $destino"
