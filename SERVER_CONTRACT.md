# Contrato do servidor de ingestão

O agente envia `POST /api/ti/ingest` com JSON e o header `x-ti-agent-token`. O servidor deve aceitar somente HTTPS, validar o token individual antes de processar o corpo, limitar tamanho de payload, validar esquema/tipos, registrar auditoria e retornar `401` para token inválido e `429` para excesso de requisições.

Tokens devem ser armazenados com hash, associados a uma instalação, expirar quando apropriado e poder ser revogados e rotacionados sem reutilização. Não registre o token nem o corpo completo do inventário em logs de aplicação. A autorização deve limitar cada token ao tenant/empresa correspondente.

O endpoint recebe `agentId`, `machine`, `devices` e opcionalmente `deviceCount`. Campos desconhecidos devem ser descartados ou rejeitados conforme uma versão explícita de contrato. O painel deve permitir correção humana das classificações estimadas pelo agente.
