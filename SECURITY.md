# Segurança

## Reporte de vulnerabilidades

Não publique vulnerabilidades em issues públicas. Reporte-as privadamente ao mantenedor do projeto, com versão afetada, impacto e instruções de reprodução.

## Controles implementados

- O endpoint de ingestão exige HTTPS.
- O token é individual por instalação e o instalador restringe o ACL de `config.json` à conta atual, administradores e SYSTEM.
- A interface de status usa exclusivamente `127.0.0.1` e respostas não são armazenadas em cache.
- A descoberta de rede é opt-in e limitada a IPv4 `/24` até `/30`.
- O envio ao painel possui timeout e até três tentativas para falhas transitórias.

## Operação segura

Revogue tokens comprometidos, mantenha Node.js em versão suportada e distribua somente instaladores e atualizações assinados. Nunca inclua `config.json` em repositórios ou pacotes públicos.
