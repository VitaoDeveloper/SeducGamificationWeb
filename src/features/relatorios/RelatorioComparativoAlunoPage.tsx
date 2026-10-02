import { Link, useParams, useSearchParams } from 'react-router-dom'

import { Alert, PageHeader, Spinner } from '../../components'

import { gruposPorBimestre, seriesDoComparativoDoAluno } from './series'
import { GraficoDeSintese } from './GraficoDeSintese'
import {
  BlocoDaPontuacaoFinal,
  ErroDoRelatorio,
  ESCALA_DO_EIXO,
  SecaoDeRelatorio,
} from './relatorios.componentes'
import { useRelatorioComparativoDoAluno } from './relatorios.hooks'
import { ESCALA_DE_PONTUACAO, rotuloCurtoDoBimestre } from './relatorios.tipos'
import { rotaDoRelatorioIndividual } from './rotas'

/**
 * Relatório individual comparado ao grupo do aluno.
 *
 * A diferença para o relatório individual não é o gráfico: é a **linha do
 * próprio aluno** misturada com as dos colegas, e o grupo que muda de bimestre.
 * Por isso o eixo continua sendo o bimestre e as séries são pessoas — quando o
 * aluno troca de equipe no meio do ano, o colega antigo fica com um intervalo em
 * branco, que é a informação honesta ("não dividíamos grupo neste bimestre") em
 * vez de uma linha costurada que sugere convivência onde não houve.
 *
 * Quem do grupo o aluno era aparece escrito abaixo do gráfico: sem isso, a
 * comparação mostraria sintese contra sintese sem dizer com quem, e a pergunta
 * "ele foi justo nesse time?" ficaria sem resposta.
 */
export function RelatorioComparativoAlunoPage() {
  const { alunoId } = useParams<{ alunoId: string }>()
  const [parametros] = useSearchParams()
  const competicaoId = parametros.get('competicaoId') ?? undefined

  const relatorio = useRelatorioComparativoDoAluno(alunoId, competicaoId)

  if (relatorio.carregando) {
    return (
      <>
        <PageHeader title="Comparação com o grupo" />
        <div className="flex items-center justify-center gap-2.5 py-16">
          <Spinner label="Carregando relatório" />
          <span className="text-neutral-500 text-sm">Carregando a comparação…</span>
        </div>
      </>
    )
  }

  const dados = relatorio.dados
  const series = dados ? seriesDoComparativoDoAluno(dados) : []
  const grupos = dados ? gruposPorBimestre(dados) : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comparação com o grupo"
        description={dados ? `${dados.nome} · ${dados.competicaoNome}` : 'Comparação do aluno'}
        action={
          dados ? (
            <Link
              to={rotaDoRelatorioIndividual(dados.alunoId, dados.competicaoId)}
              className="text-primary-700 hover:text-primary-800 text-sm font-medium underline underline-offset-2"
            >
              Ver o relatório individual
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
            escala={ESCALA_DE_PONTUACAO.MEDIA_BIMESTRAL}
            valor={dados.pontuacaoFinal}
            descricao={`Média de ${dados.nome}`}
          />

          {/*
           * Uma série só (o próprio aluno, sem grupo) não é comparação: é o
           * relatório individual de novo. A tela avisa e manda para ele, em vez de
           * mostrar um gráfico de uma linha que não responde a pergunta.
           */}
          {series.length > 1 ? (
            <>
              <SecaoDeRelatorio id="titulo-comparativo-grupo" titulo="Comparação no grupo">
                <GraficoDeSintese
                  series={series}
                  destaque={dados.alunoId}
                  titulo={`${dados.nome} e o grupo, por bimestre`}
                  descricao={`Uma linha por integrante do grupo de cada bimestre, na ${ESCALA_DO_EIXO}. A linha mais grossa é a do próprio aluno.`}
                />

                <ul className="text-neutral-500 space-y-1 text-xs">
                  {grupos.map((item) => (
                    <li key={item.numero}>
                      {rotuloCurtoDoBimestre(item.numero)} bimestre:{' '}
                      {item.grupo ? item.grupo.nome : 'sem grupo'}
                    </li>
                  ))}
                </ul>
              </SecaoDeRelatorio>
            </>
          ) : (
            <Alert tone="info">
              <p className="font-medium">Nenhum colega de grupo para comparar.</p>
              <p className="mt-1">
                O relatório comparado ao grupo mostra uma linha por integrante da
                equipe do bimestre. Enquanto o aluno não dividiu grupo com mais
                ninguém, o que ele tem é o relatório individual.
              </p>
            </Alert>
          )}
        </>
      ) : null}
    </div>
  )
}