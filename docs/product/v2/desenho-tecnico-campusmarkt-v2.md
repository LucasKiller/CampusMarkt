# Desenho técnico CampusMarkt V2

**Estado:** estrutura inicial em elaboração. **Revisão:** 0.10, 17 de outubro de 2026. **Aprovação integral:** pendente.

Este documento relaciona a [direção de produto V2](prd-campusmarkt-v2.md) com a arquitetura existente e os contratos que precisam mudar. O checkout cobra ao reservar antes do encontro, e o vendedor só recebe depois da retirada. O comprador apresenta código de retirada ou QR Code equivalente, que o vendedor valida digitando ou escaneando. Exceções e mecanismo financeiro de liberação ainda serão definidos. Não há provedor selecionado, schema financeiro aprovado ou autorização de implementação.

## 1 Base e critérios de decisão

Começamos pela base existente, sem tratar a V2 como autorização para reescrever a plataforma. O desenho deve preservar regras fora da UI, autorização no servidor e na fronteira de dados, privacidade e rastreabilidade.

| Base documentada ou observada | Fonte | Tratamento nesta revisão |
| --- | --- | --- |
| Monólito modular TypeScript com Next.js | AD-003 e AD-006; manifests existentes | Base atual; nenhuma troca decidida |
| Supabase próprio com PostgreSQL, Auth, Storage e Realtime quando necessário | AD-006 | Base atual; não assumir serviço gerenciado |
| Mutações de identidade pelo BFF de mesma origem | AD-007 | Preservar fronteira existente |
| RLS, grants e RPCs para regras e acesso | AGENTS.md e decisões de domínio | Verificar em cada nova capacidade |
| Docker Compose e implantação existente em Coolify | Estado e infraestrutura existentes | Inventariar antes de escolher topologia V2 |
| Inglês e alemão, padrão inglês | AD-020 | Preservar salvo nova decisão |
| Mensagens com reparos e limitações registradas | Handoff da feature 025 | Não prometer Realtime já validado |

É uma leitura inicial dos documentos e manifests, não uma auditoria completa do runtime. Não importamos Python, LangGraph, agentes de IA ou integrações comerciais do exemplo Koviq.

## 2 Contexto e limites

| Ator ou sistema | Responsabilidade | Fronteira |
| --- | --- | --- |
| Visitante e participante | Descobrir e realizar interações permitidas | Navegador sem segredos ou autoridade própria |
| CampusMarkt | Anúncio, negociação, disponibilidade, reserva, retirada e acesso | Regras em aplicação e domínio com persistência autorizada |
| Provedor financeiro futuro | Processar pagamentos e repasses conforme contrato | Integração ainda a escolher; fatos financeiros confirmados pelo provedor |
| Moderador e administrador | Executar capacidades explicitamente concedidas | Negação por padrão, verificação no servidor e trilha |
| Ferramentas do agente | Auxiliar documentação, implementação e verificação | Fora da aplicação e sem permissão implícita para produção |

O desenho C4 de contexto e containers será consolidado após decisões de recebimento, provedor e operação. Esta revisão não presume serviço novo ou fila externa.

## 3 Organização e módulos

| Área | Base ou impacto esperado | Requisito relacionado |
| --- | --- | --- |
| Identidade e perfil | Sessões, privacidade, verificação opcional e eventual onboarding de recebimento separado | RF-V2-02 e RF-V2-03 |
| Anúncios e descoberta | Novo visual, disponibilidade e projeção de métodos aceitos | RF-V2-01 e RF-V2-03 |
| Negociação e reserva | Integrar pagamento antecipado sem perder invariantes de exclusividade | RF-V2-04 e RF-V2-05 |
| Pagamentos e retirada | Integração, taxa, confirmação por código/QR, liberação após retirada e reconciliação a especificar | RF-V2-04, RF-V2-06, RF-V2-07, RF-V2-11 e RF-V2-12 |
| Mensagens e segurança | Continuar acesso por participante, bloqueio e privacidade | RF-V2-10 |
| Administração | Capacidades, correções, revisão e auditoria | RF-V2-08 |
| Experiência compartilhada | Tokens aprovados, componentes, idiomas e estados | RF-V2-01 e RNF-V2-01/02 |

São áreas de responsabilidade, não instruções para criar pacotes, tabelas ou serviços vazios. Estrutura de diretórios e interfaces finais serão derivadas das especificações aprovadas e dos consumidores reais.

## 4 Reserva e pagamento antecipado

### Decisão que muda o desenho

O caminho integrado cobra antes da retirada. A jornada anterior de inspecionar e só então pagar deve ser reconciliada. Pagamento não prova entrega; entrega não prova que um repasse foi liquidado.

A decisão V2-D07 permite recebimento pelo vendedor somente depois da retirada, e V2-D09 escolhe confirmação por código ou QR Code apresentado pelo comprador e validado pelo vendedor. O provedor deve suportar um arranjo compatível; a decisão não autoriza CampusMarkt a manter fundos por conta própria. Momento da solicitação de liberação, prazo bancário e exceções permanecem abertos. A seleção do provedor deve tratar essa condição como requisito eliminatório.

### Contratos por definir

V2-D11 aprova cancelamento voluntário pelo comprador antes da retirada física sem antecedência mínima, aprovação discricionária do vendedor ou multa adicional. A operação deve seguir V2-D10, invalidar a confirmação de retirada quando cancelada e impedir disputa de estado entre cancelamento, consumo do código/QR, conclusão e repasse. Alegação de entrega já realizada exige tratamento próprio, não cancelamento automático por falta de código. V2-D12 define reserva paga de até 3 dias a partir da confirmação do pagamento, prorrogável por acordo. Contagem exata, consequências do vencimento e critérios de abuso permanecem abertos.

V2-D13 refina V2-D12: após os 3 dias ordinários de retirada, abrir janela final de resolução por ambas as partes; V2-D14 define sua duração em 48 horas a partir do fim do prazo ordinário vigente. Encerramento ao fim para casos sem resposta, retirada, extensão bilateral ou conflito registrado. Execução financeira e prazos de revisão de conflitos ainda não estão especificados. Não anunciar os 3 dias como máximo absoluto de bloqueio; fluxo sem extensão ou conflito soma 5 dias. Não há retenção automática de taxa ou sanção aprovada pelo simples vencimento.

O contrato futuro precisa registrar prazo ordinário, fim da janela final e acordo bilateral de prorrogação, com autorização, versão e trilha. Não inferir extensão por mensagem isolada ou ação unilateral. Expiração deve verificar estado e versão atuais e concorrer com prorrogação, cancelamento, registro de conflito e confirmação de retirada sem produzir liberação ou reembolso duplicado. Vencer o prazo não comprova ausência culpável nem autoriza repasse sem retirada. Um conflito de entrega exige fluxo separado e impede encerramento financeiro ou nova venda automática incompatível com o caso pendente.

- Aquisição e duração de exclusividade temporária enquanto o comprador paga.
- Momento de confirmação da reserva e possibilidade de retomada após falha ou autenticação adicional.
- Congelamento do preço acordado, taxa e método; tratamento de edição do anúncio durante a tentativa.
- Resultado quando confirmação financeira chega após expiração, cancelamento ou suspensão.
- Cancelamento, reembolso e liberação da disponibilidade sem vender duas vezes ou perder rastro financeiro.
- Identidade do beneficiário, onboarding e mecanismo de recebimento apenas após retirada, com limites de prazo e responsabilidades definidos no contrato do provedor.
- Como tratar ausência de confirmação por código/QR, confirmação contestada e disputa antes de liberar o recebimento.

### Propriedades técnicas a especificar

Propostas derivadas do risco do novo fluxo, sujeitas à especificação:

- Operações repetidas não podem duplicar cobrança, taxa, reembolso ou transição.
- Eventos externos precisam de autenticidade, deduplicação e tratamento de atraso e ordem diferente.
- Transições concorrentes devem verificar estado atual e versão na fronteira transacional.
- Resultado incerto requer consulta e reconciliação antes de nova cobrança.
- Separar fatos do provedor de estados do marketplace e do status bancário do repasse.
- Credenciais e decisões financeiras permanecem no servidor; não armazenar dados brutos de cartão.
- Taxa precisa de cálculo verificável, arredondamento, representação monetária exata e política de devolução aprovada.

Não há enum final nem diagrama de estados financeiro nesta revisão: ambos dependem das respostas de produto e do contrato real do provedor.

### Confirmação da retirada por código e QR

O comprador apresenta a confirmação no encontro; o vendedor pode digitar o código ou ler o QR com a câmera. São duas representações do mesmo segredo de retirada, vinculado a uma transação, e não duas autorizações independentes. A leitura do QR precisa passar pela mesma validação no servidor usada pela digitação.

Conforme a direção de segurança já documentada em `docs/product/05-future-capabilities.md`, o contrato deverá exigir segredo de uso único, validade limitada, proteção contra adivinhação, verificação de participante e estado atual e armazenamento não reversível quando viável. O valor bruto não deve aparecer em logs, telemetria ou ferramentas administrativas. Isso não fixa tamanho, duração ou quantidade de tentativas nesta descoberta.

Validação e consumo precisam impedir reutilização e confirmação concorrente, sem duplicar solicitação de repasse. Falha de leitura mantém a alternativa de digitação; resultado de rede incerto requer consulta ao estado autorizado antes de repetir. Não registrar confirmação apenas porque o QR foi lido localmente. Reemissão, expiração, recuperação, ausência de conexão e contestação precisam de política explícita. A confirmação não comprova crédito bancário e não cria sozinha garantia de proteção ao comprador.

O escopo aprovado desta escolha é o caminho integrado. Uso em doação ou pagamento direto permanece aberto.

### Taxa aprovada e custos em avaliação

V2-D15 aprova a verificação dos registros autorizados e manifestações no vencimento, com revisão humana para indício concreto ou divergência relevante e padrão integral de devolução de produto e taxa sem evidência relevante após oportunidade de manifestação. Checagens devem ser determinísticas e autorizadas; não inferir culpa de silêncio ou código ausente nem conceder acesso geral a conversas privadas. Responsável, sinais, prazo de revisão, resultado inconclusivo e estados financeiros precisam ser especificados. Não bloquear o preço inteiro apenas por discussão da taxa sem critério próprio. Essa aprovação não modifica V2-D10 sobre desistência voluntária.

V2-D10 aprova a direção de reembolso por motivo em [política de cancelamento](politica-cancelamento-proposta.md). O contrato futuro deverá distinguir valor do item, taxa da plataforma, valor devolvido e custos não recuperados, com motivo auditável e autorização. Retenção por desistência voluntária depende de validação jurídica; falha do vendedor, divergência no item ou falha da plataforma prevê devolução também da taxa. Prazos, evidências, revisão de motivo e execução financeira permanecem abertos.

A decisão V2-D08 aprova cobrar do comprador 3% do preço acordado + €0,30 por compra no checkout, sem descontar essa taxa da plataforma do preço do vendedor. A UI deve mostrar item, taxa e total antes da confirmação de pagamento. Ver [análise de taxa](analise-taxa-checkout.md) para referências oficiais e simulações. Não há decisão de contratar Stripe ou outro provedor.

Comparar custo do pagamento sobre o total cobrado, custo por vendedor ativo, repasse e roteamento, além de devoluções, contestações, tributos e suporte. Uma margem positiva antes desses custos não demonstra viabilidade. Antes do lançamento, validar a fórmula aprovada com cenários de ticket e frequência de venda representativos; eventual subsídio de piloto precisa ser explícito. Arredondamento, versionamento da taxa por compra e tratamento de devoluções ainda precisam de especificação.

## 5 Administração e autorização

A referência aprovada separa membro, moderação, administração e gestão de acessos. A implementação precisa de uma matriz com **ator, recurso, ação, campos permitidos, condições e trilha**.

Pontos obrigatórios para fechar o contrato: origem confiável dos acessos; operador inicial; alterações e revogações; reautenticação quando aplicável; prevenção de autoelevação e perda do último gestor; conflitos entre edição do dono e correção administrativa; justificativa e antes/depois gravados atomicamente; retenção e leitura do histórico.

Preço, propriedade, estados de negociação e ações financeiras não se tornam editáveis por existir uma tela genérica de administração. A referência atual permite correções públicas limitadas e exclui conversas privadas. A definição final de campos e permissões continua pendente.

## 6 Dados e migração

Antes do schema V2, inventariar anúncios, ofertas, reservas, conversas, perfis, verificações e acessos existentes, distinguindo implementação local de versão publicada. Definir como continuar interações abertas e quais exigem adesão explícita ao novo checkout.

Não converter reserva V1 em cobrança nem cobrar taxa retroativa por inferência. Proposta de transição a aprovar: preservar a modalidade acordada nos registros anteriores e iniciar o novo fluxo apenas quando as condições forem conhecidas pelos participantes.

Cada mudança precisa de migração versionada, compatibilidade, grants e RLS explícitos, ensaio com dados de teste e estratégia de retorno. Reverter interface ou aplicação não desfaz um efeito financeiro externo; o plano precisa preservar reconciliação e suporte.

## 7 Interface e contratos

Usar [DESIGN.md](../../../DESIGN.md), [produto aprovado](../../../design/APPROVED-PRODUCT.md) e tokens aprovados como fontes de design. Confirmar inventário de componentes no aplicativo antes de decidir biblioteca ou importação de tokens.

As interfaces precisam cobrir inglês e alemão, telas estreitas, conteúdo longo, teclado, foco, leitor de tela, movimento reduzido e retomada de falhas. Métodos de pagamento só podem aparecer quando realmente suportados para o contexto pelo provedor escolhido.

O backend deve devolver estados inequívocos e projeções mínimas. Esquemas de API, erros, paginação e atualização de estado serão especificados por capacidade, preservando regras reutilizáveis por futuros clientes sem criar um cliente móvel agora.

## 8 Operação e observabilidade

Definir capacidade esperada, orçamento, responsáveis, disponibilidade e objetivos de recuperação. O histórico de operação registra bloqueios de segurança, backup e recuperação que precisam ser reavaliados antes da V2; novo visual não os resolve.

Para checkout, planejar rastreio por identificadores de negócio e do provedor, monitoramento de eventos pendentes, reconciliação, alertas e procedimento para pagamento confirmado sem estado correspondente. Evitar segredos, emails e corpos de conversa em telemetria comum.

Escolha de hospedagem, recursos extras e ferramenta de observabilidade só será proposta depois de inventariar a operação e fechar requisitos. Nenhuma infraestrutura será provisionada nesta descoberta.

## 9 Verificação e entrega

As especificações futuras devem rastrear aceitação a RF-V2/RNF-V2 e derivar testes do comportamento. Cobertura necessária inclui:

- Exclusividade do item, confirmação tardia, duplicidade de eventos e tentativas concorrentes.
- Cobrança, taxa, cancelamento e reembolso conforme política aprovada.
- Equivalência entre código e QR; negação a outro vendedor/transação; validade, tentativas, uso único, concorrência e retomada após resultado incerto, conforme contrato futuro.
- Negação por ator e recurso, incluindo dono, outro usuário, moderador e administrador.
- Preservação de registros V1 e privacidade das projeções públicas.
- Jornadas completas de compra, venda, doação, Wanted e administração.
- Responsividade, idiomas, acessibilidade e recuperação após falha.

Playwright MCP ajuda a inspecionar jornadas, mas não substitui testes versionados nem validação independente. Encerrar servidores e processos de teste imediatamente após a verificação.

## 10 Decisões e próximos estudos

| Tema | Estado | Próxima evidência |
| --- | --- | --- |
| Renovar produto com checkout e administração | Confirmado como direção | PRD consolidado e aprovado |
| Cobrar ao reservar antes do encontro | Confirmado | Política de reserva, desistência e ausência |
| Alternativa de pagamento direto | Confirmado | Regras por método e conclusão |
| Taxa por venda no checkout | Comprador paga 3% do preço acordado + €0,30 | Arredondamento, custos, versionamento e devolução |
| Repasse somente depois da retirada | Condição de produto confirmada | Código ou QR validados pelo vendedor; regra financeira, exceções, prazo bancário e viabilidade do provedor pendentes |
| Código de retirada com QR equivalente | Fluxo confirmado em V2-D09 | Validade, tentativas, uso único, recuperação, conflitos e composição das telas |
| Cancelamento antes da retirada sem multa adicional | Confirmado em V2-D11 | Expiração da reserva, conflito com entrega/código, critérios e revisão de abuso |
| Reserva paga por até 3 dias, prorrogável por acordo | Confirmado em V2-D12 | Contagem, aceite bilateral, limites de prorrogação, avisos e tratamento da expiração |
| 3 dias ordinários mais janela final de 48 horas | Formato confirmado em V2-D13 e duração em V2-D14 | Aviso dos dois prazos, extensões, encerramento sem resposta e tratamento financeiro/conflitos |
| Revisão seletiva no vencimento e padrão integral sem evidência relevante | Confirmado em V2-D15 | Sinais, projeções autorizadas, responsável, prazos, revisão inconclusiva, reconciliação e assimetria da taxa |
| Provedor e métodos integrados | Aberto | Comparação documentada após fechar necessidades |
| Arquitetura existente como ponto de partida | Base atual | Inventário técnico e decisão sobre alterações |
| Matriz administrativa | Aberto | Aprovação por capacidade e campo |
| Migração e lançamento | Aberto | Dados abertos, ensaio, operação e retorno |

As escolhas externas serão verificadas em documentação oficial atual antes de virar decisão técnica. Nenhuma alegação de fornecedor ou preço do exemplo Koviq é adotada aqui.
