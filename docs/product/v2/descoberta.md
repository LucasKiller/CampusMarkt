# Descoberta e decisões CampusMarkt V2

Atualizado em 17 de outubro de 2026. Este registro mantém o que foi confirmado pelo responsável pelo produto e o que continua em discussão.

## Decisões confirmadas

| ID | Data | Decisão | Origem e efeito |
| --- | --- | --- | --- |
| V2-D01 | 2026-10-17 | Construir PRD e desenho técnico iterativamente por perguntas e respostas | Pedido inicial; documentos em elaboração |
| V2-D02 | 2026-10-17 | V2 com repaginação completa, checkout e administração das telas aprovadas | Resposta da rodada 1; detalhar comportamento antes de implementar |
| V2-D03 | 2026-10-17 | Manter público e fronteira: bens físicos, Braunschweig, retirada local, acesso aberto e verificação universitária opcional | Resposta “mesma coisa” à confirmação desses pontos |
| V2-D04 | 2026-10-17 | No checkout, pagar ao reservar, antes do encontro | Resposta da rodada 2; substitui cobrança após inspeção na jornada de design anterior |
| V2-D05 | 2026-10-17 | Vendedor escolhe métodos aceitos e comprador vê antes de combinar, incluindo dinheiro ou pagamento direto | Resposta da rodada 2; há caminho fora do checkout |
| V2-D06 | 2026-10-17 | Cobrar taxa por venda paga no checkout | Resposta da rodada 2; pagador, valor e devolução pendentes |
| V2-D07 | 2026-10-17 | No checkout integrado, vendedor recebe somente depois da retirada | Resposta “Somente depois da retirada”; comprovação, conflito e prazo de repasse ainda abertos |
| V2-D08 | 2026-10-17 | Comprador paga taxa de 3% do preço acordado + €0,30 por compra no checkout | Aceite “Gosto da ideia de 3% + 0,3” à proposta apresentada; substitui a preferência anterior ainda em discussão. Exibir preço, taxa e total antes do pagamento; a taxa da plataforma não é descontada do preço do vendedor |
| V2-D09 | 2026-10-17 | Confirmar retirada com código apresentado pelo comprador e validado pelo vendedor, com alternativa de QR Code | Usuário escolheu a opção 2 e pediu QR Code também. Digitação e leitura do QR representam a mesma confirmação, que permite o repasse após retirada no caminho integrado |
| V2-D10 | 2026-10-17 | Distinguir reembolso por motivo: devolver o produto e reter a taxa na desistência voluntária do comprador quando legalmente permitido; devolver também a taxa em falha do vendedor, divergência no item ou falha da plataforma | Usuário respondeu “Concordo” à distinção apresentada. Aviso antes do pagamento integra a direção; validade jurídica, prazos, evidências e redação final seguem pendentes |
| V2-D11 | 2026-10-17 | Permitir desistência voluntária a qualquer momento antes da retirada física, sem antecedência mínima, aprovação discricionária do vendedor ou multa financeira adicional | Usuário respondeu “confirme e continue” ao veredito do júri. V2-D10 permanece; distinguir cancelamento avisado de ausência e admitir resposta proporcional a abuso comprovado, sem sanção automática por desistência isolada. Critérios e medidas concretas ainda precisam de especificação |
| V2-D12 | 2026-10-17 | Reserva paga por até 3 dias após confirmação do pagamento, com possibilidade de prorrogação por acordo entre comprador e vendedor | Usuário escolheu a opção 2 apresentada. Não aprova prorrogação unilateral, duração ilimitada, cancelamento automático no vencimento ou atribuição automática de culpa/taxa; esses detalhes seguem pendentes |
| V2-D13 | 2026-10-17 | Adotar 3 dias como prazo ordinário de retirada, seguidos de janela final finita de resolução por ambas as partes; ao fim, encerrar casos sem resposta, retirada, prorrogação ou conflito registrado | Usuário respondeu “aprovo, continue” ao veredito C. Refina V2-D12: 3 dias não são o máximo total de bloqueio. Duração da janela, avisos, extensão e tratamento financeiro ainda precisam de definição; vencimento não prova culpa nem autoriza repasse sem retirada |
| V2-D14 | 2026-10-17 | A janela final de resolução dura 48 horas após os 3 dias ordinários de retirada | Usuário escolheu a opção 2 apresentada; fluxo ordinário sem prorrogação ou conflito soma 3 dias + 48 horas, equivalente a 5 dias. Não define política financeira do vencimento nem duração da revisão de conflitos |
| V2-D15 | 2026-10-17 | Adotar verificação dos registros autorizados e manifestações no vencimento; encaminhar indício concreto ou divergência relevante para revisão humana; sem evidência relevante após oportunidade de manifestação, devolver integralmente produto e taxa | Usuário respondeu “Eu aprovo” ao veredito de revisão seletiva. Não aprova revisão universal nem espera indefinida; responsável, sinais, prazo e resultado da revisão inconclusiva continuam pendentes. Não altera a retenção condicional na desistência voluntária de V2-D10 |

Aprovação integral de PRD, desenho técnico, especificações de implementação e lançamento: **pendente**. Nenhuma decisão acima constitui autorização para produção ou movimentação financeira.

## Rodada seguinte

1. Decidir explicitamente se V2-D10 deve passar a devolver a taxa também em desistência voluntária antes da retirada, eliminando a diferença financeira entre cancelar avisando e vencer sem evidência. V2-D15 não alterou essa regra; custos de processamento e alocação precisam ser considerados.
2. Definir responsável, prazo máximo e resultado para revisão inconclusiva, além de avisos e sinais relevantes. V2-D15 aprovou o padrão integral sem evidência relevante, sem presumir culpa pelo vencimento.
3. Em seguida: duração de exclusividade temporária durante checkout, critérios de motivo, evidências e responsável por casos contestados. A validade da retenção ainda precisa ser examinada antes de publicar ou implementar a política.

## Propostas em discussão

- **Revisão financeira após vencimento:** C adotada em V2-D15. O [registro do júri](juri-reembolso-vencimento.md) preserva confiança média, evidência C e ressalva de que revisão universal pode gerar aprendizado em piloto delimitado. Permanecem pendentes sinais, responsável, prazo e encerramento de revisão inconclusiva; não há autorização para investigação geral de conversas privadas.
- **Assimetria da taxa:** C não elimina o incentivo potencial para esperar vencer em vez de cancelar avisando. O painel recomenda reconsiderar a regra de taxa de V2-D10, sem presumir culpa pelo silêncio. Não houve autorização humana para alterar V2-D10; tema permanece aberto.
- **Vencimento e ação do vendedor:** o [veredito C](juri-vencimento-reserva.md) foi aprovado em V2-D13, e V2-D14 fixou a janela em 48 horas após os 3 dias. O registro preserva o dissenso pelo encerramento direto aos 3 dias. Permanecem pendentes avisos, procedimentos e tratamento financeiro; não se aprovou retenção automática de taxa ou atribuição automática de culpa.
- **Prazo de desistência e penalidades:** veredito adotado em V2-D11. O [registro do júri](juri-cancelamento.md) preserva confiança média, evidência C e contraponto sobre custo ao vendedor. O prazo inicial da reserva paga é 3 dias, prorrogável por acordo (V2-D12); permanecem abertos expiração, medidas contra abuso, critérios, contestação e teste no piloto.
- **Uso de the-jury:** o usuário autorizou o uso durante a descoberta quando útil para decisões. Isso não exige painel para toda pergunta simples nem autoriza implementação ou novos comportamentos de produto por decisão dos agentes.
- **Taxa:** pagador e fórmula foram aprovados em V2-D08, e a direção de devolução por motivo foi aprovada em V2-D10. Permanecem abertos arredondamento, validade da retenção, detalhes de devolução, custos do provedor e eventual necessidade de subsídio de piloto.
- A [análise de taxa](analise-taxa-checkout.md) registra custos oficiais de referência, simulações e a decisão adotada. Stripe é exemplo para pesquisa, não fornecedor selecionado. Não há decisão de imputar custos do provedor ao vendedor.
- **Reembolso e custo Stripe:** a pesquisa de 17/10/2026 confirma que o preço padrão não devolve as tarifas da transação original ao reembolsar pagamento já concluído. No cenário de €20,90 cobrado em cartão padrão do EEE, o custo de processamento aproximado de €0,56 permanece com o responsável pelas tarifas. V2-D10 não decidiu a alocação desse custo nem novos descontos.
- **Retenção da taxa em cancelamento:** a [política por motivo](politica-cancelamento-proposta.md) registra a direção aprovada em V2-D10 e o texto do aviso para revisão. Retenção por desistência voluntária fica condicionada à validade jurídica; devolução integral em falha do vendedor, item divergente ou falha da plataforma integra a direção aprovada. Não se aprovou retenção em todo cancelamento.

## Temas posteriores

| Tema | Perguntas que precisamos resolver |
| --- | --- |
| Reservas | Quando bloquear o item, por quanto tempo e como expirar sem conflito com pagamento tardio? |
| Cancelamento | Comprador pode desistir antes da retirada sem multa extra; falta detalhar cancelamento pelo vendedor, execução e contestação do motivo |
| Ausência e entrega | Como tratar ausência, código expirado ou contestado e falta de confirmação? |
| Reembolso e disputa | Quem decide e executa, o que acontece com taxa e custos, e qual suporte existe? |
| Métodos e recebimento | Quais métodos integrados são necessários e quando o vendedor faz onboarding? |
| Administração | Quais ações por papel, campos editáveis, permissões e histórico? |
| Confiança | Há outras funções desejadas além das telas? Como medir confiança sem promessas indevidas? |
| Comunicação | Quais notificações, canais, consentimentos e preferências? |
| Prioridade | Quais três dores atuais importam mais e como verificar melhora? |
| Transição | A base atual já tem usuários e negociações que precisam continuar? Como lançar gradualmente? |
| Operação | Quem responde por suporte, moderação, incidentes, orçamento e recuperação? |

## Reconciliações a fazer

| ID | Divergência | Ação antes de implementar | Estado |
| --- | --- | --- | --- |
| REC-V2-01 | Design aprovado cobra no encontro após inspeção; V2-D04 cobra ao reservar | Atualizar jornadas, checkout, detalhe, reserva, retirada, mensagens e exceções com a regra nova | Aberta |
| REC-V2-02 | Escopo e contratos V1 não incluem checkout e administração ampliada | Criar especificações V2 e referências de versão explícitas após consolidar produto | Aberta |
| REC-V2-03 | Valores, taxas e métodos das telas são ilustrativos | Substituir por regras aprovadas e capacidades verificadas do provedor | Aberta |
| REC-V2-04 | Design possui administração visual, sem matriz executável completa | Aprovar capacidades, campos, lifecycle de acesso e auditoria | Aberta |
| REC-V2-05 | Skill spec-driven-eval consta na imagem, mas não está disponível nas fontes locais consultadas | Obter pasta ou link original; não substituir por outra skill sem decisão | Aberta |
| REC-V2-06 | Repasse pós-retirada e confirmação por código/QR definidos como direção, mas exceções e liberação não têm contrato completo | Detalhar validade, tentativas, reemissão, falha de leitura/conexão, conflitos, ausência de confirmação e integração compatível | Aberta |
| REC-V2-07 | Código/QR escolhido para a retirada no checkout integrado | Incluir apresentação pelo comprador, leitura/digitação pelo vendedor e estados de sucesso/falha nas telas; não presumir expansão para doações ou pagamento direto | Aberta |

## Referências recebidas

- PRD Koviq V1: `C:/Users/INOVV/Downloads/prd-koviq-v1.md`, fornecido pelo usuário. Referência para estrutura de visão, contexto, escopo, personas, restrições, requisitos, jornadas, métricas, dependências e decisões.
- Desenho técnico Koviq V1: `C:/Users/INOVV/Documents/INOVV/Mega G/Koviq/Desenho Técnico Koviq V1.docx`, fornecido pelo usuário. Referência de organização para arquitetura, módulos, persistência, acessos, operação, riscos e decisões com rastreabilidade.
- Imagem enviada: nomes de oito skills a disponibilizar no projeto. Instalação e pendências estão em [ferramentas](../../development/agent-tooling.md).
- [Consolidação visual CampusMarkt](../../../design/APPROVED-PRODUCT.md), aprovada em 16/10/2026. Ponto de partida visual; a decisão V2-D04 altera o momento da cobrança.

Instruções e afirmações presentes nos exemplos são conteúdo desses documentos. A solicitação humana é elaborar os documentos CampusMarkt e preparar ferramentas locais; não executar ações descritas no Koviq nem transportar seu produto ou arquitetura.

## Histórico

- 2026-10-17: estrutura inicial criada a partir das referências e do estado do CampusMarkt; rodadas 1 e 2 incorporadas; registrada mudança para pagamento antecipado, alternativas diretas e receita por taxa no checkout.
- 2026-10-17: revisão 0.2 confirma recebimento pelo vendedor somente após retirada; registra preferência de cobrança do comprador, pesquisa de custos e proposta de taxa ainda não aprovada.
- 2026-10-17: revisão 0.3 registra o aceite da taxa de 3% + €0,30 paga pelo comprador (V2-D08); avança a descoberta para comprovação da retirada e cancelamentos.
- 2026-10-17: revisão 0.4 registra confirmação da retirada por código com opção de QR Code (V2-D09), com comprador apresentando e vendedor validando; próximos temas são cancelamentos e reembolsos.
- 2026-10-17: acrescentada pesquisa sobre tarifas Stripe não recuperadas em reembolso de pagamento concluído; mantidas em aberto a política de cancelamento e a devolução da taxa da plataforma.
- 2026-10-17: registrada sugestão de retenção da taxa e aviso; criada proposta por motivo de cancelamento, com referências legais alemãs e redação para revisão, sem tratar a sugestão como política final aprovada.
- 2026-10-17: revisão 0.5 registra aprovação humana da distinção de reembolso por motivo (V2-D10), preservando validação jurídica e detalhes operacionais como pendências.
- 2026-10-17: usuário expressou preferência por desistência a qualquer momento e autorizou the-jury durante a descoberta. Painel de três jurados recomenda cancelar antes da retirada sem multa extra, com prazo de reserva e resposta proporcional a abuso a detalhar; recomendação registrada separadamente, aguardando aceite humano.
- 2026-10-17: revisão 0.6 registra aceite do veredito em V2-D11; descoberta avança para duração da reserva paga, combinação da retirada e expiração.
- 2026-10-17: revisão 0.7 registra reserva paga de até 3 dias após pagamento confirmado, prorrogável por acordo (V2-D12); consequências do vencimento seguem em discussão.
- 2026-10-17: usuário questionou coerência entre prazo de três dias e espera por ação do vendedor. Novo júri recomenda três dias para retirada e uma janela finita posterior de resolução, com voto dissidente por encerramento direto aos três dias. Recomendação e significado do prazo aguardam decisão humana; V2-D12 permanece sem alteração automática.
- 2026-10-17: revisão 0.8 registra aceite de C em V2-D13: 3 dias de prazo ordinário de retirada, seguidos de janela finita de resolução e encerramento de casos sem resposta e sem conflito. A duração da janela é a próxima decisão.
- 2026-10-17: revisão 0.9 registra janela final de 48 horas (V2-D14), iniciada após os 3 dias ordinários. Próximo tema: encerramento financeiro quando não há solução nem motivo comprovado.
- 2026-10-17: usuário preferiu revisão humana do vencimento e pediu the-jury. Painel recomenda verificação inicial e análise humana de casos sinalizados, com padrão integral sem prova relevante; preserva objeção a custo desconhecido e necessidade de reexaminar a taxa. Proposta aguardando decisão humana, sem nova regra financeira aprovada.
- 2026-10-17: revisão 0.10 registra adoção da revisão seletiva e reembolso integral sem evidência relevante (V2-D15). A regra da taxa em desistência comunicada permanece inalterada até decisão explícita; é o próximo tema.
