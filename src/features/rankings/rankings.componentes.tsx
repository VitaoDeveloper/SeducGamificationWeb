import type { ReactNode } from 'react'

import { Alert, Badge, Button, Card, Table } from '../../components'
import type { TableColumn } from '../../components'
import { formatarSintese } from '../../lib/sinteseCalculo'
import { SelecaoDeBimestre } from '../competicoes/SelecaoDeBimestre'
import type { Bimestre } from '../competicoes/competicoes.tipos'

import type { ItemBase, RespostaDeRanking, RespostaDoRankingIndividual } from './rankings.tipos'
import { formatarPosicao, resultadoParcial } from './rankings.tipos'

/** Cabeçalho de seção, no mesmo peso dos títulos das abas da competição. */
const TITULO = 'text-neutral-600 font-display text-sm font-semibold tracking-wide uppercase'

/**
 * As três colunas de todo ranking, montadas uma vez.
 *
 * Parcial, anual e individual mostram o mesmo formato — posição, nome e
 * pontuação — e o que muda entre eles é só como a segunda coluna se chama
 * (equipe ou aluno). Gerar as colunas por função mantém os três com o mesmo
 * desenho sem que um ajuste de estilo chegue aos outros por acaso.
 */
function colunasDoRanking<T extends ItemBase>(nomeDaColuna: string): TableColumn<T>[] {
  return [
    {
      key: 'posicao',
      header: 'Posição',
      className: 'w-32',
      cell: (linha) => (
        <span className="flex items-center gap-1.5">
          {/*
           * A posição repetida já é a marca do empate — a API dá a mesma posição
           * para quem fechou com o mesmo valor — e por isso o número vai sozinho
           * na linha. O ícone ao lado é o reforço, não o aviso: sem ele, a
           * posição repetida continua dizendo a mesma coisa.
           */}
          <span className="text-neutral-800 font-semibold tabular-nums">
            {formatarPosicao(linha.posicao)}
          </span>
          {linha.empate ? <MarcaDeEmpate /> : null}
        </span>
      ),
    },
    {
      key: 'nome',
      header: nomeDaColuna,
      cell: (linha) => <span className="font-medium text-neutral-800">{linha.nome}</span>,
    },
    {
      key: 'valor',
      header: 'Pontuação',
      align: 'right',
      className: 'whitespace-nowrap',
      cell: (linha) => (
        <span className="text-primary-700 font-semibold tabular-nums">
          {formatarSintese(linha.valor)}
        </span>
      ),
    },
  ]
}

/**
 * O empate ao lado da posição.
 *
 * O `sr-only` é o que dá nome ao ícone para o leitor de tela: sem ele, o SVG com
 * `aria-hidden` seria lido como nada, e o empate — que é a informação principal
 * da linha — desapareceria para quem não vê o ícone. Por isso o texto "empate"
 * existe mesmo parecendo redundante com o `title`.
 */
function MarcaDeEmpate() {
  return (
    <span className="text-accent-700 inline-flex items-center rounded-full bg-accent-50 px-1.5 py-0.5">
      <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden className="size-3">
        <path d="M1 4.5h10v2H1zM1 8.5h10v2H1z" />
      </svg>
      <span className="sr-only">empate</span>
    </span>
  )
}

/**
 * O aviso de que o ranking ainda é parcial.
 *
 * Aparece nos rankings anual e individual, e não no parcial: o parcial é por
 * definição um recorte de um bimestre, e o que importa ali é o que aquele
 * bimestre valeu, não quantos bimestres faltam. O texto diz quantos de quatro
 * porque é uma conta que o leitor refaz — "2 de 4" se confere, "parcial" não.
 */
export function AvisoDeParcialidade({ bimestresEncerrados }: { bimestresEncerrados: number }) {
  if (!resultadoParcial(bimestresEncerrados)) return null

  return (
    <p className="text-neutral-500 text-sm">
      Resultado parcial — {bimestresEncerrados} de 4 bimestres encerrados. As posições acima ainda
      podem mudar.
    </p>
  )
}

/** O erro da chamada, com a ação de tentar de novo. */
export function ErroDoRanking({
  erro,
  aoRecarregar,
}: {
  erro: string | null
  aoRecarregar: () => void
}) {
  if (!erro) return null

  return (
    <Alert tone="erro">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{erro}</span>
        <Button variant="outline" size="sm" onClick={aoRecarregar}>
          Tentar de novo
        </Button>
      </div>
    </Alert>
  )
}

export interface SecaoDeRankingProps<T extends ItemBase> {
  /** Valor do `aria-labelledby` que liga a seção ao título. */
  id: string
  titulo: string
  itens: T[]
  rowKey: (linha: T) => string
  nomeDaColuna: string
  mensagemVazia: string
  carregando: boolean
  erro: string | null
  aoRecarregar: () => void
  /**
   * Quando presente, mostra o aviso de resultado parcial com este número de
   * bimestres encerrados. Omitido, a seção não fala de parcialidade — é o que o
   * ranking parcial usa, porque ele é um recorte de um bimestre por definição.
   */
  bimestresEncerrados?: number
  /** Marca as linhas em que a função é verdadeira (a linha "sua", no individual). */
  destacar?: (linha: T) => boolean
  /** Rótulo da marca de destaque. Sem ele, `destacar` não marca nada. */
  rotuloDaDestaque?: string
  /** Controle extra à direita do título — o seletor de bimestre do parcial. */
  cabecalho?: ReactNode
}

/**
 * Uma seção de ranking: título, aviso de parcialidade, erro e tabela.
 *
 * É o bloco reaproveitado pelas três visões do professor e pelas seções do aluno.
 * Existe para que "o mesmo ranking" seja o mesmo componente de verdade: o que
 * muda entre a aba e o dashboard é o conteúdo do cabeçalho e se há linha de
 * destaque, e não o desenho da tabela.
 *
 * `destacar` e `rotuloDaDestaque` servem ao caso do aluno — no ranking
 * individual, a linha dele é a que responde a pergunta que ele abriu a página
 * para fazer. Nenhum dos dois é usado nos rankings de equipe, que não têm "a
 * linha dele".
 */
export function SecaoDeRanking<T extends ItemBase>({
  id,
  titulo,
  itens,
  rowKey,
  nomeDaColuna,
  mensagemVazia,
  carregando,
  erro,
  aoRecarregar,
  bimestresEncerrados,
  destacar,
  rotuloDaDestaque,
  cabecalho,
}: SecaoDeRankingProps<T>) {
  const colunas: TableColumn<T>[] = colunasDoRanking<T>(nomeDaColuna)

  // A segunda coluna ganha a marca de "você" quando a seção pede destaque: é o
  // lugar onde o nome fica, e a marca ao lado dele lê como "é este".
  if (destacar) {
    colunas[1] = {
      ...colunas[1]!,
      cell: (linha) => (
        <span className="flex items-center gap-2">
          <span className="font-medium text-neutral-800">{linha.nome}</span>
          {destacar(linha) && rotuloDaDestaque ? (
            <Badge tone="primary">{rotuloDaDestaque}</Badge>
          ) : null}
        </span>
      ),
    }
  }

  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <h2 id={id} className={TITULO}>
            {titulo}
          </h2>
          {bimestresEncerrados !== undefined ? (
            <AvisoDeParcialidade bimestresEncerrados={bimestresEncerrados} />
          ) : null}
        </div>
        {cabecalho}
      </div>

      <ErroDoRanking erro={erro} aoRecarregar={aoRecarregar} />

      {/*
       * A tabela fica sempre montada, mesmo no erro: o `Table` já desenha o
       * esqueleto durante a carga e a mensagem de vazio quando nada chegou, e o
       * alerta acima é que explica o porquê. Trocar a tabela por um texto de erro
       * apagaria o esqueleto da primeira carga sem ganhar nada em troca.
       */}
      <Card bare>
        <Table
          columns={colunas}
          rows={itens}
          rowKey={rowKey}
          loading={carregando}
          emptyMessage={mensagemVazia}
        />
      </Card>
    </section>
  )
}

export interface RankingParcialProps {
  dados: RespostaDeRanking | null
  carregando: boolean
  erro: string | null
  aoRecarregar: () => void
  bimestres: Bimestre[]
  bimestreId: string | undefined
  aoMudarBimestre: (bimestreId: string) => void
}

/**
 * Ranking parcial: as equipes de um bimestre, pela síntese bimestral.
 *
 * O seletor de bimestre mora aqui e não na página da competição inteira porque o
 * parcial é o único dos três que varia por bimestre: anual e individual somam os
 * quatro. Assim quem troca o seletor geral da página — o das abas de montagem —
 * continua olhando o ranking que a aba abriu.
 */
export function RankingParcial({
  dados,
  carregando,
  erro,
  aoRecarregar,
  bimestres,
  bimestreId,
  aoMudarBimestre,
}: RankingParcialProps) {
  return (
    <SecaoDeRanking
      id="titulo-ranking-parcial"
      titulo="Ranking parcial"
      itens={dados?.itens ?? []}
      rowKey={(linha) => linha.grupoId}
      nomeDaColuna="Equipe"
      mensagemVazia="Nenhuma equipe neste bimestre."
      carregando={carregando}
      erro={erro}
      aoRecarregar={aoRecarregar}
      cabecalho={
        <SelecaoDeBimestre bimestres={bimestres} valor={bimestreId} onChange={aoMudarBimestre} />
      }
    />
  )
}

export interface RankingAnualProps {
  dados: RespostaDeRanking | null
  carregando: boolean
  erro: string | null
  aoRecarregar: () => void
}

/**
 * Ranking anual: as equipes pela soma das sínteses dos quatro bimestres.
 *
 * A escala vai a 40 e não a 10 como no parcial, e a soma é da API — a tela lê o
 * valor da resposta em vez de somar as sínteses que já viu em outras abas, para
 * que o número da tabela e o do relatório sejam o mesmo por construção.
 */
export function RankingAnual({ dados, carregando, erro, aoRecarregar }: RankingAnualProps) {
  return (
    <SecaoDeRanking
      id="titulo-ranking-anual"
      titulo="Ranking anual"
      itens={dados?.itens ?? []}
      rowKey={(linha) => linha.grupoId}
      nomeDaColuna="Equipe"
      mensagemVazia="Nenhuma equipe no ranking anual."
      carregando={carregando}
      erro={erro}
      aoRecarregar={aoRecarregar}
      bimestresEncerrados={dados?.bimestresEncerrados}
    />
  )
}

export interface PainelDoRankingIndividualProps {
  dados: RespostaDoRankingIndividual | null
  carregando: boolean
  erro: string | null
  aoRecarregar: () => void
  /** Id do aluno da sessão, para marcar a linha dele. */
  alunoId: string | undefined
  /** Rótulo da marca de "você". */
  rotuloDeVoce: string | undefined
}

/**
 * Ranking individual: a média das sínteses bimestrais de cada aluno.
 *
 * É o único dos três que tem uma linha "sua". Marcar a do aluno logado é o que
 * faz o ranking responder sem que ele leia nomes até se achar — a aba do
 * professor não marca ninguém, porque o professor não tem linha na tabela.
 */
export function PainelDoRankingIndividual({
  dados,
  carregando,
  erro,
  aoRecarregar,
  alunoId,
  rotuloDeVoce,
}: PainelDoRankingIndividualProps) {
  return (
    <SecaoDeRanking
      id="titulo-ranking-individual"
      titulo="Ranking individual"
      itens={dados?.itens ?? []}
      rowKey={(linha) => linha.alunoId}
      nomeDaColuna="Aluno"
      mensagemVazia="Nenhum aluno no ranking individual."
      carregando={carregando}
      erro={erro}
      aoRecarregar={aoRecarregar}
      bimestresEncerrados={dados?.bimestresEncerrados}
      destacar={(linha) => linha.alunoId === alunoId}
      rotuloDaDestaque={rotuloDeVoce}
    />
  )
}
