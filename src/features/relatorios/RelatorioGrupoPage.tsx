import { Link, useParams } from 'react-router-dom'

import { PageHeader, Spinner } from '../../components'

import { BaixarPdf } from './BaixarPdf'
import { GraficoDeSintese } from './GraficoDeSintese'
import {
  AvisoSemSintese,
  BlocoDaPontuacaoFinal,
  ErroDoRelatorio,
  ESCALA_DO_EIXO,
  SecaoDeRelatorio,
  TabelaDeIntegrantes,
} from './relatorios.componentes'
import { parcelasDaSoma, serieDoRelatorio } from './series'
import { useRelatorioDoGrupo } from './relatorios.hooks'
import { ESCALA_DE_PONTUACAO } from './relatorios.tipos'
import { rotaDoRelatorioComparativoDoGrupo } from './rotas'

/**
 * Relatório coletivo do grupo: a síntese de cada bimestre, os integrantes de cada
 * um deles e a pontuação final em destaque.
 *
 * **O ponto inteiro desta tela é a separação das escalas.** A pontuação final do
 * grupo é a *soma* das sínteses bimestrais e vai a 40; cada linha do gráfico vai a
 * 10. Por isso a soma fica em um bloco próprio, com o nome da escala e as parcelas
 * que a formam escritas embaixo — `8.25 + 7.50 + …` não deixa dúvida de que o
 * número é acumulado, e é a leitura errada que a etapa 10 existe para impedir.
 *
 * Os integrantes também mudam de bimestre para bimestre (a alocação é por
 * bimestre), então a tabela é uma por bimestre: uma tabela única mentiria sobre a
 * composição da equipe no meio do ano.
 */
export function RelatorioGrupoPage() {
  const { grupoId } = useParams<{ grupoId: string }>()
  const relatorio = useRelatorioDoGrupo(grupoId)

  if (relatorio.carregando) {
    return (
      <>
        <PageHeader title="Relatório do grupo" />
        <div className="flex items-center justify-center gap-2.5 py-16">
          <Spinner label="Carregando relatório" />
          <span className="text-neutral-500 text-sm">Carregando o relatório…</span>
        </div>
      </>
    )
  }

  const dados = relatorio.dados

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatório do grupo"
        description={dados ? `${dados.nome} · ${dados.competicaoNome}` : 'Relatório do grupo'}
        action={
          dados ? (
            <>
              <Link
                to={rotaDoRelatorioComparativoDoGrupo(dados.grupoId)}
                className="text-primary-700 hover:text-primary-800 text-sm font-medium underline underline-offset-2"
              >
                Comparar com os outros grupos
              </Link>
              <BaixarPdf relatorio={dados} />
            </>
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

          {dados.bimestres.some((bimestre) => bimestre.valor !== null) ? (
            <SecaoDeRelatorio id="titulo-sintese-grupo" titulo="Síntese do grupo por bimestre">
              <GraficoDeSintese
                series={[serieDoRelatorio(dados.bimestres, dados.grupoId, dados.nome)]}
                titulo={`Síntese da ${dados.nome} por bimestre`}
                descricao={`Um ponto por bimestre, na ${ESCALA_DO_EIXO}. A soma dos bimestres está no bloco acima, em escala própria.`}
              />
            </SecaoDeRelatorio>
          ) : (
            <AvisoSemSintese quem={`o grupo ${dados.nome}`} />
          )}

          {dados.bimestres.map((bimestre, indice) => (
            <TabelaDeIntegrantes key={bimestre.bimestreId} bimestre={bimestre} indice={indice} />
          ))}
        </>
      ) : null}
    </div>
  )
}