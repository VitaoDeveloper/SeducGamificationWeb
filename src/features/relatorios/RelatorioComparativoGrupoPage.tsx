import { Link, useParams } from 'react-router-dom'

import { Badge, Card, PageHeader, Spinner, Table } from '../../components'
import type { TableColumn } from '../../components'

import { parcelasDaSoma, seriesDoComparativoDeGrupos } from './series'
import { GraficoDeSintese } from './GraficoDeSintese'
import {
  BlocoDaPontuacaoFinal,
  ErroDoRelatorio,
  ESCALA_DO_EIXO,
  SecaoDeRelatorio,
  TabelaDeIntegrantes,
} from './relatorios.componentes'
import { useRelatorioComparativoDoGrupo } from './relatorios.hooks'
import { ESCALA_DE_PONTUACAO, formatarPontuacao } from './relatorios.tipos'
import type { GrupoComparativo } from './relatorios.tipos'
import { rotaDoRelatorioDoGrupo } from './rotas'

/**
 * Relatório coletivo do grupo comparado aos demais grupos da competição.
 *
 * A tela tem dois blocos com escalas diferentes, e essa é a razão de ela existir
 * separada do relatório do grupo:
 *
 * 1. **O gráfico**, com uma série por grupo e eixo em 0 a 10: a comparação das
 *    sínteses bimestrais, que é o que se compara a olho.
 * 2. **A tabela de pontuação final**, com a soma de cada grupo na escala de 0 a
 *    40, abaixo do bloco em destaque e nunca no mesmo eixo nem na mesma coluna do
 *    gráfico.
 *
 * Se os dois fossem para o mesmo lugar — a soma ao lado de uma linha de 0 a 10 —,
 * o efeito seria o mesmo de ler 30,80 como uma nota de bimestre. A ordem na tela
 * (gráfico, depois soma) é também a ordem da leitura: primeiro o que aconteceu
 * bimestre a bimestre, depois o que o ano somou.
 */
export function RelatorioComparativoGrupoPage() {
  const { grupoId } = useParams<{ grupoId: string }>()
  const relatorio = useRelatorioComparativoDoGrupo(grupoId)

  if (relatorio.carregando) {
    return (
      <>
        <PageHeader title="Comparação entre grupos" />
        <div className="flex items-center justify-center gap-2.5 py-16">
          <Spinner label="Carregando relatório" />
          <span className="text-neutral-500 text-sm">Carregando a comparação…</span>
        </div>
      </>
    )
  }

  const dados = relatorio.dados
  const series = dados ? seriesDoComparativoDeGrupos(dados) : []

  /*
   * O próprio grupo entra na tabela de somas a partir do relatório dele, porque a
   * API manda em `comparativo` só os **outros** grupos. A ordenação é pela soma
   * (maior primeiro), com `null` — grupo sem síntese — no fim, e não como zero:
   * ordenar por `?? 0` colocaria o time que ainda não pontuou no mesmo posto de
   * quem closedou com 0,00.
   */
  const grupos: GrupoComparativo[] = dados
    ? [
        {
          grupoId: dados.grupoId,
          nome: dados.nome,
          pontuacaoFinal: dados.pontuacaoFinal,
          bimestres: dados.bimestres.map((bimestre) => ({
            bimestreId: bimestre.bimestreId,
            numero: bimestre.numero,
            valor: bimestre.valor,
          })),
        },
        ...dados.comparativo,
      ].sort((a, b) => {
        if (a.pontuacaoFinal === null) {
          return b.pontuacaoFinal === null ? a.nome.localeCompare(b.nome) : 1
        }
        if (b.pontuacaoFinal === null) return -1
        return b.pontuacaoFinal - a.pontuacaoFinal
      })
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comparação entre grupos"
        description={dados ? `${dados.nome} · ${dados.competicaoNome}` : 'Comparação entre grupos'}
        action={
          dados ? (
            <Link
              to={rotaDoRelatorioDoGrupo(dados.grupoId)}
              className="text-primary-700 hover:text-primary-800 text-sm font-medium underline underline-offset-2"
            >
              Ver o relatório do grupo
            </Link>
          ) : null
        }
      />

      <ErroDoRelatorio
        erro={relatorio.erro}
        aoRecarregar={relatorio.recarregar}
        voltarPara="/salas"
        rotuloDoVoltar="Voltar para as salas"
      />

      {dados ? (
        <>
          <BlocoDaPontuacaoFinal
            escala={ESCALA_DE_PONTUACAO.SOMA_BIMESTRAL}
            valor={dados.pontuacaoFinal}
            descricao={dados.nome}
            parcelas={parcelasDaSoma(dados.bimestres)}
          />

          {series.length > 1 ? (
            <SecaoDeRelatorio id="titulo-comparativo-grupos" titulo="Síntese por bimestre">
              <GraficoDeSintese
                series={series}
                destaque={dados.grupoId}
                titulo="Síntese de cada grupo por bimestre"
                descricao={`Uma linha por grupo da competição, na ${ESCALA_DO_EIXO}. A linha mais grossa é a do grupo deste relatório.`}
              />
            </SecaoDeRelatorio>
          ) : (
            <Card>
              <p className="text-neutral-500 text-sm">
                A competição tem apenas este grupo, então não há com o que comparar. As
                sínteses por bimestre estão no relatório do grupo.
              </p>
            </Card>
          )}

          {/*
           * A soma de cada grupo fica numa tabela própria, embaixo do gráfico e
           * nunca misturada às sínteses: é a escala de 0 a 40 ao lado da escala de
           * 0 a 10, lado a lado na tela mas nunca no mesmo lugar.
           */}
          <SecaoDeRelatorio id="titulo-somas-dos-grupos" titulo="Pontuação final por grupo">
            <Card bare>
              <Table
                columns={colunasDasSomas(dados.grupoId)}
                rows={grupos}
                rowKey={(grupo) => grupo.grupoId}
                emptyMessage="Nenhum grupo com pontuação final nesta competição."
              />
            </Card>
          </SecaoDeRelatorio>

          <SecaoDeRelatorio id="titulo-integrantes-do-grupo" titulo="Integrantes por bimestre">
            <div className="space-y-6">
              {dados.bimestres.map((bimestre, indice) => (
                <TabelaDeIntegrantes key={bimestre.bimestreId} bimestre={bimestre} indice={indice} />
              ))}
            </div>
          </SecaoDeRelatorio>
        </>
      ) : null}
    </div>
  )
}

/**
 * A tabela das somas, com o grupo do próprio relatório marcado.
 *
 * O "Este grupo" importa aqui: a comparação é feita a partir de uma equipe, e
 * saber qual das linhas é a sua é o que evita ter que comparar o nome da página
 * com o nome da tabela. As colunas são geradas por função porque o destaque
 * depende do id do relatório em mãos — o que a linha não carrega.
 *
 * A coluna chama "Pontuação final (soma, até 40)" porque a coluna **é** a soma: é
 * o rótulo que impede que o número seja lido como nota, já que ele aparece logo
 * abaixo de um gráfico cujas linhas vão a 10.
 */
function colunasDasSomas(grupoDoRelatorio: string): TableColumn<GrupoComparativo>[] {
  return [
    {
      key: 'nome',
      header: 'Grupo',
      cell: (grupo) => (
        <span className="flex items-center gap-2">
          <span className="font-medium text-neutral-800">{grupo.nome}</span>
          {grupo.grupoId === grupoDoRelatorio ? <Badge tone="primary">Este grupo</Badge> : null}
        </span>
      ),
    },
    {
      key: 'pontuacaoFinal',
      header: 'Pontuação final (soma, até 40)',
      align: 'right',
      className: 'whitespace-nowrap',
      cell: (grupo) => (
        <span className="text-accent-700 font-semibold tabular-nums">
          {formatarPontuacao(grupo.pontuacaoFinal)}
        </span>
      ),
    },
  ]
}