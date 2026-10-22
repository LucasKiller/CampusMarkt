# Fluxo de entrega do CampusMarkt

Adotado a pedido do usuário em 22 de outubro de 2026. Cada etapa do roadmap tem uma branch e um pull request para `development`. Dentro da etapa, cada feature segue a skill [TLC spec-driven](../../.agents/skills/tlc-spec-driven/SKILL.md), com critérios verificáveis, commits por tarefa e validação independente.

## Fontes e unidades de trabalho

- O [roadmap de produto](../product/04-roadmap.md) define horizontes e evidências de progressão. O [planejamento V2](../product/v2/README.md) reúne a descoberta e os documentos da evolução atual. Um roteiro não aprova implementação.
- Uma **etapa do roadmap** é uma entrega com objetivo, dependências e critério de saída próprios. É a unidade de branch e PR.
- Uma **feature** tem seu contrato em `.specs/features/<feature>/`. Uma etapa pode reunir mais de uma feature aprovada.
- **Specify, Design, Tasks e Execute** são fases do processo TLC. Não criam, por si só, branches ou PRs adicionais.
- Uma **task** é uma alteração atômica com gate e commit próprios. Um lote de agentes é apenas uma unidade de execução e preserva essas tarefas.
- [STATE.md](../../.specs/STATE.md) guarda decisões e handoff. Ao retomar, confrontar o registro com branch, commits, alterações locais e tarefas. As evidências atuais prevalecem sobre um snapshot antigo.

## Ciclo de uma entrega

| Passo                       | Resultado e condição de avanço                                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planejar                    | Identificar etapa, objetivo, dependências, escopo e critério de saída no roadmap. Selecionar a próxima feature utilizável.                                                                                    |
| Especificar e discutir      | Escrever requisitos e critérios EARS em `spec.md`. Resolver ambiguidades em rodadas curtas e registrar decisões em `context.md` quando houver discussão. Executar `validate_spec.py` antes da revisão humana. |
| Aprovar o contrato          | Obter aprovação do recorte antes de implementar. Distinguir direção de produto, hipótese comercial, aprovação visual e contrato executável.                                                                   |
| Desenhar, quando necessário | Produzir `design.md` para decisões arquiteturais ou features grandes/complexas e obter sua aprovação.                                                                                                         |
| Decompor, quando necessário | Produzir `tasks.md` com arquivos, dependências, testes derivados dos critérios e gate por tarefa. Executar `validate_tasks.py` antes da aprovação das tarefas.                                                |
| Executar                    | Trabalhar uma tarefa por vez: implementar, passar o gate, atualizar a tarefa e a rastreabilidade, validar a mensagem e fazer o commit atômico.                                                                |
| Avaliar                     | Após o último commit de implementação da feature, despachar automaticamente um verificador distinto do autor. Registrar evidências e o veredito em `validation.md`.                                           |
| Revisar a etapa             | Conferir todas as features, dependências, critérios de saída e checks do PR. Só então marcar o PR como pronto para revisão.                                                                                   |
| Integrar                    | Com autorização de merge, integrar em `development` preservando os commits. A próxima etapa parte da base atualizada. Promoção para produção e deploy têm autorização própria.                                |

A profundidade segue a TLC: trabalho pequeno pode usar especificação e passos atômicos inline; Design e Tasks só produzem arquivos quando necessários. Se os passos revelarem mais de cinco ações ou dependências complexas, criar `tasks.md`. Não criar artefatos vazios nem especificar antecipadamente todo o roadmap.

O verificador confirma os resultados esperados dos critérios, cita evidências `file:line` e executa o sensor de discriminação em cópias ou worktree descartável. Nunca usar `git stash` para o sensor. Falhas viram tarefas de correção; após até três ciclos sem solução, escalar ao usuário. Executar `validate_state.py` e exigir `validation.md` com PASS antes de declarar a feature concluída. UAT interativo se aplica a jornadas de usuário com comportamento complexo.

Os scripts são resolvidos em `.agents/skills/tlc-spec-driven/scripts/`, a partir da raiz do repositório; usar o nome ou caminho da feature como argumento. `check_commit.py --message "<mensagem>"` valida cada commit. Para mudanças apenas documentais, usar checagens de conteúdo, links, comandos e formatação; não inventar testes de produto. O relatório registra os limites dessa prova.

## Branches e pull requests

Para uma nova etapa aprovada, atualizar a referência remota e criar `feature/v2-etapa-<numero>-<slug>` a partir de `origin/development`. Não partir de um checkout com commits alheios ainda não publicados. Se houver trabalho concorrente ou alterações locais de outro escopo, usar outro worktree sem resetar, descartar ou carregar esses arquivos para a entrega.

| Etapa V2 | Entrega                             | Branch reservada por convenção            |
| -------- | ----------------------------------- | ----------------------------------------- |
| 0        | Consolidação documental             | `feature/v2-etapa-0-consolidacao`         |
| 1        | Base técnica verificável            | `feature/v2-etapa-1-base-tecnica`         |
| 2        | Repaginação das jornadas existentes | `feature/v2-etapa-2-repaginacao`          |
| 3        | Administração delimitada            | `feature/v2-etapa-3-administracao`        |
| 4        | Provedor e viabilidade financeira   | `feature/v2-etapa-4-provedor-viabilidade` |
| 5        | Compra protegida completa           | `feature/v2-etapa-5-compra-protegida`     |
| 6        | Transição e piloto                  | `feature/v2-etapa-6-transicao-piloto`     |

Esta tabela organiza a entrega; não altera os contratos nem os critérios de aprovação do produto. Criar cada branch quando sua etapa começar, e o PR quando houver um primeiro commit publicado. Não criar branches vazias nem PRs de etapas futuras. As oito fases internas da feature de base técnica continuam dentro da etapa 1.

Mudanças transversais de documentação ou manutenção usam uma branch própria `feature/<slug>` e um PR delimitado. Esta adoção do processo usa `feature/roadmap-delivery-workflow`.

O PR da etapa:

1. Tem base `development` e permanece draft enquanto houver trabalho ou validação pendente.
2. Identifica a etapa, as features incluídas, dependências, critérios de saída, escopo e riscos. Usa o [modelo do repositório](../../.github/pull_request_template.md).
3. Reúne os commits das tarefas, incluindo testes e atualizações de status no mesmo commit. O relatório final do verificador é versionado em commit de evidência próprio após a implementação.
4. Registra comandos realmente executados, resultados, limites e relatórios de validação. `check` e `build` na CI não equivalem ao `verify` completo.
5. Fica pronto para revisão somente com todos os critérios de saída satisfeitos, features validadas e checks obrigatórios aprovados. Um PR aberto não significa entrega concluída.
6. Usa merge commit para preservar os commits atômicos das tarefas. Não usar squash ou reescrever commits já revisados para acomodar o fluxo.

Concluir uma etapa antes de integrar uma dependente. Etapas independentes podem avançar em paralelo quando o roadmap e suas dependências permitirem; cada uma mantém branch, PR e validação próprios. Atualizar a branch com a `development` vigente antes da integração e repetir os gates afetados. Resolver conflitos sem perder contratos, tarefas ou evidências.

Se uma etapa ficar grande demais para uma revisão útil, propor uma divisão explícita no roadmap, com critérios de saída próprios, antes de abrir entregas adicionais. Não dividir silenciosamente a etapa por fase TLC ou lote de agentes.

## Aprovações e limites

O pedido do usuário de 22/10/2026 estabelece a publicação das branches de etapa e a abertura/atualização de seus PRs como parte das entregas aprovadas deste roadmap no repositório CampusMarkt. Não pedir novamente a mesma autorização de publicação enquanto esse escopo permanecer vigente. Aprovar apenas uma spec não amplia essa autorização para outros repositórios, escopos ou operações.

Merge, push direto em `development` ou `production`, force-push, deploy, migração remota, instalações e mudanças de permissões exigem autorização própria. Nunca habilitar auto-merge por inferência. O workflow existente pode propor um PR de `development` para `production`; essa proposta não autoriza merge nem lançamento.

Quando um gate falhar, parar a tarefa, registrar o bloqueio e corrigir dentro do recorte autorizado. Não enfraquecer, excluir ou pular testes. Um ambiente indisponível não é PASS. Preservar o piso de regressão e executar os gates pertinentes à camada; o fechamento de implementação exige os gates integrais definidos pela feature.

Encerrar os servidores, watchers, bancos e processos de teste iniciados pela entrega assim que a verificação acabar, inclusive após falhas. Preservar processos preexistentes de outros trabalhos.

## Adoção em trabalho existente

Esta mudança documenta o processo e não move a implementação já iniciada na branch local `development`. Antes de continuar uma etapa existente, inventariar commits concluídos, trabalho parcial, base remota e alterações de outros escopos. Definir o recorte da branch/PR de transição com essas evidências, sem reexecutar tarefas concluídas, mover arquivos em edição ou publicar commits alheios. Se a transição exigir reescrita de histórico ou misturar escopos, resolver essa decisão com o usuário antes de agir.

O handoff da etapa deve registrar etapa/feature, branch, PR quando existir, último gate e commit concluídos, próxima tarefa e bloqueios. Atualizar somente a seção apropriada de `STATE.md`, preservando o histórico de decisões. Não usar esta documentação para declarar retroativamente uma validação, aprovação ou prontidão de beta.
