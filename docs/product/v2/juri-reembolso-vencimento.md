# Veredito sobre revisão financeira no vencimento

**Data:** 17/10/2026. **Estado:** alternativa C adotada pelo responsável pelo produto em V2-D15 após responder “Eu aprovo”. A preferência anterior era revisão humana de todos os casos; a análise abaixo foi preservada com suas limitações. Responsável, sinais, prazo e revisão inconclusiva permanecem pendentes; não autoriza implementação.

## Decisão recomendada

Adotar **C: conferir registros autorizados e encaminhar para revisão humana os casos com indício concreto ou divergência relevante**. Depois de oportunidade efetiva de manifestação durante os prazos informados, sem evidência relevante de entrega, extensão, disputa ou motivo que autorize outro tratamento, recomendar reembolso integral do item e da taxa.

Não condicionar todo reembolso à disponibilidade de um revisor quando não há informação adicional a analisar. Não presumir culpa pelo silêncio. Ausência de código de retirada, isoladamente, não prova que não houve entrega; alegação real de entrega precisa sair do fluxo padrão e receber tratamento próprio.

O fluxo recomendado exige prazos de triagem e de revisão, responsável e encaminhamento para caso inconclusivo. Esses elementos ainda não foram definidos; C não está pronta para implementação. “Iniciar reembolso” também não equivale a dinheiro já devolvido pelo provedor e banco.

## Alternativas e critérios

| Opção | Tratamento | Benefício | Risco |
| --- | --- | --- | --- |
| A | Devolver item e taxa automaticamente nos vencimentos sem conflito | Regra simples e rápida | Pode ignorar entrega ainda não registrada e preserva diferença de incentivo da taxa |
| B | Revisar todos esses vencimentos antes da decisão financeira | Contato humano pode recuperar prova e ensinar sobre falhas do fluxo | Fila sem capacidade/SLA conhecidos; humano também pode continuar sem evidência |
| C | Checar registros e manifestações; revisar indícios ou divergências; padrão integral sem evidência relevante | Direciona análise ao que há para apurar, com resultado padrão explícito | Precisa de sinais e prazos bem definidos; não elimina o incentivo para esperar vencer |

Critérios: justiça e evidência; incentivo para avisar; resolução financeira em prazo finito; capacidade e custo de suporte.

## O que a verificação significa

- Conferir deterministamente registros autorizados de pagamento, reserva, prazo vigente, extensão bilateral, validação do código/QR, cancelamento e conflito.
- Considerar manifestações e provas apresentadas pelas partes, sem conceder acesso geral a conversas privadas a administradores.
- Não usar silêncio, código ausente ou alegação unilateral como prova automática de culpa. Não inferir responsabilidade por IA, reputação improvisada ou contagem de tempo.
- Se houver indício de entrega ou contestação factual relevante, impedir reembolso e nova venda automáticos incompatíveis com o caso, seguindo fluxo de resolução com prazo a aprovar.
- Separar divergência apenas sobre a taxa de divergência sobre entrega e valor do item. Investigar a taxa não deve, por si só, imobilizar o preço inteiro; eventual devolução separada precisa de contrato jurídico e financeiro verificável.

## Incentivo que permanece aberto

C **não resolve** a assimetria entre reter taxa na desistência comunicada e devolvê-la quando o motivo do vencimento é desconhecido. Revisão humana universal tampouco a elimina: se ninguém fornecer prova, o humano continua sem base para atribuir culpa.

O painel recomenda **reabrir a discussão de V2-D10 sobre a taxa no cancelamento voluntário**, buscando tratamento que não recompense o silêncio. Não foi aprovada a devolução da taxa em todo cancelamento nem revogada a retenção condicional já registrada. A força do incentivo e o comportamento real dos usuários não foram medidos.

## Contraponto preservado

Revisar todos os casos durante um beta pequeno pode recolher provas não enviadas e identificar entregas sem código. O custo de B é desconhecido, não comprovadamente alto. Um piloto temporário de revisão universal seria defensável com responsável, capacidade, prazo máximo e hipótese de aprendizado aprovados. Esse piloto ainda não foi autorizado.

Não houve voto contrário final, mas o argumento de aprendizado humano foi preservado. Não justificar automação alegando uma sobrecarga de suporte já demonstrada: não há dados para isso.

## Apuração e limitações

Três jurados com lentes de justiça adversarial, custos/confiabilidade e auditoria de evidência. A convocação foi escalonada, diferentemente do início simultâneo solicitado pela skill; todos receberam contexto isolado e comprometeram o voto inicial antes de ver posições alheias. Houve uma rodada de deliberação anonimizada, sem mudanças de voto.

| Posição | Voto inicial | Confiança inicial | Voto final | Confiança final | Evidência |
| --- | --- | --- | --- | --- | --- |
| 1 | C | 86 | C | 84 | C |
| 2 | C | 85 | C | 81 | C |
| 3 | C | 78 | C | 76 | C |

Apuração determinística: C soma 241. Confiança **média**, limitada por evidência C. Modelos são distintos, mas da mesma família, com contexto compartilhado e sem dados locais; a independência é parcial e unanimidade não valida resultado operacional.

- [Votos e contexto](juri/reembolso-vencimento-votos.json).
- [Apuração executada](juri/reembolso-vencimento-apuracao.txt).

## Fontes e limites

A [documentação Stripe de reembolsos](https://docs.stripe.com/refunds) distingue solicitação, saldo disponível, falhas e tratamento conforme tipo de cobrança. A [documentação de repasses manuais](https://docs.stripe.com/connect/manual-payouts) informa limites e não oferece escrow. São referências para viabilidade do fluxo, não provedor selecionado ou justificativa de retenção da taxa.

As condições de remuneração de serviços em [§ 357a BGB](https://www.gesetze-im-internet.de/bgb/__357a.html) não demonstram validade da retenção CampusMarkt. Este painel não certifica o contrato nem cria direitos de cobrança.

## Premissa e teste

Premissa mais arriscada: avisos, coleta de manifestações e verificação dos registros identificam adequadamente os casos que precisam de análise humana.

Teste proposto para piloto: auditar amostra de casos padrão e registrar entregas sem código descobertas depois, contestações, tempo de resolução, custo por caso e insuficiência de prova. Comparar o que uma análise humana adicional realmente encontra. Não fixar amostragem, prazo ou limiar sem decisão e capacidade operacional.

## Próximo passo

C foi adotada em V2-D15. Definir responsável, prazo e resultado para revisão inconclusiva, além de discutir explicitamente a assimetria da taxa em V2-D10 antes de considerar encerrado o desenho de cancelamento.
