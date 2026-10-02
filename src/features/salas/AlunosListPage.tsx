import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Button, Card, PageHeader, Table } from '../../components'
import type { TableColumn } from '../../components'
import { ModalMatricula } from './ModalMatricula'
import { NovoAlunoForm } from './NovoAlunoForm'
import { rotaDaSala } from './rotas'
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

  function aoCadastrar(aluno: Aluno) {
    setRecemCriado(aluno)
    // A lista precisa da versão com o aluno novo: sem isso, quem cadastrasse o
    // segundo antes de a primeira requisição voltar o veria duas vezes — e o
    // professor anotaria o mesmo código de matrícula duas vezes.
    alunos.recarregar()
  }

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
            columns={COLUNAS}
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
