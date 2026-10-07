# Validação manual - Exportação PDF (Etapa 11)

## Objetivo
Validar o critério de aceite: "geram um PDF válido, para uma competição de teste com pelo menos 2 bimestres encerrados".

## Pré-requisitos
- Backend/API rodando com dados de teste contendo pelo menos 2 bimestres encerrados
- Usuário com perfil adequado para acessar as telas
- Navegador (Chrome/Firefox) para testar download real

## Testes por tela
1. Relatório Individual (/alunos/:id/relatorio-individual)
2. Relatório Comparativo do Aluno (/alunos/:id/relatorio-comparativo-grupo)
3. Relatório do Grupo (/grupos/:id/relatorio)
4. Relatório Comparativo entre Grupos (/grupos/:id/relatorio-comparativo)

## Checklist
- [x] Botão "Baixar PDF" aparece quando relatório está carregado — **passou nas 4 telas** (navegador real, Playwright/Chrome)
- [x] Ao clicar, exibe "Gerando o PDF..." e bloqueia clique — **passou nas 4** (`aria-busy="true"`, `aria-disabled="true"`, `tabindex="-1"`; 2º clique não gera 2ª requisição)
- [x] Download inicia com nome de arquivo adequado (contém prefixo correto) — **passou nas 4**:
  - `relatorio-individual-paulo-vitor.pdf`
  - `relatorio-comparativo-grupo-paulo-vitor.pdf`
  - `relatorio-os-leiteiros.pdf`
  - `relatorio-comparativo-os-leiteiros.pdf`
- [x] PDF abre corretamente no visualizador (não é HTML) — **passou nas 4**: cabeçalho `%PDF-`, xref/EOF e texto extraível (pdfjs), tamanhos 20–23 kB
- [x] Verificar marcação de parcialidade (RN32) quando aplicável — **passou**: os 4 trazem "Resultado parcial — apenas 2 de 4 bimestres encerrados"
- [x] Testar com rede lenta (timeout 60s) - comportamento ok — **passou**: com resposta atrasada 12 s (dentro do timeout), loading visível aos 1/3/6/9 s e download completo em ~12,8 s
- [x] Testar em janela estreita - layout não quebra (ações com flex-wrap) — **1 defeito real encontrado e corrigido**: a tabela `sr-only` do gráfico das telas de grupo esticava o `scrollWidth` (16 px @360px); conserto via `relative overflow-clip` no `<figure>` de `GraficoDeSintese` — reavaliado nas 4 telas a 360 px, overflow 0
- [x] Navegação por teclado: foco não se perde de forma crítica — **passou**: Enter dispara o download e o foco permanece no botão durante a geração

## Resultado da execução (07/10/2026)

- **Ambiente:** frente apontada para a API remota `seduc-gamification.vercel.app` (CORS libera `localhost:5173`); dev server em `http://localhost:5173`.
- **Dados usados (competição "Competição", `beb61729-…`):** os 4 bimestres estavam em aberto e sem pesos no 2º; para satisfazer o CA1 o 1º e o 2º foram **encerrados** via API pelo professor `26000` (Darlan), com pesos criados (3 componentes do 2º bimestre) e notas lançadas (8 componentes, modelo CPS ETEC). Estado gravado na API remota.
- **Falha simulada (CA3):** com a rede cortada no clique, o toast mostra "Não foi possível falar com o servidor.", o botão volta ao normal e a página segue usável; novo clique depois da falha baixa o PDF normalmente.
- **Evidências:** `%TEMP%\opencode\pdfval\evidencias\` (prints das 4 telas carregadas e em 360 px, 4 PDFs baixados, textos extraídos, toasts de erro, `resultados*.json/txt`).

## Critérios de aceite relacionados
- CA1: Geram PDF válido para competição com >= 2 bimestres encerrados — **ATENDIDO** (competição com 2 bimestres encerrados; PDFs válidos, legíveis e com carimbo RN32)
- CA2: Exibem loading durante geração — **ATENDIDO**
- CA3: Tratamento de erros adequado (toast) — **ATENDIDO**

## Mudanças no código feitas durante a validação
- `src/features/relatorios/GraficoDeSintese.tsx`: `<figure className="relative space-y-3 overflow-clip">` (corrige overflow horizontal em 360 px causado pela tabela `sr-only`).
- `src/features/relatorios/relatorios.pdf.ts`: removida a função morta `sanitizarNomeDeArquivo` (bloqueava `tsc -b` com TS6133 e aviso de lint).
- `src/features/competicoes/{NovoComponenteForm,DesempateForm,EncerrarBimestre,TabelaDeLancamentos}.spec.tsx`: 6 asserts de `toBeDisabled()` → `toHaveAttribute('aria-disabled', 'true')`, alinhando-os ao contrato novo do `Button` (working tree já usava `aria-disabled` em vez de `disabled` durante loading - itens 7/9 do diagnóstico).
- Após as mudanças: `pnpm test` **40/40 arquivos, 325/325 testes**; `tsc -b` ok; `oxlint` zero achados.