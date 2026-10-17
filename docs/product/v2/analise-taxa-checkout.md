# Análise inicial da taxa de checkout

Pesquisa e decisão de 17 de outubro de 2026. **Estado:** taxa aprovada como direção de produto em V2-D08; provedor e viabilidade operacional pendentes.

O responsável pelo produto inicialmente sugeriu 2% ou 3% e, após a comparação abaixo, aprovou a proposta de 3% + €0,30 paga pelo comprador. Confirmou separadamente que o vendedor só recebe após retirada. A análise preserva as alternativas comparadas e as limitações de custo que ainda precisam ser resolvidas.

## Decisão adotada

Cobrar **3% do preço acordado + €0,30 por compra no checkout**, pagos pelo comprador, com preço do item, taxa e total claros antes do pagamento. A taxa da plataforma não é descontada do preço acordado do vendedor. Não há outra taxa de processamento aprovada para adicionar ao comprador.

Na comparação inicial entre percentuais puros de 2% e 3%, a recomendação foi 3%; ainda assim, percentual puro pode exigir subsídio em vendas pequenas. A parcela fixa ajuda a cobrir o custo fixo do pagamento, mas também aumenta o peso efetivo da taxa nos itens baratos. Em €10, 3% + €0,30 equivale a 6%; em €20, a 4,5%. Não apresentar a taxa adotada como “apenas 3%”.

A aprovação da taxa não garante sustentabilidade. Antes do lançamento, simular volume, ticket, frequência por vendedor, custos do arranjo de marketplace, devoluções, contestações, tributos e suporte. Eventual subsídio de piloto precisa de orçamento explícito; não foi aprovado nesta decisão.

## Referências de custo

Como referência, a [tabela Stripe Alemanha](https://stripe.com/de/pricing) publica **1,5% + €0,25** para cartões padrão do EEE. É o cenário de processamento usado na simulação; não representa todos os cartões e métodos.

No modelo em que a plataforma define preços, o [Stripe Connect](https://stripe.com/de/connect/pricing) publica **€2 por conta ativa no mês**, sendo ativa aquela que recebe repasse bancário ou em cartão, e **0,25% + €0,10 por repasse**. A tabela também distingue roteamento e outras capacidades. Custos aplicáveis dependem da integração; a simulação abaixo não os inclui nem pressupõe que esse modelo será contratado.

## Simulação de taxa ao comprador

| Preço do item | Taxa de 2% | Taxa de 3% | Proposta 3% + €0,30 | Total com a proposta |
| --- | --- | --- | --- | --- |
| €10,00 | €0,20 | €0,30 | €0,60 | €10,60 |
| €20,00 | €0,40 | €0,60 | €0,90 | €20,90 |
| €50,00 | €1,00 | €1,50 | €1,80 | €51,80 |
| €100,00 | €2,00 | €3,00 | €3,30 | €103,30 |

Valores calculados, sem dedução da taxa da plataforma do preço do vendedor. Arredondamento ilustrativo ao centavo; a política definitiva será especificada.

Para item de €20 com taxa de 3%, cobraríamos €20,60. No cenário de cartão acima, o processamento sobre esse total custa aproximadamente €0,56; restam **€0,04 antes de todos os demais custos**. Com 3% + €0,30, a taxa seria €0,90 e restariam aproximadamente €0,34 antes desses custos. Esses saldos não são lucro.

Se o arranjo escolhido também cobrar por vendedor ativo, um vendedor que realiza apenas uma venda pequena no mês pode custar mais que a receita da taxa. Adicionar €0,30 não resolve sozinho esse problema.

## Custos de reembolso

Verificado em 17/10/2026: no preço padrão, as taxas da transação original de processamento, Connect e conversão cambial não são devolvidas com o reembolso. Para cartões, não há tarifa adicional de reembolso no modelo padrão; transferências bancárias e contratos personalizados podem ter cobrança própria. Fonte: [FAQ Stripe Alemanha](https://stripe.com/de/pricing), seção de taxas de reembolso.

Exemplo calculado: item de €20, taxa CampusMarkt de €0,90, total capturado de €20,90. No cenário de cartão padrão do EEE desta análise, o processamento é aproximadamente €0,56. Se devolvermos os €20,90 integralmente, o responsável contratual pelas tarifas continua arcando com esses €0,56, além de outros custos aplicáveis. Não confundir devolução da taxa CampusMarkt com recuperação da tarifa Stripe.

Adiar o repasse ao vendedor não desfaz o processamento do pagamento já cobrado do comprador. Cancelar um pagamento ainda não concluído é uma operação diferente de reembolsar uma cobrança concluída, conforme [documentação de cancelamentos e reembolsos](https://docs.stripe.com/refunds). Esta descoberta mantém a decisão de cobrar ao reservar; não foi aprovada troca para autorização sem captura.

A direção de devolução dos 3% + €0,30 foi aprovada em V2-D10 e está na [política por motivo](politica-cancelamento-proposta.md): retenção em desistência voluntária apenas quando legalmente permitida; devolução também da taxa em falha do vendedor, divergência no item ou falha da plataforma. Quem absorve as tarifas não recuperadas, a validade jurídica da retenção e os procedimentos continuam abertos. A pesquisa não autoriza novos descontos nem altera direitos aplicáveis.

## Repasse após retirada

A política desejada exige verificar como o provedor condiciona o recebimento à retirada e quais limites e responsabilidades se aplicam. A [documentação de repasses manuais Stripe](https://docs.stripe.com/connect/manual-payouts) mostra que há controle de agendamento com limites de retenção; isso não equivale a um contrato de escrow ou proteção ao comprador e não comprova sozinho adequação ao CampusMarkt.

Como referência de experiência, o [Kleinanzeigen](https://themen.kleinanzeigen.de/sicher-bezahlen/kaeuferschutz/) cobra do comprador e relaciona liberação à confirmação de recebimento, com processo próprio de exceção. Não importamos sua política nem presumimos equivalência com retirada local.

## Decisões pendentes

1. Detalhar confirmação por código ou QR apresentada pelo comprador e validada pelo vendedor, incluindo falta de confirmação e divergência, conforme V2-D09.
2. Selecionar provedor e arranjo compatíveis e validar viabilidade com a taxa aprovada.
3. Detalhar cancelamento e devolução por motivo conforme V2-D10, validar retenção e definir custos não recuperáveis e atendimento.
4. Especificar arredondamento e preservação da versão de taxa em cada compra.

Esta decisão alimenta o PRD e o desenho técnico V2. Não cria integração financeira nem altera a cobrança no aplicativo V1.
