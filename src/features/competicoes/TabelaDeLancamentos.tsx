import { useState } from 'react'
import {
  Alert,
  Button,
  IconeDeLixeira,
  Input,
  Select,
  Table,
  useToast,
} from '../../components'
import type { TableColumn } from '../../components'
import { formatarSintese } from '../../lib/sinteseCalculo'
import { mensagemDeErro } from '../../lib/erro-api'
import { excluirLancamento, lancarNota, lancarNotasEmLote } from './componentes-pontuacao.api'
import { useLancamentos, useLancamentosDeComponentes } from './componentes-pontuacao.hooks'
import { sinteseDaMateriaPorAluno } from './previa-sintese'
import { validarNotas } from './notas'
import { ESCALA_NUMERICA, SEM_MODELO_DE_AVALIACAO, ehEscalaNumerica } from './modelo-avaliacao'
import type { NotaPendente } from './previa-sintese'
import type { ModeloAvaliacao } from './modelo-avaliacao'
import type { NotaDigitada } from './notas'
import type { ComponentePontuacaoDoBimestre, MateriaComPesos } from './componentes-pontuacao.tipos'
import type { Aluno } from '../salas/salas.tipos'

/** Texto que a coluna de prévia repete, para ninguém ler o número como oficial. */
export const AVISO_DE_PREVIA =
  'Prévia — sujeita a alteração até o encerramento do bimestre.'

export interface TabelaDeLancamentosProps {
  componente: ComponentePontuacaoDoBimestre
  /**
   * A matéria a que o componente pertence, com os outros componentes dela.
   *
   * A prévia da coluna é a síntese da **matéria**, não a deste componente: para
   * somar os pesos o front precisa das notas que os irmãos da prova já têm, e
   * quem sabe quais são é a matéria, não o componente solto.
   */
  materia: MateriaComPesos
  /** Todos os matriculados na sala: a nota em branco é aluno sem lançamento. */
  alunos: Aluno[]
  /**
   * Modelo da escola — define se o campo é número ou seletor de rótulos, e é o
   * mesmo que valida a nota. `null` quando a API não informou o modelo: a grade
   * não é montada, e a tela avisa.
   */
  modelo: ModeloAvaliacao | null
  /** Bimestre encerrado: os campos e os salvamentos ficam bloqueados. */
  encerrado: boolean
}

/** Linha da tabela: o aluno, o que está no campo e o erro daquele campo. */
interface LinhaDeLancamento {
  aluno: Aluno
  valor: string
  erro?: string
  /** A nota da linha foi mexida depois do último salvamento. */
  editada: boolean
  /** Síntese da matéria com o que está no campo agora — a prévia da linha. */
  previa: string
}

/** Registro sem uma chave, para tirar o estado de uma linha sem mutar o objeto. */
function semChave(registro: Record<string, string>, chave: string): Record<string, string> {
  const copia = { ...registro }
  delete copia[chave]
  return copia
}

/**
 * Lançamento das notas de um componente, uma linha por aluno da sala.
 *
 * Três decisões que valem conhecer:
 *
 * 1. **O que está no campo vem do servidor, e o que o professor digitou fica por
 *    cima.** O valor efetivo é `editados[alunoId] ?? valor já salvo`. Assim uma
 *    recarga por baixo — depois de salvar em outro lugar, ou de trocar de aba —
 *    não apaga o que está sendo digitado, e a tela nunca mostra uma nota diferente
 *    da que está no banco. É o mesmo cuidado que o `GerenciarMembros` tem com o
 *    grupo de cada aluno.
 * 2. **Salvar é em lote, e salvar a linha é a exceção.** Preencher a turma é o
 *    caso comum e não pode obrigar o professor a salvar 30 vezes; retocar um nome
 *    sem mexer nos outros também é comum, e por isso cada linha que foi mexida
 *    ganha o seu próprio botão, que só acende quando a linha mudou de verdade.
 * 3. **A coluna de prévia lê o mesmo `editados`, e não uma cópia.** É o estado
 *    local do formulário, então o número anda junto com a digitação, sem esperar
 *    o "Salvar". E a prévia da matéria sai somando o peso *deste* componente com
 *    as notas já lançadas nos irmãos, que vêm de `useLancamentosDeComponentes` —
 *    por isso os dois hooks dividem o trabalho: este traz o componente em edição,
 *    o outro traz os irmãos, e o componente não é buscado duas vezes.
 */
export function TabelaDeLancamentos({
  componente,
  materia,
  alunos,
  modelo,
  encerrado,
}: TabelaDeLancamentosProps) {
  const toast = useToast()
  const lancamentos = useLancamentos(componente.id)
  const [editados, setEditados] = useState<Record<string, string>>({})
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [salvandoAluno, setSalvandoAluno] = useState<string | null>(null)
  const [excluindoAluno, setExcluindoAluno] = useState<string | null>(null)

  const salvosPorAluno = new Map<string, string>()
  for (const lancamento of lancamentos.dados ?? []) {
    salvosPorAluno.set(lancamento.alunoId, lancamento.valorNoModelo)
  }

  /*
   * Só os irmãos entram na busca: as notas deste componente já estão em
   * `lancamentos`, e buscá-las de novo seria a mesma requisição duas vezes para
   * a mesma linha. A lista é ordenada para a chave do `useRequisicao` não mudar
   * por causa da ordem em que a matéria devolveu os componentes.
   */
  const idsDosIrmãos = materia.componentesPontuacao
    .filter((outro) => outro.id !== componente.id)
    .map((outro) => outro.id)
    .sort()
  const notasDosIrmãos = useLancamentosDeComponentes(idsDosIrmãos)

  /**
   * O modelo é a fonte única do formato do campo e da validação: os dois saem
   * daqui, e nenhum dos dois adivinha. Sem ele, a grade não é montada — mostrar um
   * campo com a escala errada erraria a turma inteira de uma vez, e o professor
   * descobriria isso só quando a API recusasse o lote.
   *
   * A guarda vem antes de qualquer uso do modelo, inclusive da prévia da linha e das
   * funções de salvar: elas validam e calculam com o modelo, e nenhuma das duas
   * pode rodar sem ele.
   */
  if (!modelo) {
    return (
      <Alert tone="erro" role="alert">
        {SEM_MODELO_DE_AVALIACAO}
      </Alert>
    )
  }

  /*
   * O modelo a partir daqui, depois da guarda.
   *
   * Nome próprio porque as funções abaixo são declarações — que o TypeScript
   * considera disponíveis desde o topo do componente, mesmo escritas depois da
   * guarda. Ler `modeloDaEscola` é o que deixa o compilador exigir o modelo onde
   * ele é usado, em vez de repetir `modelo!` nas três vezes em que a conta e a
   * validação dependem dele.
   */
  const modeloDaEscola: ModeloAvaliacao = modelo

  function valorDe(alunoId: string): string {
    return editados[alunoId] ?? salvosPorAluno.get(alunoId) ?? ''
  }

  function digitar(alunoId: string, valor: string) {
    setEditados((atuais) => ({ ...atuais, [alunoId]: valor }))
    setErros((atuais) => (atuais[alunoId] ? semChave(atuais, alunoId) : atuais))
  }

  function notasDigitadas(): NotaDigitada[] {
    return alunos.map((aluno) => ({ alunoId: aluno.id, valor: valorDe(aluno.id) }))
  }

  if (alunos.length === 0) {
    return (
      <Alert tone="info">
        Nenhum aluno matriculado nesta sala ainda. Cadastre os alunos antes de lançar
        notas.
      </Alert>
    )
  }

  /**
   * A síntese da matéria por aluno, com o que está no campo agora.
   *
   * São as notas salvas de todos os componentes da matéria — as destes, que já
   * estão em `lancamentos`, e as dos irmãos, que vieram em `notasDosIrmãos` — com
   * o que foi digitado por cima. É o que `sinteseDaMateriaPorAluno` espera, e a
   * lista de `pendentes` sai do próprio estado `editados`, que é a única fonte
   * que muda enquanto o professor digita.
   */
  function previaPorAluno(): Map<string, number> {
    const lancamentosPorComponente = new Map(notasDosIrmãos.dados ?? [])
    lancamentosPorComponente.set(componente.id, lancamentos.dados ?? [])

    const pendentes: NotaPendente[] = Object.entries(editados).map(([alunoId, valor]) => ({
      componentePontuacaoId: componente.id,
      alunoId,
      valor,
    }))

    return sinteseDaMateriaPorAluno({
      materia,
      lancamentosPorComponente,
      alunos,
      modelo: modeloDaEscola,
      pendentes,
    })
  }

  /*
   * Enquanto qualquer nota da matéria não chega, a prévia fica fora em vez de
   * mostrar a conta pela metade: um componente da matéria sem as notas carregadas
   * entraria como 0 e a linha piscaria entre um número e outro conforme cada
   * requisição responde.
   */
  const previa = lancamentos.carregando || notasDosIrmãos.carregando ? null : previaPorAluno()

  async function salvarLote() {
    if (enviando) return

    const validacao = validarNotas(notasDigitadas(), modeloDaEscola)
    setErros(Object.fromEntries(validacao.erros.map((erro) => [erro.alunoId, erro.erro])))

    if (!validacao.valido) {
      setErroGeral('Corrija as notas destacadas antes de salvar.')
      return
    }

    if (validacao.lancamentos.length === 0) {
      setErroGeral('Nenhuma nota preenchida para salvar.')
      return
    }

    setErroGeral(null)
    setEnviando(true)
    try {
      await lancarNotasEmLote(componente.id, validacao.lancamentos)
      setEditados({})
      lancamentos.recarregar()
      toast.success(
        `${validacao.preenchidas} ${validacao.preenchidas === 1 ? 'nota salva' : 'notas salvas'}.`,
      )
    } catch (falha) {
      setErroGeral(mensagemDeErro(falha, 'Não foi possível salvar as notas. Tente de novo.'))
    } finally {
      setEnviando(false)
    }
  }

  async function salvarLinha(aluno: Aluno) {
    if (salvandoAluno) return

    const validacao = validarNotas([{ alunoId: aluno.id, valor: valorDe(aluno.id) }], modeloDaEscola)

    if (!validacao.valido) {
      setErros((atuais) => ({
        ...atuais,
        [aluno.id]: validacao.erros[0]?.erro ?? 'Nota inválida.',
      }))
      return
    }

    if (validacao.lancamentos.length === 0) return

    setSalvandoAluno(aluno.id)
    try {
      await lancarNota(componente.id, aluno.id, validacao.lancamentos[0]!.valorNoModelo)
      setEditados((atuais) => semChave(atuais, aluno.id))
      setErros((atuais) => semChave(atuais, aluno.id))
      lancamentos.recarregar()
      toast.success(`Nota de ${aluno.nome} salva.`)
    } catch (falha) {
      setErroGeral(mensagemDeErro(falha, `Não foi possível salvar a nota de ${aluno.nome}.`))
    } finally {
      setSalvandoAluno(null)
    }
  }

  async function excluirLancamentoDaLinha(aluno: Aluno) {
    if (excluindoAluno) return

    const temNotaSalva = salvosPorAluno.has(aluno.id)
    if (!temNotaSalva) {
      return
    }

    const confirmou = window.confirm(
      `Excluir a nota de ${aluno.nome}? Essa ação não pode ser desfeita - o professor pode relançar a nota depois.`,
    )
    if (!confirmou) {
      return
    }

    setExcluindoAluno(aluno.id)
    setErroGeral(null)
    try {
      await excluirLancamento(componente.id, aluno.id)
      setEditados((atuais) => semChave(atuais, aluno.id))
      setErros((atuais) => semChave(atuais, aluno.id))
      lancamentos.recarregar()
      toast.success(`Nota de ${aluno.nome} excluída.`)
    } catch (falha) {
      setErroGeral(mensagemDeErro(falha, `Não foi possível excluir a nota de ${aluno.nome}.`))
    } finally {
      setExcluindoAluno(null)
    }
  }

  const numerico = ehEscalaNumerica(modeloDaEscola)

  const linhas: LinhaDeLancamento[] = alunos.map((aluno) => {
    const valor = valorDe(aluno.id)

    return {
      aluno,
      valor,
      erro: erros[aluno.id],
      editada: editados[aluno.id] !== undefined && editados[aluno.id] !== salvosPorAluno.get(aluno.id),
      previa: previa ? formatarSintese(previa.get(aluno.id) ?? 0) : '…',
    }
  })

  /*
   * A coluna de prévia só existe com o bimestre aberto. Encerrado, quem manda no
   * número é a síntese que a API gravou, e a Etapa 06 deixa explicitamente fora do
   * escopo recalcular isso no front — mostrar aqui uma conta feita no navegador,
   * com o modelo de avaliação que a tela assumiu, seria apresentar um segundo
   * valor para a mesma coisa.
   */
  const colunaPrevia: TableColumn<LinhaDeLancamento> = {
    key: 'previa',
    header: (
      /*
       * O cabeçalho carrega o aviso inteiro, e não só a palavra "Prévia": quem
       * bate o olho na coluna precisa ler que o número ainda vai mudar. O `title`
       * repete para o mouse, e o rodapé da tabela cobre o leitor de tela.
       */
      <span title={`Síntese de ${materia.materiaNome}. ${AVISO_DE_PREVIA}`}>
        <span className="block">Prévia</span>
        <span className="text-neutral-400 block text-[0.65rem] font-medium normal-case">
          {materia.materiaNome}
        </span>
      </span>
    ),
    className: 'w-28',
    align: 'right',
    hideBelow: 'md',
    cell: (linha) => (
      /*
       * Sem `aria-label`: quem lê a tabela por leitor de tela já ouve o
       * cabeçalho da coluna antes do número, e um rótulo por linha repetiria o
       * mesmo texto trinta vezes. O "…" é o estado em que as notas da matéria
       * ainda não chegaram.
       */
      <span className="text-neutral-600 font-medium tabular-nums">{linha.previa}</span>
    ),
  }

  const colunas: TableColumn<LinhaDeLancamento>[] = [
    {
      key: 'aluno',
      header: 'Aluno',
      cell: (linha) => (
        <span>
          <span className="font-medium text-neutral-800">{linha.aluno.nome}</span>
          <span className="text-neutral-500 block text-xs">
            #{linha.aluno.codigoMatricula}
          </span>
        </span>
      ),
    },
    {
      key: 'nota',
      header: numerico ? 'Nota (1 a 10)' : 'Conceito',
      className: 'w-64',
      cell: (linha) => (
        <div className="space-y-1">
          {numerico ? (
            <Input
              type="number"
              min={ESCALA_NUMERICA.minimo}
              max={ESCALA_NUMERICA.maximo}
              step={ESCALA_NUMERICA.passo}
              inputMode="decimal"
              aria-label={`Nota de ${linha.aluno.nome}`}
              aria-invalid={linha.erro ? true : undefined}
              value={linha.valor}
              onChange={(evento) => digitar(linha.aluno.id, evento.target.value)}
              disabled={encerrado}
            />
          ) : (
            <Select
              aria-label={`Conceito de ${linha.aluno.nome}`}
              aria-invalid={linha.erro ? true : undefined}
              value={linha.valor}
              onChange={(evento) => digitar(linha.aluno.id, evento.target.value)}
              disabled={encerrado}
            >
              <option value="">Sem nota</option>
              {modelo.rotulos.map((rotulo) => (
                <option key={rotulo} value={rotulo}>
                  {rotulo}
                </option>
              ))}
            </Select>
          )}

          {linha.erro ? (
            <p role="alert" className="text-accent-600 text-xs font-medium">
              {linha.erro}
            </p>
          ) : null}
        </div>
      ),
    },
    ...(encerrado ? [] : [colunaPrevia]),
    {
      key: 'acoes',
      header: <span className="sr-only">Ações da nota desta linha</span>,
      className: 'w-44',
      align: 'right',
      cell: (linha) => {
        const temNotaSalva = salvosPorAluno.has(linha.aluno.id)
        const podeExcluir = !encerrado && temNotaSalva && excluindoAluno === null

        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              aria-label={`Excluir nota de ${linha.aluno.nome}`}
              onClick={() => excluirLancamentoDaLinha(linha.aluno)}
              disabled={!podeExcluir}
              className="text-neutral-400 hover:text-accent-600 hover:bg-accent-50 rounded-md p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              title="Excluir lançamento"
            >
              <IconeDeLixeira />
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => salvarLinha(linha.aluno)}
              disabled={encerrado || !linha.editada || salvandoAluno !== null}
              loading={salvandoAluno === linha.aluno.id}
              loadingText="Salvando…"
            >
              Salvar
            </Button>
          </div>
        )
      },
    },
  ]

  const pendentes = linhas.filter((linha) => linha.editada).length

  return (
    <div className="space-y-3">
      {encerrado ? (
        <Alert tone="info">
          Este bimestre está encerrado. As notas lançadas ficam só de leitura — reabra
          o bimestre para corrigir alguma.
        </Alert>
      ) : null}

      {erroGeral ? <Alert tone="erro">{erroGeral}</Alert> : null}

      {lancamentos.erro ? <Alert tone="erro">{lancamentos.erro}</Alert> : null}

      {/*
       * Falha só dos irmãos: as notas deste componente continuam carregadas e
       * lançáveis, então o aviso é sobre a prévia, não sobre a tela inteira. Sem
       * ele a coluna viraria "…" para sempre, sem explicação.
       */}
      {notasDosIrmãos.erro && !encerrado ? (
        <Alert tone="erro">
          {notasDosIrmãos.erro} A prévia da matéria fica sem os componentes{" "}
          {idsDosIrmãos.length === 1 ? 'declarado' : 'declarados'}:{' '}
          {materia.materiaNome} tem {materia.componentesPontuacao.length}{' '}
          {materia.componentesPontuacao.length === 1 ? 'componente' : 'componentes'}.
        </Alert>
      ) : null}

      <Table
        columns={colunas}
        rows={linhas}
        rowKey={(linha) => linha.aluno.id}
        loading={lancamentos.carregando}
        emptyMessage="Nenhum aluno nesta sala ainda."
      />

      {!encerrado ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-neutral-500 text-sm">
              {numerico
                ? 'Notas de 1 a 10, com ponto decimal. Aluno sem nota vale 0 no cálculo.'
                : `Conceitos da escola: ${modelo.rotulos.join(', ')}. Aluno sem nota vale 0 no cálculo.`}
            </p>

            <Button
              onClick={salvarLote}
              loading={enviando}
              loadingText="Salvando…"
              disabled={alunos.length === 0}
            >
              Salvar lançamentos
            </Button>
          </div>

          {/*
           * O aviso da prévia fica sempre visível enquanto o bimestre estiver
           * aberto, e não só quando há coluna: ele é o que separa, na tela, um
           * número calculado no navegador do valor que a API grava no
           * encerramento.
           */}
          <p className="text-neutral-500 text-xs">
            A coluna <strong>Prévia</strong> mostra a síntese de {materia.materiaNome} já
            com o que você digitou, sem precisar salvar. {AVISO_DE_PREVIA}
          </p>

          {pendentes > 0 ? (
            <p className="text-neutral-500 text-xs">
              {pendentes} {pendentes === 1 ? 'nota alterada' : 'notas alteradas'} sem
              salvar. "Salvar lançamentos" grava todas de uma vez.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
