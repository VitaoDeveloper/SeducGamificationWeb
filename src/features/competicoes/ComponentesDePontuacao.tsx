import { Alert, Badge, Button, Card, CardTitle, Spinner } from '../../components'
import {
  useComponentesDoBimestre,
  useValidacaoDePesos,
} from './componentes-pontuacao.hooks'
import { NovoComponenteForm } from './NovoComponenteForm'
import { avaliarPesos, formatarPercentual, rotuloDoPeso } from './pesos'
import { SITUACAO_BIMESTRE } from './competicoes.tipos'
import type { Bimestre } from './competicoes.tipos'
import type { MateriaComPesos } from './componentes-pontuacao.tipos'
import type { ComponenteCurricular } from '../salas/salas.tipos'

export interface ComponentesDePontuacaoProps {
  bimestre: Bimestre
  /** Matérias do lecionamento, para o formulário de criação. */
  componentesCurriculares: ComponenteCurricular[]
}

/**
 * Componentes de pontuação do bimestre, agrupados por matéria.
 *
 * Uma cartão por matéria, e não uma lista corrida, porque a pergunta do professor
 * é sempre por matéria: "esta matéria já fecha?" Uma tabela única obrigaria a
 * somar de cabeça para achar a linha, e o indicador de fechamento só existe por
 * matéria. O agrupamento vem da API, e o indicador vem de `avaliarPesos` — não
 * de `somaPesoPercentual` — porque a soma em ponto flutuante precisa do mesmo
 * arredondamento de 2 casas que o banco faz.
 *
 * O veredito do topo é o de `.../validar`, que é o mesmo que a Etapa 07 vai
 * consultar para recusar o encerramento de um bimestre com pesos abertos: a tela
 * avisa antes, e o encerramento cobra depois.
 */
export function ComponentesDePontuacao({
  bimestre,
  componentesCurriculares,
}: ComponentesDePontuacaoProps) {
  const componentes = useComponentesDoBimestre(bimestre.id)
  const validacao = useValidacaoDePesos(bimestre.id)

  const encerrado = bimestre.situacao === SITUACAO_BIMESTRE.ENCERRADO
  const materias = componentes.dados?.materias ?? []

  return (
    <div className="space-y-5">
      {encerrado ? (
        <Alert tone="info">
          Este bimestre está encerrado. Os pesos e os componentes ficam só de
          leitura — o que foi definido neles já entrou no cálculo do ranking.
        </Alert>
      ) : null}

      <Card tone="accent" bar="left">
        <CardTitle>Novo componente</CardTitle>
        <p className="text-neutral-600 mt-1.5 mb-4 text-sm">
          O componente é uma avaliação da matéria no bimestre — a prova, o
          trabalho, o simulado. O peso é a fatia dele dentro dos 100% da matéria.
        </p>

        {encerrado ? (
          <p className="text-neutral-500 text-sm">
            O bimestre está encerrado, então não dá para criar componente.
          </p>
        ) : (
          <NovoComponenteForm
            bimestreId={bimestre.id}
            componentesCurriculares={componentesCurriculares}
            onCriado={() => {
              componentes.recarregar()
              validacao.recarregar()
            }}
          />
        )}
      </Card>

      {componentes.erro ? (
        <Alert tone="erro">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{componentes.erro}</span>
            <Button variant="outline" size="sm" onClick={componentes.recarregar}>
              Tentar de novo
            </Button>
          </div>
        </Alert>
      ) : null}

      {validacao.erro ? (
        <Alert tone="erro">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{validacao.erro}</span>
            <Button variant="outline" size="sm" onClick={validacao.recarregar}>
              Tentar de novo
            </Button>
          </div>
        </Alert>
      ) : null}

      {validacao.dados && !validacao.dados.fechado ? (
        <Alert tone="info">
          <p className="font-medium">
            Ainda faltam pesos para fechar 100% em{' '}
            {validacao.dados.materiasPendentes.length}{' '}
            {validacao.dados.materiasPendentes.length === 1 ? 'matéria' : 'matérias'}.
          </p>
          <ul className="mt-1.5 list-inside list-disc">
            {validacao.dados.materiasPendentes.map((materia) => (
              <li key={materia.componenteCurricularId}>
                {materia.materiaNome} — soma em {formatarPercentual(materia.somaPesoPercentual)},
                faltam {materia.faltaParaFechar}%
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {validacao.dados?.fechado ? (
        <Alert tone="sucesso">
          Todas as matérias fecham 100% neste bimestre. Os pesos já podem ir para
          o cálculo das notas.
        </Alert>
      ) : null}

      {componentes.carregando ? (
        <div className="flex items-center justify-center gap-2.5 py-10">
          <Spinner size="sm" />
          <span className="text-neutral-500 text-sm">Carregando componentes…</span>
        </div>
      ) : materias.length === 0 ? (
        <Card bare>
          <p className="text-neutral-500 px-6 py-10 text-center text-sm">
            O lecionamento desta competição não tem matéria cadastrada. Inscreva-se
            de novo na sala escolhendo os componentes curriculares.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {materias.map((materia) => (
            <CartaoDaMateria key={materia.componenteCurricularId} materia={materia} />
          ))}
        </div>
      )}
    </div>
  )
}

/** A matéria com o indicador de fechamento e os componentes que ela já tem. */
function CartaoDaMateria({ materia }: { materia: MateriaComPesos }) {
  const avaliacao = avaliarPesos(materia.componentesPontuacao)

  return (
    <Card>
      <CardTitle className="flex flex-wrap items-center justify-between gap-2.5">
        <span>{materia.materiaNome}</span>
        <Badge tone={avaliacao.fechou ? 'primary' : 'neutro'}>
          {rotuloDoPeso(avaliacao)}
        </Badge>
      </CardTitle>

      {materia.componentesPontuacao.length === 0 ? (
        <p className="text-neutral-500 mt-2.5 text-sm">
          Nenhum componente nesta matéria. Crie o primeiro acima.
        </p>
      ) : (
        <ul className="divide-line mt-2.5 divide-y">
          {materia.componentesPontuacao.map((componente) => (
            <li
              key={componente.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span className="text-neutral-800 text-sm">{componente.nome}</span>
              <span className="text-neutral-600 text-sm font-medium">
                {formatarPercentual(componente.pesoPercentual)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-neutral-500 mt-2.5 text-xs">
        Soma da matéria: {formatarPercentual(avaliacao.total)} ·{' '}
        {materia.componentesPontuacao.length}{' '}
        {materia.componentesPontuacao.length === 1 ? 'componente' : 'componentes'}
      </p>
    </Card>
  )
}
