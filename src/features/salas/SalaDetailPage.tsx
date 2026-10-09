import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardTitle,
  Modal,
  PageHeader,
  Spinner,
  Table,
  useToast,
} from '../../components'
import type { TableColumn } from '../../components'
import { mensagemDeErro } from '../../lib/erro-api'
import { InscricaoForm } from './InscricaoForm'
import { AbasDaSala } from './AbasDaSala'
import { NovaSalaForm } from './NovaSalaForm'
import { rotaDosAlunos } from './rotas'
import { excluirSala } from './salas.api'
import { useLecionamentos, useSala } from './salas.hooks'
import type { Lecionamento, Sala } from './salas.tipos'

/**
 * Detalhe da sala: quem leciona nela e, se o professor ainda não estiver
 * inscrito, o formulário para se inscrever.
 *
 * A inscrição é o que abre a porta da competição (Etapa 04), então a tela
 * separa os dois casos: já iniciado mostra o que ele leciona; não iniciado
 * mostra o formulário. A lista de lecionamentos vem sempre, porque a sala é
 * compartilhada e o professor precisa ver quem mais leciona nela para saber o
 * que a competição vai englobar.
 *
 * Editar e excluir ficam no cabeçalho. A edição reusa o formulário de criação,
 * travada a escola. A exclusão pede confirmação porque a sala carrega alunos e
 * competições em cascata; quando a API recusa por haver dependentes, a mensagem
 * dela é mostrada como veio, sem a tela tentar adivinhar qual dos bloqueios é.
 */
export function SalaDetailPage() {
  const { salaId } = useParams<{ salaId: string }>()
  const navegar = useNavigate()
  const toast = useToast()

  const sala = useSala(salaId)
  const lecionamentos = useLecionamentos(salaId)

  const [editando, setEditando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)

  function aoInscrever(lecionamento: Lecionamento) {
    lecionamentos.recarregar()
    sala.recarregar()
    toast.success(
      `Inscrição feita. Você leciona ${lecionamento.componentesCurriculares.length} componente(s) nesta sala.`,
    )
  }

  function aoSalvarSala(salaAtualizada: Sala) {
    setEditando(false)
    // O cabeçalho é montado a partir da leitura de `GET /salas`; sem recarregar,
    // o nome novo não apareceria até um F5.
    sala.recarregar()
    toast.success(`Sala ${salaAtualizada.nome} atualizada.`)
  }

  function abrirConfirmacaoDeExclusao() {
    setErroExclusao(null)
    setConfirmandoExclusao(true)
  }

  function fecharConfirmacao() {
    if (excluindo) return
    setConfirmandoExclusao(false)
    setErroExclusao(null)
  }

  async function excluir(id: string, nome: string) {
    setExcluindo(true)
    setErroExclusao(null)
    try {
      await excluirSala(id)
      toast.success(`Sala ${nome} excluída.`)
      // A listagem refaz a busca ao montar, então voltar já mostra a sala a
      // menos — sem precisar recarregar contando com o estado antigo.
      navegar('/salas')
    } catch (erro) {
      setErroExclusao(mensagemDeErro(erro, 'Não foi possível excluir a sala. Tente de novo.'))
      setExcluindo(false)
    }
  }

  if (sala.carregando) {
    return (
      <>
        <PageHeader title="Sala" />
        <div className="flex items-center justify-center gap-2.5 py-16">
          <Spinner label="Carregando sala" />
          <span className="text-neutral-500 text-sm">Carregando a sala…</span>
        </div>
      </>
    )
  }

  if (sala.erro || !sala.dados) {
    return (
      <>
        <PageHeader title="Sala" />
        <Alert tone="erro" className="mt-6 max-w-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{sala.erro ?? 'Sala não encontrada.'}</span>
            <Link to="/salas">
              <Button variant="outline" size="sm">
                Voltar para as salas
              </Button>
            </Link>
          </div>
        </Alert>
      </>
    )
  }

  const dados = sala.dados
  const meu = dados.meuLecionamento

  return (
    <>
      <PageHeader
        title={dados.nome}
        description={`${dados.escola.nome} · ano letivo ${dados.anoLetivo}`}
        action={
          <>
            {dados.id ? (
              <Link to={rotaDosAlunos(dados.id)}>
                <Button variant="secondary">Alunos</Button>
              </Link>
            ) : null}
            {!editando ? (
              <Button variant="outline" onClick={() => setEditando(true)}>
                Editar
              </Button>
            ) : null}
            <Button variant="outline" onClick={abrirConfirmacaoDeExclusao}>
              Excluir sala
            </Button>
          </>
        }
      />

      <AbasDaSala salaId={dados.id} atual="lecionamentos" />

      <div className="mt-6 space-y-6">
        {editando ? (
          <NovaSalaForm
            sala={dados}
            onSalva={aoSalvarSala}
            onCancelar={() => setEditando(false)}
          />
        ) : null}

        {meu ? (
          <Card tone="primary" bar="left">
            <CardTitle className="flex flex-wrap items-center gap-2.5">
              Você leciona aqui
              <Badge tone="primary">
                {meu.componentesCurriculares.length}{' '}
                {meu.componentesCurriculares.length === 1 ? 'componente' : 'componentes'}
              </Badge>
            </CardTitle>
            <p className="text-neutral-600 mt-1.5 text-sm">
              {meu.componentesCurriculares.length > 0 ? (
                <>
                  Você leciona{' '}
                  <span className="text-neutral-800 font-medium">
                    {meu.componentesCurriculares.map((c) => c.nome).join(', ')}
                  </span>{' '}
                  nesta sala.
                </>
              ) : (
                'Sua inscrição não tem componentes curriculares registrados.'
              )}
            </p>
          </Card>
        ) : (
          <Card tone="accent" bar="left">
            <CardTitle>Ainda não leciona nesta sala</CardTitle>
            <p className="text-neutral-600 mt-1.5 mb-5 text-sm">
              A inscrição informa os componentes que você leciona aqui e é o que
              dá origem à competição da sala. Outro professor da mesma escola já
              pode estar inscrito — a lista abaixo mostra quem é.
            </p>
            <InscricaoForm salaId={dados.id} onInscrito={aoInscrever} />
          </Card>
        )}

        <section aria-labelledby="titulo-lecionamentos">
          <h2 id="titulo-lecionamentos" className="text-neutral-600 font-display text-sm font-semibold tracking-wide uppercase">
            Lecionamentos
          </h2>

          <Card bare className="mt-2.5">
            {lecionamentos.erro ? (
              <div className="p-6">
                <Alert tone="erro">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{lecionamentos.erro}</span>
                    <Button variant="outline" size="sm" onClick={lecionamentos.recarregar}>
                      Tentar de novo
                    </Button>
                  </div>
                </Alert>
              </div>
            ) : (
              <Table
                columns={COLUNAS}
                rows={lecionamentos.dados ?? []}
                rowKey={(lecionamento) => lecionamento.id}
                loading={lecionamentos.carregando}
                emptyMessage="Nenhum professor inscrito nesta sala ainda."
              />
            )}
          </Card>
        </section>
      </div>

      <Modal
        open={confirmandoExclusao}
        onClose={fecharConfirmacao}
        title="Excluir sala"
        description={`A sala "${dados.nome}" será removida permanentemente. Esta ação não pode ser desfeita.`}
        footer={
          <>
            <Button variant="outline" onClick={fecharConfirmacao} disabled={excluindo}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={excluindo}
              loadingText="Excluindo..."
              onClick={() => excluir(dados.id, dados.nome)}
            >
              Excluir sala
            </Button>
          </>
        }
      >
        {erroExclusao ? (
          <Alert tone="erro">{erroExclusao}</Alert>
        ) : (
          <p className="text-neutral-600 text-sm">
            Só é possível excluir uma sala sem alunos e sem professores
            inscritos. Se houver algum, nada é apagado e o motivo aparece aqui.
          </p>
        )}
      </Modal>
    </>
  )
}

const COLUNAS: TableColumn<Lecionamento>[] = [
  {
    key: 'professor',
    header: 'Professor',
    cell: (lecionamento) => (
      <span>
        <span className="font-medium text-neutral-800">{lecionamento.professor.nome}</span>
        <span className="text-neutral-500 block text-xs">
          {lecionamento.professor.codigoMatricula}
        </span>
      </span>
    ),
  },
  {
    key: 'componentes',
    header: 'Componentes curriculares',
    cell: (lecionamento) =>
      lecionamento.componentesCurriculares.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {lecionamento.componentesCurriculares.map((componente) => (
            <li key={componente.id}>
              <Badge tone="neutro">{componente.nome}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-neutral-400">—</span>
      ),
  },
]
