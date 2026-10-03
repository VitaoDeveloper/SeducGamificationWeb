import { Alert, Card, Field, Select } from '../../components'
import { useComponentesDoBimestre } from './componentes-pontuacao.hooks'
import { TabelaDeLancamentos } from './TabelaDeLancamentos'
import { formatarPercentual } from './pesos'
import { SITUACAO_BIMESTRE } from './competicoes.tipos'
import type { Bimestre } from './competicoes.tipos'
import type { ModeloAvaliacao } from './modelo-avaliacao'
import type {
  ComponentePontuacaoDoBimestre,
  MateriaComPesos,
} from './componentes-pontuacao.tipos'
import type { Aluno } from '../salas/salas.tipos'

export interface LancamentosDeComponenteProps {
  bimestre: Bimestre
  /** Componente em lançamento; a escolha fica com a página, para sobreviver à aba. */
  componenteId: string | undefined
  onComponenteChange: (componenteId: string) => void
  alunos: Aluno[]
  /**
   * Modelo da escola, repassado à tabela sem decisão: ela é quem escolhe o
   * formato do campo, e o mesmo modelo valida a nota. `null` quando a API não
   * informou o modelo da escola.
   */
  modelo: ModeloAvaliacao | null
}

/**
 * Lançamentos de um componente de pontuação do bimestre.
 *
 * O componente é escolhido aqui dentro, e não fixa: uma competição tem um
 * componente por avaliação e por matéria, e o professor alterna entre eles o dia
 * inteiro. A lista vem achatada (uma opção por componente, com a matéria no
 * rótulo) porque o seletor precisa dizer de qual componente é a nota que ele
 * está lançando — dois "Prova 1", um de Matemática e outro de Português, são
 * linhas diferentes e notas diferentes.
 *
 * A escolha mora na página, e não aqui, para não se perder quando o professor vai
 * ver os grupos e volta.
 */
export function LancamentosDeComponente({
  bimestre,
  componenteId,
  onComponenteChange,
  alunos,
  modelo,
}: LancamentosDeComponenteProps) {
  const componentes = useComponentesDoBimestre(bimestre.id)
  const encerrado = bimestre.situacao === SITUACAO_BIMESTRE.ENCERRADO

  const todos: Array<{ materia: MateriaComPesos; componente: ComponentePontuacaoDoBimestre }> = []
  for (const materia of componentes.dados?.materias ?? []) {
    for (const componente of materia.componentesPontuacao) {
      todos.push({ materia, componente })
    }
  }

  const selecionado = todos.find((item) => item.componente.id === componenteId)

  if (componentes.carregando) {
    return (
      <Card bare>
        <p className="text-neutral-500 px-6 py-10 text-center text-sm">
          Carregando componentes do bimestre…
        </p>
      </Card>
    )
  }

  if (todos.length === 0) {
    return (
      <Alert tone="info">
        Este bimestre ainda não tem componente de pontuação. Vá em{" "}
        <strong>Componentes</strong>, defina os pesos e volte para lançar as notas.
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/*
       * O seletor de componente não trava com o bimestre encerrado: o que fica
       * somente leitura são as notas, não a escolha de qual componente ler. Um
       * bimestre encerrado é justamente o que o professor quer consultar.
       */}
      <Field label="Componente de pontuação" className="max-w-md">
        <Select value={componenteId ?? ''} onChange={(evento) => onComponenteChange(evento.target.value)}>
          <option value="">Escolha o componente…</option>
          {todos.map(({ materia, componente }) => (
            <option key={componente.id} value={componente.id}>
              {materia.materiaNome} — {componente.nome} ({formatarPercentual(componente.pesoPercentual)})
            </option>
          ))}
        </Select>
      </Field>

      {selecionado ? (
        <Card bare className="p-6">
          {/*
           * A `key` força a remontagem ao trocar de componente, e é o que impede a
           * pior versão desse bug: o professor digita meio crédito na prova de
           * Matemática, vai lançar a de Português e a tabela aparece já preenchida
           * com os restos da prova de Matemática — como se fossem notas de uma
           * avaliação que ele nem está mais vendo.
           *
           * A matéria inteira desce com o componente porque a coluna de prévia
           * (Etapa 06) soma os pesos dos componentes irmãos, que só ela conhece.
           */}
          <TabelaDeLancamentos
            key={selecionado.componente.id}
            componente={selecionado.componente}
            materia={selecionado.materia}
            alunos={alunos}
            modelo={modelo}
            encerrado={encerrado}
          />
        </Card>
      ) : (
        <Card bare>
          <p className="text-neutral-500 px-6 py-10 text-center text-sm">
            Escolha o componente acima para lançar as notas da turma.
          </p>
        </Card>
      )}
    </div>
  )
}
