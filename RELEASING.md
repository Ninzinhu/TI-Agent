# Checklist de release

Antes de publicar uma versão:

1. Execute `npm test` e `npm run check`.
2. Atualize a versão em `package.json`, `config.example.json` e no changelog da release.
3. Gere um instalador para Windows e assine o executável/instalador com certificado de assinatura de código.
4. Publique hashes SHA-256 e uma SBOM junto aos artefatos.
5. Assine o manifesto de atualização; o agente só deve aceitar atualizações cuja assinatura seja válida.
6. Confirme que o pacote não contém `config.json`, tokens, dados de clientes nem chaves privadas.
7. Publique as notas da versão, a política de privacidade e um canal privado para reporte de vulnerabilidades.

O projeto não inclui certificado, chave privada, mecanismo de atualização ou instalador binário: esses itens devem ser provisionados pelo responsável pela distribuição em ambiente seguro.
