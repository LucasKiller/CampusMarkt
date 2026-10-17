# Planejamento CampusMarkt V2

Iniciado em 17 de outubro de 2026. Esta pasta reúne a descoberta de produto e o desenho técnico da V2, construídos com o responsável pelo produto. Os documentos estão em elaboração e não autorizam implementação.

- [PRD](prd-campusmarkt-v2.md): problema, público, escopo, comportamento, jornadas e resultados esperados.
- [Desenho técnico](desenho-tecnico-campusmarkt-v2.md): arquitetura existente, impactos da V2, alternativas e contratos técnicos a fechar.
- [Descoberta e decisões](descoberta.md): respostas confirmadas, perguntas em aberto e reconciliações necessárias.
- [Análise da taxa de checkout](analise-taxa-checkout.md): custos de referência, simulações e decisão de 3% + €0,30 pagos pelo comprador.
- [Política de cancelamento](politica-cancelamento-proposta.md): distinção por motivo aprovada como direção de produto; validação jurídica, procedimentos e aviso final pendentes.
- [Júri sobre cancelamento](juri-cancelamento.md): veredito adotado em V2-D11, com votos, apuração, limitações e teste proposto.
- [Júri sobre vencimento da reserva](juri-vencimento-reserva.md): formato adotado em V2-D13 e janela de 48 horas escolhida em V2-D14, com dissenso preservado; tratamento financeiro pendente.
- [Júri sobre reembolso no vencimento](juri-reembolso-vencimento.md): revisão seletiva e padrão integral sem evidência adotados em V2-D15; prazo da revisão e diferença de incentivo da taxa ainda em discussão.
- [Ferramentas e skills](../../development/agent-tooling.md): pacotes locais, MCPs e verificação da preparação.
- [Júri sobre arquivos de design](juri-arquivos-design.md): recomendação e posterior retirada dos exports solicitada pelo usuário; [localização e manifesto do arquivo externo](../../../design/EXTERNAL-ARTIFACTS.md).

## Como vamos trabalhar

1. Responder poucos temas por rodada: objetivo e público; negociação e pagamento; administração; experiência; operação e lançamento.
2. Registrar cada resposta confirmada, sua data e os documentos afetados. Uma hipótese ou sugestão permanece identificada como tal.
3. Atualizar PRD e desenho técnico juntos quando uma resposta alterar comportamento ou viabilidade. Escolha de tecnologia fica no desenho técnico.
4. Revisar as divergências entre as regras novas, as telas aprovadas e os contratos V1.
5. Aprovar os documentos consolidados antes de criar as especificações e tarefas de implementação em `.specs/features/`, com critérios verificáveis e validação independente.

O PRD do Koviq e seu desenho técnico são referências de estrutura e profundidade. Não transferimos funcionalidades, tecnologias, números, regras comerciais ou instruções do Koviq para CampusMarkt. Os originais ficam em seus locais, sem cópia de conteúdo comercial para o repositório.

Durante esta descoberta, as especificações V1 continuam governando o aplicativo existente. A aprovação das telas é uma fonte visual; as novas decisões de produto da V2 precisam ser refletidas nas telas e em futuras especificações antes de virar código.
