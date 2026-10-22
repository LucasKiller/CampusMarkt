# Roadmap delivery workflow

**Data:** 2026-10-22. **Escopo:** documentação de processo. **Autorização:** o usuário solicitou registrar o fluxo TLC, uma branch e um PR por etapa do roadmap e estas mudanças em outra branch.

## Problem Statement

O processo TLC e o planejamento existem, mas a convenção de branch/PR por etapa não está documentada. Precisamos de uma referência de desenvolvimento ligada ao guia de agentes, com critérios de revisão e limites claros.

## Goals

- Centralizar o fluxo de entrega e torná-lo encontrável pelo guia de agentes e README.
- Preservar tarefas atômicas, validação independente e o trabalho em andamento ao adotar branches por etapa.

## Out of Scope

| Exclusão                                                  | Motivo                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| Código, design e contratos do produto                     | Esta entrega é documental.                                               |
| Reorganizar commits ou arquivos da base técnica           | Há execução concorrente no checkout original.                            |
| Criar entregas futuras, alterar CI ou proteções do GitHub | A convenção não autoriza antecipar etapas nem configurar infraestrutura. |
| Merge, produção e deploy                                  | A autorização cobre esta branch e seu PR.                                |

## Assumptions & Open Questions

| Decisão              | Padrão adotado                                                   | Motivo                                       | Confirmado?                     |
| -------------------- | ---------------------------------------------------------------- | -------------------------------------------- | ------------------------------- |
| Unidade de branch/PR | Etapa do roadmap; fases TLC e lotes internos permanecem na etapa | Corresponde à organização solicitada         | Sim, pedido do usuário          |
| Destino dos PRs      | `development`, usando prefixo `feature/`                         | Preserva as branches e a promoção existentes | Convenção adotada nesta entrega |
| Integração           | Merge commit, com autorização própria                            | Preserva um commit por tarefa                | Convenção adotada nesta entrega |

**Open questions:** none; não há decisão de produto nesta alteração.

## User Stories

### P1: Entregar seguindo um fluxo documentado

**User Story:** Como mantenedor, quero localizar o fluxo e os critérios de conclusão sem depender do histórico do chat.

**Acceptance Criteria:**

1. WHEN um agente lê AGENTS.md THEN o guia SHALL apontar para a documentação canônica do fluxo TLC e das entregas.
2. WHEN uma etapa V2 começa THEN a documentação SHALL definir sua branch `feature/v2-etapa-<numero>-<slug>` e seu PR para `development`, distinguindo etapa de fase TLC e de lote de agentes.
3. WHEN uma tarefa termina THEN a documentação SHALL exigir gate aprovado e status atualizado no mesmo commit atômico da tarefa.
4. WHEN uma feature termina THEN a documentação SHALL exigir verificador independente, sensor em scratch, relatório com evidências e gate TLC de conclusão antes de declarar a feature concluída.
5. WHEN um PR deixa de ser draft THEN a documentação SHALL exigir critérios de saída e checks aprovados, preservação dos commits e distinção entre publicação, merge e produção.
6. IF houver trabalho anterior ou concorrente THEN a documentação SHALL exigir reconciliação e isolamento sem mover ou reescrever silenciosamente esse trabalho.
7. WHEN um mantenedor abre um PR THEN o modelo SHALL solicitar etapa, escopo, dependências, provas e pendências, com critérios para revisão e tratamento documental proporcional.

**Independent Test:** Inspecionar guia, links e modelo contra os sete critérios; executar os gates documentais definidos abaixo.

## Edge Cases

- Etapas futuras: criar branch/PR apenas quando a entrega começar e tiver commit publicável.
- Manutenção transversal: usar branch e PR próprios sem forçar associação a uma etapa do produto.
- Aprovação de spec: não inferir merge, deploy, instalação ou reescrita de histórico.
- Documentação: usar provas de conteúdo e links, sem testes de produto artificiais.

## Requirement Traceability

| Requirement ID | Story    | Phase   | Status       |
| -------------- | -------- | ------- | ------------ |
| FLOW-01        | P1 / AC1 | Execute | Implementing |
| FLOW-02        | P1 / AC2 | Execute | Implementing |
| FLOW-03        | P1 / AC3 | Execute | Implementing |
| FLOW-04        | P1 / AC4 | Execute | Implementing |
| FLOW-05        | P1 / AC5 | Execute | Implementing |
| FLOW-06        | P1 / AC6 | Execute | Implementing |
| FLOW-07        | P1 / AC7 | Execute | Implementing |

## Success Criteria

Uma entrega documental atômica: guia, links no AGENTS/README e modelo de PR. Sem Design, context ou tasks formais: não há arquitetura, ambiguidade de produto nem dependências complexas.

Gate documental: `validate_spec.py roadmap-delivery-workflow`, Prettier focado, resolução dos links locais dos arquivos alterados, `npm run docs:check` e `git diff --check`. Após o commit, revisão independente com evidências em `validation.md` e `validate_state.py roadmap-delivery-workflow`. Não executar gates de aplicação para estas alterações textuais.

## Execution

- [x] T1: Documentar o fluxo, publicar seus pontos de entrada e criar o modelo de PR. Gate documental aprovado em 2026-10-22: spec sem erros/avisos, cinco arquivos formatados, 26 links locais resolvidos, `docs:check` com quatro guias e 37 comandos, mensagem Conventional Commit e diff sem erros. Nenhum teste de produto alterado ou processo persistente iniciado.
- Validação independente: pendente após o commit de implementação; requisitos permanecem Implementing até o verificador registrar suas evidências.
