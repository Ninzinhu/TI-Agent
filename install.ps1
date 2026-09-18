param(
  [string]$ApiUrl = "",
  [string]$AgentToken = "",
  [string]$AgentId = "",
  [string]$Network = "",
  [switch]$EnableNetworkDiscovery,
  [switch]$InstallService
)

$AgentPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ExecutablePath = Join-Path $AgentPath "LifeTiAgent.exe"
$ConfigPath = Join-Path $AgentPath "config.json"

if (-not $ApiUrl) { $ApiUrl = Read-Host "URL do painel (ex.: https://painel.empresa.com)" }
if (-not $AgentToken) { $AgentToken = Read-Host "Token individual deste agente" }
if (-not $AgentId) { $AgentId = Read-Host "Identificador único (ex.: pc-recepcao-01)" }
if (-not $Network) { $Network = Read-Host "Faixa IPv4 autorizada (ex.: 192.168.1.0/24)" }
if (-not $ApiUrl -or -not $AgentToken -or -not $AgentId -or -not $Network) { throw "Todos os campos são obrigatórios." }

if (-not (Test-Path -LiteralPath $ExecutablePath) -and -not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "LifeTiAgent.exe não foi encontrado e Node.js não está instalado. Instale o executável do agente ou Node.js LTS."
}

@{
  version = "1.1.0"
  agentId = $AgentId
  network = $Network
  networkDiscoveryEnabled = [bool]$EnableNetworkDiscovery
  apiUrl = $ApiUrl.TrimEnd("/")
  agentToken = $AgentToken
  scanIntervalMinutes = 15
  heartbeatIntervalSeconds = 120
  port = 47820
  maxHosts = 254
  requestTimeoutSeconds = 15
} | ConvertTo-Json | Set-Content -LiteralPath $ConfigPath -Encoding utf8

# O token deve ficar acessível somente à conta atual, administradores e SYSTEM.
& icacls.exe $ConfigPath /inheritance:r /grant:r "${env:USERDOMAIN}\${env:USERNAME}:(R,W)" "Administrators:(F)" "SYSTEM:(F)" | Out-Null

Write-Host "Configuração criada em $ConfigPath" -ForegroundColor Green
if ($InstallService) {
  if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Abra o PowerShell como administrador para instalar o serviço."
  }
  & (Join-Path $AgentPath "install-service.ps1")
} else {
  Write-Host "Para iniciar agora, execute: node `"$AgentPath\agent.js`"" -ForegroundColor Cyan
  Write-Host "Para instalar como serviço, execute novamente com -InstallService em PowerShell administrador." -ForegroundColor Cyan
}
