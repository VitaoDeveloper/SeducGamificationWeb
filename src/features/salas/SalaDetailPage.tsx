import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardTitle,
  IconeDeEdicao,
  IconeDeLixeira,
  Input,
  Modal,
  PageHeader,
  Spinner,
  Table,
  useToast,
} from '../../components'
import type { TableColumn } from '../../components'
import { useAuth } from '../auth'
import { mensagemDeErro } from '../../lib/erro-api'
import { InscricaoForm } from './InscricaoForm'
import { AbasDaSala } from './AbasDaSala'
import { NovaSalaForm } from './NovaSalaForm'
import { rotaDosAlunos } from './rotas'
import {
  adicionarComponenteCurricular,
  desinscrever,
  excluirComponenteCurricular,
  excluirSala,
  renomearComponenteCurricular,
} from './salas.api'
import { useLecionamentos, useSala } from './salas.hooks'
import type { ComponenteCurricular, Lecionamento, Sala } from './salas.tipos'

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
 * Desde a Etapa 02, cada lecionamento da lista permite adicionar, renomear e
 * excluir as próprias matérias — como a inscrição original já criou os
 * componentes em lote, são esses botões que dão ao professor o CRUD avulso que
 * ficou de fora. O lecionamento do próprio professor também ganha "Sair desta
 * sala", que é a desinscrição. As duas recusas de 409 (matéria com pontuação,
 * lecionamento com competição) são mostradas com a mensagem exata da API.
 */
export function SalaDetailPage() {
  const { salaId } = useParams<{ salaId: string }>()
  const navegar = useNavigate()
  const toast = useToast()
  const { usuario } = useAuth()

  const sala = useSala(salaId)
  const lecionamentos = useLecionamentos(salaId)

  const [editando, setEditando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)

  const [adicionandoEm, setAdicionandoEm] = useState<string | null>(null)
  const [novoComponente, setNovoComponente] = useState('')
  const [erroAoAdicionar, setErroAoAdicionar] = useState<string | null>(null)
  const [adicionando, setAdicionando] = useState(false)

  const [renomeando, setRenomeando] = useState<string | null>(null)
  const [nomeDoComponente, setNomeDoComponente] = useState('')
  const [erroAoRenomear, setErroAoRenomear] = useState<string | null>(null)
  const [renomeandoComponente, setRenomeandoComponente] = useState(false)

  const [componenteEmExclusao, setComponenteEmExclusao] = useState<ComponenteCurricular | null>(null)
  const [excluindoComponente, setExcluindoComponente] = useState(false)
  const [erroExclusaoDoComponente, setErroExclusaoDoComponente] = useState<string | null>(null)

  const [lecionamentoEmDesinscricao, setLecionamentoEmDesinscricao] = useState<Lecionamento | null>(
    null,
  )
  const [desinscrevendo, setDesinscrevendo] = useState(false)
  const [erroDesinscricao, setErroDesinscricao] = useState<string | null>(null)

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

  function abrirAdicao(lecionamentoId: string) {
    setNovoComponente('')
    setErroAoAdicionar(null)
    setAdicionandoEm(lecionamentoId)
  }

  async function adicionar(lecionamentoId: string) {
    const nome = novoComponente.trim()
    if (!nome) {
      setErroAoAdicionar('Informe o nome da matéria.')
      return
    }

    setAdicionando(true)
    setErroAoAdicionar(null)
    try {
      await adicionarComponenteCurricular(lecionamentoId, nome)
      setAdicionandoEm(null)
      setNovoComponente('')
      lecionamentos.recarregar()
      sala.recarregar()
    } catch (erro) {
      setErroAoAdicionar(
        mensagemDeErro(erro, 'Não foi possível adicionar a matéria. Tente de novo.'),
      )
    } finally {
      setAdicionando(false)
    }
  }

  function abrirRenome(componente: ComponenteCurricular) {
    setNomeDoComponente(componente.nome)
    setErroAoRenomear(null)
    setRenomeando(componente.id)
  }

  async function renomear() {
    if (!renomeando) return

    const nome = nomeDoComponente.trim()
    if (!nome) {
      setErroAoRenomear('Informe o nome da matéria.')
      return
    }

    setRenomeandoComponente(true)
    setErroAoRenomear(null)
    try {
      await renomearComponenteCurricular(renomeando, nome)
      setRenomeando(null)
      lecionamentos.recarregar()
      sala.recarregar()
    } catch (erro) {
      setErroAoRenomear(
        mensagemDeErro(erro, 'Não foi possível renomear a matéria. Tente de novo.'),
      )
    } finally {
      setRenomeandoComponente(false)
    }
  }

  function abrirExclusaoDeComponente(componente: ComponenteCurricular) {
    setErroExclusaoDoComponente(null)
    setComponenteEmExclusao(componente)
  }

  async function excluirComponente() {
    if (!componenteEmExclusao) return

    setExcluindoComponente(true)
    setErroExclusaoDoComponente(null)
    try {
      await excluirComponenteCurricular(componenteEmExclusao.id)
      setComponenteEmExclusao(null)
      lecionamentos.recarregar()
      sala.recarregar()
      toast.success('Matéria excluída.')
    } catch (erro) {
      setErroExclusaoDoComponente(
        mensagemDeErro(erro, 'Não foi possível excluir a matéria. Tente de novo.'),
      )
      setExcluindoComponente(false)
    }
  }

  function abrirDesinscricao(lecionamento: Lecionamento) {
    setErroDesinscricao(null)
    setLecionamentoEmDesinscricao(lecionamento)
  }

  async function confirmarDesinscricao() {
    if (!lecionamentoEmDesinscricao) return

    setDesinscrevendo(true)
    setErroDesinscricao(null)
    try {
      await desinscrever(lecionamentoEmDesinscricao.id)
      setLecionamentoEmDesinscricao(null)
      lecionamentos.recarregar()
      sala.recarregar()
      toast.success('Você saiu desta sala.')
    } catch (erro) {
      setErroDesinscricao(
        mensagemDeErro(erro, 'Não foi possível sair da sala. Tente de novo.'),
      )
      setDesinscrevendo(false)
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
  const meuId = usuario?.id

  const colunas: TableColumn<Lecionamento>[] = [
    {
      key: 'professor',
      header: 'Professor',
      cell: (lecionamento) => (
        <span>
          <span className="font-medium text-neutral-800">{lecionamento.professor.nome}</span>
          <span className="text-neutral-500 block text-xs">
            {lecionamento.professor.codigoMatricula}
          </span>
          {lecionamento.professorId === meuId ? (
            <span className="mt-2 block">
              <Button variant="outline" size="sm" onClick={() => abrirDesinscricao(lecionamento)}>
                Sair desta sala
              </Button>
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'componentes',
      header: 'Componentes curriculares',
      cell: (lecionamento) => (
        <div className="flex flex-col gap-2.5">
          {lecionamento.componentesCurriculares.length > 0 ? (
            <ul className="flex flex-wrap items-center gap-1.5">
              {lecionamento.componentesCurriculares.map((componente) =>
                renomeando === componente.id ? (
                    <li key={componente.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-44 shrink-0">
                          <Input
                            aria-label={`Nome da matéria ${componente.nome}`}
                            autoFocus
                            value={nomeDoComponente}
                            onChange={(evento) => setNomeDoComponente(evento.target.value)}
                            onKeyDown={(evento) => {
                              if (evento.key === 'Enter') void renomear()
                            }}
                            disabled={renomeandoComponente}
                          />
                        </span>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={renomeandoComponente}
                          onClick={() => void renomear()}
                        >
                          Salvar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={renomeandoComponente}
                          onClick={() => setRenomeando(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                      {erroAoRenomear ? (
                        <Alert tone="erro" className="max-w-sm">
                          {erroAoRenomear}
                        </Alert>
                      ) : null}
                    </li>
                  ) : (
                    <li key={componente.id} className="flex items-center gap-1.5">
                      <Badge tone="neutro">{componente.nome}</Badge>
                      <button
                        type="button"
                        aria-label={`Editar ${componente.nome}`}
                        className="text-neutral-400 hover:text-primary-700 hover:bg-primary-50 rounded-md p-1 transition-colors"
                        onClick={() => abrirRenome(componente)}
                      >
                        <IconeDeEdicao />
                      </button>
                      <button
                        type="button"
                        aria-label={`Excluir ${componente.nome}`}
                        className="text-neutral-400 hover:text-accent-700 hover:bg-accent-50 rounded-md p-1 transition-colors"
                        onClick={() => abrirExclusaoDeComponente(componente)}
                      >
                        <IconeDeLixeira />
                      </button>
                    </li>
                  ),
                )}
              </ul>
            ) : (
              <span className="text-neutral-400">—</span>
            )}

            {adicionandoEm === lecionamento.id ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-44 shrink-0">
                    <Input
                      aria-label="Nome da nova matéria"
                      autoFocus
                      value={novoComponente}
                      onChange={(evento) => setNovoComponente(evento.target.value)}
                      onKeyDown={(evento) => {
                        if (evento.key === 'Enter') void adicionar(lecionamento.id)
                      }}
                      disabled={adicionando}
                    />
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={adicionando}
                    onClick={() => void adicionar(lecionamento.id)}
                  >
                    Adicionar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={adicionando}
                    onClick={() => setAdicionandoEm(null)}
                  >
                    Cancelar
                  </Button>
                </div>
                {erroAoAdicionar ? (
                  <Alert tone="erro" className="max-w-sm">
                    {erroAoAdicionar}
                  </Alert>
                ) : null}
              </div>
            ) : (
              <span>
                <Button variant="outline" size="sm" onClick={() => abrirAdicao(lecionamento.id)}>
                  Adicionar matéria
                </Button>
              </span>
            )}
          </div>
        )
      },
  ]

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
                columns={colunas}
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

      <Modal
        open={componenteEmExclusao !== null}
        onClose={() => {
          if (excluindoComponente) return
          setComponenteEmExclusao(null)
        }}
        title="Excluir matéria"
        description={
          componenteEmExclusao
            ? `A matéria "${componenteEmExclusao.nome}" será removida deste lecionamento.`
            : ''
        }
        footer={
          <>
            <Button
              variant="outline"
              disabled={excluindoComponente}
              onClick={() => setComponenteEmExclusao(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={excluindoComponente}
              loadingText="Excluindo..."
              onClick={() => void excluirComponente()}
            >
              Excluir matéria
            </Button>
          </>
        }
      >
        {erroExclusaoDoComponente ? (
          <Alert tone="erro">{erroExclusaoDoComponente}</Alert>
        ) : (
          <p className="text-neutral-600 text-sm">
            Matéria com pontuação já lançada não pode ser excluída — a API
            bloqueia e o motivo aparece aqui.
          </p>
        )}
      </Modal>

      <Modal
        open={lecionamentoEmDesinscricao !== null}
        onClose={() => {
          if (desinscrevendo) return
          setLecionamentoEmDesinscricao(null)
        }}
        title="Sair desta sala"
        description={
          lecionamentoEmDesinscricao
            ? `Sua inscrição em "${dados.nome}" será removida, junto com as matérias que você leciona aqui.`
            : ''
        }
        footer={
          <>
            <Button
              variant="outline"
              disabled={desinscrevendo}
              onClick={() => setLecionamentoEmDesinscricao(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={desinscrevendo}
              loadingText="Saindo..."
              onClick={() => void confirmarDesinscricao()}
            >
              Sair desta sala
            </Button>
          </>
        }
      >
        {erroDesinscricao ? (
          <Alert tone="erro">{erroDesinscricao}</Alert>
        ) : (
          <p className="text-neutral-600 text-sm">
            Só é possível sair quando o lecionamento ainda não tem competições
            criadas. Se tiver, nada é removido e o motivo aparece aqui.
          </p>
        )}
      </Modal>
    </>
  )
}