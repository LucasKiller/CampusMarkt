# Política de cancelamento e devolução de taxas V2

**Estado:** distinção por motivo aprovada como direção de produto em 17/10/2026 (V2-D10). Validação jurídica, detalhamento operacional e texto final permanecem pendentes. Não publicar como política vigente nem implementar retenção com base neste rascunho.

V2-D11 também aprova desistência voluntária a qualquer momento antes da retirada física, sem antecedência mínima, aprovação discricionária do vendedor ou multa adicional. A regra de devolução segue a matriz abaixo; validade da retenção da taxa e direitos legais permanecem preservados.

V2-D12, refinada por V2-D13 e V2-D14, define 3 dias ordinários para retirada após confirmação do pagamento, prorrogáveis por acordo, e depois uma janela final de 48 horas para resolução. Ao fim, encerrar casos sem resposta, retirada, extensão ou conflito registrado; a execução financeira está pendente. Não equiparar vencimento automaticamente a desistência voluntária ou culpa do comprador para reter a taxa. Alegação de entrega ou conflito exige resolução própria, cujo prazo ainda não foi definido.

## Objetivo

O responsável pelo produto aprovou distinguir desistência voluntária do comprador de falha do vendedor, divergência no item ou falha da plataforma. A retenção da taxa na desistência voluntária, sem falha do vendedor, anúncio ou plataforma, fica condicionada à sua validade para o serviço efetivamente contratado e aos direitos legais aplicáveis. O aviso antes do pagamento também faz parte da direção aprovada; sua redação final ainda precisa de revisão.

A taxa CampusMarkt aprovada é 3% do preço acordado + €0,30, paga pelo comprador. Ela é distinta do custo Stripe. No exemplo de item de €20, reter €0,90 não equivale a apenas recuperar o processamento estimado de €0,56. Não apresentar toda a taxa como uma despesa Stripe comprovada.

## Direção aprovada e detalhes pendentes

| Situação antes da retirada | Valor do item | Taxa CampusMarkt | Estado |
| --- | --- | --- | --- |
| Comprador desiste por vontade própria, sem falha do anúncio, vendedor ou plataforma | Devolver integralmente | Reter apenas quando juridicamente permitido pelo contrato e serviço prestado | Direção aprovada; validação jurídica e prazos pendentes |
| Vendedor cancela, não aparece ou não entrega | Devolver integralmente | Devolver integralmente | Direção aprovada; critérios operacionais pendentes |
| Item diverge materialmente do anúncio ou há fraude confirmada | Devolver integralmente | Devolver integralmente | Direção de devolução por problema no item aprovada; critérios e comprovação pendentes |
| Cobrança duplicada ou falha da plataforma invalida a compra | Devolver a cobrança indevida | Devolver a taxa correspondente | Direção de devolução por falha da plataforma aprovada; procedimento pendente |
| Vencimento sem evidência relevante após avisos, oportunidade de manifestação e verificação dos registros autorizados | Devolver integralmente | Devolver integralmente | Aprovado em V2-D15; sinais e execução pendentes |
| Indício concreto de entrega ou divergência relevante | Encaminhar para revisão, sem decisão automática por alegação isolada | Não aplicar retenção definitiva sem critério | Revisão seletiva aprovada em V2-D15; prazo, responsável e resultado inconclusivo pendentes |

Direitos legais aplicáveis prevalecem em todos os cenários. A matriz não autoriza transformar cancelamento do vendedor ou problema no item em desistência voluntária do comprador. Casos após retirada, contestações de cartão e problemas não contemplados precisam de regras próprias.

## Aviso proposto para revisão

Exemplo editorial em português para o checkout, ainda não aprovado para publicação:

> Se você desistir por vontade própria antes da retirada, sem problema com o item, o vendedor ou a plataforma, devolveremos o valor do produto, mantendo a taxa de serviço de 3% + €0,30 quando legalmente permitido. Se o vendedor cancelar ou não entregar, se o item não corresponder ao anúncio ou houver falha da plataforma que invalide a compra, devolveremos também a taxa. Seus direitos legais de reembolso permanecem preservados.

Mostrar o valor monetário exato da taxa ao lado do preço e total, antes do compromisso de pagamento. A confirmação de cancelamento deve informar valor devolvido, eventual valor retido e motivo antes da confirmação da ação. Não prometer reembolso concluído quando ele apenas foi solicitado ao provedor. A redação final precisa de versões em inglês e alemão e de revisão contratual; um aviso ou aceite não substitui condições legais aplicáveis.

## Pontos jurídicos a verificar

A [regra alemã sobre término do direito de arrependimento em serviços pagos](https://www.gesetze-im-internet.de/bgb/__356.html), § 356, prevê condições relativas à execução completa, consentimento expresso para início antecipado e ciência da perda do direito. A [regra de compensação por serviços prestados até o arrependimento](https://www.gesetze-im-internet.de/bgb/__357a.html), § 357a, também exige condições de solicitação e informação. Essas referências não demonstram que a taxa CampusMarkt pode ser integralmente retida neste modelo; o enquadramento do serviço e do contrato ainda não foi definido.

A separação entre compra do bem e serviço cobrado pela plataforma, a condição de consumidor, o conteúdo do serviço, seu momento de execução, os deveres de informação e o mecanismo de consentimento precisam ser examinados antes de finalizar a política. Vendas entre particulares não devem ser usadas para presumir ausência de direitos na relação com a plataforma.

## Decisões ainda necessárias

V2-D15 adotou o [veredito sobre reembolso no vencimento](juri-reembolso-vencimento.md): verificação dos registros autorizados e revisão humana dos casos com indício concreto, com padrão de reembolso integral sem evidência relevante após oportunidade de manifestação. Responsável, sinais, prazo e resultado da revisão inconclusiva estão pendentes. A diferença entre cancelar avisando e permanecer em silêncio não é eliminada pela revisão; reexaminar V2-D10 é o próximo tema, mas a retenção condicional não foi alterada por inferência.

O [veredito sobre prazo e penalidade](juri-cancelamento.md) foi adotado pelo responsável pelo produto em V2-D11. Distinguir cancelamento comunicado de ausência; uma desistência isolada não gera sanção automática. Medidas proporcionais para abuso comprovado precisam de critérios e contestação antes de implementação. O veredito tem confiança média e evidência C, não altera V2-D10 nem valida juridicamente a retenção da taxa.

1. Validar juridicamente a retenção e o contrato do serviço antes de publicar ou implementar a política.
2. Detalhar expiração da reserva paga de 3 dias, prorrogação bilateral, cancelamento pelo vendedor, evidências, revisão de motivo e recurso. O comprador pode desistir antes da retirada, conforme V2-D11.
3. Definir quem absorve tarifas não recuperadas em cada cenário sem descontar custos não aprovados de comprador ou vendedor.
4. Especificar devolução parcial, taxa versionada, registro auditável e reconciliação com o provedor.
5. Revisar a redação final do aviso e suas traduções em inglês e alemão.

Esta direção complementa V2-D08, sem escolher a Stripe ou substituir a [análise de custos](analise-taxa-checkout.md). A aprovação humana da distinção por motivo está registrada; os pontos pendentes acima não foram aprovados por inferência.
