# PRD CampusMarkt V2

**Estado:** em elaboração com o responsável pelo produto. **Revisão:** 0.10, 17 de outubro de 2026. **Aprovação integral:** pendente.

A V2 repagina integralmente o CampusMarkt e acrescenta checkout integrado e administração ampliada, usando as telas aprovadas como referência. Preserva o foco em bens físicos com retirada local em Braunschweig, acesso aberto e verificação universitária opcional.

Este documento define o comportamento do produto. Arquitetura, tecnologias e contratos de integração ficam no [desenho técnico](desenho-tecnico-campusmarkt-v2.md). As decisões confirmadas e as perguntas abertas estão em [descoberta](descoberta.md). Nenhuma seção incompleta constitui autorização de implementação.

## Índice e modo de leitura

| Seção | Pergunta que responde | Uso |
| --- | --- | --- |
| 1 Visão geral | O que muda e por quê? | Leitura inicial |
| 2 Contexto e vocabulário | O que cada conceito significa? | Consulta |
| 3 Escopo | O que entra, permanece ou exige outra decisão? | Referência de compromisso |
| 4 Personas | Para quem construímos? | Jornadas e prioridades |
| 5 Restrições | O que limita as promessas? | Leitura antes dos requisitos |
| 6 Requisitos funcionais | Como a plataforma deve se comportar? | Especificação posterior |
| 7 Requisitos não funcionais | Quais qualidades precisam ser demonstradas? | Critérios de qualidade |
| 8 Jornadas | Como as capacidades se conectam? | Design e testes |
| 9 Métricas | Como saberemos se melhorou? | Medição |
| 10 Dependências | O que precisa ser resolvido antes do lançamento? | Preparação |
| 11 Fontes e decisões abertas | O que sabemos e o que falta? | Continuidade |

## 1 Visão geral

### Produto e público

CampusMarkt facilita a descoberta e a transferência local de bens físicos. O público inicial continua sendo estudantes e moradores de Braunschweig, incluindo quem chega, muda de residência ou deixa a cidade. Participação comum não exige vínculo universitário.

### Transformação confirmada

- Repaginação completa conforme a direção visual aprovada.
- Novas funções de checkout e administração.
- Pagamento integrado **ao reservar, antes do encontro**, conforme decisão de 17/10/2026. Isso altera a jornada visual anterior, que cobrava depois da inspeção presencial.
- Métodos aceitos escolhidos pelo vendedor e visíveis ao comprador antes de combinar, incluindo dinheiro ou pagamento direto como alternativas ao checkout.
- Receita da plataforma por taxa de **3% do preço acordado + €0,30 por compra no checkout, paga pelo comprador**. Em desistência voluntária sem falha, reter a taxa quando legalmente permitido e devolver o produto; em falha do vendedor, divergência no item ou falha da plataforma, devolver também a taxa. Validação jurídica e detalhes operacionais permanecem pendentes.
- No caminho integrado, o vendedor só recebe depois da retirada, confirmada com código ou QR Code apresentado pelo comprador e validado pelo vendedor. Exceções e prazo bancário ainda serão definidos.
- O comprador pode desistir a qualquer momento antes da retirada física, sem antecedência mínima, aprovação discricionária do vendedor ou multa adicional. A devolução segue V2-D10. O prazo ordinário para retirada é 3 dias após confirmação do pagamento, com prorrogação por acordo, seguido de janela final de 48 horas para resolução (V2-D12 a V2-D14).
- No vencimento, verificar registros autorizados e manifestações: indício concreto ou divergência relevante exige revisão humana com prazo a definir. Sem evidência relevante após oportunidade de manifestação, devolver produto e taxa integralmente (V2-D15). Isso não altera automaticamente a regra de taxa na desistência voluntária comunicada.

**Taxa aprovada em 17/10/2026:** preço do item, taxa de 3% + €0,30 e total devem aparecer antes do pagamento. Em um item de €20, a taxa é €0,90 e o comprador paga €20,90. A taxa da plataforma não é descontada do preço acordado do vendedor. Custos do provedor, viabilidade e detalhamento da devolução permanecem a definir; a [análise de taxa](analise-taxa-checkout.md) registra a justificativa e os cenários, e a [política por motivo](politica-cancelamento-proposta.md) registra V2-D10.

### Problema e resultado esperado

A base de produto identifica descoberta fragmentada, dúvidas sobre disponibilidade, negociação dispersa e dificuldades para coordenar retirada e confiança. A V2 busca oferecer uma experiência mais coerente de descoberta até conclusão e ferramentas para operar a plataforma.

Ainda precisamos priorizar quais problemas atuais mais prejudicam usuários e definir o resultado mensurável que justificará o lançamento. Não há pesquisa nova, baseline de conversão ou meta numérica aprovada nesta revisão.

## 2 Contexto e vocabulário

| Conceito | Significado para este planejamento |
| --- | --- |
| `SELL` | Oferta de bem físico por preço em euros. |
| `GIVE_AWAY` | Doação de bem físico, sem cobrança pelo item. |
| `WANTED` | Pedido de um bem; não é uma venda automática do autor. |
| Oferta | Proposta estruturada de valor, separada de mensagem livre. |
| Reserva | Compromisso sobre a disponibilidade do anúncio. No checkout integrado, há 3 dias ordinários para retirada após pagamento confirmado, com prorrogação por acordo, e janela final de 48 horas para resolução. Exclusividade durante checkout, avisos e consequências financeiras precisam de regra exata. |
| Checkout | Fluxo de pagamento integrado. Abrir ou fechar a tela não comprova pagamento. |
| Pagamento direto | Acerto entre participantes fora do checkout, como dinheiro; não gera confirmação do provedor integrado. |
| Taxa da plataforma | Receita sobre venda paga pelo checkout; distinta do custo cobrado pelo provedor. |
| Repasse | Crédito ao vendedor conforme regras do provedor e política ainda a definir; não é sinônimo de pagamento confirmado pelo comprador. |
| Retirada | Entrega física local, separada do pagamento. |
| Código de retirada e QR Code | Duas formas de apresentar a mesma confirmação de retirada: comprador apresenta; vendedor digita o código ou lê o QR. |
| Moderação | Revisão de denúncias e aplicação de políticas. |
| Administração | Correções e gestão autorizadas da plataforma; permissões e campos editáveis precisam ser definidos. |

## 3 Escopo

### Confirmado como direção da V2

| Área | Compromisso de direção | Detalhamento necessário |
| --- | --- | --- |
| Experiência | Repaginação completa das telas aprovadas | Prioridade, cobertura e critérios por fluxo |
| Marketplace | Manter bens físicos, Braunschweig, retirada local e acesso aberto | Compatibilidade com registros existentes |
| Tipos | Preservar `SELL`, `GIVE_AWAY` e `WANTED` | Regras específicas e eventuais ajustes de fluxo |
| Confiança | Verificação universitária opcional | Preservar privacidade e validade vigente, salvo nova decisão |
| Checkout | Cobrar ao reservar antes do encontro | Bloqueio do item, confirmação, falhas, desistência e conflito |
| Métodos | Vendedor escolhe os aceitos, incluindo alternativa direta | Métodos integrados concretos e alterações após acordo |
| Monetização | Comprador paga 3% do preço acordado + €0,30 por compra no checkout | Arredondamento, custos, política de devolução e exibição final |
| Repasse | Vendedor recebe somente depois da retirada no caminho integrado, confirmada por código ou QR | Exceções, prazo e capacidade do provedor |
| Administração | Ampliar operação conforme telas aprovadas | Matriz de acesso, auditoria e limites de edição |

### Base a preservar e revisar

Cadastro, sessão, recuperação de acesso, perfil, anúncios, fotos, descoberta, busca, filtros, favoritos, mensagens, negociação, reserva, retirada, denúncias, bloqueio, moderação e suporte continuam sendo a base do produto. A V2 precisa verificar a continuidade de cada jornada; esta lista não afirma que toda implementação atual já foi validada em produção.

Inglês e alemão continuam como base existente. O idioma inicial vigente é inglês, conforme AD-020. Acrescentar idioma exige nova decisão.

### Sem inclusão aprovada nesta V2

Trocas, serviços, moradia, empregos, envio, pontos oficiais de encontro, aplicativo nativo, funcionalidades específicas de PWA, avaliações públicas, IA e expansão geográfica não foram solicitados nesta descoberta. O roadmap histórico não os transforma em entregas da V2.

## 4 Personas

| Papel | Necessidade | O que precisamos validar |
| --- | --- | --- |
| Visitante | Encontrar bens locais e entender condições antes de entrar | Clareza de preço, métodos e disponibilidade |
| Comprador | Negociar, reservar, pagar quando aplicável e retirar | Confiança para pagar antes de inspecionar e saída quando algo falha |
| Vendedor ou doador | Publicar, escolher interessado e concluir a transferência | Configuração de recebimento, reservas, ausência e repasse |
| Autor de Wanted | Receber respostas relevantes ao que procura | Separação de pedido, negociação e eventual venda |
| Moderador | Resolver denúncias com contexto permitido | Limites da ação e escalonamento |
| Administrador | Manter dados públicos e operação sob controle | Campos, capacidades, justificativas e histórico |

São papéis derivados do produto existente e das telas, sem validação nova por entrevistas. A definição de quem pode gerenciar acessos administrativos permanece aberta.

## 5 Restrições conhecidas

- O aplicativo V1 continua sujeito às especificações existentes enquanto a V2 é elaborada.
- As telas aprovadas não definem sozinhas contratos de pagamento, permissões ou políticas de reembolso.
- A direção de devolução por motivo foi aprovada em V2-D10; prazos, critérios, evidências, contestação e execução precisam ser especificados. A retenção da taxa ainda depende de validação jurídica.
- Processamento financeiro depende de um provedor compatível. Não prometemos custódia, proteção ao comprador ou liberação condicionada à retirada antes de comprovar capacidade e aprovar política.
- Emails privados e endereços precisos não podem virar dados públicos. O selo universitário não é identidade civil nem garantia de transação.
- Layouts administrativos aprovados excluem acesso geral a conversas privadas. A nova matriz deverá preservar essa fronteira.
- Taxas, valores e métodos ilustrados nas telas são exemplos. Não constituem tabela comercial da V2.

## 6 Requisitos funcionais

Os identificadores abaixo organizam a descoberta. Os requisitos marcados como direção precisam de critérios de aceitação e especificação aprovada antes da implementação.

| ID | Comportamento esperado | Estado |
| --- | --- | --- |
| RF-V2-01 | Oferecer a experiência visual aprovada nas jornadas públicas, de conta e de operação | Direção confirmada; cobertura pendente |
| RF-V2-02 | Preservar descoberta pública e participação cadastrada sem obrigar verificação universitária | Continuidade confirmada |
| RF-V2-03 | Permitir ao vendedor escolher os métodos aceitos e mostrá-los antes do acordo | Confirmado; lista e edição pendentes |
| RF-V2-04 | No caminho integrado de venda, solicitar pagamento ao reservar, antes do encontro | Confirmado; ciclo da reserva pendente |
| RF-V2-05 | Permitir alternativa de dinheiro ou pagamento direto quando aceita pelo vendedor | Confirmado; registro da conclusão pendente |
| RF-V2-06 | Cobrar do comprador 3% do preço acordado + €0,30 por compra no checkout, exibindo preço, taxa e total antes do pagamento | Pagador e fórmula aprovados; arredondamento e devolução pendentes |
| RF-V2-07 | Diferenciar pagamento, repasse e retirada na experiência e no histórico | Base das telas; detalhamento pendente |
| RF-V2-08 | Oferecer administração ampliada com ações explicitamente autorizadas | Direção confirmada; matriz pendente |
| RF-V2-09 | Manter doação sem checkout financeiro e Wanted como resposta privada, conforme referência aprovada | Base visual; reconciliar com regras V2 |
| RF-V2-10 | Preservar segurança, denúncia, bloqueio e moderação nas novas jornadas | Continuidade a detalhar |
| RF-V2-11 | No checkout integrado, impedir repasse ao vendedor antes da retirada | Condição e confirmação por código/QR definidas; exceções e regras financeiras pendentes |
| RF-V2-12 | Permitir ao comprador apresentar código de retirada ou QR Code equivalente e ao vendedor validá-lo por digitação ou leitura para confirmar a retirada | Fluxo aprovado; validade, tentativas, reemissão e exceções pendentes |
| RF-V2-13 | Permitir ao comprador cancelar antes da retirada física sem antecedência mínima, aprovação discricionária do vendedor ou multa adicional, aplicando a devolução por motivo de V2-D10 | Aprovado em V2-D11; concorrência, motivos, prazos de reserva e procedimentos pendentes |
| RF-V2-14 | Oferecer prazo ordinário de retirada de 3 dias após pagamento confirmado e prorrogação por acordo entre comprador e vendedor | Aprovado em V2-D12, refinado por V2-D13; contagem, acordo, limites e avisos pendentes |
| RF-V2-15 | Após os 3 dias, abrir janela de 48 horas para ambas as partes resolverem retirada, extensão bilateral ou cancelamento; encerrar ao fim casos sem resposta, retirada, extensão ou conflito registrado | Formato aprovado em V2-D13 e duração em V2-D14; padrão financeiro sem evidência definido em V2-D15, procedimentos pendentes |
| RF-V2-16 | No vencimento, conferir registros autorizados e manifestações; revisar humanamente indício concreto ou divergência relevante; sem evidência relevante após oportunidade de manifestação, devolver produto e taxa | Aprovado em V2-D15; sinais, responsável, prazo, revisão inconclusiva e execução financeira pendentes |

Cancelamento, reembolso, disputa, notificações, onboarding de recebimento e tratamento de falhas de pagamento ainda precisam de definição. Não serão preenchidos com regras inventadas.

Direção aprovada: [política de cancelamento e devolução da taxa](politica-cancelamento-proposta.md), com retenção apenas em desistência voluntária do comprador quando legalmente permitida e devolução integral em falha do vendedor, item divergente ou falha da plataforma. O aviso antes do pagamento também integra a direção; contrato, validação jurídica, prazos, evidências e redação final permanecem pendentes. Direitos legais aplicáveis prevalecem.

V2-D11 adota o [veredito do júri](juri-cancelamento.md): cancelamento comunicado e ausência são situações diferentes. Uma desistência isolada não gera sanção automática; medidas proporcionais para abuso comprovado precisam de critérios, revisão e especificação. Entrega já realizada não se torna cancelamento automático apenas porque falta validar o código/QR.

**V2-D13 e V2-D14 aprovadas:** os três dias são prazo ordinário de retirada, seguidos de janela final de 48 horas para resolução e encerramento de casos sem resposta e sem conflito. A comunicação antes do pagamento deve informar ambos os prazos; não anunciar três dias como máximo total de bloqueio. O fluxo sem prorrogação ou conflito soma 5 dias; conflito não tem prazo de revisão definido nesta decisão. O [registro do júri](juri-vencimento-reserva.md) preserva a análise e o dissenso. Fechamento financeiro e avisos permanecem pendentes. Alegação de entrega ou conflito impede encerramento financeiro automático e exige resolução própria.

**V2-D15 aprovada:** revisão humana apenas diante de indício concreto ou divergência relevante, após verificação de registros autorizados e oportunidade de manifestação. Sem evidência relevante, devolver item e taxa integralmente. O [júri financeiro](juri-reembolso-vencimento.md) preserva a análise e suas limitações. Essa regra não resolve sozinha a assimetria entre desistência comunicada e vencimento sem motivo comprovado; V2-D10 permanece vigente como direção até nova decisão explícita. Revisão tem de ter prazo e resultado definidos; ambos ainda estão pendentes, sem permitir retenção indefinida.

## 7 Requisitos não funcionais

| ID | Qualidade a demonstrar | Critério ainda a fechar |
| --- | --- | --- |
| RNF-V2-01 | Jornadas responsivas em inglês e alemão | Matriz de larguras, navegadores e conteúdo longo |
| RNF-V2-02 | Acessibilidade dos fluxos completos | Alvo, teclado, leitor de tela, foco e movimento reduzido |
| RNF-V2-03 | Autorização e privacidade em toda leitura e alteração | Evidências por ator, objeto e operação |
| RNF-V2-04 | Consistência sob concorrência e falha | Sem cobrança duplicada ou dois compradores confirmados para o mesmo item |
| RNF-V2-05 | Estados financeiros e operacionais compreensíveis e auditáveis | Histórico permitido, reconciliação e recuperação |
| RNF-V2-06 | Desempenho e operação sustentáveis | Volume, latências, disponibilidade, custo e recuperação sem números presumidos |

## 8 Jornadas

### Compra com checkout integrado

Descobrir → abrir anúncio e métodos aceitos → conversar ou propor valor → acordo → pagamento ao reservar → combinar encontro → conferir item e realizar retirada → comprador apresenta código ou QR → vendedor valida → retirada confirmada → liberação do repasse conforme contrato do provedor → conclusão.

O repasse ao vendedor só pode ocorrer depois da retirada. Há 3 dias ordinários para retirada após pagamento confirmado, prorrogáveis por acordo, seguidos de janela final de 48 horas para resolução. A confirmação escolhida usa código ou QR Code equivalentes; não exige as duas formas. **Questões abertas:** exclusividade durante checkout, confirmação da reserva, contagem e comunicação dos prazos, consequências financeiras do encerramento, validade e tentativas do código, falha de conexão, confirmação contestada, liberação do repasse e execução do reembolso. A falha ou resultado incerto do pagamento não pode aparecer como sucesso sem evidência.

### Compra com pagamento direto

Descobrir → verificar métodos aceitos → acordo e reserva conforme regra própria → combinar encontro → conferir item → acerto direto → retirada e conclusão. Não há comprovação financeira do provedor neste caminho.

### Venda

Configurar métodos e recebimento aplicável → publicar → receber interesse e negociar → acompanhar reserva e pagamento → combinar retirada → entregar → digitar o código apresentado pelo comprador ou escanear seu QR → acompanhar confirmação, liberação e repasse quando houver. O repasse integrado só ocorre depois da retirada; exceções e prazo até crédito bancário permanecem abertos. O uso de código/QR em pagamento direto ou doação ainda não foi decidido.

### Doação e Wanted

Doação segue interesse, reserva e retirada sem cobrança. Wanted recebe resposta privada sem iniciar checkout no próprio pedido. Se a V2 conectar a resposta a uma venda, essa transição precisará de definição explícita.

### Administração

Entrada condicionada à permissão → localizar registro → consultar campos permitidos → propor correção com motivo → revisar antes e depois → confirmar → consultar atividade. Gestão de equipe, moderação e publicação de conteúdo exigem permissões próprias a aprovar.

### Falhas e exceções

Definir caminhos para pagamento recusado ou incerto, duas tentativas concorrentes, desistência, ausência, item divergente, reembolso pendente, repasse falho, sessão expirada e acesso revogado. Cada caminho precisa de ator responsável, próximo passo e estado final verificável.

## 9 Métricas de sucesso

Proposta para discussão, sem metas aprovadas:

- Descoberta: proporção de visitas que chegam a anúncio relevante e a uma interação.
- Publicação: anúncios iniciados, publicados e abandonados por etapa.
- Liquidez: anúncios que chegam à retirada concluída e tempo até acordo.
- Checkout: início, confirmação, recusa e abandono, separados de retirada e repasse.
- Qualidade da transação: cancelamento após pagamento, ausência, reembolso e incidentes.
- Receita: taxas efetivamente recebidas, custos do provedor e taxas devolvidas, sem confundir volume vendido com receita.
- Operação: tempo de resposta a denúncias e falhas pendentes de resolução.

Precisamos aprovar definições, baseline, período, meta e dono de cada métrica. Menos tempo em tela ou mais mensagens não demonstram melhora por si só.

## 10 Dependências e pré condições

1. Fechar regras de reserva, pagamento antecipado, taxas, recebimento e cancelamento.
2. Validar provedor e métodos por documentação atual e ambiente de teste, depois das escolhas de produto.
3. Aprovar matriz administrativa e processo de acesso inicial, revogação e auditoria.
4. Reconciliar telas com pagamento antes do encontro e completar exceções, idiomas e acessibilidade.
5. Inventariar dados existentes, usuários afetados e registros abertos para transição V1 → V2.
6. Definir responsáveis por suporte, moderação e incidentes financeiros e operacionais.
7. Aprovar métricas, condições de lançamento e plano de migração e retorno seguro.

MCPs e skills são ferramentas de desenvolvimento; não são dependências de execução do produto nem autorização para publicar dados no Notion.

## 11 Fontes e decisões abertas

Fontes internas: [visão V1](../00-product-vision.md), [domínio](../01-domain-model.md), [escopo V1](../02-mvp-scope.md), [política](../03-marketplace-policy.md), [roadmap](../04-roadmap.md), [futuro](../05-future-capabilities.md), [estado](../../../.specs/STATE.md), [design](../../../DESIGN.md) e [consolidação aprovada](../../../design/APPROVED-PRODUCT.md).

Os exemplos Koviq orientam organização e rastreabilidade, conforme [registro de descoberta](descoberta.md). As respostas humanas de 17/10/2026 prevalecem sobre jornadas de design anteriores nos documentos de planejamento V2, sem alterar automaticamente os contratos V1.

Pontos imediatos: decidir a assimetria da taxa entre desistência comunicada e vencimento sem evidência; definir responsável, sinais e prazo de revisão, avisos e execução financeira; depois, exclusividade durante checkout. Estão confirmados taxa, repasse pós-retirada, código/QR, devolução por motivo, cancelamento antes da retirada sem multa adicional, 3 dias ordinários mais 48 horas e revisão seletiva com devolução integral sem evidência relevante. Rodadas seguintes: exceções do código/QR; métodos e onboarding; administração; objetivos e migração. Aprovação final deste PRD e das especificações de implementação permanece pendente.
