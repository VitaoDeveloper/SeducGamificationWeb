import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Field,
  IconeDeEdicao,
  IconeDeLixeira,
  Input,
  Modal,
  PageHeader,
  Table,
} from '../../components'
import type { TableColumn } from '../../components'
import { mensagemDeErro } from '../../lib/erro-api'
import { ModalMatricula } from './ModalMatricula'
import { NovoAlunoForm } from './NovoAlunoForm'
import { rotaDaSala } from './rotas'
import { atualizarAluno, excluirAluno } from './salas.api'
import { useAlunos, useSala } from './salas.hooks'
import type { Aluno } from './salas.tipos'

/**
 * Alunos da sala, e o cadastro dos novos.
 *
 * O nome da sala vem do cabeçalho porque o professor chega aqui pela turma, e
 * uma lista de nomes solta na tela perde o contexto de qual turma é. A busca é
 * a mesma de `useSala`, que não achou a sala mostra o erro aqui também.
 */
export function AlunosListPage() {
  const { salaId } = useParams<{ salaId: string }>()
  const sala = useSala(salaId)
  const alunos = useAlunos(salaId)

  const [cadastrando, setCadastrando] = useState(false)
  const [recemCriado, setRecemCriado] = useState<Aluno | null>(null)

  const [editando, setEditando] = useState<Aluno | null>(null)
  const [nomeDoEditando, setNomeDoEditando] = useState('')
  const [erroAoTentarEditar, setErroAoTentarEditar] = useState<string | null>(null)
  const [enviandoEdicao, setEnviandoEdicao] = useState(false)

  const [excluindo, setExcluindo] = useState<Aluno | null>(null)
  const [erroAoExcluir, setErroAoExcluir] = useState<string | null>(null)
  const [enviandoExclusao, setEnviandoExclusao] = useState(false)

  function aoCadastrar(aluno: Aluno) {
    setRecemCriado(aluno)
    // A lista precisa da versão com o aluno novo: sem isso, quem cadastrasse o
    // segundo antes de a primeira requisição voltar o veria duas vezes — e o
    // professor anotaria o mesmo código de matrícula duas vezes.
    alunos.recarregar()
  }

  function abrirEdicao(aluno: Aluno) {
    setEditando(aluno)
    setNomeDoEditando(aluno.nome)
    setErroAoTentarEditar(null)
  }

  function fecharEdicao() {
    if (enviandoEdicao) return
    setEditando(null)
    setNomeDoEditando('')
    setErroAoTentarEditar(null)
  }

  async function salvarEdicao() {
    if (!editando || enviandoEdicao) return

    const nome = nomeDoEditando.trim()
    if (!nome) {
      setErroAoTentarEditar('Informe o nome do aluno.')
      return
    }

    setEnviandoEdicao(true)
    setErroAoTentarEditar(null)
    try {
      await atualizarAluno(editando.id, { nome })
      fecharEdicao()
      alunos.recarregar()
    } catch (falha) {
      setErroAoTentarEditar(
        mensagemDeErro(falha, 'Não foi possível salvar as alterações. Tente de novo.'),
      )
    } finally {
      setEnviandoEdicao(false)
    }
  }

  function abrirExclusao(aluno: Aluno) {
    setExcluindo(aluno)
    setErroAoExcluir(null)
  }

  function fecharExclusao() {
    if (enviandoExclusao) return
    setExcluindo(null)
    setErroAoExcluir(null)
  }

  async function confirmarExclusao() {
    if (!excluindo || enviandoExclusao) return

    setEnviandoExclusao(true)
    setErroAoExcluir(null)
    try {
      await excluirAluno(excluindo.id)
      fecharExclusao()
      alunos.recarregar()
    } catch (falha) {
      setErroAoExcluir(mensagemDeErro(falha, 'Não foi possível excluir o aluno. Tente de novo.'))
    } finally {
      setEnviandoExclusao(false)
    }
  }

  const colunas: TableColumn<Aluno>[] = [
    ...COLUNAS,
    {
      key: 'acoes',
      header: '',
      cell: (aluno) => (
        <span className="flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label={`Editar ${aluno.nome}`}
            onClick={() => abrirEdicao(aluno)}
            className="text-neutral-400 hover:text-primary-700 hover:bg-primary-50 rounded-md p-1 transition-colors"
          >
            <IconeDeEdicao />
          </button>
          <button
            type="button"
            aria-label={`Excluir ${aluno.nome}`}
            onClick={() => abrirExclusao(aluno)}
            className="text-neutral-400 hover:text-accent-600 hover:bg-accent-50 rounded-md p-1 transition-colors"
          >
            <IconeDeLixeira />
          </button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Alunos"
        description={
          sala.dados
            ? `${sala.dados.nome} · ${sala.dados.escola.nome}`
            : sala.erro
              ? 'Sala não carregada'
              : 'Carregando a sala…'
        }
        action={
          cadastrando ? null : (
            <Button onClick={() => setCadastrando(true)}>Novo aluno</Button>
          )
        }
      />

      <div className="mt-6 space-y-6">
        {cadastrando ? (
          <NovoAlunoForm
            salaId={salaId ?? ''}
            onCriado={aoCadastrar}
          />
        ) : null}

        {/*
         * A lista de alunos vem de outra chamada, então ela sobrevive à falha
         * desta — mas a falha precisa aparecer. Sem este alerta a tela ficava
         * presa em "Carregando a sala…" para sempre, sem mensagem e sem botão
         * para tentar de novo, mesmo com os alunos listados logo abaixo.
         */}
        {sala.erro ? (
          <Alert tone="erro">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{sala.erro}</span>
              <Button variant="outline" size="sm" onClick={sala.recarregar}>
                Tentar de novo
              </Button>
            </div>
          </Alert>
        ) : null}

        {alunos.erro ? (
          <Alert tone="erro">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{alunos.erro}</span>
              <Button variant="outline" size="sm" onClick={alunos.recarregar}>
                Tentar de novo
              </Button>
            </div>
          </Alert>
        ) : null}

        <Card bare>
          <Table
            columns={colunas}
            rows={alunos.dados ?? []}
            rowKey={(aluno) => aluno.id}
            loading={alunos.carregando}
            emptyMessage={
              sala.carregando
                ? 'Carregando…'
                : 'Nenhum aluno nesta sala ainda. Cadastre o primeiro para a competição começar.'
            }
            emptyAction={
              !cadastrando && !sala.carregando ? (
                <Button onClick={() => setCadastrando(true)}>Cadastrar o primeiro aluno</Button>
              ) : null
            }
          />
        </Card>

        {/*
         * A senha inicial é o próprio código de matrícula. Fica escrito aqui
         * porque esta é a tela que o professor consulta depois, para conferir o
         * código de alguém — e é onde a regra passa despercebida.
         */}
        {!alunos.carregando && (alunos.dados?.length ?? 0) > 0 ? (
          <p className="text-neutral-500 text-sm">
            A senha inicial de cada aluno é o próprio código de matrícula, e vale
            pedir a troca no primeiro acesso.
          </p>
        ) : null}

        <p className="text-neutral-500 text-sm">
          <Link
            to={salaId ? rotaDaSala(salaId) : '/salas'}
            className="text-primary-700 hover:text-primary-800 underline underline-offset-2"
          >
            Voltar para a sala
          </Link>
        </p>
      </div>

      <ModalMatricula aluno={recemCriado} onClose={() => setRecemCriado(null)} />

      {/*
       * A edição é um modal só com o nome: o código de matrícula aparece fixo
       * ali embaixo, porque a tentação de mudá-lo seria trocar o "login" de
       * quem usa o próprio código para entrar — e o aluno já tem senha e
       * histórico amarrados a ele.
       */}
      <Modal
        open={editando !== null}
        onClose={fecharEdicao}
        title="Editar aluno"
        description="Só o nome muda. O código de matrícula continua o mesmo."
        footer={
          <>
            <Button variant="outline" onClick={fecharEdicao} disabled={enviandoEdicao}>
              Cancelar
            </Button>
            <Button loading={enviandoEdicao} loadingText="Salvando…" onClick={() => void salvarEdicao()}>
              Salvar alterações
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nome do aluno">
            <Input
              name="nome"
              value={nomeDoEditando}
              onChange={(evento) => setNomeDoEditando(evento.target.value)}
              disabled={enviandoEdicao}
            />
          </Field>

          <Field label="Código de matrícula">
            <Input value={editando ? `#${editando.codigoMatricula}` : ''} disabled />
          </Field>

          {erroAoTentarEditar ? <Alert tone="erro">{erroAoTentarEditar}</Alert> : null}
        </div>
      </Modal>

      <Modal
        open={excluindo !== null}
        onClose={fecharExclusao}
        title="Excluir aluno"
        description={
          excluindo ? `Deseja excluir ${excluindo.nome} da sala?` : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={fecharExclusao} disabled={enviandoExclusao}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={enviandoExclusao}
              loadingText="Excluindo…"
              onClick={() => void confirmarExclusao()}
            >
              Excluir aluno
            </Button>
          </>
        }
      >
        {/*
         * O 409 (aluno com histórico) cai aqui dentro: a mensagem da API chega
         * pela `mensagemDeErro` e o modal continua aberto para o professor ler
         * o motivo — o aluno tem lançamentos ou já foi membro de grupo, e por
         * isso não sai por esta tela.
         */}
        {erroAoExcluir ? <Alert tone="erro">{erroAoExcluir}</Alert> : null}
      </Modal>
    </>
  )
}

const COLUNAS: TableColumn<Aluno>[] = [
  {
    key: 'nome',
    header: 'Nome',
    cell: (aluno) => <span className="font-medium text-neutral-800">{aluno.nome}</span>,
  },
  {
    key: 'codigoMatricula',
    header: 'Código de matrícula',
    cell: (aluno) => (
      <span className="font-display text-neutral-800 font-semibold tracking-wide">
        #{aluno.codigoMatricula}
      </span>
    ),
  },
]