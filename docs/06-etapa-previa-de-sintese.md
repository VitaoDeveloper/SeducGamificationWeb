# Etapa 06 (GUI) — Prévia de síntese (cálculo no front, antes do encerramento)

**Pré-requisito:** Etapa 05 concluída (lançamentos funcionando).
**Equivalente na API:** `plano-implementacao/06-etapa-calculo-sinteses.md` (lá é um serviço puro, sem endpoint HTTP).
**Referência normativa:** `docs/03-regras-de-calculo.md` do repositório da API — as fórmulas e os exemplos numéricos de lá são a fonte da verdade.

## Contexto para o agente

A API só grava as sínteses de verdade no momento do encerramento do bimestre (Etapa 07). Antes disso, não existe endpoint para "ver a síntese parcial" — mas é muito útil para o professor ver, em tempo real, como está a nota de cada aluno **enquanto ainda está lançando**, antes de encerrar (e sem possibilidade de desfazer). Esta etapa implementa esse cálculo **só no front**, como prévia, deixando claro na interface que é uma estimativa e não o valor oficial.

## Tarefas

1. **Utilitário de cálculo** (`src/lib/sinteseCalculo.ts`), replicando as fórmulas do doc `03`:
   - Síntese do aluno por matéria: `Σ(nota_i × peso_i / 100)`, nota ausente = 0.
   - Síntese bimestral do aluno: média simples entre as matérias.
   - Síntese bimestral do grupo: média simples entre os integrantes (conforme a composição do bimestre selecionado).
   - Arredondamento para 2 casas decimais.
   - Escrever com testes (`sinteseCalculo.test.ts`, usando o runner que o projeto já tiver configurado) reaproveitando os mesmos exemplos numéricos do doc `03`, para garantir que o front calcula exatamente igual ao back.
2. **Coluna "Prévia" na tabela de lançamentos** (Etapa 05): ao lado de cada aluno, mostrar a síntese daquela matéria calculada ao vivo, atualizando conforme o professor digita as notas (antes mesmo de salvar, usando o estado local do formulário).
3. **Painel "Prévia da síntese do bimestre"**, na página da competição (Etapa 04), com uma tabela: aluno → síntese bimestral (média entre as matérias já lançadas) e grupo → síntese bimestral (média dos integrantes). Buscar os lançamentos de todos os componentes do bimestre selecionado (uma ou mais chamadas a `GET /componentes-pontuacao/:id/lancamentos`) e aplicar o utilitário do item 1.
4. Deixar textualmente claro, em qualquer lugar que mostre esses valores, que é uma **prévia**, sujeita a mudar até o encerramento do bimestre (ex.: um rótulo "Prévia — sujeita a alteração até o encerramento", ou um ícone com tooltip).

## Critérios de aceite

- Os testes do utilitário de cálculo batem com os exemplos do doc `03`.
- Ao digitar notas na tela de lançamentos (Etapa 05), a coluna de prévia atualiza sem precisar salvar.
- O painel de prévia do bimestre mostra valores que, aplicados manualmente à mão com os mesmos dados, batem com o resultado da tela.
- Nenhum lugar da interface apresenta esses valores como se fossem definitivos.

## Fora de escopo

Persistir qualquer síntese (isso só acontece no encerramento, Etapa 07), lidar com dados de bimestres já encerrados (esses vêm prontos do backend, não precisam ser recalculados no front — ver Etapa 07).
