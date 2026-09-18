# Guia de utilização

## 1. Antes de instalar

Tenha uma URL HTTPS do painel, um token exclusivo para este computador e a faixa IPv4 cuja descoberta foi autorizada. Não reutilize tokens entre clientes ou máquinas.

## 2. Instalação

Baixe o MSI na página de Releases e execute-o. Os arquivos ficam em `C:\Program Files\Life TI Agent`.

Abra essa pasta e execute `configure-agent.ps1`. Informe a URL, token, identificador e faixa de rede. A descoberta vem desligada: marque-a somente quando houver autorização para sondar os ativos dessa faixa.

Também é possível configurar pelo PowerShell:

```powershell
.\install.ps1 -ApiUrl "https://painel.empresa.com" -AgentToken "TOKEN" -AgentId "pc-recepcao-01" -Network "192.168.1.0/24"
```

## 3. Serviço

Depois de configurar, abra PowerShell como administrador e execute:

```powershell
.\install-service.ps1
```

O serviço inicia automaticamente e tenta se recuperar após falhas. Verifique o estado em `http://127.0.0.1:47820/status` na própria máquina.

## 4. Operação

O agente envia o inventário local a cada heartbeat e executa a descoberta no intervalo configurado. Para uma varredura manual, use um terminal local:

```powershell
Invoke-RestMethod -Method Post http://127.0.0.1:47820/scan
```

## 5. Suporte e remoção

Para revogar acesso, desative o token no painel e remova o serviço antes de desinstalar o MSI. Nunca envie o `config.json` para suporte ou repositórios: ele contém a credencial da instalação.
