# Ferramentas do agente CampusMarkt

Preparação local em 17 de outubro de 2026, solicitada para apoiar os documentos e a futura V2.

## Skills

Os sete pacotes disponíveis foram copiados para [`.agents/skills`](../../.agents/skills/README.md), incluindo referências e scripts. A origem lógica e os hashes individuais ficam em [`sources.json`](../../.agents/skills/sources.json). `react-best-practices` usa o pacote instalado localmente como `react-best-practice`, cujo nome declarado é `vercel-react-best-practices`.

`spec-driven-eval` permanece pendente da fonte original. Não houve substituição por `tlc-spec-driven`, `harness-eval` ou outro pacote.

As cópias preservam conteúdo e metadados de autoria/licença presentes nas fontes. São snapshots locais; atualizar uma skill global não altera silenciosamente a versão do projeto. Não formatar automaticamente esses arquivos de terceiros.

`.gitattributes` desativa a conversão de finais de linha nesses snapshots para preservar os hashes de origem também no Git.

## MCPs

| Servidor | Configuração | Estado desta preparação |
| --- | --- | --- |
| Notion | `https://mcp.notion.com/mcp` | Declarado localmente; autenticação e acesso não verificados |
| Playwright | `npx` com `-y @playwright/mcp@latest` | Declarado localmente; sessão MCP e navegadores não iniciados |

O JSON fornecido foi preservado em [`.mcp.json`](../../.mcp.json), com `-y` para evitar prompt interativo do npx. Para Codex, a configuração equivalente está em [`.codex/config.toml`](../../.codex/config.toml), usando `npx.cmd` no Windows. Nenhuma credencial foi gravada.

A [documentação oficial de MCP no Codex](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) descreve `.codex/config.toml` para projetos confiáveis e autenticação de servidores OAuth. Após recarregar a configuração, conectar o Notion requer o login interativo da conta e as permissões disponíveis. Declarar o servidor não confirma conexão nem acesso a páginas.

A [documentação oficial de skills](https://learn.chatgpt.com/docs/build-skills) descreve a descoberta em `.agents/skills`. Os pacotes deverão estar disponíveis no próximo turno; se não aparecerem, recarregar o cliente.

O seletor `@latest` foi mantido conforme pedido. Ele resolve a versão na execução; esta preparação não a fixa no lockfile da aplicação.

## Limites de uso

- Não há integração Notion no runtime do CampusMarkt. Os documentos locais são a base desta descoberta; não foi criada ou publicada página externa.
- Playwright MCP apoia inspeção, mas não substitui testes de aceitação versionados.
- Não iniciar checkout real, criar papéis, alterar banco remoto ou publicar aplicação apenas porque um MCP está configurado.
- Encerrar servidor, navegador de teste e processos auxiliares iniciados para uma verificação assim que ela terminar, conforme AGENTS.md.

## Verificação realizada

Verificação concluída: sete pacotes e 113 arquivos conferidos por SHA-256; sintaxe JSON/TOML válida; `npx.cmd` resolvido no Windows; 25 links locais dos novos documentos válidos; manifesto íntegro e documentos UTF-8 sem caracteres de substituição. `git diff --check` passou.

Não foi realizada autenticação Notion, inicialização do servidor Playwright ou execução de testes do aplicativo, pois esta alteração prepara documentação e configuração local.
