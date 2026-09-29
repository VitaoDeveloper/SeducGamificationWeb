# Etapa 11 (GUI) — Exportação dos relatórios em PDF

**Pré-requisito:** Etapa 10 concluída (os quatro relatórios navegáveis em tela).
**Equivalente na API:** `plano-implementacao/11-etapa-relatorios-pdf.md`.
**Endpoints usados:** as mesmas quatro rotas da Etapa 10, com sufixo `.pdf` (ex.: `GET /alunos/:id/relatorio-individual.pdf`), retornando `application/pdf`.

## Contexto para o agente

Esta é a última etapa da rodada atual do plano de GUI, fechando a paridade completa com as 11 etapas já desenvolvidas na API. Relatórios podem ser exportados **a qualquer estágio da competição** (mesmo com bimestres ainda em aberto) — o PDF gerado pela API já sinaliza quando o resultado é parcial; a interface só precisa expor a ação de baixar, sem reimplementar essa lógica.

## Tarefas

1. **Botão "Baixar PDF"** em cada uma das quatro páginas de relatório da Etapa 10, no cabeçalho da página.
2. **Implementação do download:** chamar o endpoint correspondente com Axios configurado para `responseType: 'blob'`, e então disparar o download no navegador (criar uma URL de objeto a partir do blob e simular o clique num link, ou usar uma lib leve equivalente, à escolha do agente).
3. **Estado de carregamento** no botão enquanto o PDF é gerado (pode levar alguns segundos, especialmente com gráficos) — usar o `Spinner`/estado de loading já definido nos componentes-base da Etapa 01.
4. **Tratamento de erro:** se a geração falhar, mostrar uma mensagem de erro (toast), sem travar a página.
5. **Nome do arquivo baixado:** algo legível, incluindo o nome do aluno/grupo e o tipo de relatório (ex.: `relatorio-individual-joao-silva.pdf`), lido do header `Content-Disposition` da resposta se a API o fornecer, ou montado no front a partir dos dados já carregados na tela.

## Testes automatizados (Vitest)

- Testar a função utilitária de download (mockando a resposta em blob do Axios): dispara o download com o nome de arquivo esperado.
- Testar o estado de carregamento do botão "Baixar PDF" durante a chamada, e o retorno ao estado normal em caso de sucesso e de erro.
- Testar o tratamento de uma falha na geração (erro da API mockado): mostra o toast de erro, sem travar a página.

## Critérios de aceite

- Os quatro botões de download funcionam e geram um PDF válido, para uma competição de teste com pelo menos 2 bimestres encerrados.
- O botão mostra estado de carregamento durante a geração e volta ao normal depois, com sucesso ou erro.
- Uma falha simulada (ex.: desligar a API momentaneamente) mostra uma mensagem de erro clara, sem quebrar a navegação da página.
- `npm run test` passa, cobrindo os casos da seção de testes automatizados.

## Fora de escopo

Customização visual do PDF em si (isso é responsabilidade da API, Etapa 11 do backend) — aqui é só o consumo/download desse arquivo pela interface.

---

## Encerramento desta rodada do plano de GUI

Com esta etapa, a interface cobre a mesma superfície funcional que as 11 etapas da API: autenticação, cadastros do professor (salas, lecionamento, alunos), competição/bimestres/grupos, componentes de pontuação e lançamentos, acompanhamento de síntese, encerramento, rankings, desempate e relatórios (tela e PDF), incluindo a área mínima do aluno. Melhorias de UX, responsividade fina, testes end-to-end da interface e qualquer funcionalidade que a própria API ainda não cobre (predefinições de avaliação, encerramento automático por data, notificações) ficam para rodadas seguintes, junto com a evolução da API nesses mesmos pontos.
