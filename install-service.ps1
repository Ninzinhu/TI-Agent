param(
  [string]$ServiceName = "LifeTiAgent",
  [string]$ExecutablePath = "",
  [string]$NodePath = "node.exe"
)

$AgentPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$DefaultExecutable = Join-Path $AgentPath "LifeTiAgent.exe"
$AgentCommand = if ($ExecutablePath) { "`"$ExecutablePath`"" } elseif (Test-Path -LiteralPath $DefaultExecutable) { "`"$DefaultExecutable`"" } else { "`"$NodePath`" `"$AgentPath\agent.js`"" }
$Existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($Existing) { throw "O serviço $ServiceName já existe. Remova-o antes de instalar novamente." }
& sc.exe create $ServiceName binPath= $AgentCommand start= auto | Out-Host
& sc.exe description $ServiceName "Agente de descoberta de ativos de TI - Life Engenharia" | Out-Host
& sc.exe start $ServiceName | Out-Host
Write-Host "Serviço instalado. Consulte http://127.0.0.1:47820/status"
