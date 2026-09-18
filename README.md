# Life TI Agent

Agente leve e independente para inventário de TI. Ele pode ser distribuído gratuitamente para empresas autorizadas, sem acesso direto ao Firebase ou ao banco de dados.

## O que ele coleta

- Inventário local do Windows: marca, modelo, serial, processador, sistema, memória, disco, IP, MAC e tempo ligado.
- Nome do usuário atualmente conectado, quando disponível no Windows.
- Identificação de desktop ou notebook pela bateria do equipamento.
- Descoberta opcional de ativos em uma faixa IPv4 autorizada.
- Classificação por fabricante do MAC, hostname e portas: telefone, impressora, computador, servidor e rede.

Ele não coleta arquivos, senhas, capturas de tela, conteúdo de mensagens nem histórico de navegação.

## Instalação para desenvolvimento

1. Instale Node.js LTS no computador ou coloque `LifeTiAgent.exe` nesta pasta.
2. Abra PowerShell e execute `./install.ps1` para configurar sem editar JSON.
3. Para configurar e registrar o serviço de uma vez, abra PowerShell como administrador e execute `./install.ps1 -InstallService`.
4. Consulte `http://127.0.0.1:47820/status` para validar o serviço local.

## Instalação persistente no Windows

Abra PowerShell como administrador e execute:

```powershell
.\install-service.ps1
```

Se `LifeTiAgent.exe` estiver na pasta, o serviço usa o executável. Caso contrário, usa `node agent.js` durante a etapa de desenvolvimento.

## Configuração

Nunca reutilize um token entre empresas ou computadores. Cada instalação deve receber token individual, que possa ser revogado pelo painel.

```json
{
  "agentId": "pc-recepcao-01",
  "network": "192.168.1.0/24",
  "networkDiscoveryEnabled": false,
  "apiUrl": "https://painel.suaempresa.com",
  "agentToken": "token-individual-da-instalacao"
}
```

## Distribuição pública

O repositório inclui uma licença MIT. A descoberta de rede vem desativada por padrão e deve ser habilitada apenas com autorização expressa. Leia a [política de privacidade](PRIVACY.md), as orientações de [segurança](SECURITY.md) e o [checklist de release](RELEASING.md). O arquivo `config.json` é local e não deve ser incluído em releases nem commits.
