import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Alert, Badge, Button, Card, Table } from '../../components'
import type { TableColumn } from '../../components'

import { descreverEscala, formatarPontuacao, rotuloCurtoDoBimestre } from './relatorios.tipos'
import type {
  BimestreDoAluno,
  BimestreDoGrupo,
  EscalaDePontuacao,
  IntegranteDoGrupo,
  MateriaDoAluno,
} from './relatorios.tipos'

/** Cabeçalho de seção, no mesmo peso dos títulos das abas da competição. */
const TITULO = 'text-neutral-600 font-display text-sm font-semibold tracking-wide uppercase'

/* ------------------------------------------------------- pontuação em destaque -- */

/**
 * O bloco de destaque da pontuação final.
 *
 * Existe separado do gráfico por uma regra que a Etapa 10 escreve na primeira
 * linha: a pontuação final do grupo é a **soma** das sínteses e vai a 40, enquanto
 * toda linha do gráfico vai a 10. Se os dois números dividissem o mesmo bloco ou o
 * mesmo eixo, alguém leria "31.80" como uma nota de bimestre — e é o erro mais
 * provável de quem olha um relatório pela primeira vez. Por isso o bloco carrega o
 * nome da escala (`descreverEscala`) e, no caso da soma, a lista das parcelas que
 * a compõem: ver `8.25 + 7.50 + …` deixa claro que o total é uma soma de
 * bimestres, e não uma nota.
 *
 * O valor é sempre o que a API mandou (`pontuacaoFinal`), nunca uma conta feita
 * aqui: a soma e a média do relatório são gravadas no encerramento, e refazer a
 * conta no front criaria um segundo lugar onde os números podem divergir.
 */
export interface BlocoDaPontuacaoFinalProps {
  escala: EscalaDePontuacao
  /** Valor da API. `null` é "sem síntese gravada", e vira traço — nunca 0. */
  valor: number | null
  /**
   * As parcelas do valor, quando a escala é uma soma.
   *
   * Só o grupo usa: para o aluno a pontuação final é média, e a média não é uma
   * soma que a tela precise mostrar parcela por parcela.
   */
  parcelas?: Array<{ rotulo: string; valor: number | null }>
  /** Quem é o dono do número, para o texto não ficar solto: "Equipe Alfa". */
  descricao: string
}

export function BlocoDaPontuacaoFinal({
  escala,
  valor,
  parcelas,
  descricao,
}: BlocoDaPontuacaoFinalProps) {
  const { titulo, maximo, explicacao } = descreverEscala(escala)

  return (
    <Card tone="accent" bar="left" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-neutral-600 font-display text-sm font-semibold tracking-wide uppercase">
            {titulo}
          </h2>
          <p className="text-neutral-500 text-xs">
            {descricao} · {explicacao}
          </p>
        </div>

        <p className="flex items-baseline gap-2">
          <span className="text-neutral-900 font-display text-4xl leading-none font-bold tabular-nums">
            {formatarPontuacao(valor)}
          </span>
          <span className="text-neutral-400 text-sm">/ {maximo}</span>
        </p>
      </div>

      {/*
       * As parcelas entram aqui, dentro do bloco da soma, e não ao lado do
       * número: é o que impede que alguém leia o total como uma nota de bimestre
       * — o próprio bloco mostra de onde ele saiu.
       *
       * Cada parcela é um item de lista com "1º: 8.25" num único texto: são pares
       * (rótulo, número), não uma frase, e a lista é o que diz isso para quem
       * percorre a tela por voz.
       */}
      {parcelas && parcelas.length > 0 ? (
        <ul className="text-neutral-600 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {parcelas.map((parcela) => (
            <li key={parcela.rotulo} className="tabular-nums">
              {`${parcela.rotulo}: ${formatarPontuacao(parcela.valor)}`}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  )
}

/* --------------------------------------------------------------- utilidades -- */

/**
 * A mensagem de recusa de escopo, com o caminho de volta.
 *
 * Sem ela, o `403` deixaria a página com um título e nada mais — o pior estado
 * para quem só queria ver um número. O botão de voltar é para a competição (ou
 * para o dashboard do aluno), que é de onde o relatório foi pedido na quase
 * totalidade dos casos.
 */
export function ErroDoRelatorio({
  erro,
  aoRecarregar,
  voltarPara,
  rotuloDoVoltar,
}: {
  erro: string | null
  aoRecarregar: () => void
  voltarPara?: string
  rotuloDoVoltar?: string
}) {
  if (!erro) return null

  return (
    <Alert tone="erro">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{erro}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={aoRecarregar}>
            Tentar de novo
          </Button>
          {voltarPara ? (
            <Link to={voltarPara}>
              <Button variant="outline" size="sm">
                {rotuloDoVoltar ?? 'Voltar'}
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </Alert>
  )
}

/** O aviso de que a resposta veio sem nenhum bimestre para mostrar. */
export function AvisoSemSintese({ quem }: { quem: string }) {
  return (
    <Alert tone="info">
      <p className="font-medium">Nenhuma síntese gravada ainda para {quem}.</p>
      <p className="mt-1">
        Os gráficos e as tabelas aparecem depois do encerramento do primeiro
        bimestre, que é quando a API grava as sínteses.
      </p>
    </Alert>
  )
}

/* ------------------------------------------------------------------ tabelas -- */

/** Colunas das tabelas por matéria — a mesma nos dois relatórios de aluno. */
function colunasDeMaterias(): TableColumn<MateriaDoAluno>[] {
  return [
    {
      key: 'materia',
      header: 'Matéria',
      cell: (materia) => <span className="font-medium text-neutral-800">{materia.nome}</span>,
    },
    {
      key: 'sintese',
      header: 'Síntese na matéria',
      align: 'right',
      className: 'whitespace-nowrap',
      cell: (materia) => (
        <span className="text-primary-700 font-semibold tabular-nums">
          {formatarPontuacao(materia.valor)}
        </span>
      ),
    },
  ]
}

/**
 * As matérias de um bimestre, para o relatório individual.
 *
 * A tabela é a resposta a "por que este bimestre valeu isso" — o gráfico diz o
 * quanto, e ela diz o de quê, que é a pergunta que o professor faz ao ver um
 * número que não esperava.
 */
export function TabelaDeMaterias({
  bimestre,
  indice,
}: {
  bimestre: BimestreDoAluno
  indice: number
}) {
  return (
    <section aria-labelledby={`materias-${indice}`} className="space-y-3">
      <h3 id={`materias-${indice}`} className={TITULO}>
        {rotuloCurtoDoBimestre(bimestre.numero)} bimestre — por matéria
      </h3>
      <Card bare>
        <Table
          columns={colunasDeMaterias()}
          rows={bimestre.materias}
          rowKey={(materia) => materia.componenteCurricularId}
          emptyMessage="Sem síntese por matéria neste bimestre."
        />
      </Card>
    </section>
  )
}

/** Os integrantes de um bimestre do grupo, com a síntese de cada um. */
export function TabelaDeIntegrantes({
  bimestre,
  indice,
  destaque,
  rotuloDoDestaque,
}: {
  bimestre: BimestreDoGrupo
  indice: number
  /** Id do integrante a marcar — o aluno logado, no relatório do próprio grupo. */
  destaque?: string
  rotuloDoDestaque?: string
}) {
  const colunas: TableColumn<IntegranteDoGrupo>[] = [
    {
      key: 'nome',
      header: 'Integrante',
      cell: (integrante) => (
        <span className="flex items-center gap-2">
          <span className="font-medium text-neutral-800">{integrante.nome}</span>
          {destaque === integrante.alunoId && rotuloDoDestaque ? (
            <Badge tone="primary">{rotuloDoDestaque}</Badge>
          ) : null}
        </span>
      ),
    },
    {
      key: 'sintese',
      header: 'Síntese no bimestre',
      align: 'right',
      className: 'whitespace-nowrap',
      cell: (integrante) => (
        <span className="text-primary-700 font-semibold tabular-nums">
          {formatarPontuacao(integrante.valor)}
        </span>
      ),
    },
  ]

  return (
    <section aria-labelledby={`integrantes-${indice}`} className="space-y-3">
      <h3 id={`integrantes-${indice}`} className={TITULO}>
        {rotuloCurtoDoBimestre(bimestre.numero)} bimestre — integrantes
      </h3>
      <Card bare>
        <Table
          columns={colunas}
          rows={bimestre.integrantes}
          rowKey={(integrante) => integrante.alunoId}
          emptyMessage="Nenhum integrante neste bimestre."
        />
      </Card>
    </section>
  )
}

/* ------------------------------------------------------------------ escalas -- */

/**
 * Rótulo do eixo do gráfico, que é sempre a escala da síntese.
 *
 * Vive aqui, e não em `relatorios.tipos.ts`, porque é um texto de tela: os números
 * das escalas estão no arquivo de tipos, e a frase que entra na descrição do
 * gráfico é da tela.
 */
export const ESCALA_DO_EIXO = 'escala de 0 a 10'

/** Wrapper de seção com título, usado pelas quatro telas. */
export function SecaoDeRelatorio({
  id,
  titulo,
  children,
  cabecalho,
}: {
  id: string
  titulo: string
  children: ReactNode
  cabecalho?: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id={id} className={TITULO}>
          {titulo}
        </h2>
        {cabecalho}
      </div>
      {children}
    </section>
  )
}