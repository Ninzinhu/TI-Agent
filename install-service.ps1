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
& sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/15000/restart/60000 | Out-Host
& sc.exe failureflag $ServiceName 1 | Out-Host
& sc.exe start $ServiceName | Out-Host
Write-Host "Serviço instalado com recuperação automática. Consulte http://127.0.0.1:47820/status"
