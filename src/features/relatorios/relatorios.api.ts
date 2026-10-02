import { AxiosError } from 'axios'

import { api } from '../../lib/api'
import { mensagemDeErro } from '../../lib/erro-api'

import { PREFIXO_DO_PDF, nomeDoArquivoDoPdf } from './relatorios.pdf'
import type {
  Relatorio,
  RelatorioComparativoDoAluno,
  RelatorioComparativoDoGrupo,
  RelatorioDoGrupo,
  RelatorioIndividual,
} from './relatorios.tipos'

/**
 * O texto que a tela mostra quando a API recusa um relatório por escopo.
 *
 * A recusa chega como `403` e o corpo traz "Forbidden" (ou o motivo interno do
 * `RelatoriosService`, como "Aluno só pode acessar o próprio relatório"), que
 * não diz a quem lê o que fazer. As três causas que a API documenta na seção
 * 11.13 — aluno pedindo o relatório de outro, grupo de outra competição,
 * professor de outra sala — cabem numa frase só, sem afirmar qual foi: a página
 * continua de pé e o texto diz o que a pessoa pode tentar.
 *
 * O mesmo tratamento do `rankings.api.ts`, e pela mesma razão: é o `403` que
 * chega quando o link veio de outro lugar, e a tela não pode quebrar nele.
 */
export const MENSAGEM_DE_ACESSO_AO_RELATORIO =
  'Você não tem acesso a este relatório. Ele pode ser de outra competição, ou o seu perfil pode não ter permissão para vê-lo.'

/**
 * Reescreve a mensagem de um `403` da API e devolve `null` nas outras falhas.
 *
 * Consumida como `traduzirErro` em `useRequisicao`: `null` mantém a mensagem
 * padrão (rede, timeout, erro de aplicação), e só a recusa de escopo ganha texto
 * que o leitor entende.
 */
export function traduzirErroDoRelatorio(falha: unknown): string | null {
  if (falha instanceof AxiosError && falha.response?.status === 403) {
    return MENSAGEM_DE_ACESSO_AO_RELATORIO
  }

  return null
}

/**
 * `GET /alunos/:id/relatorio-individual?competicaoId=<uuid>`
 *
 * O `competicaoId` é opcional na API (só obrigatório quando o aluno participa de
 * mais de uma competição), e chega omitido quando a tela não o tem — no `params`
 * do axios, `undefined` não vira query string.
 */
export async function buscarRelatorioIndividual(
  alunoId: string | undefined,
  competicaoId?: string,
): Promise<RelatorioIndividual | null> {
  if (!alunoId) return null

  const { data } = await api.get<RelatorioIndividual>(`/alunos/${alunoId}/relatorio-individual`, {
    params: competicaoId ? { competicaoId } : undefined,
  })
  return data
}

/** `GET /alunos/:id/relatorio-comparativo-grupo?competicaoId=<uuid>`. */
export async function buscarRelatorioComparativoDoAluno(
  alunoId: string | undefined,
  competicaoId?: string,
): Promise<RelatorioComparativoDoAluno | null> {
  if (!alunoId) return null

  const { data } = await api.get<RelatorioComparativoDoAluno>(
    `/alunos/${alunoId}/relatorio-comparativo-grupo`,
    { params: competicaoId ? { competicaoId } : undefined },
  )
  return data
}

/**
 * `GET /grupos/:id/relatorio`
 *
 * Sem `competicaoId`: a API descobre a competição pelo próprio grupo (é o
 * `carregarAcessoGrupo` que resolve), e mandar o parâmetro seria inventar um
 * filtro que a rota não tem.
 */
export async function buscarRelatorioDoGrupo(
  grupoId: string | undefined,
): Promise<RelatorioDoGrupo | null> {
  if (!grupoId) return null

  const { data } = await api.get<RelatorioDoGrupo>(`/grupos/${grupoId}/relatorio`)
  return data
}

/** `GET /grupos/:id/relatorio-comparativo` — o mesmo grupo, contra os outros. */
export async function buscarRelatorioComparativoDoGrupo(
  grupoId: string | undefined,
): Promise<RelatorioComparativoDoGrupo | null> {
  if (!grupoId) return null

  const { data } = await api.get<RelatorioComparativoDoGrupo>(
    `/grupos/${grupoId}/relatorio-comparativo`,
  )
  return data
}

/* ------------------------------------------------------------------- o PDF -- */

/**
 * O que a Etapa 11 baixa: os bytes do PDF e o nome com que ele deve ser salvo.
 *
 * O nome vem pronto, e não como parte do blob, porque a decisão é do módulo de
 * PDF (`relatorios.pdf.ts`) e essa função é o único ponto onde as duas se
 * encontram. Quem chama entrega o resultado ao navegador e não sabe de onde o
 * nome saiu.
 */
export interface PdfBaixado {
  blob: Blob
  nomeDoArquivo: string
}

/**
 * A espera da geração do PDF, em milissegundos.
 *
 * O `timeout` global da instância (15 s) foi calibrado para o JSON, que é lido de
 * uma tabela. O PDF é montado pelo `pdfmake` no servidor, com os gráficos e as
 * tabelas de cada bimestre, e pode passar dos 15 s numa competição grande — e
 * estourar o tempo devolve um timeout, quando a resposta estava a caminho. Aqui
 * só a chamada do PDF recebe o limite maior; nenhuma outra muda.
 */
const TEMPO_LIMITE_DO_PDF = 60000

/**
 * A rota do PDF do relatório que já está na tela.
 *
 * Recebe o **relatório inteiro**, e não `(alunoId, tipo)`, porque o `.pdf` se
 * endereça pelo mesmo recurso do JSON e pela mesma identificação: `/alunos/:id/`
 * para os dois relatórios de aluno, `/grupos/:id/` para os dois de grupo. Assim a
 * tela passa o que já tem em mãos e a rota do PDF não pode divergir da rota do
 * JSON — não existe o caso de o botão estar na tela do individual e o arquivo
 * sair do grupo, que é a falha que ninguém acha na revisão.
 */
export async function baixarPdfDoRelatorio(relatorio: Relatorio): Promise<PdfBaixado> {
  const prefixo = PREFIXO_DO_PDF[relatorio.tipo]

  const { data, headers } = await api.get<Blob>(
    caminhoDoPdf(relatorio, prefixo),
    /*
     * O `competicaoId` vai sempre, nos relatórios de aluno, mesmo quando a rota
     * da tela não o trazia: a API só o exige quando o aluno participa de mais de
     * uma competição (README-API.md, 11.13), e o relatório que já carregou diz
     * qual competição é esta. Nos de grupo não vai nada, porque a rota não tem o
     * parâmetro e a competição é resolvida pelo próprio grupo.
     */
    {
      params: 'alunoId' in relatorio ? { competicaoId: relatorio.competicaoId } : undefined,
      responseType: 'blob',
      timeout: TEMPO_LIMITE_DO_PDF,
    },
  )

  conferirQueEhPdf(data, headers)

  return {
    blob: data,
    /*
     * O `Content-Disposition` da API, quando vier, tem precedência; quando não
     * vem, o nome é montado do relatório. A API documenta `Content-Type:
     * application/pdf` e o nome `relatorio-*.pdf`, mas não promete o cabeçalho —
     * por isso os dois caminhos existem, e o montado é o que não pode faltar.
     *
     * E o cabeçalho talvez nem chegue: `Content-Disposition` não é liberado pelo
     * CORS por padrão, então o navegador esconde do JavaScript o que a API
     * mandou, a menos que a resposta traga
     * `Access-Control-Expose-Headers: Content-Disposition`. Ler um cabeçalho que
     * o navegador esconde dá `undefined`, e `undefined` cai no nome montado —
     * que é exatamente o comportamento certo para esse caso.
     */
    nomeDoArquivo: nomeDoArquivoDoPdf(
      relatorio.tipo,
      relatorio.nome,
      headers['content-disposition'] ?? null,
    ),
  }
}

/** `/alunos/:id/relatorio-individual.pdf` ou `/grupos/:id/relatorio.pdf`. */
function caminhoDoPdf(relatorio: Relatorio, prefixo: string): string {
  if ('alunoId' in relatorio) {
    return `/alunos/${relatorio.alunoId}/${prefixo}.pdf`
  }

  return `/grupos/${relatorio.grupoId}/${prefixo}.pdf`
}

/**
 * Recusa a resposta que não é um PDF.
 *
 * Existe porque um `200` nem sempre é o que parece: um proxy ou um captive portal
 * no caminho da API devolve a própria página de erro em HTML, com status 200 e
 * sem que o axios (ou o professor) desconfie. Salvar esse HTML com nome de
 * `.pdf` é o pior desfecho possível — um arquivo que existe, que abre, e que não
 * é o relatório. Um `Content-Type` que não seja `application/pdf`, ou um corpo
 * vazio, viram erro de verdade, com mensagem na tela e a página de pé.
 */
function conferirQueEhPdf(blob: Blob, headers: Record<string, unknown>): void {
  const tipo = String(headers['content-type'] ?? '')

  if (tipo && !tipo.includes('application/pdf')) {
    throw new Error('A API devolveu uma página da web em vez do PDF do relatório.')
  }

  if (!blob?.size) {
    throw new Error('O PDF do relatório veio vazio.')
  }
}

/**
 * A mensagem que a tela mostra quando a geração do PDF falha.
 *
 * Quatro caminhos, na ordem em que cada um diz mais do que o seguinte: a recusa de
 * escopo (`403`), que é a mesma frase que os quatro relatórios em JSON já usam; o
 * erro que a API descreveu no corpo, extraído por `mensagemDeErro`; a mensagem de
 * um erro lançado aqui — o `PDF` que veio vazio ou que não era PDF —, que é mais
 * específica que a genérica; e, por último, a frase desta etapa, para o que não é
 * erro nenhum.
 *
 * É **assíncrona** por causa do `Blob`: a chamada do PDF pede `responseType:
 * 'blob'`, e isso vale também para as respostas de erro, que chegam como `Blob` em
 * vez do JSON que `mensagemDeErro` sabe ler. Sem o `await` do blob, todo erro da
 * API no download viraria o mesmo "Request failed with status code 500", que é
 * o axios falando e não o servidor — e o professor ficaria sem nenhuma pista do
 * que deu errado.
 */
export async function mensagemDoErroDoPdf(falha: unknown): Promise<string> {
  const doEscopo = traduzirErroDoRelatorio(falha)
  if (doEscopo) return doEscopo

  if (!(falha instanceof AxiosError)) {
    return falha instanceof Error ? falha.message : FALHA_AO_GERAR_O_PDF
  }

  /*
   * O texto cru do axios ("Request failed with status code 500") entra como
   * último recurso só para rede e timeout, que `mensagemDeErro` traduz. Para o
   * status que a API não descreveu, a frase genérica desta etapa é melhor que
   * o número do status solto.
   */
  return mensagemDeErro(await comOCorpoDoErroLegivel(falha), FALHA_AO_GERAR_O_PDF)
}

/**
 * O mesmo erro do axios, com o corpo do blob lido como o JSON que ele é.
 *
 * Devolve a falha como veio quando o corpo não é um blob ou não é JSON — a página
 * de HTML do proxy, um corpo vazio —, porque nesses casos não há mensagem da API
 * para ler e o texto original do axios é o que resta.
 */
async function comOCorpoDoErroLegivel(falha: AxiosError): Promise<AxiosError> {
  const dados = falha.response?.data
  if (!(dados instanceof Blob) || !falha.response) return falha

  try {
    return new AxiosError(falha.message, falha.code, falha.config, falha.request, {
      ...falha.response,
      data: JSON.parse(await dados.text()) as unknown,
    })
  } catch {
    return falha
  }
}

/** O texto de último recurso, quando a falha não diz nada de útil. */
const FALHA_AO_GERAR_O_PDF = 'Não foi possível gerar o PDF do relatório. Tente de novo.'