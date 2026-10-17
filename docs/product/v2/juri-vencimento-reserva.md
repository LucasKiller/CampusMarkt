# Veredito sobre vencimento da reserva paga

**Data:** 17/10/2026. **Estado:** formato adotado pelo responsável pelo produto em V2-D13, após “aprovo, continue”, e janela definida em 48 horas em V2-D14. Refina a apresentação de V2-D12; tratamento financeiro e procedimentos permanecem pendentes. O registro preserva a análise original, suas limitações e o voto dissidente.

## Questão

O usuário preferiu que o vendedor decidisse cancelar após o prazo, mas questionou se os três dias têm utilidade quando o item continua reservado indefinidamente. O problema da opção apresentada pelo assistente era chamar de prazo de reserva uma data que não produzia encerramento nem outra consequência obrigatória.

Um prazo pode ser um marco de ação ou um limite máximo. A escolha precisa ser explícita: não prometer reserva máxima de três dias se houver bloqueio adicional não informado.

## Veredito

Recomendar **C: três dias para retirada, seguidos de uma janela finita de resolução, comunicada antes do pagamento**. No terceiro dia, ambas as partes devem poder resolver a pendência: registrar retirada efetivada pelo mecanismo autorizado, prorrogar por acordo ou cancelar. Silêncio não renova a reserva indefinidamente.

Ao fim da janela, sem retirada, prorrogação ou conflito registrado, recomendar encerramento automático com tratamento financeiro a especificar. Não liberar repasse pelo simples vencimento, não atribuir culpa automaticamente e não decidir retenção da taxa só pelo relógio. Entrega alegada ou disputa precisa de revisão e prazo próprio, sem reembolso ou nova venda automática enquanto houver conflito.

A duração não foi escolhida pelo júri: o responsável pelo produto posteriormente definiu **48 horas** em V2-D14. A adoção de C em V2-D13 reformula a apresentação de V2-D12: os três dias são prazo ordinário de retirada, seguido de janela adicional informada; não são o máximo total de bloqueio. Sem prorrogação ou conflito, o fluxo soma cinco dias. O prazo de revisão de conflito continua aberto.

## Alternativas e critérios

| Opção | Funcionamento | Vantagem | Custo ou risco |
| --- | --- | --- | --- |
| A | Avisar aos três dias e aguardar ação do vendedor, sem fim automático | Flexibilidade manual | Reserva e dinheiro podem ficar pendentes sem limite efetivo |
| B | Encerrar aos três dias salvo retirada, extensão bilateral ou conflito | Prazo simples e efetivo | Pode cancelar um encontro desejado cuja extensão não foi registrada |
| C | Abrir janela finita após os três dias, depois encerrar casos sem resposta e sem conflito | Última oportunidade de resolver sem pendência indefinida | Segundo prazo e mais complexidade; benefício não medido |

Critérios: consequência efetiva do prazo e prevenção de pendências indefinidas; flexibilidade e coordenação; previsibilidade e equidade financeira; simplicidade e custo operacional.

## Apuração

Três jurados de modelos distintos, com papéis de proponente, cético e integrador. Rodada 1 independente; rodada 2 com posições anonimizadas e defesa do melhor argumento contrário. Nenhum voto mudou; todos reduziram a confiança ao examinar limites da própria posição.

| Posição | Voto inicial | Confiança inicial | Voto final | Confiança final | Evidência |
| --- | --- | --- | --- | --- | --- |
| 1 | C | 81 | C | 74 | C |
| 2 | C | 84 | C | 73 | C |
| 3 | B | 72 | B | 70 | C |

Apuração determinística: C soma 147, B soma 70. Confiança **média**, limitada por evidência C e ausência de dados locais. Modelos são da mesma família e compartilham contexto; independência parcial. Não há consenso unânime.

- [Votos e configuração do painel](juri/reserva-vencimento-votos.json).
- [Apuração executada](juri/reserva-vencimento-apuracao.txt).

## Dissenso preservado

Cancelar aos três dias com aviso antecipado e extensão bilateral já resolveria o problema com menos estados e menor custo de suporte. Disputa de entrega é um risco comum a B e C e exige exceção nas duas; não constitui prova de superioridade de C. Se três dias forem o limite máximo absoluto desejado pelo responsável pelo produto, B é a opção coerente.

## Evidências e limites

São fatos de produto as decisões V2-D04 a V2-D12. A manifestação mais recente do usuário é uma pergunta sobre a coerência da opção manual, não aprovação de A ou C. Não há dados CampusMarkt sobre atrasos, respostas, suporte, duração real até retirada ou cancelamentos evitáveis.

A [documentação Stripe sobre repasses manuais](https://docs.stripe.com/connect/manual-payouts) informa limites de tempo e distingue repasse bancário de outras movimentações; não fornece escrow. Isso reforça verificar o ciclo completo com o provedor, sem provar que C é melhor ou selecionar Stripe. Direitos legais e a condição de validade da retenção de taxa continuam conforme [política de cancelamento](politica-cancelamento-proposta.md).

## Premissa e teste

Premissa mais arriscada: a janela final recupera combinações legítimas que seriam canceladas, em quantidade suficiente para justificar o segundo prazo e o trabalho adicional.

Teste proposto para piloto: acompanhar reservas que chegam ao terceiro dia, resolução durante a janela, extensão efetivamente aceita pelos dois, cancelamento sem retirada, duração total da pendência e chamados de suporte. Comparar com aviso antecipado e extensão simples antes do terceiro dia. Se quase ninguém resolver durante a janela, ou ela só adiar cancelamentos, preferir B ou rever o prazo ordinário com evidência.

## Próximo passo

C foi adotada em V2-D13 e a janela de 48 horas foi escolhida em V2-D14. Definir agora avisos, consequências financeiras ao fim da janela, extensões e tratamento dos conflitos; esses elementos são necessários para tornar o fluxo completo e verificável.
