# Veredito sobre cancelamento antes da retirada

**Data:** 17/10/2026. **Estado:** veredito adotado pelo responsável pelo produto em V2-D11 após responder “confirme e continue”. Este documento preserva a análise original, a confiança e as pendências; não autoriza implementação. O usuário autorizou usar the-jury durante a descoberta quando uma decisão se beneficiar do painel.

## Decisão recomendada

Permitir desistência voluntária a qualquer momento antes da retirada física, sem antecedência mínima, aprovação discricionária do vendedor ou multa financeira adicional. A taxa de serviço segue V2-D10, inclusive sua condição de validade jurídica; ela não é uma multa nova nem compensação garantida ao vendedor.

Cancelamento comunicado deve ser distinguido de ausência sem aviso. O direito de cancelar não implica reserva sem prazo nem ausência de consequência para abuso comprovado. Recomendar aviso imediato ao vendedor e encerramento da exclusividade da reserva, preservando reconciliação de pagamento e reembolso antes de permitir nova venda incompatível com o estado financeiro.

Não usar a falta de validação do código para autorizar cancelamento automático quando o bem já foi entregue. Conflito entre entrega alegada, cancelamento e validação do código/QR precisa de fluxo próprio e proteção transacional, a especificar.

## Alternativas e critérios

- A: cancelar antes da retirada sem multa adicional, com resposta proporcional a abuso recorrente.
- B: antecedência mínima ou aprovação do vendedor para cancelamento tardio.
- C: penalidade financeira adicional por cancelamento tardio ou ausência.

Critérios: confiança e autonomia do comprador; proteção do tempo e disponibilidade do vendedor; custos e suporte; simplicidade e equidade operacional. O painel recebeu as mesmas decisões V2-D04 a V2-D10 e a ausência de dados locais, sem tratar a preferência inicial do usuário como obrigação de concordar.

## Razões e contraponto

1. Dificultar cancelamento não assegura comparecimento; pode transformar desistência comunicada em ausência ou disputa. É hipótese operacional, não efeito medido no CampusMarkt.
2. Multa e aprovação tardia exigem atribuir culpa e exceções sem dados locais que demonstrem benefício superior ao custo de suporte e conflitos.
3. O vendedor precisa de proteção. Recomenda-se estudar prazo explícito de reserva, reconfirmação de encontro e ações proporcionais para abuso recorrente, mantendo contestação e evitando sanção por relato unilateral.

O contraponto mais forte é o vendedor perder outros interessados, desmontar ou transportar o item para um comprador que cancela no último minuto. A recomendação não elimina esse custo; considera as alternativas menos simples sem evidência de que o resolvam.

Não criar automaticamente avaliação pública negativa, multa ou bloqueio por uma desistência isolada. Advertência ou restrição temporária de novas reservas para abuso comprovado são propostas a especificar e aprovar, com distinção entre emergência, exercício de direitos, problema do vendedor e reincidência intencional. Não foram fixados contadores ou limiares nesta rodada.

## Método e apuração

Três jurados de modelos distintos, com papéis de proponente, advogado do diabo e integrador, tiveram uma rodada independente e uma rodada de deliberação com posições anonimizadas. Métodos: consequências de segunda ordem, análise adversarial e auditoria de evidência.

| Posição anônima | Voto inicial | Confiança inicial | Voto final | Confiança final | Evidência |
| --- | --- | --- | --- | --- | --- |
| 1 | A | 83 | A | 81 | C |
| 2 | A | 80 | A | 80 | C |
| 3 | A | 76 | A | 74 | C |

Apuração determinística: A soma 235 pontos finais; nenhum voto mudou. Confiança **média**, limitada pela ausência de dados locais e evidência C. Modelos distintos são da mesma família e compartilham contexto; a independência é parcial. Unanimidade não demonstra resultado operacional. Nenhum voto contrário; o custo ao vendedor foi preservado como principal objeção.

- [Dados de votos](juri/cancelamento-votos.json).
- [Apuração executada](juri/cancelamento-apuracao.txt), pelo script da skill local the-jury.

## Evidência externa e limites

A [página eBay sobre cancelamento](https://www.ebay.de/help/buying/cancelling-order/cancelling-order?id=4004) admite solicitação para retirada local até os limites definidos por sua política; o vendedor pode aceitar ou negar. O [regulamento eBay](https://www.ebay.de/help/policies/member-behavior-policies/order-cancellation-policy?id=5298) também trata abuso. São referências de mecanismos, não prova de que A produz melhores resultados nem política adotada pelo CampusMarkt.

As condições legais de remuneração de serviços na [regra alemã § 357a BGB](https://www.gesetze-im-internet.de/bgb/__357a.html) não validam automaticamente a retenção da taxa CampusMarkt. O júri decide uma recomendação de produto e não substitui revisão jurídica.

## Premissa e teste

Premissa mais arriscada: cancelamento fácil, comunicação e medidas proporcionais serão suficientes para que desistências tardias não afastem vendedores.

Teste proposto para piloto: acompanhar cancelamentos comunicados, sua antecedência, ausências, perdas relatadas por vendedores, reincidência e disputas. Avaliar conversão e continuidade dos vendedores. Não medir apenas redução de cancelamentos registrados, pois eles podem ter virado ausências. Aprovar período e critérios de revisão antes do piloto; não há dados atuais nem limite numérico decidido.

Se perdas frequentes e relevantes persistirem, testar alternativa com compromisso de horário sem bloquear rejeição legítima do item ou direitos legais. Qualquer nova penalidade exige decisão própria.

## Próximo passo

A recomendação foi confirmada em V2-D11. V2-D12 definiu reserva paga de até 3 dias após confirmação do pagamento, prorrogável por acordo. Definir agora as consequências do vencimento e o tratamento de ausência, com critérios verificáveis e sem presumir automação de sanções.
