import { api } from '../../lib/api'
import type {
  ComponentePontuacao,
  ComponentesDoBimestre,
  Lancamento,
  LancamentoCriado,
  LancarNota,
  LoteDeLancamentos,
  NovoComponentePontuacao,
  ValidacaoDePesosDaApi,
} from './componentes-pontuacao.tipos'

/**
 * Chamadas de componente de pontuação e lançamento de nota.
 *
 * Em arquivo separado de `competicoes.api.ts` porque a escada é outra: aqui o
 * componente pende do bimestre e o lançamento pende do componente. Misturar com a
 * competição e o grupo daria um arquivo de duas_feature que ninguém sabe em que
 * ordem ler.
 */

/** `POST /bimestres/:id/componentes-pontuacao` — cria em uma matéria do lecionamento. */
export async function criarComponentePontuacao(
  bimestreId: string,
  novo: NovoComponentePontuacao,
): Promise<ComponentePontuacao> {
  const { data } = await api.post<ComponentePontuacao>(
    `/bimestres/${bimestreId}/componentes-pontuacao`,
    novo,
  )
  return data
}

/**
 * `GET /bimestres/:id/componentes-pontuacao` — os componentes agrupados por
 * matéria, com a soma de pesos de cada uma.
 *
 * A API devolve uma entrada por componente curricular do lecionamento, mesmo para
 * a matéria que ainda não tem nenhum componente: essa lista vazia é o que a tela
 * usa para mostrar "faltam 100%" em cima de uma matéria que o professor ainda não
 * começou.
 */
export async function listarComponentesDoBimestre(
  bimestreId: string,
): Promise<ComponentesDoBimestre> {
  const { data } = await api.get<ComponentesDoBimestre>(
    `/bimestres/${bimestreId}/componentes-pontuacao`,
  )
  return data
}

/**
 * `POST /bimestres/:id/componentes-pontuacao/validar` — o resumo de quais
 * matérias não fecham 100%.
 *
 * É `POST` e não `GET` porque não devolve lista: devolve um veredito, e o
 * Encerramento de bimestre (Etapa 07) vai precisar da mesma resposta para recusar
 * um encerramento com pesos abertos.
 */
export async function validarPesosDoBimestre(bimestreId: string): Promise<ValidacaoDePesosDaApi> {
  const { data } = await api.post<ValidacaoDePesosDaApi>(
    `/bimestres/${bimestreId}/componentes-pontuacao/validar`,
  )
  return data
}

/** `POST /componentes-pontuacao/:id/lancamentos` — lança ou relança a nota de um aluno. */
export async function lancarNota(
  componentePontuacaoId: string,
  alunoId: string,
  valorNoModelo: string,
): Promise<LancamentoCriado> {
  // `LancamentoCriado`, não `Lancamento`: a API responde a entidade criada, sem
  // o aluno embutido. A tela recarrega a lista depois de gravar, então nunca usa
  // o retorno.
  const { data } = await api.post<LancamentoCriado>(
    `/componentes-pontuacao/${componentePontuacaoId}/lancamentos`,
    { alunoId, valorNoModelo },
  )
  return data
}

/**
 * `GET /componentes-pontuacao/:id/lancamentos` — as notas já lançadas, com o
 * aluno embutido e ordenadas pelo nome.
 */
export async function listarLancamentos(componentePontuacaoId: string): Promise<Lancamento[]> {
  const { data } = await api.get<Lancamento[]>(
    `/componentes-pontuacao/${componentePontuacaoId}/lancamentos`,
  )
  return data
}

/**
 * `POST /componentes-pontuacao/:id/lancamentos/lote` — lança várias notas de uma
 * vez, num transação só.
 *
 * O lote é o caminho que a tela usa para a turma inteira; a chamada simples
 * existe para o professor ajustar uma nota sem salvar as outras. O corpo não
 * pode vir vazio: o DTO tem `@ArrayNotEmpty`.
 */
export async function lancarNotasEmLote(
  componentePontuacaoId: string,
  lancamentos: LancarNota[],
): Promise<LancamentoCriado[]> {
  const corpo: LoteDeLancamentos = { lancamentos }
  // Mesma razão do lançamento simples: o lote responde sem o aluno embutido.
  const { data } = await api.post<LancamentoCriado[]>(
    `/componentes-pontuacao/${componentePontuacaoId}/lancamentos/lote`,
    corpo,
  )
  return data
}
