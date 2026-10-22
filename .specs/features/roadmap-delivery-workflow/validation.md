# Roadmap delivery workflow: FAIL

**Veredito:** FAIL. Os sete critérios de conteúdo estão atendidos, mas o link do modelo para o fluxo de entrega não funciona no corpo de um PR do GitHub. A entrega precisa dessa correção antes do fechamento.

**Data:** 2026-10-22. **Verificador:** subagente independente, distinto do autor.

**Spec:** `.specs/features/roadmap-delivery-workflow/spec.md`.

**Diff range:** `origin/development..fb55c6c`, resolvido nesta verificação para `377bb2cacd444fac5904a66082292e901da4d4b9..fb55c6c3d8eca2e77e405a809f9656562df35277`.

**Escopo:** `AGENTS.md`, `README.md`, `docs/development/delivery-workflow.md`, `.github/pull_request_template.md` e a spec. Nenhum código de aplicação, teste, contrato de produto ou configuração de infraestrutura foi alterado nesse intervalo.

## Conclusão da tarefa

T1 foi implementada em um único commit, `fb55c6c`, incluindo o registro da tarefa e os status Implementing na spec. O commit atende ao formato Conventional Commits. A validação encontrou uma correção documental pendente; a feature não está concluída. Não há `context.md`, `design.md` ou `tasks.md` vazio ou necessário para esta tarefa documental única, conforme `.specs/features/roadmap-delivery-workflow/spec.md:72`.

## Cobertura independente dos critérios

As afirmações abaixo são inspeções documentais contra os resultados exigidos pela spec, sem testes artificiais de comportamento de produto.

| Critério      | Resultado exigido e afirmação conferida                                                                                                                                                                       | Evidência                                                                                                                                                                                                                                                             | Resultado                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| FLOW-01 / AC1 | O guia aponta para a referência canônica do fluxo; o README também publica esse ponto de entrada.                                                                                                             | `AGENTS.md:7`, `README.md:99`                                                                                                                                                                                                                                         | PASS                                          |
| FLOW-02 / AC2 | Uma etapa V2 usa `feature/v2-etapa-<numero>-<slug>`, parte de `origin/development` e tem PR para `development`. Etapa, feature, fase TLC e lote têm papéis distintos.                                         | `docs/development/delivery-workflow.md:8`, `docs/development/delivery-workflow.md:10`, `docs/development/delivery-workflow.md:11`, `docs/development/delivery-workflow.md:36`, `docs/development/delivery-workflow.md:48`, `docs/development/delivery-workflow.md:54` | PASS                                          |
| FLOW-03 / AC3 | A sequência exige implementar, passar o gate, atualizar tarefa/rastreabilidade e fazer o commit atômico. Os status e testes acompanham a tarefa no mesmo commit.                                              | `AGENTS.md:27`, `docs/development/delivery-workflow.md:23`, `docs/development/delivery-workflow.md:56`                                                                                                                                                                | PASS                                          |
| FLOW-04 / AC4 | A feature exige verificador distinto do autor, despacho automático, evidência `file:line`, sensor isolado, relatório PASS e `validate_state.py` antes do fechamento.                                          | `docs/development/delivery-workflow.md:24`, `docs/development/delivery-workflow.md:30`                                                                                                                                                                                | PASS                                          |
| FLOW-05 / AC5 | O PR fica draft até cumprir critérios de saída, checks e validações. Merge commit preserva tarefas. Publicação, merge e produção têm tratamentos de autorização distintos.                                    | `AGENTS.md:10`, `docs/development/delivery-workflow.md:54`, `docs/development/delivery-workflow.md:58`, `docs/development/delivery-workflow.md:59`, `docs/development/delivery-workflow.md:67`, `docs/development/delivery-workflow.md:69`                            | PASS                                          |
| FLOW-06 / AC6 | Trabalho anterior exige inventário e reconciliação; concorrência exige isolamento sem reset, descarte, repetição, publicação de commits alheios ou reescrita silenciosa.                                      | `AGENTS.md:11`, `docs/development/delivery-workflow.md:12`, `docs/development/delivery-workflow.md:36`, `docs/development/delivery-workflow.md:77`                                                                                                                    | PASS                                          |
| FLOW-07 / AC7 | O modelo pede etapa, objetivo, escopo, specs, dependências, riscos, pendências e provas. A lista exige critérios de revisão e aceita checagens documentais proporcionais com itens inaplicáveis justificados. | `.github/pull_request_template.md:7`, `.github/pull_request_template.md:15`, `.github/pull_request_template.md:19`, `.github/pull_request_template.md:24`                                                                                                             | PASS de conteúdo; defeito de navegação abaixo |

Não foram encontrados critérios semanticamente imprecisos. A cobertura textual 7/7 não elimina a falha de link no contexto de uso exigido pela revisão.

## Lacuna priorizada e tarefa de correção

1. **P2: o link para o guia quebra quando o modelo vira corpo do PR.** Em `.github/pull_request_template.md:27`, `../docs/development/delivery-workflow.md` é relativo à pasta `.github` quando o arquivo é renderizado no repositório. No corpo de um PR, essa pasta não é o contexto da página. Para a página ilustrativa `https://github.com/LucasKiller/CampusMarkt/pull/123`, a resolução produz `https://github.com/LucasKiller/CampusMarkt/docs/development/delivery-workflow.md`. Falta o caminho GitHub de arquivo, com `blob/<ref>`. Portanto a checagem de existência local aprova um link que não leva ao guia no uso principal do modelo. Associado ao FLOW-07 e ao teste independente de links definido em `.specs/features/roadmap-delivery-workflow/spec.md:49`.

**Tarefa de correção:** trocar o destino por um link de arquivo do repositório que funcione no corpo de um PR e no modelo renderizado, com referência apropriada. Conferir o destino publicado, repetir formatação e links, e solicitar revalidação. Esta verificação não modificou o modelo.

A [documentação oficial de sintaxe do GitHub](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#relative-links) distingue links relativos ao arquivo. Na seção de imagens, a mesma página explicita que o contexto de issues/PRs usa caminhos de arquivo com `../blob/<ref>/...`. A aplicação dessa regra ao link do modelo foi confirmada por resolução local com `urllib.parse.urljoin`; não foi criado PR de teste nem executada escrita remota.

## Coerência do processo e casos de borda

- O mapa de etapas organiza branches e PRs sem alterar contratos de produto (`docs/development/delivery-workflow.md:48`). O roadmap continua exigindo evidências e specs aprovadas (`docs/product/04-roadmap.md:5`). A descoberta V2 continua sem autorizar implementação (`docs/product/v2/README.md:3`, `AGENTS.md:15`).
- O fluxo preserva TLC, autoajuste da profundidade, arquivos criados apenas quando necessários, commits por tarefa e validação independente. O commit posterior de evidência é explicitamente separado dos commits de implementação (`docs/development/delivery-workflow.md:28`, `docs/development/delivery-workflow.md:56`).
- As fases internas da base técnica pertencem à etapa 1. Uma divisão adicional requer proposta explícita no roadmap; não pode surgir de fases TLC ou lotes (`docs/development/delivery-workflow.md:48`, `docs/development/delivery-workflow.md:63`).
- Etapas futuras não geram branches vazias ou PRs antecipados. Manutenção transversal usa branch própria (`docs/development/delivery-workflow.md:48`, `docs/development/delivery-workflow.md:50`).
- A regra geral de aprovação local da spec (`AGENTS.md:30`) é compatível com a autorização de publicação específica atribuída ao pedido do usuário (`docs/development/delivery-workflow.md:67`). A documentação mantém merge, produção, deploy, migração remota e reescrita sob autorização própria (`docs/development/delivery-workflow.md:69`). Esta revisão não realizou nenhuma dessas operações nem verificou autorização fora dos documentos e do escopo delegado.
- O guia exige encerramento dos processos iniciados e preservação dos processos preexistentes (`docs/development/delivery-workflow.md:73`). Todos os comandos desta revisão terminaram; nenhum servidor, watcher ou banco foi iniciado.

## Gates executados

Todos os comandos foram executados no worktree isolado informado. Os processos retornaram ao terminar.

| Comando ou check                                                                                                                                                                                                                                                        | Resultado                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `python .agents/skills/tlc-spec-driven/scripts/validate_spec.py roadmap-delivery-workflow`                                                                                                                                                                              | Exit 0; 0 erros, 0 avisos.                                                                    |
| `node C:/Users/INOVV/Documents/GitHub/CampusMarkt/node_modules/prettier/bin/prettier.cjs --check AGENTS.md README.md docs/development/delivery-workflow.md .github/pull_request_template.md .specs/features/roadmap-delivery-workflow/spec.md --ignore-path .gitignore` | Exit 0; os cinco arquivos usam o estilo Prettier.                                             |
| Checagem Python de destinos Markdown locais nos cinco arquivos                                                                                                                                                                                                          | 26 links; 26 destinos existentes; 0 ausentes. O mesmo resolvedor foi usado no sensor isolado. |
| `npm run docs:check`                                                                                                                                                                                                                                                    | Exit 0; 4 guias operacionais, 37 comandos.                                                    |
| `git diff --check origin/development..fb55c6c` e `git diff --check`                                                                                                                                                                                                     | Exit 0; sem erros de whitespace no intervalo ou no worktree.                                  |
| `python .agents/skills/tlc-spec-driven/scripts/check_commit.py --message 'docs(workflow): define roadmap stage branches and delivery gates'`                                                                                                                            | Exit 0; `check_commit: OK`.                                                                   |
| Resolução do único link do modelo como conteúdo de PR                                                                                                                                                                                                                   | FAIL; destino sem `blob/<ref>`, conforme lacuna P2.                                           |

`docs:check` verifica somente os quatro guias de `docs/operations`, por construção em `scripts/operations/verify-doc-commands.ts:10` e `scripts/operations/verify-doc-commands.ts:119`. Seu PASS não comprova o conteúdo do novo guia nem o link do modelo; essas partes foram inspecionadas separadamente.

## Sensor proporcional

**Resultado:** 1 mutação, 1 detectada, 0 sobreviventes. O sensor exercitou a checagem documental de links, sem simular comportamento executável inexistente.

1. Capturado `git status --porcelain=v1` antes do sensor: saída vazia.
2. Copiados os cinco arquivos e seus destinos locais para diretório temporário próprio, com caminho absoluto verificado dentro do diretório temporário do sistema e prefixo `campusmarkt-workflow-verifier-`.
3. Executado o resolvedor no scratch íntegro: 26 links válidos.
4. Alterado somente o scratch em `docs/development/delivery-workflow.md:7`: `../product/04-roadmap.md` virou `../product/__sensor_missing-roadmap__.md`.
5. O mesmo resolvedor identificou exatamente esse destino ausente. A mutação foi detectada.
6. O diretório temporário foi removido e sua ausência foi confirmada. O porcelain real depois do sensor permaneceu vazio e igual ao baseline. Não foi usado `git stash`.

O sensor comprova detecção de destino local ausente. Não comprova automaticamente conformidade semântica do texto, renderização do GitHub ou futuros comportamentos de aplicação. O defeito de contexto do modelo foi encontrado por inspeção adicional e resolução de URL.

## Integridade, limites e fechamento

O intervalo contém somente documentação; nenhum teste de produto foi removido, enfraquecido ou adicionado. Não foram executados build, suites de aplicação, serviços, UAT, instalações, commits, pushes ou operações de PR. A inspeção de qualidade seguiu `.agents/skills/tlc-spec-driven/references/coding-principles.md`: alteração cirúrgica, rastreável e sem abstrações ou capacidades adicionais.

Somente este `validation.md` foi escrito pelo verificador. Os status da spec permanecem Implementing. `validate_state.py` não foi executado porque o veredito é FAIL, conforme o escopo delegado; não há declaração de conclusão. A lacuna foi registrada aqui e comunicada ao autor. Não foi criado registro em `lessons.json`, pois a autorização desta revisão limita a escrita a este relatório.
