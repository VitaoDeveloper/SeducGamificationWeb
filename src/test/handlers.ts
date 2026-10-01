import { http, HttpResponse } from 'msw'
import { TIPO_USUARIO } from '../lib/sessao'
import type { TipoUsuario } from '../lib/sessao'
import type { Aluno, EscolaResumo, Lecionamento, Sala } from '../features/salas'
import { SITUACAO_BIMESTRE } from '../features/competicoes/competicoes.tipos'
import type {
  Bimestre,
  CompeticaoCompleta,
  GrupoCompetidor,
  MembroDoGrupo,
} from '../features/competicoes/competicoes.tipos'
import type {
  ComponentePontuacaoDoBimestre,
  ComponentesDoBimestre,
  Lancamento,
  LancarNota,
  LoteDeLancamentos,
  MateriaComPesos,
  MateriaPendente,
  ValidacaoDePesosDaApi,
} from '../features/competicoes/componentes-pontuacao.tipos'
import type {
  EmpateDoBimestre,
  ResultadoDoEncerramento,
  SinteseOficialDoAluno,
  SinteseOficialDoGrupo,
} from '../features/competicoes/encerramento.tipos'
import { TIPO_RANKING, TOTAL_DE_BIMESTRES } from '../features/rankings/rankings.tipos'
import type {
  ItemDeAluno,
  ItemDeGrupo,
  RespostaDeRanking,
  RespostaDoRankingIndividual,
} from '../features/rankings/rankings.tipos'

/**
 * Handlers de autenticação para os testes, em forma de fábrica.
 *
 * Ficam aqui, e não prontos no `server.ts`, porque o que muda entre os testes é
 * justamente o cenário: a `LoginPage` monta o caso do aluno, o `AuthProvider` o
 * da senha recusada. Um handler único compartilhado teria de adivinhar, no
 * momento do `server.use`, o que cada tela precisa — e o teste passaria a
 * descrever o mock, não o código.
 *
 * Cada função devolve os handlers que o teste espalha no seu próprio
 * `server.use(...)`, e o `resetHandlers` de `src/test/setup.ts` desfaz tudo
 * depois.
 *
 * Os de sala estão no fim do arquivo pelo mesmo motivo, e porque as respostas
 * de `GET /salas` e `GET /salas/:id/lecionamentos` andam sempre juntas: a
 * listagem junta as duas para saber onde o professor leciona.
 */

export const API = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000'

/** Senha que os handlers de login aceitam; qualquer outra é recusada com 401. */
export const SENHA_DE_TESTE = 'senha-correta'

export const TOKEN_DE_TESTE = 'token-de-teste'

/** Id do professor da sessão nos testes de sala. */
export const PROFESSOR_DE_TESTE = 'prof-1'

/**
 * Corpo de erro no formato do NestJS, que é o que `mensagemDeErro` em
 * `src/lib/erro-api.ts` sabe ler.
 */
function erroDaApi(status: number, message: string) {
  return { statusCode: status, message, error: status === 401 ? 'Unauthorized' : 'Bad Request' }
}

/**
 * Login aceito, com o `GET /auth/me` que vem logo atrás.
 *
 * Os dois vêm juntos porque `autenticar` em `auth.api.ts` faz as duas chamadas e
 * só grava a sessão se as duas derem certo: um teste do login que devolvesse só
 * o token deixaria o `AuthProvider` sem usuário para testar.
 *
 * A senha é conferida aqui para que o cenário de recusa saia do próprio handler,
 * sem um segundo `server.use` disputando com este.
 */
export function loginAceito(
  opcoes: { tipo?: TipoUsuario; id?: string } = {},
): [ReturnType<typeof http.post>, ReturnType<typeof http.get>] {
  const { tipo = TIPO_USUARIO.PROFESSOR, id = 'prof-1' } = opcoes

  return [
    http.post(`${API}/auth/login`, async ({ request }) => {
      const { senha } = (await request.json()) as { senha?: string }

      if (senha !== SENHA_DE_TESTE) {
        return HttpResponse.json(erroDaApi(401, 'Código de matrícula ou senha inválidos.'), {
          status: 401,
        })
      }

      return HttpResponse.json({ accessToken: TOKEN_DE_TESTE })
    }),
    http.get(`${API}/auth/me`, () => HttpResponse.json({ id, tipo })),
  ]
}

/** Login recusado, sem o `/auth/me`: a sessão nem chega a ser montada. */
export function loginRecusado() {
  return http.post(`${API}/auth/login`, () =>
    HttpResponse.json(erroDaApi(401, 'Código de matrícula ou senha inválidos.'), { status: 401 }),
  )
}

export function trocarSenhaAceita() {
  return http.post(`${API}/auth/trocar-senha`, () => new HttpResponse(null, { status: 200 }))
}

/**
 * Senha atual errada. A API responde 401, o mesmo código do token expirado, e
 * é essa ambiguidade que o `semSessaoAoExpirar` desarma.
 */
export function trocarSenhaRecusada() {
  return http.post(`${API}/auth/trocar-senha`, () =>
    HttpResponse.json(erroDaApi(401, 'Senha atual incorreta.'), { status: 401 }),
  )
}

/* ------------------------------------------------------------------ salas -- */

export const ESCOLA_A: EscolaResumo = { id: 'escola-a', nome: 'Escola Estadual de Exemplo' }
export const ESCOLA_B: EscolaResumo = { id: 'escola-b', nome: 'Escola Técnica Dutra' }

/** Sala pronta, com a escola já embutida como a API devolve. */
export function sala(
  parcial: Partial<Sala> & Pick<Sala, 'id' | 'nome'>,
): Sala {
  const { id, nome } = parcial
  return {
    anoLetivo: 2026,
    escolaId: ESCOLA_A.id,
    professorCriadorId: PROFESSOR_DE_TESTE,
    escola: ESCOLA_A,
    createdAt: '2026-03-01T12:00:00.000Z',
    updatedAt: '2026-03-01T12:00:00.000Z',
    ...parcial,
    id,
    nome,
  }
}

export function lecionamento(
  parcial: Partial<Lecionamento> & Pick<Lecionamento, 'id' | 'salaId'>,
): Lecionamento {
  return {
    professorId: PROFESSOR_DE_TESTE,
    professor: { id: PROFESSOR_DE_TESTE, nome: 'Professor Exemplo', codigoMatricula: '26001' },
    componentesCurriculares: [
      { id: `${parcial.id}-c1`, lecionamentoId: parcial.id, nome: 'Programação Web' },
    ],
    createdAt: '2026-03-01T12:00:00.000Z',
    updatedAt: '2026-03-01T12:00:00.000Z',
    ...parcial,
  }
}

export function aluno(parcial: Partial<Aluno> & Pick<Aluno, 'id' | 'nome' | 'codigoMatricula'>): Aluno {
  return { createdAt: '2026-03-01T12:00:00.000Z', ...parcial }
}

/**
 * Salas do professor, com os lecionamentos de cada uma.
 *
 * As duas respostas saem juntas porque a tela as pede juntas: a listagem precisa
 * saber, para cada sala, se o professor leciona nela, e quem responde isso é o
 * endpoint de lecionamentos. Deixar as duas de fora do mesmo conjunto faria o
 * `onUnhandledRequest: 'error'` do msw acusar a tela inteira.
 */
export function salasDoProfessor(
  salas: Sala[],
  lecionamentosPorSala: Record<string, Lecionamento[]> = {},
) {
  return [
    http.get(`${API}/salas`, () => HttpResponse.json(salas)),
    http.get(`${API}/salas/:salaId/lecionamentos`, ({ params }) =>
      HttpResponse.json(lecionamentosPorSala[String(params.salaId)] ?? []),
    ),
  ]
}

/** Nenhuma sala: a resposta vazia do `GET /salas` mais os lecionamentos em branco. */
export function semSalas() {
  return salasDoProfessor([])
}

/* ------------------------------------------------------------ competições -- */

const CRIADO_EM = '2026-01-15T12:00:00.000Z'

export function bimestre(
  parcial: Partial<Bimestre> & Pick<Bimestre, 'id' | 'numero'>,
): Bimestre {
  return {
    competicaoId: 'comp-1',
    dataInicio: '2026-02-01T00:00:00.000Z',
    dataFim: '2026-04-30T00:00:00.000Z',
    situacao: SITUACAO_BIMESTRE.ABERTO,
    createdAt: CRIADO_EM,
    updatedAt: CRIADO_EM,
    ...parcial,
  }
}

/** Os quatro bimestres encaixados, como `POST /competicoes` os cria. */
export function bimestresDaCompeticao(competicaoId: string): Bimestre[] {
  const periodos: Array<[string, string]> = [
    ['2026-02-01T00:00:00.000Z', '2026-04-30T00:00:00.000Z'],
    ['2026-05-01T00:00:00.000Z', '2026-07-15T00:00:00.000Z'],
    ['2026-08-01T00:00:00.000Z', '2026-10-15T00:00:00.000Z'],
    ['2026-10-16T00:00:00.000Z', '2026-12-20T00:00:00.000Z'],
  ]

  return periodos.map(([dataInicio, dataFim], indice) =>
    bimestre({
      id: `${competicaoId}-b${indice + 1}`,
      competicaoId,
      numero: indice + 1,
      dataInicio,
      dataFim,
    }),
  )
}

export function competicao(
  parcial: Partial<CompeticaoCompleta> & Pick<CompeticaoCompleta, 'id' | 'nome'>,
): CompeticaoCompleta {
  return {
    lecionamentoId: 'lec-1',
    bimestres: [],
    gruposCompetidores: [],
    createdAt: CRIADO_EM,
    updatedAt: CRIADO_EM,
    ...parcial,
  }
}

export function grupo(
  parcial: Partial<GrupoCompetidor> & Pick<GrupoCompetidor, 'id' | 'nome'>,
): GrupoCompetidor {
  return {
    competicaoId: 'comp-1',
    createdAt: CRIADO_EM,
    updatedAt: CRIADO_EM,
    ...parcial,
  }
}

/**
 * Vínculo de um aluno a um grupo no bimestre, com o aluno embutido.
 *
 * Recebe o aluno inteiro (a fábrica `aluno` já existe) em vez de só o id: a API
 * devolve `membrosGrupos[].aluno` junto, e é o nome dele que a tela desenha.
 */
export function membro(grupoId: string, aluno: Aluno, bimestreId: string): MembroDoGrupo {
  return {
    grupoId,
    alunoId: aluno.id,
    bimestreId,
    aluno: { id: aluno.id, nome: aluno.nome, codigoMatricula: aluno.codigoMatricula },
  }
}

/* ------------------------------------------------- componentes e lançamentos -- */

export function componentePontuacao(
  parcial: Partial<ComponentePontuacaoDoBimestre> &
    Pick<ComponentePontuacaoDoBimestre, 'id' | 'nome' | 'pesoPercentual'>,
): ComponentePontuacaoDoBimestre {
  return {
    componenteCurricularId: 'mat-1',
    createdAt: CRIADO_EM,
    ...parcial,
  }
}

/**
 * Uma matéria com os componentes que ela tem no bimestre.
 *
 * A `somaPesoPercentual` é calculada aqui, e não passada, pelo mesmo motivo da
 * resposta real: a API soma em `Decimal` no banco justamente para não acumular
 * erro de ponto flutuante, e um fixture que aceitasse a soma pronta deixaria
 * passar um total que a API nunca devolveria.
 */
export function materia(
  parcial: Partial<MateriaComPesos> & Pick<MateriaComPesos, 'componenteCurricularId' | 'materiaNome'>,
  componentes: ComponentePontuacaoDoBimestre[] = [],
): MateriaComPesos {
  const soma = componentes.reduce((total, componente) => total + componente.pesoPercentual, 0)

  return {
    somaPesoPercentual: Math.round(soma * 100) / 100,
    componentesPontuacao: componentes,
    ...parcial,
  }
}

/** Uma matéria com os pesos já fechados em 100%. */
export function materiaFechada(
  componenteCurricularId: string,
  materiaNome: string,
  ...componentes: Array<[nome: string, pesoPercentual: number]>
): MateriaComPesos {
  return materia(
    { componenteCurricularId, materiaNome },
    componentes.map(([nome, pesoPercentual], indice) =>
      componentePontuacao({
        id: `${componenteCurricularId}-cp${indice + 1}`,
        nome,
        pesoPercentual,
        componenteCurricularId,
      }),
    ),
  )
}

/**
 * Resposta de `GET /bimestres/:id/componentes-pontuacao`, com `todasFechadas`
 * coerente com as matérias passadas.
 */
export function componentesDoBimestre(
  bimestreId: string,
  materias: MateriaComPesos[],
): ComponentesDoBimestre {
  return {
    bimestreId,
    materias,
    todasFechadas: materias.every((item) => item.somaPesoPercentual === 100),
  }
}

/** Resposta de `POST .../validar`: as matérias que não fecham, com quanto falta. */
export function validacaoDePesos(materias: MateriaComPesos[]): ValidacaoDePesosDaApi {
  const materiasPendentes = materias
    .filter((item) => item.somaPesoPercentual !== 100)
    .map((item) => ({
      componenteCurricularId: item.componenteCurricularId,
      materiaNome: item.materiaNome,
      somaPesoPercentual: item.somaPesoPercentual,
      faltaParaFechar: Math.round((100 - item.somaPesoPercentual) * 100) / 100,
    }))

  return { fechado: materiasPendentes.length === 0, materiasPendentes }
}

/** Nota lançada, com o aluno embutido como `GET .../lancamentos` devolve. */
export function lancamento(
  componentePontuacaoId: string,
  aluno: Aluno,
  valorNoModelo: string,
): Lancamento {
  return {
    componentePontuacaoId,
    alunoId: aluno.id,
    valorNoModelo,
    aluno: { id: aluno.id, nome: aluno.nome, codigoMatricula: aluno.codigoMatricula },
    createdAt: CRIADO_EM,
    updatedAt: CRIADO_EM,
  }
}

/**
 * Grava uma nota na lista do cenário, no lugar de uma anterior do mesmo aluno.
 *
 * A API faz `upsert` no par `(componentePontuacaoId, alunoId)`, então relançar
 * uma nota tem de trocar a existente — e é essa troca que faz o teste ver a
 * linha trocar de valor em vez de duplicar na tela.
 */
function registrarNota(
  notas: Lancamento[],
  componentePontuacaoId: string,
  lancada: LancarNota,
  alunos: Aluno[],
): Lancamento {
  const aluno = alunos.find((candidato) => candidato.id === lancada.alunoId)

  const registro: Lancamento = {
    componentePontuacaoId,
    alunoId: lancada.alunoId,
    valorNoModelo: lancada.valorNoModelo,
    aluno: {
      id: lancada.alunoId,
      nome: aluno?.nome ?? 'Aluno',
      codigoMatricula: aluno?.codigoMatricula ?? '',
    },
    createdAt: CRIADO_EM,
    updatedAt: CRIADO_EM,
  }

  const existente = notas.findIndex(
    (nota) => nota.alunoId === lancada.alunoId && nota.componentePontuacaoId === componentePontuacaoId,
  )

  if (existente >= 0) notas[existente] = registro
  else notas.push(registro)

  return registro
}

/**
 * Só a listagem de lançamentos, para o teste que precisa do `POST` por conta
 * própria — capturar o payload, ou recusar a requisição com um erro.
 *
 * Existe separada porque dois handlers do mesmo `server.use` disputam a mesma
 * rota e quem responde é o último registrado: misturar o `POST` do cenário com o
 * `POST` de teste depende dessa ordem implícita. Aqui o teste monta a resposta
 * que quer e não precisa saber de precedência.
 *
 * A lista filtra por componente para que a mesma lista sirva a mais de um
 * componente do cenário.
 */
export function listagemDeLancamentos(notas: Lancamento[]) {
  return [
    http.get(`${API}/componentes-pontuacao/:id/lancamentos`, ({ params }) =>
      HttpResponse.json(notas.filter((nota) => nota.componentePontuacaoId === String(params.id))),
    ),
  ]
}

/**
 * Os três handlers de lançamento de um componente, sobre a mesma lista de notas:
 * a listagem, o salvamento de uma linha e o lote.
 *
 * A mutação acontece dentro do handler, e não no teste, de propósito: é o que
 * permite o teste ver a tabela atualizar depois de salvar, sem ter que reescrever
 * a resposta da listagem entre um `act` e outro.
 *
 * Os `alunos` entram para o lançamento poder devolver o nome de quem recebeu a
 * nota — é o `lancamentos[].aluno` que a API embute e que a tela usa na coluna.
 */
export function lancamentosDoComponente(notas: Lancamento[], alunos: Aluno[] = []) {
  return [
    ...listagemDeLancamentos(notas),
    http.post(`${API}/componentes-pontuacao/:id/lancamentos`, async ({ params, request }) => {
      const lancada = (await request.json()) as LancarNota

      return HttpResponse.json(registrarNota(notas, String(params.id), lancada, alunos), {
        status: 201,
      })
    }),
    http.post(`${API}/componentes-pontuacao/:id/lancamentos/lote`, async ({ params, request }) => {
      const { lancamentos } = (await request.json()) as LoteDeLancamentos

      const salvos = lancamentos.map((lancada) =>
        registrarNota(notas, String(params.id), lancada, alunos),
      )

      return HttpResponse.json(salvos, { status: 201 })
    }),
  ]
}

/* ------------------------------------------------------------- encerramento -- */

/**
 * Resposta de `POST /bimestres/:id/encerrar`, com a situação já em ENCERRADO.
 *
 * Fica no formato do exemplo do `README-API.md` (seção 11.9), que é o resumo
 * fiel do que a API devolve: totais, as duas listas de síntese, os empates e o
 * aviso de fim de competição. O que o teste não quiser que apareça, deixa
 * vazio/null — daí os `parcial` com padrão.
 */
export function encerramento(
  parcial: Partial<ResultadoDoEncerramento> &
    Pick<ResultadoDoEncerramento, 'bimestreId' | 'numero'>,
): ResultadoDoEncerramento {
  return {
    situacao: SITUACAO_BIMESTRE.ENCERRADO,
    encerradoEm: '2026-04-10T18:00:00.000Z',
    totais: { alunos: 0, materias: 0, grupos: 0 },
    sinteseAluno: [],
    sinteseGrupo: [],
    empates: [],
    competicaoConcluida: false,
    pontuacoesFinais: null,
    ...parcial,
  }
}

/** Síntese oficial de um aluno, como o encerramento grava. */
export function sinteseDoAluno(
  bimestreId: string,
  aluno: Aluno,
  valor: number,
): SinteseOficialDoAluno {
  return { bimestreId, alunoId: aluno.id, nome: aluno.nome, valor }
}

/** Síntese oficial de um grupo, com quantos integrantes ele tinha no bimestre. */
export function sinteseDoGrupo(
  bimestreId: string,
  id: string,
  nome: string,
  valor: number,
  integrantes = 1,
): SinteseOficialDoGrupo {
  return { bimestreId, grupoId: id, nome, integrantes, valor }
}

/** Empate do ranking parcial: os grupos que fecharam com o mesmo valor. */
export function empate(
  bimestreId: string,
  valor: number,
  grupos: Array<{ grupoId: string; nome: string }>,
): EmpateDoBimestre {
  return {
    bimestreId,
    valor,
    grupos: grupos.map((grupo) => ({ ...grupo, valor })),
  }
}

/**
 * Encerramento aceito, e a situação do bimestre virando ENCERRADO para o
 * `GET /competicoes/:id` seguinte.
 *
 * A virada acontece dentro do handler, e não no teste, pelo mesmo motivo de
 * `lancamentosDoComponente`: é o que deixa a página recarregar sozinha e mostrar
 * a etiqueta "Encerrado" e as abas de montagem travadas, sem o teste precisar
 * reescrever a resposta da competição entre um `act` e outro.
 */
export function encerramentoAceito(
  resultado: ResultadoDoEncerramento,
  bimestres: Bimestre[],
) {
  return http.post(`${API}/bimestres/:id/encerrar`, ({ params }) => {
    const bimestreId = String(params.id)

    const alvo = bimestres.find((item) => item.id === bimestreId)
    if (alvo) alvo.situacao = SITUACAO_BIMESTRE.ENCERRADO

    return HttpResponse.json({ ...resultado, bimestreId })
  })
}

/**
 * Encerramento recusado por pesos abertos, com a lista de matérias no corpo do
 * 400 — a mesma que `POST .../validar` devolve.
 */
export function encerramentoRecusadoPorPesos(materiasPendentes: MateriaPendente[]) {
  return http.post(`${API}/bimestres/:id/encerrar`, () =>
    HttpResponse.json(
      {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Todas as matérias precisam somar 100% dos pesos para encerrar o bimestre.',
        materiasPendentes,
      },
      { status: 400 },
    ),
  )
}

/**
 * Encerramento recusado por motivo que não tem lista de matérias.
 *
 * Serve para o erro que não é de pesos — bimestre já encerrado em outra aba, API
 * fora do ar, erro do servidor —, em que a tela mostra a mensagem e oferece tentar
 * de novo, em vez de mandar para a aba de componentes.
 */
export function encerramentoRecusado(mensagem: string, status = 409) {
  return http.post(`${API}/bimestres/:id/encerrar`, () =>
    HttpResponse.json({ statusCode: status, message: mensagem, error: 'Conflict' }, { status }),
  )
}

/* ---------------------------------------------------------------- rankings -- */

/** Linha de ranking de equipe, com os campos que a posição já ordena. */
export function linhaDeGrupo(
  parcial: Partial<ItemDeGrupo> & Pick<ItemDeGrupo, 'posicao' | 'nome' | 'grupoId'>,
): ItemDeGrupo {
  return { valor: 0, empate: false, ...parcial }
}

/** Linha do ranking individual. */
export function linhaDeAluno(
  parcial: Partial<ItemDeAluno> & Pick<ItemDeAluno, 'posicao' | 'nome' | 'alunoId'>,
): ItemDeAluno {
  return { valor: 0, empate: false, ...parcial }
}

/**
 * Envelope de um ranking de equipe (parcial ou anual), com o `completo`
 * derivado de `bimestresEncerrados` — e não passado à mão.
 *
 * A API mantém os dois coerentes (é `completo === (bimestresEncerrados === 4)`),
 * e deixar a fábrica montar a coerência evita o teste que "prova" o aviso de
 * parcialidade com um cenário impossível.
 */
export function rankingDeGrupo(
  parcial: Partial<RespostaDeRanking> & Pick<RespostaDeRanking, 'competicaoId'>,
): RespostaDeRanking {
  const bimestresEncerrados = parcial.bimestresEncerrados ?? TOTAL_DE_BIMESTRES

  return {
    tipo: TIPO_RANKING.ANUAL,
    bimestreId: null,
    itens: [],
    ...parcial,
    bimestresEncerrados,
    completo: parcial.completo ?? bimestresEncerrados === TOTAL_DE_BIMESTRES,
  }
}

/** Envelope do ranking individual, que é anual e por isso ignora `bimestreId`. */
export function rankingIndividual(
  parcial: Partial<RespostaDoRankingIndividual> &
    Pick<RespostaDoRankingIndividual, 'competicaoId'>,
): RespostaDoRankingIndividual {
  const bimestresEncerrados = parcial.bimestresEncerrados ?? TOTAL_DE_BIMESTRES

  return {
    tipo: TIPO_RANKING.INDIVIDUAL,
    itens: [],
    ...parcial,
    bimestresEncerrados,
    completo: parcial.completo ?? bimestresEncerrados === TOTAL_DE_BIMESTRES,
  }
}

/**
 * Os rankings de equipe de uma competição: a mesma rota responde o parcial ou o
 * anual conforme o `bimestreId`, então um handler só decide qual dos dois volta.
 *
 * `GET /competicoes/:id/ranking` sem `bimestreId` é o anual; com, é o parcial do
 * bimestre. Repetir a regra aqui é o que permite o teste trocar de visão e ver a
 * tabela certa, sem dois handlers disputando a mesma rota.
 */
export function rankingsDaCompeticao(opcoes: {
  anual?: RespostaDeRanking
  parcial?: RespostaDeRanking
}) {
  return http.get(`${API}/competicoes/:id/ranking`, ({ request }) => {
    const bimestreId = new URL(request.url).searchParams.get('bimestreId')
    const resposta = bimestreId ? opcoes.parcial : opcoes.anual

    return resposta
      ? HttpResponse.json(resposta)
      : HttpResponse.json(erroDaApi(404, 'Ranking não encontrado.'), { status: 404 })
  })
}

/** O ranking individual da competição. */
export function rankingIndividualDaCompeticao(resposta: RespostaDoRankingIndividual) {
  return http.get(`${API}/competicoes/:id/ranking-individual`, () => HttpResponse.json(resposta))
}

/**
 * Recusa de escopo nos dois endpoints de ranking: a API responde `403` quando
 * quem pede o ranking é o aluno ou quando a competição não é da sala dele.
 *
 * É a resposta que o critério de aceite da Etapa 08 manda tratar sem quebrar a
 * página, e por isso o corpo é o "Forbidden" cru do NestJS: se a tela mostrar a
 * mensagem amigável, é porque a tradução aconteceu.
 */
export function rankingsRecusados() {
  const forbidden = { statusCode: 403, message: 'Forbidden', error: 'Forbidden' }

  return [
    http.get(`${API}/competicoes/:id/ranking`, () =>
      HttpResponse.json(forbidden, { status: 403 }),
    ),
    http.get(`${API}/competicoes/:id/ranking-individual`, () =>
      HttpResponse.json(forbidden, { status: 403 }),
    ),
  ]
}


