import { useState } from 'react'
import { Alert, Button, Input, Select, Table, useToast } from '../../components'
import type { TableColumn } from '../../components'
import { mensagemDeErro } from '../../lib/erro-api'
import { lancarNota, lancarNotasEmLote } from './componentes-pontuacao.api'
import { useLancamentos } from './componentes-pontuacao.hooks'
import { validarNotas } from './notas'
import { ESCALA_NUMERICA, ehEscalaNumerica } from './modelo-avaliacao'
import type { ModeloAvaliacao } from './modelo-avaliacao'
import type { NotaDigitada } from './notas'
import type { ComponentePontuacaoDoBimestre } from './componentes-pontuacao.tipos'
import type { Aluno } from '../salas/salas.tipos'

export interface TabelaDeLancamentosProps {
  componente: ComponentePontuacaoDoBimestre
  /** Todos os matriculados na sala: a nota em branco é aluno sem lançamento. */
  alunos: Aluno[]
  /** Modelo da escola — define se o campo é número ou seletor de rótulos. */
  modelo: ModeloAvaliacao
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
 * Duas decisões que valem conhecer:
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
 */
export function TabelaDeLancamentos({
  componente,
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

  const salvosPorAluno = new Map<string, string>()
  for (const lancamento of lancamentos.dados ?? []) {
    salvosPorAluno.set(lancamento.alunoId, lancamento.valorNoModelo)
  }

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

  async function salvarLote() {
    if (enviando) return

    const validacao = validarNotas(notasDigitadas(), modelo)
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

    const validacao = validarNotas([{ alunoId: aluno.id, valor: valorDe(aluno.id) }], modelo)

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

  if (alunos.length === 0) {
    return (
      <Alert tone="info">
        Nenhum aluno matriculado nesta sala ainda. Cadastre os alunos antes de lançar
        notas.
      </Alert>
    )
  }

  const numerico = ehEscalaNumerica(modelo)

  const linhas: LinhaDeLancamento[] = alunos.map((aluno) => {
    const valor = valorDe(aluno.id)

    return {
      aluno,
      valor,
      erro: erros[aluno.id],
      editada: editados[aluno.id] !== undefined && editados[aluno.id] !== salvosPorAluno.get(aluno.id),
    }
  })

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
    {
      key: 'salvar',
      header: <span className="sr-only">Salvar a nota desta linha</span>,
      className: 'w-36',
      align: 'right',
      cell: (linha) => (
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
      ),
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
