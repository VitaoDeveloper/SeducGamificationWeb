import { Link, useParams, useSearchParams } from 'react-router-dom'

import { PageHeader, Spinner } from '../../components'

import { GraficoDeSintese } from './GraficoDeSintese'
import {
  AvisoSemSintese,
  BlocoDaPontuacaoFinal,
  ErroDoRelatorio,
  ESCALA_DO_EIXO,
  SecaoDeRelatorio,
  TabelaDeMaterias,
} from './relatorios.componentes'
import { serieDoRelatorio } from './series'
import { useRelatorioIndividual } from './relatorios.hooks'
import { ESCALA_DE_PONTUACAO } from './relatorios.tipos'
import { rotaDoRelatorioComparativoDoAluno } from './rotas'

/**
 * Relatório individual do aluno: a síntese de cada bimestre, o detalhamento por
 * matéria e a pontuação final em destaque.
 *
 * O `competicaoId` vem da query da URL e não é obrigatório — a API o resolve
 * sozinha quando o aluno participa de uma competição só —, mas a tela o repassa
 * quando ele está: o professor chega aqui de uma competição específica, e dizer
 * qual evita o `400` de "o aluno participa de mais de uma competição".
 *
 * **Por que o bloco da média vem antes do gráfico.** A pontuação final é a média
 * das sínteses (0 a 10), e é o número que o aluno quer; o gráfico é o "como". A
 * ordem se mantém no relatório do grupo, com a soma — e em nenhum dos dois o
 * número final divide eixo com as linhas.
 */
export function RelatorioIndividualPage() {
  const { alunoId } = useParams<{ alunoId: string }>()
  const [parametros] = useSearchParams()
  const competicaoId = parametros.get('competicaoId') ?? undefined

  const relatorio = useRelatorioIndividual(alunoId, competicaoId)

  if (relatorio.carregando) {
    return (
      <>
        <PageHeader title="Relatório do aluno" />
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
        title="Relatório individual"
        description={dados ? `${dados.nome} · ${dados.competicaoNome}` : 'Relatório do aluno'}
        action={
          dados ? (
            <Link
              to={rotaDoRelatorioComparativoDoAluno(dados.alunoId, dados.competicaoId)}
              className="text-primary-700 hover:text-primary-800 text-sm font-medium underline underline-offset-2"
            >
              Comparar com o grupo
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
            descricao={dados.nome}
          />

          {dados.bimestres.some((bimestre) => bimestre.valor !== null) ? (
            <SecaoDeRelatorio id="titulo-sintese-aluno" titulo="Síntese por bimestre">
              <GraficoDeSintese
                series={[serieDoRelatorio(dados.bimestres, dados.alunoId, dados.nome)]}
                titulo="Síntese do aluno por bimestre"
                descricao={`Um ponto por bimestre, na ${ESCALA_DO_EIXO}.`}
              />
            </SecaoDeRelatorio>
          ) : (
            <AvisoSemSintese quem={`${dados.nome} nesta competição`} />
          )}

          {/*
           * A tabela por matéria vem depois do gráfico, e não antes: o professor
           * olha o quanto para decidir se quer o por quê. Uma por bimestre, porque
           * as matérias de avaliação entram e saem ao longo do ano.
           */}
          {dados.bimestres.map((bimestre, indice) => (
            <TabelaDeMaterias key={bimestre.bimestreId} bimestre={bimestre} indice={indice} />
          ))}
        </>
      ) : null}
    </div>
  )
}