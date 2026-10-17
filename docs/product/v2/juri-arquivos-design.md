# Júri: imagens, PDFs e fontes de design no Git

Data: 17 de outubro de 2026. Consulta solicitada pelo responsável pelo produto com a skill `the-jury`.

## Veredito

Recomendar **B: conjunto essencial no Git, com curadoria conservadora**. Não é necessário versionar toda imagem ou PDF gerado. O formato do arquivo, sozinho, não define seu destino. Esta consulta não executa organização, exclusão, upload, commit ou mudança de `.gitignore`.

Confiança do coordenador: **MÉDIA**. Os três votos foram independentes na primeira rodada e permaneceram em B após deliberação anônima. Modelos distintos da mesma família e ausência de auditoria completa das dependências limitam a independência e a certeza. A unanimidade não comprova quais arquivos podem ser dispensados.

## Evidência local

| Local | Inventário inspecionado | Situação no Git |
| --- | --- | --- |
| `design/` | 375 arquivos visuais, nativos e compactados; 72,55 MiB, incluindo 354 PNG | Não versionados |
| `output/pdf/CampusMarkt-Design-System.pdf` | 1,12 MiB | Não versionado |
| `tmp/` | 41 arquivos visuais/PDF; 5,98 MiB | Não versionados |
| `design/CampusMarkt-Approved.figcraft` | Fonte aprovada de 1,44 MiB, incluída no total de `design/` | Não versionada |

Estar dentro da pasta de trabalho não significa estar no histórico Git. Nenhum arquivo inspecionado se aproxima do limite individual do GitHub. Há 24 Markdown em `design/`, `docs/` e `.specs/` com referências visuais; `DESIGN.md` também aponta para o acervo. O manifesto aprovado contém um caminho absoluto desta máquina. Não há armazenamento externo configurado nem regeneração comprovada de todo o material.

## Critério recomendado para a seleção

| Material | Destino recomendado |
| --- | --- |
| PRD, desenho técnico, decisões, regras visuais, tokens JSON/CSS | Git |
| Assets efetivamente usados pela aplicação | Git, conforme a estrutura da aplicação |
| Fonte editável aprovada e referências necessárias para entender as telas | Git; o tamanho atual é administrável |
| PDF aprovado útil ao handoff, sem equivalente acessível suficiente | Pode ficar no Git; não há proibição geral de PDF |
| Renders temporários, caches, capturas repetidas e arquivos compactados já extraídos | Fora do histórico após verificar que não guardam informação única |
| Explorações ou fontes únicas que não entrarem no conjunto principal | Preservar até definir arquivo durável, acessível e referenciado |

Não aplicar exclusões globais como `*.png` ou `*.pdf`: isso poderia esconder assets válidos. A seleção deve verificar referências, substituir caminhos absolutos por relativos quando cabível e registrar a origem dos arquivos essenciais. Ignorar um arquivo não cria backup. Não publicar referências externas do Koviq por conveniência de organização.

LFS ou armazenamento de artefatos podem ser reavaliados se fontes binárias crescerem ou mudarem com frequência. Não são necessários apenas por existir uma imagem ou PDF. O [GitHub explica os limites por arquivo](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) e o [funcionamento de ponteiros do Git LFS](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage).

## Objeção preservada e teste

Nenhum voto final dissidente. A objeção mais forte favorece A: o volume atual é administrável e uma triagem prematura pode perder o contexto das explorações. Se não for possível identificar o conjunto essencial com segurança, preservar mais arquivos é preferível a excluir informação única.

Premissa mais arriscada: conseguir separar os derivados dispensáveis das fontes e evidências únicas sem prejudicar o handoff.

Teste antes de organizar: mapear as referências, montar a lista candidata e verificar em uma cópia isolada que o conjunto contém a fonte aprovada e permite consultar os documentos e seus visuais sem depender de `tmp/` ou caminhos desta máquina. Esse teste ainda não foi executado.

Próxima ação recomendada: preparar a lista explícita de arquivos a versionar e de materiais a preservar separadamente, antes de alterar sua organização.

## Registro do painel

| Jurado | Lente | Voto inicial | Voto final | Evidência |
| --- | --- | --- | --- | --- |
| 1 | Manutenção e consequências futuras | B, 93 | B, 93 | B |
| 2 | Handoff e risco de perda de contexto | B, 86 | B, 86 | B |
| 3 | Operação e auditoria de evidências | B, 87 | B, 84 | B |

Todos os votos cegos foram recolhidos antes do envio das posições anonimizadas. Sem mudanças de opção; deliberação encerrada após a segunda rodada. [Votos estruturados](juri/arquivos-design-votos.json) e [apuração determinística](juri/arquivos-design-apuracao.txt).

Esta recomendação não modifica as decisões de pagamento da V2. A proposta de rever a retenção da taxa no cancelamento voluntário continua sem resposta do responsável pelo produto.

## Ação posterior solicitada pelo usuário

Após o veredito, o usuário pediu a remoção das imagens e PDFs. Foram retirados da pasta do repositório os exports de documentação e os pacotes auxiliares de referência: 427 arquivos, 84.552.465 bytes, preservados em arquivo externo local e verificados por SHA-256 antes da remoção. Fontes nativas, tokens, textos e assets da aplicação permanecem no projeto. O inventário acima registra o estado anterior à retirada. A [localização e o manifesto](../../../design/EXTERNAL-ARTIFACTS.md) permitem recuperar os exports; não houve exclusão definitiva nem publicação externa.
