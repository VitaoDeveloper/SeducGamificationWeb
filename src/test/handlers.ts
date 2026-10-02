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
import { ORIGEM_DESEMPATE, TIPO_EMPATE } from '../features/competicoes/desempate.tipos'
import type {
  CorpoDoDesempate,
  PendenciaDeDesempate,
  RespostaDoDesempateAutomatico,
} from '../features/competicoes/desempate.tipos'
import { TIPO_RANKING, TOTAL_DE_BIMESTRES } from '../features/rankings/rankings.tipos'
import type {
  ItemDeAluno,
  ItemDeGrupo,
  RespostaDeRanking,
  RespostaDoRankingIndividual,
} from '../features/rankings/rankings.tipos'
import type {
  BimestreDoAluno,
  BimestreDoGrupo,
  MateriaDoAluno,
  RelatorioComparativoDoAluno,
  RelatorioComparativoDoGrupo,
  RelatorioDoGrupo,
  RelatorioIndividual,
} from '../features/relatorios/relatorios.tipos'

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
 * Os de sala estão no fim do arquivo pelo mesmo motivo, e porque as respostas de
 * `GET /salas`, `GET /salas/:id/lecionamentos` e `GET /escolas` andam sempre juntas: a
 * listagem pede as três na mesma montagem — as salas e os lecionamentos para montar a
 * tabela, as escolas para o formulário de nova sala.
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
 * Salas do professor, com os lecionamentos de cada uma e as escolas vinculadas.
 *
 * As três respostas saem juntas porque a tela as pede juntas: a listagem precisa
 * saber, para cada sala, se o professor leciona nela, e o formulário de nova sala
 * precisa das escolas para onde ele pode criar a primeira. Deixar alguma de fora do
 * mesmo conjunto faria o `onUnhandledRequest: 'error'` do msw acusar a tela inteira.
 */
export function salasDoProfessor(
  salas: Sala[],
  lecionamentosPorSala: Record<string, Lecionamento[]> = {},
  escolas: EscolaResumo[] = [ESCOLA_A],
) {
  return [
    http.get(`${API}/salas`, () => HttpResponse.json(salas)),
    http.get(`${API}/salas/:salaId/lecionamentos`, ({ params }) =>
      HttpResponse.json(lecionamentosPorSala[String(params.salaId)] ?? []),
    ),
    escolasVinculadas(escolas),
  ]
}

/**
 * Escolas vinculadas ao professor, como `GET /escolas` devolve.
 *
 * O padrão é o cenário mais comum — vinculado na escola em que estão as salas do
 * teste — para o teste não ter que repetir o que não está variando. Passar `[]`
 * monta o caso de professor sem nenhum vínculo, que é o único em que o formulário
 * de nova sala se recusa a enviar.
 */
export function escolasVinculadas(escolas: EscolaResumo[] = [ESCOLA_A]) {
  return http.get(`${API}/escolas`, () => HttpResponse.json(escolas))
}

/** Nenhuma sala, com as escolas vinculadas: o professor ainda não criou a primeira. */
export function semSalas(escolas: EscolaResumo[] = [ESCOLA_A]) {
  return salasDoProfessor([], {}, escolas)
}

/**
 * Salas e lecionamentos, sem o handler de escolas.
 *
 * Para os testes que precisam tratar o `GET /escolas` por conta própria — atrasá-lo
 * ou colocá-lo em erro. Como o msw resolve pela primeira rota que casa, o handler
 * padrão da fábrica venceria o do teste, e a tela não mostraria nem o carregamento
 * nem a falha que ele quer verificar.
 */
export function salasSemHandlerDeEscolas(
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
 * Fica no formato do exemplo do `README-API.md` (seção 11.10), que é o resumo
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
 *
 * `aposGravar` é o gancho para o que o encerramento também provoca: o
 * encerramento de um bimestre com empate faz nascer uma pendência de desempate, e
 * essa ligação está na API, não na tela. Receber um callback mantém essa ordem
 * fora do teste — e sem ele, o cenário teria de fazer a pendência existir *antes*
 * do encerramento, que é um empate que ninguém teve.
 */
export function encerramentoAceito(
  resultado: ResultadoDoEncerramento,
  bimestres: Bimestre[],
  aposGravar?: (bimestreId: string) => void,
) {
  return http.post(`${API}/bimestres/:id/encerrar`, ({ params }) => {
    const bimestreId = String(params.id)

    const alvo = bimestres.find((item) => item.id === bimestreId)
    if (alvo) alvo.situacao = SITUACAO_BIMESTRE.ENCERRADO

    aposGravar?.(bimestreId)

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

/* --------------------------------------------------------------- desempate -- */

/**
 * Pendência de desempate, como `GET .../desempate/pendencias` devolve.
 *
 * `tipo` e `bimestreId` saem um do outro — parcial tem bimestre, anual não tem —,
 * então a fábrica deriva o tipo do `bimestreId` em vez de aceitar os dois e
 * deixar o cenário montar um "anual do 2º bimestre" que a API nunca devolveria.
 */
export function pendenciaDeDesempate(
  parcial: Partial<PendenciaDeDesempate> & Pick<PendenciaDeDesempate, 'valor' | 'grupos'>,
): PendenciaDeDesempate {
  const bimestreId = parcial.bimestreId ?? null

  return {
    tipo: bimestreId ? TIPO_EMPATE.PARCIAL : TIPO_EMPATE.ANUAL,
    bimestreId,
    ...parcial,
  }
}

/**
 * Os três endpoints de desempate, sobre uma mesma lista de pendências.
 *
 * A lista é mutada dentro dos handlers — como em `encerramentoAceito` — e é isso
 * que deixa o teste ver a pendência sumir da faixa de avisos depois de gravar, em
 * vez de ter de reescrever a resposta do `GET` entre um `act` e outro.
 *
 * A resposta do endpoint automático é passada pelo teste, e não derivada aqui
 * pelas pendências: `aplicados` e as posições gravadas dependem de onde o bloco
 * estava no ranking, informação que a pendência não carrega. Derivá-la no fixture
 * seria inventar o dado que o critério automático produz.
 *
 * O `POST` manual devolve exatamente o que a API devolve — as posições gravadas,
 * com a origem `MANUAL` — porque é essa resposta que a tela usa para confirmar o
 * que foi gravado.
 */
export function desempateDaCompeticao(
  pendencias: PendenciaDeDesempate[],
  opcoes: { automatico?: RespostaDoDesempateAutomatico } = {},
) {
  /*
   * Um empate deixa de ser pendência quando todos os seus grupos foram gravados —
   * é a mesma condição de `carregarGruposResolvidos` na API, e não "algum deles",
   * que deixaria a pendência de um empate de três equipes voltar na próxima busca.
   */
  function resolver(grupoIds: string[]) {
    const resolvidos = new Set(grupoIds)

    for (let indice = pendencias.length - 1; indice >= 0; indice -= 1) {
      const alvo = pendencias[indice]
      if (alvo?.grupos.every((grupo) => resolvidos.has(grupo.grupoId))) {
        pendencias.splice(indice, 1)
      }
    }
  }

  return [
    http.get(`${API}/competicoes/:id/desempate/pendencias`, () => HttpResponse.json(pendencias)),

    http.post(`${API}/competicoes/:id/desempate`, async ({ request }) => {
      const { bimestreId, ordem } = (await request.json()) as CorpoDoDesempate

      // A API recusa posição repetida e grupo repetido antes de gravar qualquer
      // coisa (RN24). O teste que precisa dessa recusa usa `desempateRecusado`;
      // aqui a conferência existe para que uma tela que envie ordem inválida não
      // "passe" num handler que aceitaria.
      if (new Set(ordem.map((item) => item.posicao)).size !== ordem.length) {
        return HttpResponse.json(
          erroDaApi(400, 'As posições do desempate devem ser únicas.'),
          { status: 400 },
        )
      }

      resolver(ordem.map((item) => item.grupoId))

      return HttpResponse.json({
        bimestreId: bimestreId ?? null,
        desempates: ordem.map((item) => ({
          grupoId: item.grupoId,
          posicao: item.posicao,
          origem: ORIGEM_DESEMPATE.MANUAL,
        })),
      })
    }),

    http.post(`${API}/competicoes/:id/desempate/aplicar-automatico`, ({ request }) => {
      const resposta = opcoes.automatico ?? {
        bimestreId: null,
        aplicados: 0,
        desempates: [],
        residuais: [],
      }

      /*
       * Sem desempate gravado, nada sai da lista: é o caso de `aplicados: 0` com
       * residual, em que a API não grava nada e o empate continua pendente — e o
       * teste precisa ver a pendência continuar ali.
       */
      if (resposta.desempates.length > 0) {
        resolver(resposta.desempates.map((desempate) => desempate.grupoId))
      }

      return HttpResponse.json({
        ...resposta,
        bimestreId: new URL(request.url).searchParams.get('bimestreId'),
      })
    }),
  ]
}

/**
 * Desempate recusado pela API nos dois `POST`.
 *
 * O caso que importa para a tela é o 400 das posições — a mensagem que o
 * professor recebe quando tenta gravar uma ordem que a API não aceita —, e o
 * 403, que é o que o `traduzirErroDoDesempate` traduz.
 */
export function desempateRecusado(mensagem: string, status = 400) {
  return [
    http.post(`${API}/competicoes/:id/desempate`, () =>
      HttpResponse.json(erroDaApi(status, mensagem), { status }),
    ),
    http.post(`${API}/competicoes/:id/desempate/aplicar-automatico`, () =>
      HttpResponse.json(erroDaApi(status, mensagem), { status }),
    ),
  ]
}

/* -------------------------------------------------------------- relatórios -- */

/**
 * Matéria com a síntese do aluno nela, como `RelatoriosService` serializa.
 */
export function materiaDoRelatorio(
  componenteCurricularId: string,
  nome: string,
  valor = 8,
): MateriaDoAluno {
  return { componenteCurricularId, nome, valor }
}

/** Um bimestre do relatório de aluno, com as matérias que o compuseram. */
export function bimestreDoAluno(
  parcial: Partial<BimestreDoAluno> & Pick<BimestreDoAluno, 'numero'>,
): BimestreDoAluno {
  return {
    bimestreId: `comp-1-b${parcial.numero}`,
    valor: 8,
    materias: [materiaDoRelatorio(`mat-${parcial.numero}`, 'Programação Web')],
    ...parcial,
  }
}

/** Um bimestre do relatório do grupo, com quem estava nele. */
export function bimestreDoGrupo(
  parcial: Partial<BimestreDoGrupo> & Pick<BimestreDoGrupo, 'numero'>,
): BimestreDoGrupo {
  return {
    bimestreId: `comp-1-b${parcial.numero}`,
    valor: 8.25,
    integrantes: [{ alunoId: 'a1', nome: 'Ana Souza', valor: 8.25 }],
    ...parcial,
  }
}

/**
 * Os bimestres de um relatório de aluno: dois encerrados e um aberto.
 *
 * São os mesmos números para o relatório individual e para o do grupo, e é
 * proposital: é a soma (15.75) deles que o grupo devolve, contra a média (7.88)
 * que o aluno devolve, e um cenário com números diferentes em cada relatório
 * esconderia justamente essa distinção.
 */
function bimestresDoRelatorioDoAluno(): BimestreDoAluno[] {
  return [
    bimestreDoAluno({ numero: 1, valor: 8.25 }),
    bimestreDoAluno({ numero: 2, valor: 7.5 }),
    bimestreDoAluno({ numero: 3, valor: null, materias: [] }),
  ]
}

/** O cabeçalho que os dois relatórios de aluno compartilham, menos os bimestres. */
function baseDoRelatorioDoAluno(alunoId: string, nome: string) {
  return {
    alunoId,
    nome,
    competicaoId: 'comp-1',
    competicaoNome: 'Competição da Escola',
    pontuacaoFinal: 7.88,
  }
}

/**
 * Relatório individual do aluno.
 *
 * O `pontuacaoFinal` do padrão é a **média** dos dois bimestres encerrados, e é de
 * propósito diferente da soma que o relatório do grupo devolve para as mesmas
 * sínteses: é a distinção que o teste de escala precisa ver, e ela precisa estar
 * no dado — não na tela, que só mostra o que veio.
 */
export function relatorioIndividual(
  parcial: Partial<RelatorioIndividual> & Pick<RelatorioIndividual, 'alunoId' | 'nome'>,
): RelatorioIndividual {
  return {
    ...baseDoRelatorioDoAluno(parcial.alunoId, parcial.nome),
    tipo: 'individual',
    bimestres: bimestresDoRelatorioDoAluno(),
    ...parcial,
  }
}

/**
 * Relatório do aluno comparado ao grupo, com um colega por bimestre.
 *
 * Os `colegasDeGrupo` não trazem o próprio aluno — a API lista os *outros* — e é
 * por isso que o cenário tem um colega de verdade: a tela monta a série do aluno
 * por conta própria, e um relatório sem colega nenhum não provaria nada.
 *
 * O bimestre sem síntese (o 3º do padrão) também fica sem grupo, que é o que a API
 * devolve: bimestre aberto não tem equipe montada, e é isso que dá à tela a linha
 * "sem grupo" da lista por bimestre.
 */
export function relatorioComparativoDoAluno(
  parcial: Partial<RelatorioComparativoDoAluno> &
    Pick<RelatorioComparativoDoAluno, 'alunoId' | 'nome'>,
): RelatorioComparativoDoAluno {
  const base = {
    ...baseDoRelatorioDoAluno(parcial.alunoId, parcial.nome),
    bimestres: bimestresDoRelatorioDoAluno(),
  }

  return {
    ...base,
    tipo: 'comparativo-grupo',
    bimestres: base.bimestres.map((bimestre) => ({
      ...bimestre,
      grupo: bimestre.valor === null ? null : { grupoId: 'g1', nome: 'Equipe Alfa' },
      colegasDeGrupo: [
        {
          alunoId: 'a2',
          nome: 'Bruno Lima',
          valor: bimestre.valor === null ? null : 6.5,
          materias: [materiaDoRelatorio(`mat-${bimestre.numero}`, 'Programação Web', 6.5)],
        },
      ],
    })),
    ...parcial,
  }
}

/** O cabeçalho que os dois relatórios de grupo compartilham, menos os bimestres. */
function baseDoRelatorioDoGrupo(grupoId: string, nome: string) {
  return {
    grupoId,
    nome,
    competicaoId: 'comp-1',
    competicaoNome: 'Competição da Escola',
    pontuacaoFinal: 15.75,
  }
}

/**
 * Relatório coletivo do grupo.
 *
 * O `pontuacaoFinal` do padrão é a **soma** das duas sínteses encerradas (15.75), e
 * não a média: é o número que o gráfico — cujo eixo vai a 10 — não pode conter.
 */
export function relatorioDoGrupo(
  parcial: Partial<RelatorioDoGrupo> & Pick<RelatorioDoGrupo, 'grupoId' | 'nome'>,
): RelatorioDoGrupo {
  return {
    ...baseDoRelatorioDoGrupo(parcial.grupoId, parcial.nome),
    tipo: 'coletivo-grupo',
    bimestres: [
      bimestreDoGrupo({ numero: 1, valor: 8.25 }),
      bimestreDoGrupo({ numero: 2, valor: 7.5 }),
      bimestreDoGrupo({ numero: 3, valor: null, integrantes: [] }),
    ],
    ...parcial,
  }
}

/**
 * Relatório do grupo comparado aos demais, com um segundo grupo no comparativo.
 *
 * A API manda no `comparativo` **só os outros** grupos, e o fixture segue a mesma
 * regra: o time do próprio relatório entra pela lista de bimestres dele, e quem
 * responde se a tela o soma ao comparativo é o teste.
 */
export function relatorioComparativoDoGrupo(
  parcial: Partial<RelatorioComparativoDoGrupo> &
    Pick<RelatorioComparativoDoGrupo, 'grupoId' | 'nome'>,
): RelatorioComparativoDoGrupo {
  const base = baseDoRelatorioDoGrupo(parcial.grupoId, parcial.nome)

  return {
    ...base,
    tipo: 'comparativo-grupos',
    bimestres: [
      bimestreDoGrupo({ numero: 1, valor: 8.25 }),
      bimestreDoGrupo({ numero: 2, valor: 7.5 }),
      bimestreDoGrupo({ numero: 3, valor: null, integrantes: [] }),
    ],
    comparativo: [
      {
        grupoId: 'g2',
        nome: 'Equipe Beta',
        pontuacaoFinal: 14.25,
        bimestres: [
          { bimestreId: 'comp-1-b1', numero: 1, valor: 7 },
          { bimestreId: 'comp-1-b2', numero: 2, valor: 7.25 },
          { bimestreId: 'comp-1-b3', numero: 3, valor: null },
        ],
      },
    ],
    ...parcial,
  }
}

/** `GET /alunos/:alunoId/relatorio-individual`. */
export function relatorioIndividualDoAluno(resposta: RelatorioIndividual) {
  return http.get(`${API}/alunos/:alunoId/relatorio-individual`, () => HttpResponse.json(resposta))
}

/** `GET /alunos/:alunoId/relatorio-comparativo-grupo`. */
export function relatorioComparativoDoAlunoHandler(resposta: RelatorioComparativoDoAluno) {
  return http.get(`${API}/alunos/:alunoId/relatorio-comparativo-grupo`, () =>
    HttpResponse.json(resposta),
  )
}

/** `GET /grupos/:grupoId/relatorio`. */
export function relatorioDoGrupoHandler(resposta: RelatorioDoGrupo) {
  return http.get(`${API}/grupos/:grupoId/relatorio`, () => HttpResponse.json(resposta))
}

/** `GET /grupos/:grupoId/relatorio-comparativo`. */
export function relatorioComparativoDoGrupoHandler(resposta: RelatorioComparativoDoGrupo) {
  return http.get(`${API}/grupos/:grupoId/relatorio-comparativo`, () =>
    HttpResponse.json(resposta),
  )
}

/**
 * Recusa de escopo nos quatro relatórios: a API responde `403` quando o aluno pede
 * o relatório de outro, quando o grupo é de outra competição e quando o professor
 * não é da sala do recurso.
 *
 * É a resposta que o critério de aceite da Etapa 10 manda tratar sem quebrar a
 * página, e o corpo é o "Forbidden" cru do NestJS de propósito: se a tela mostrar
 * a mensagem amigável, é porque a tradução aconteceu — e o teste afirma que a
 * palavra "Forbidden" não aparece na tela.
 */
export function relatoriosRecusados() {
  const forbidden = { statusCode: 403, message: 'Forbidden', error: 'Forbidden' }
  const recusado = () => HttpResponse.json(forbidden, { status: 403 })

  return [
    http.get(`${API}/alunos/:alunoId/relatorio-individual`, recusado),
    http.get(`${API}/alunos/:alunoId/relatorio-comparativo-grupo`, recusado),
    http.get(`${API}/grupos/:grupoId/relatorio`, recusado),
    http.get(`${API}/grupos/:grupoId/relatorio-comparativo`, recusado),
  ]
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


