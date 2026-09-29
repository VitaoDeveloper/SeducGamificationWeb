# Plano de Implementação (GUI) — SeducGamification Front-end

**Versão:** 0.2 — agora com 11 etapas, uma para cada etapa já desenvolvida na API.
**Repositório:** novo, a criar do zero (ex.: `SeducGamification-web`)
**Stack decidida:** React + TypeScript, via **Vite**. Estilização a critério do agente (Tailwind CSS recomendado — ver Etapa 01). Chamadas à API com **Axios puro**, sem lib de cache/revalidação — o estado de dados fica em React (Context + hooks).
**Backend:** API em `SeducGamification` (NestJS), conforme `plano-implementacao/` (11 etapas). **Cada etapa da GUI abaixo tem uma etapa correspondente na API** — implementar (ou pelo menos ter disponível para testar contra) a etapa da API antes ou junto da etapa equivalente da GUI.
**Referência visual:** prints enviados por Paulo (site pessoal de um professor parceiro do projeto) — só a linguagem visual (paleta, tipografia, forma dos componentes), não o conteúdo. Detalhada na Etapa 01.

## Como usar estes arquivos

Um arquivo por etapa, para colar como prompt a um agente de código. Seguir a ordem — cada etapa assume que a anterior está pronta. Antes de qualquer etapa que crie ou edite componentes visuais, consultar a skill de frontend-design do ambiente do agente (se disponível), como complemento às diretrizes de design da Etapa 01, não substituto delas.

## Índice das etapas (paridade com a API)

| GUI | API equivalente | Cobre |
|---|---|---|
| `01-etapa-setup-e-design-system.md` | 01 — Fundação | Projeto Vite, libs, tokens de design, componentes-base |
| `02-etapa-autenticacao.md` | 02 — Seed e autenticação | Login por código de matrícula, sessão, rotas protegidas, troca de senha |
| `03-etapa-salas-alunos-lecionamento.md` | 03 — Salas, alunos, lecionamento | Listar/criar sala, inscrição do professor, cadastro de alunos |
| `04-etapa-competicao-bimestres-grupos.md` | 04 — Competição, bimestres, grupos | Criar competição, ver os 4 bimestres, criar grupos e gerenciar membros |
| `05-etapa-componentes-pontuacao-lancamentos.md` | 05 — Componentes de pontuação e lançamentos | Definir componentes/pesos por matéria e bimestre, lançar notas |
| `06-etapa-previa-de-sintese.md` | 06 — Cálculo de sínteses (serviço puro) | Prévia de síntese calculada no front, antes do encerramento |
| `07-etapa-encerramento-bimestre.md` | 07 — Encerramento de bimestre | Ação de encerrar, com confirmação e sinalização de empate |
| `08-etapa-rankings.md` | 08 — Rankings | Ranking parcial, anual e individual; primeira tela do aluno |
| `09-etapa-desempate.md` | 09 — Desempate | Desempate manual e acionamento do critério automático |
| `10-etapa-relatorios.md` | 10 — Relatórios (JSON) | Os quatro relatórios em tela, com escopo por perfil |
| `11-etapa-exportacao-pdf.md` | 11 — Relatórios (PDF) | Download dos quatro relatórios em PDF |

## Variáveis de ambiente

Criar `.env.example` no front com `VITE_API_BASE_URL` (ex.: `http://localhost:3000`).

## O que fica de fora desta rodada (porque também está fora da API)

Predefinições de avaliação, encerramento automático de bimestre por data (job agendado), notificação do alerta de empate fora da própria aplicação, edição/remoção de sala e aluno, transferência de aluno entre salas.
