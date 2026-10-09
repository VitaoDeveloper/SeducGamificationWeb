import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardTitle,
  Field,
  IconeDeEdicao,
  IconeDeLixeira,
  Input,
  Modal,
  PageHeader,
  Spinner,
  useToast,
} from '../../components'
import { mensagemDeErro } from '../../lib/erro-api'
import {
  dataParaCampo,
  dataParaISO,
  formatarData,
  rotuloDoBimestre,
  validarBimestres,
} from './bimestres'
import type { BimestreForm, ErroDeBimestre } from './bimestres'
import { atualizarBimestre, atualizarCompeticao, excluirCompeticao } from './competicoes.api'
import { useCompeticao, useContextoDaCompeticao, useGrupos } from './competicoes.hooks'
import { SITUACAO_BIMESTRE } from './competicoes.tipos'
import type { Bimestre, GrupoComMembros } from './competicoes.tipos'
import { AlertaDeDesempate } from './AlertaDeDesempate'
import { AvisoDeConclusao } from './AvisoDeConclusao'
import { ComponentesDePontuacao } from './ComponentesDePontuacao'
import { DesempateForm } from './DesempateForm'
import { EncerrarBimestre } from './EncerrarBimestre'
import { GerenciarMembros } from './GerenciarMembros'
import { LancamentosDeComponente } from './LancamentosDeComponente'
import { PreviaDaSintese } from './PreviaDaSintese'
import { SintesesOficiais } from './SintesesOficiais'
import { RankingDaCompeticao, TIPO_RANKING } from '../rankings'
import type { TipoRanking } from '../rankings'
import {
  RelatoriosDaCompeticao,
  rotaDoRelatorioComparativoDoGrupo,
  rotaDoRelatorioDoGrupo,
} from '../relatorios'
import { modeloAvaliacaoDaEscola } from './modelo-avaliacao'
import { NovoGrupoForm } from './NovoGrupoForm'
import { SelecaoDeBimestre } from './SelecaoDeBimestre'
import { rotaDasCompeticoes } from '../salas/rotas'
import { useAlunos } from '../salas/salas.hooks'
import { usePendenciasDeDesempate } from './desempate.hooks'
import type { ResultadoDoEncerramento } from './encerramento.tipos'
import type { PendenciaDeDesempate } from './desempate.tipos'

const ABA = 'rounded-full px-3.5 py-2 text-sm font-medium transition-colors'
const ABA_ATIVA = 'bg-primary-50 text-primary-700'

/**
 * As seções da competição, na ordem em que o professor monta o bimestre.
 *
 * "Relatórios" entra por último, e não porque dependa de um bimestre: ela não usa
 * o seletor da página (mostra a competição inteira), e é uma leitura de resultado,
 * não mais um passo de montagem. Colocá-la ao fim da lista diz isso sem precisar
 * de aviso — o professor que está montando o 2º bimestre não abre "Relatórios"
 * esperando mais uma coisa para fazer ali.
 */
type AbaDaCompeticao =
  | 'grupos'
  | 'componentes'
  | 'lancamentos'
  | 'previa'
  | 'rankings'
  | 'relatorios'

/**
 * Abas da competição.
 *
 * A navegação já nasceu na Etapa 04 porque a tela ia crescer: pontuação, lançamentos
 * e rankings penduram-se no mesmo "qual bimestre estou vendo". Deixar a aba futura
 * visível e desabilitada evitava que a página parecesse pronta e depois se
 * reorganizasse inteira quando a etapa chegasse — a de rankings foi exatamente
 * esse caso, e agora é a última da lista.
 *
 * "Prévia" entrou na Etapa 06 entre Lançamentos e Rankings, que é a ordem em que
 * o professor trabalha: lança, confere como a turma está, e só depois encerra.
 * Na Etapa 07 a mesma aba ganha o outro nome depois do encerramento: com a síntese
 * gravada, o que está na tela deixou de ser prévia (ver `rotuloDaAba`).
 *
 * "Rankings" é a única das quatro primeiras que não se pendura no seletor de
 * bimestre da página: os três rankings têm vida própria (parcial escolhe bimestre,
 * anual e individual somam os quatro), e reaproveitar o seletor global obrigaria o
 * professor a trocar o bimestre da página para ver o ranking do ano. "Relatórios"
 * (Etapa 10) é igual: tem os quatro relatórios da competição, não do bimestre.
 */
const ABAS: Array<{ id: AbaDaCompeticao; rotulo: string }> = [
  { id: 'grupos', rotulo: 'Grupos' },
  { id: 'componentes', rotulo: 'Componentes' },
  { id: 'lancamentos', rotulo: 'Lançamentos' },
  { id: 'previa', rotulo: 'Prévia' },
  { id: 'rankings', rotulo: 'Rankings' },
  { id: 'relatorios', rotulo: 'Relatórios' },
]

/**
 * Detalhe da competição: os quatro bimestres, os grupos, a pontuação e os lançamentos.
 *
 * A página inteira gira em torno do bimestre selecionado, e por isso a escolha
 * dele é o primeiro controle depois do cabeçalho: no primeiro carregamento abre no
 * bimestre aberto mais recente — o que o professor está montando agora — e, sem
 * nenhum aberto, no primeiro, para não abrir vazia. O seletor fica acima das
 * abas porque todas as três penduram a mesma escolha.
 */
export function CompeticaoDetailPage() {
  const { competicaoId } = useParams<{ competicaoId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const competicao = useCompeticao(competicaoId)
  const [bimestreEscolhido, setBimestreEscolhido] = useState<string>()
  const [aba, setAba] = useState<AbaDaCompeticao>('grupos')
  const [componenteEscolhido, setComponenteEscolhido] = useState<string>()

  /*
   * Resultado do encerramento de cada bimestre, por id.
   *
   * Fica na página — e não dentro do `EncerrarBimestre` — porque o encerramento
   * não acaba na chamada: o bimestre passa a ENCERRADO (o que só o `GET
   * /competicoes/:id` com a situação nova sabe dizer), a prévia dá lugar às
   * sínteses gravadas e o empate vira banner. Tudo isso é estado da página, e o
   * botão só entrega o que a API devolveu.
   *
   * Por bimestre, e não um resultado só: o professor pode encerrar o 1º, abrir o
   * 2º e voltar para conferir o 1º — o painel oficial de cada um continua o que
   * a API gravou nele.
   */
  const [encerramentos, setEncerramentos] = useState<Record<string, ResultadoDoEncerramento>>({})

  /*
   * Visão de ranking com que a aba abre.
   *
   * Só existe para o atalho do aviso de conclusão: encerrar o 4º bimestre gera a
   * pergunta "e quem ganhou o ano?", e a resposta está no ranking anual, não no
   * parcial do bimestre que acabou de fechar. Sem isto, o botão jogaria o
   * professor na aba com o parcial aberto e ele teria de caçar o botão "Anual".
   * `null` nos outros casos, e aí a aba abre no padrão do próprio componente.
   */
  const [visaoInicialDoRanking, setVisaoInicialDoRanking] = useState<TipoRanking | null>(null)

  /*
   * Empates que a API ainda devolve como pendentes, e o desempate em aberto.
   *
   * A pendência vem do servidor e não do encerramento desta sessão: o empate do
   * 1º bimestre continua pendente três semanas depois, com o professor entrando
   * na competição numa tela nova. Por isso ela é buscada com a competição e não
   * derivada do `ResultadoDoEncerramento`, que existe apenas enquanto a aba está
   * aberta.
   *
   * E o desempate em aberto é uma pendência — e não um id — porque o formulário
   * precisa saber quais equipes empataram e em que escopo para montar a tela
   * sem uma segunda busca.
   */
  const pendencias = usePendenciasDeDesempate(competicao.dados?.id)
  const [desempateAberto, setDesempateAberto] = useState<PendenciaDeDesempate | null>(null)

  /*
   * Quantas vezes um desempate foi gravado, para o ranking buscar de novo.
   *
   * A posição gravada no desempate é a que `GET .../ranking` devolve, e o ranking
   * é a única vista da tela que mostra essa ordem: sem esta contagem, a página
   * continuaria mostrando o empate resolvido como empate depois de o professor
   * ter clicado em salvar. É um contador, e não um booleano, porque dois
   * desempates no mesmo minuto têm de gerar duas buscas.
   */
  const [desempatesGravados, setDesempatesGravados] = useState(0)

  const bimestres = competicao.dados?.bimestres ?? []

  /*
   * O bimestre padrão é o aberto mais recente — o que o professor está montando
   * agora — e, sem nenhum aberto, o primeiro. É derivado no render, e não guardado
   * num efeito: assim que a competição chega, a conta já vale, sem um render a
   * mais e sem estado que possa divergir dos dados.
   */
  const aberto = [...bimestres]
    .sort((a, b) => b.numero - a.numero)
    .find((bimestre) => bimestre.situacao === SITUACAO_BIMESTRE.ABERTO)
  const bimestreId = bimestreEscolhido ?? (aberto ?? bimestres[0])?.id

  // Só busca os grupos quando já há um bimestre escolhido: a escolha padrão sai
  // dos próprios bimestres que a competição trouxe, e pedir os grupos antes disso
  // seria uma requisição a mais que a tela ainda não sabe usar.
  const grupos = useGrupos(bimestreId ? competicaoId : undefined, bimestreId)

  const contexto = useContextoDaCompeticao(competicao.dados?.lecionamentoId)
  const sala = contexto.dados?.sala
  const alunos = useAlunos(sala?.id)

  const bimestreAtual = bimestres.find((bimestre) => bimestre.id === bimestreId)
  const encerrado = bimestreAtual?.situacao === SITUACAO_BIMESTRE.ENCERRADO
  const listaDeGrupos = grupos.dados?.grupos ?? []

  /*
   * O que a API gravou no bimestre em exibição, se foi encerrado nesta sessão.
   *
   * Só existe para o bimestre que o professor acabou de encerrar: as sínteses
   * oficiais gravadas antes disso só são legíveis pelos endpoints de ranking e
   * relatório, que é o que a Etapa 08 vai trazer. Sem o resultado em mãos, a aba
   * continua mostrando a prévia — que recusa calcular para bimestre encerrado, com
   * o aviso de que quem manda no número agora é a API.
   */
  const resultadoDoBimestre = bimestreAtual ? encerramentos[bimestreAtual.id] : undefined

  /*
   * A faixa de avisos da página: a pendência de desempate e o que o encerramento
   * desta sessão deixou para dizer.
   *
   * O container só existe quando há algo a mostrar — um container vazio
   * empurraria a barra de abas para baixo sem motivo. E o desempate passou a
   * morar aqui dentro desde a Etapa 09, no lugar que a Etapa 07 tinha reservado
   * para ele: a pendência de um empate é o aviso mais importante que esta página
   * tem, e ele vale tanto para quem acabou de encerrar quanto para quem voltou
   * três semanas depois.
   *
   * O empate detectado no encerramento em si não ganha mais uma faixa: a mesma
   * informação volta na pendência que a API devolve, com o caminho para resolver
   * já funcionando. Duas faixas para o mesmo empate diriam ao professor que são
   * dois problemas.
   */
  const empatesDoBimestre = resultadoDoBimestre?.empates ?? []
  const pendenciasDeDesempate = pendencias.dados ?? []
  const avisoDoEncerramento =
    resultadoDoBimestre !== undefined &&
    (empatesDoBimestre.length > 0 || resultadoDoBimestre.competicaoConcluida)
  const mostrarAvisos = avisoDoEncerramento || pendenciasDeDesempate.length > 0 || !!pendencias.erro

  /*
   * Trocar de bimestre descarta o componente escolhido: o mesmo componente em outro
   * bimestre é outro componente, e manter a seleção mostraria uma lista de notas
   * que não é a do bimestre que o professor acabou de abrir.
   */
  function trocarBimestre(novoBimestreId: string) {
    setBimestreEscolhido(novoBimestreId)
    setComponenteEscolhido(undefined)
  }

  function aoMudarGrupos() {
    grupos.recarregar()
  }

  /**
   * Abre a aba de rankings já na visão anual.
   *
   * Trocar de aba por conta própria (`setAba('rankings')`) deixaria a visão
   * inicial de uma abertura anterior, ou seja, o atalho do aviso só funcionaria
   * na primeira vez. O estado volta a `null` ao trocar a aba, para que a próxima
   * abertura use o padrão do componente — o botão é um atalho pontual, não a
   * definição de como a aba sempre abre.
   */
  function abrirRankingAnual() {
    setVisaoInicialDoRanking(TIPO_RANKING.ANUAL)
    setAba('rankings')
  }

  /**
   * O que a página faz depois de um encerramento aceito.
   *
   * Cinco efeitos, na ordem em que importam:
   *
   * 1. Guarda o resultado, que é a síntese oficial e a lista de empates.
   * 2. Fixa o bimestre encerrado como o selecionado. Sem isso, a escolha padrão
   *    ("o aberto mais recente") mudaria de alvo no instante em que a situação
   *    nova chegasse, e a tela saltaria para outro bimestre logo depois de o
   *    professor ter acabado de agir nele.
   * 3. Vai para a aba da síntese: a pergunta seguinte de quem encerra é "qual
   *    nota ficou?", e a resposta é o painel que acabou de aparecer.
   * 4. Recarrega a competição, para a situação ENCERRADO chegar do servidor — a
   *    etiqueta do bimestre e o bloqueio das abas de montagem dependem disso, e
   *    localmente o `bimestre` ainda diz ABERTO.
   * 5. Recarrega as pendências de desempate. O encerramento é o único momento em
   *    que um empate nasce, e a chave da pendência é o id da competição — que
   *    não muda aqui. Sem este `recarregar`, o empate que acabou de ser detectado
   *    ficaria invisível até o professor recarregar a página.
   */
  function aoEncerrar(resultado: ResultadoDoEncerramento) {
    setEncerramentos((atuais) => ({ ...atuais, [resultado.bimestreId]: resultado }))
    setBimestreEscolhido(resultado.bimestreId)
    setComponenteEscolhido(undefined)
    setAba('previa')
    toast.success(`${rotuloDoBimestre(resultado.numero)} encerrado. Síntese gravada pela API.`)
    competicao.recarregar()
    pendencias.recarregar()
  }

  /**
   * O que a página faz depois de um desempate gravado, manual ou automático.
   *
   * Duas listas dependem disso, e as duas são de fora do diálogo: a pendência que
   * originou o desempate some da lista, e o ranking passa a mostrar as posições
   * gravadas. Nenhuma das duas é óbvia para quem está dentro do formulário — e é
   * por isso que o formulário avisa e a página decide.
   */
  function aoResolverDesempate() {
    pendencias.recarregar()
    setDesempatesGravados((atual) => atual + 1)
  }

  /*
   * Renomear a competição: um modal só com o nome, aberto pelo cabeçalho. A
   * resposta não é usada — depois de renomear a página relê a competição inteira,
   * para o nome novo e os dados antigos virem da mesma fonte.
   */
  const [editandoNome, setEditandoNome] = useState(false)
  const [nomeDaCompeticao, setNomeDaCompeticao] = useState('')
  const [erroAoRenomear, setErroAoRenomear] = useState<string | null>(null)
  const [renomeando, setRenomeando] = useState(false)

  /*
   * Corrigir as datas de um bimestre. O formado reusa `validarBimestres` da
   * criação: são os mesmos erros por bloco e o mesmo erro de conjunto. A única
   * coisa que muda é quem está em edição (os outros três entram com as datas que
   * a API já validou), então não existe outra regra para duplicar.
   */
  const [bimestreEmEdicao, setBimestreEmEdicao] = useState<Bimestre | null>(null)
  const [datasEmEdicao, setDatasEmEdicao] = useState({ dataInicio: '', dataFim: '' })
  const [erroDasDatas, setErroDasDatas] = useState<ErroDeBimestre>({})
  const [erroGeralDasDatas, setErroGeralDasDatas] = useState<string | null>(null)
  const [salvandoDatas, setSalvandoDatas] = useState(false)

  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  function abrirEdicaoDoNome() {
    setNomeDaCompeticao(competicao.dados?.nome ?? '')
    setErroAoRenomear(null)
    setEditandoNome(true)
  }

  function fecharEdicaoDoNome() {
    if (renomeando) return
    setEditandoNome(false)
    setErroAoRenomear(null)
  }

  async function salvarNome() {
    if (renomeando) return

    const nome = nomeDaCompeticao.trim()
    if (!nome) {
      setErroAoRenomear('Informe o nome da competição.')
      return
    }

    setRenomeando(true)
    setErroAoRenomear(null)
    try {
      await atualizarCompeticao(competicao.dados!.id, { nome })
      setEditandoNome(false)
      setErroAoRenomear(null)
      toast.success('Nome da competição atualizado.')
      competicao.recarregar()
    } catch (falha) {
      setErroAoRenomear(mensagemDeErro(falha, 'Não foi possível salvar o nome. Tente de novo.'))
    } finally {
      setRenomeando(false)
    }
  }

  function abrirEdicaoDoBimestre(bimestre: Bimestre) {
    setBimestreEmEdicao(bimestre)
    setDatasEmEdicao({
      dataInicio: dataParaCampo(bimestre.dataInicio),
      dataFim: dataParaCampo(bimestre.dataFim),
    })
    setErroDasDatas({})
    setErroGeralDasDatas(null)
  }

  function fecharEdicaoDoBimestre() {
    if (salvandoDatas) return
    setBimestreEmEdicao(null)
    setErroDasDatas({})
    setErroGeralDasDatas(null)
  }

  async function salvarDatas() {
    if (!bimestreEmEdicao || salvandoDatas) return

    // Os vizinhos entram com as datas que a API já validou; juntar tudo é o que
    // permite `validarBimestres` acusar sobreposição com o bimestre próximo.
    const formulario: BimestreForm[] = bimestres.map((bimestre) => ({
      numero: bimestre.numero,
      dataInicio:
        bimestre.id === bimestreEmEdicao.id
          ? datasEmEdicao.dataInicio
          : dataParaCampo(bimestre.dataInicio),
      dataFim:
        bimestre.id === bimestreEmEdicao.id
          ? datasEmEdicao.dataFim
          : dataParaCampo(bimestre.dataFim),
    }))
    const validacao = validarBimestres(formulario)

    setErroDasDatas(validacao.porNumero[bimestreEmEdicao.numero] ?? {})
    setErroGeralDasDatas(validacao.geral ?? null)
    if (!validacao.valido) return

    setSalvandoDatas(true)
    try {
      await atualizarBimestre(bimestreEmEdicao.id, {
        dataInicio: dataParaISO(datasEmEdicao.dataInicio),
        dataFim: dataParaISO(datasEmEdicao.dataFim),
      })
      setBimestreEmEdicao(null)
      setErroDasDatas({})
      setErroGeralDasDatas(null)
      toast.success(`${rotuloDoBimestre(bimestreEmEdicao.numero)} atualizado.`)
      competicao.recarregar()
    } catch (falha) {
      // O 409 (bimestre com pontuação) cai aqui: a mensagem da API é a que a tela
      // mostra, e o modal continua aberto porque nada foi alterado.
      setErroGeralDasDatas(mensagemDeErro(falha, 'Não foi possível alterar as datas. Tente de novo.'))
    } finally {
      setSalvandoDatas(false)
    }
  }

  function abrirExclusao() {
    setErroExclusao(null)
    setConfirmandoExclusao(true)
  }

  function fecharExclusao() {
    if (excluindo) return
    setConfirmandoExclusao(false)
    setErroExclusao(null)
  }

  async function excluir() {
    if (excluindo) return

    setExcluindo(true)
    setErroExclusao(null)
    try {
      await excluirCompeticao(competicao.dados!.id)
      toast.success('Competição excluída.')
      navigate(sala ? rotaDasCompeticoes(sala.id) : '/salas')
    } catch (falha) {
      setErroExclusao(mensagemDeErro(falha, 'Não foi possível excluir a competição. Tente de novo.'))
    } finally {
      setExcluindo(false)
    }
  }

  if (competicao.carregando) {
    return (
      <>
        <PageHeader title="Competição" />
        <div className="flex items-center justify-center gap-2.5 py-16">
          <Spinner label="Carregando competição" />
          <span className="text-neutral-500 text-sm">Carregando a competição…</span>
        </div>
      </>
    )
  }

  if (competicao.erro || !competicao.dados) {
    return (
      <>
        <PageHeader title="Competição" />
        <Alert tone="erro" className="mt-6 max-w-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{competicao.erro ?? 'Competição não encontrada.'}</span>
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

  const dados = competicao.dados
  const modelo = modeloAvaliacaoDaEscola(sala?.escola)

  return (
    <>
      <PageHeader
        title={dados.nome}
        description={sala ? `${sala.nome} · ${sala.escola.nome}` : 'Competição da sala'}
        action={
          <div className="flex flex-wrap gap-2">
            {/*
             * Editar o nome e excluir a competição dependem só da competição; a
             * volta para a sala, do contexto. A ação destrutiva fica ao lado das
             * outras, sem destaque — o professor que procura "excluir" acha, e
             * quem só quer navegar não passa perto dela.
             */}
            <Button variant="outline" onClick={abrirEdicaoDoNome}>
              Editar nome
            </Button>
            <Button
              variant="outline"
              leadingIcon={<IconeDeLixeira />}
              onClick={abrirExclusao}
            >
              Excluir competição
            </Button>
            {sala ? (
              <Link to={rotaDasCompeticoes(sala.id)}>
                <Button variant="outline">Competições da sala</Button>
              </Link>
            ) : null}
          </div>
        }
      />

      {/*
       * Os avisos ficam acima das abas, não dentro de uma delas: desempate
       * pendente e fim de competição não pertencem ao painel da síntese, e um
       * professor na aba de Lançamentos também precisa saber que um bimestre
       * fechou com duas equipes empatadas.
       */}
      {mostrarAvisos ? (
        <div className="mt-6 space-y-4">
          <AlertaDeDesempate
            pendencias={pendenciasDeDesempate}
            bimestres={bimestres}
            erro={pendencias.erro}
            aoRecarregar={pendencias.recarregar}
            aoResolver={setDesempateAberto}
          />

          {avisoDoEncerramento && resultadoDoBimestre ? (
            <AvisoDeConclusao
              competicaoConcluida={resultadoDoBimestre.competicaoConcluida}
              aoVerRanking={abrirRankingAnual}
            />
          ) : null}
        </div>
      ) : null}

      <nav
        role="tablist"
        aria-label="Seções da competição"
        className="border-line mt-5 flex flex-wrap gap-1 border-b pb-3"
      >
        {ABAS.map((item) => (
          <button
            key={item.id}
            id={`aba-${item.id}`}
            type="button"
            role="tab"
            aria-selected={item.id === aba}
            onClick={() => {
              // Abrir a aba pelo próprio botão usa o padrão dela; o atalho do
              // aviso de conclusão é que escolhe a visão anual (ver
              // `abrirRankingAnual`).
              setVisaoInicialDoRanking(null)
              setAba(item.id)
            }}
            className={`${ABA} ${item.id === aba ? ABA_ATIVA : 'text-neutral-600 hover:text-primary-700'}`}
          >
            {rotuloDaAba(item, resultadoDoBimestre)}
          </button>
        ))}
      </nav>

      <div className="mt-6 space-y-6">
        <Card bare>
          <div className="border-line border-b px-6 py-4">
            <h2 className="text-neutral-600 font-display text-sm font-semibold tracking-wide uppercase">
              Bimestres
            </h2>
          </div>
          <ul className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4">
            {bimestres.map((bimestre) => (
              <li key={bimestre.id}>
                <BlocoDeBimestre
                  bimestre={bimestre}
                  editavel={bimestre.situacao === SITUACAO_BIMESTRE.ABERTO}
                  onEditar={() => abrirEdicaoDoBimestre(bimestre)}
                />
              </li>
            ))}
          </ul>
        </Card>

        {/*
         * O encerramento fica na mesma linha do seletor, e não numa aba: é a ação
         * que fecha o bimestre selecionado, e depende dele. Num campo separado, o
         * professor teria de conferir duas vezes se está encerrando o bimestre
         * certo — o botão se refere a "o bimestre em exibição", então a pergunta
         * tem uma resposta só, do lado do controle que a define.
         */}
        <div className="flex flex-wrap items-end gap-3">
          <SelecaoDeBimestre
            bimestres={bimestres}
            valor={bimestreId}
            onChange={trocarBimestre}
          />

          {bimestreAtual ? (
            <EncerrarBimestre
              bimestre={bimestreAtual}
              onEncerrado={aoEncerrar}
              onIrParaComponentes={() => setAba('componentes')}
            />
          ) : null}
        </div>

        <div role="tabpanel" aria-labelledby={`aba-${aba}`}>
          {aba === 'grupos' ? (
            <>
              {grupos.erro ? (
                <Alert tone="erro" className="mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{grupos.erro}</span>
                    <Button variant="outline" size="sm" onClick={grupos.recarregar}>
                      Tentar de novo
                    </Button>
                  </div>
                </Alert>
              ) : null}

              <div className="space-y-6">
                <section aria-labelledby="titulo-grupos" className="space-y-3">
                  <h2
                    id="titulo-grupos"
                    className="text-neutral-600 font-display text-sm font-semibold tracking-wide uppercase"
                  >
                    Grupos
                  </h2>

                  <Card tone="accent" bar="left">
                    <CardTitle>Novo grupo</CardTitle>
                    <p className="text-neutral-600 mt-1.5 mb-4 text-sm">
                      O grupo é a equipe que representa a turma na competição. Depois
                      de criado, você distribui os alunos em cada bimestre.
                    </p>
                    <NovoGrupoForm
                      competicaoId={dados.id}
                      onCriado={() => {
                        toast.success('Grupo criado.')
                        aoMudarGrupos()
                      }}
                    />
                  </Card>

                  {grupos.carregando ? (
                    <div className="flex items-center justify-center gap-2.5 py-10">
                      <Spinner size="sm" />
                      <span className="text-neutral-500 text-sm">Carregando grupos…</span>
                    </div>
                  ) : listaDeGrupos.length === 0 ? (
                    <Card bare>
                      <p className="text-neutral-500 px-6 py-10 text-center text-sm">
                        Nenhum grupo nesta competição ainda. Crie o primeiro acima.
                      </p>
                    </Card>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {listaDeGrupos.map((grupo) => (
                        <CartaoDeGrupo key={grupo.id} grupo={grupo} />
                      ))}
                    </div>
                  )}
                </section>

                {bimestreAtual ? (
                  <section aria-labelledby="titulo-composicao" className="space-y-3">
                    <h2
                      id="titulo-composicao"
                      className="text-neutral-600 font-display text-sm font-semibold tracking-wide uppercase"
                    >
                      Integrantes no {rotuloDoBimestre(bimestreAtual.numero)}
                    </h2>

                    <Card bare className="p-6">
                      {alunos.erro ? (
                        <Alert tone="erro">{alunos.erro}</Alert>
                      ) : alunos.carregando ? (
                        <div className="flex items-center justify-center gap-2.5 py-4">
                          <Spinner size="sm" />
                          <span className="text-neutral-500 text-sm">
                            Carregando alunos…
                          </span>
                        </div>
                      ) : (
                        <GerenciarMembros
                          bimestreId={bimestreAtual.id}
                          encerrado={encerrado}
                          grupos={listaDeGrupos}
                          alunos={alunos.dados ?? []}
                          competicaoId={dados.id}
                          onAlterado={aoMudarGrupos}
                        />
                      )}
                    </Card>
                  </section>
                ) : null}
              </div>
            </>
          ) : null}

          {aba === 'componentes' && bimestreAtual ? (
            <ComponentesDePontuacao
              bimestre={bimestreAtual}
              componentesCurriculares={contexto.dados?.lecionamento.componentesCurriculares ?? []}
            />
          ) : null}

          {/*
           * Lançamentos e prévia esperam o contexto carregar, e o motivo é o
           * modelo: o campo de nota é escolhido por ele, então renderizar a aba
           * antes de a sala chegar mostraria "a API não informou o modelo de
           * avaliação" — uma acusação falsa — durante cada troca de contexto.
           */}
          {aba === 'lancamentos' && bimestreAtual && !contexto.carregando ? (
            <LancamentosDeComponente
              bimestre={bimestreAtual}
              componenteId={componenteEscolhido}
              onComponenteChange={setComponenteEscolhido}
              alunos={alunos.dados ?? []}
              modelo={modelo}
            />
          ) : null}

          {/*
           * A prévia busca os lançamentos de todos os componentes do bimestre e
           * cuida do próprio estado de carga e dos casos vazios: bimestre sem
           * componente, sala sem aluno e bimestre já encerrado. A página só
           * escolhe a linha de "carregando aluno" que a lista da sala já tem.
           *
           * Encerrado com o resultado do encerramento em mãos, quem aparece é a
           * síntese que a API gravou: mesma aba, outra garantia. Sem o resultado —
           * bimestre encerrado em outra sessão — a prévia segue no lugar, e é ela
           * que avisa que quem manda no número agora é a API.
           */}
          {aba === 'previa' && bimestreAtual && resultadoDoBimestre ? (
            <SintesesOficiais resultado={resultadoDoBimestre} />
          ) : null}

          {aba === 'previa' && bimestreAtual && !resultadoDoBimestre && !alunos.carregando && !contexto.carregando ? (
            <PreviaDaSintese
              bimestre={bimestreAtual}
              alunos={alunos.dados ?? []}
              grupos={listaDeGrupos}
              modelo={modelo}
            />
          ) : null}

          {/*
           * A aba de rankings se resolve sozinha: ela recebe a competição e os
           * bimestres e busca o que precisa. Não entra na escolha de "qual
           * bimestre estou vendo" da página de propósito — os três rankings têm
           * escopos diferentes (o parcial é de um bimestre, o anual e o
           * individual somam os quatro), e atrelar o parcial ao seletor global
           * faria o professor trocar o bimestre duas vezes para comparar um
           * bimestre com o ano.
           */}
          {/*
           * A `key` remonta a aba quando o atalho do aviso muda a visão
           * desejada: a visão inicial é lida no `useState` do componente, e sem
           * o remonte um clique no atalho estando já na aba não teria efeito.
           *
           * Já `revalidacao` não remonta nada: ela entra na chave da busca dos
           * rankings, que é o que faz a posição gravada aparecer aqui. Uma `key`
           * por desempate resolveria, mas derrubaria a aba inteira — e perder a
           * visão que o professor escolheu para conferir se o desempate deu certo é
           * o pior jeito de mostrar que deu certo.
           */}
          {aba === 'rankings' ? (
            <RankingDaCompeticao
              key={`rankings-${visaoInicialDoRanking ?? 'padrao'}`}
              competicaoId={dados.id}
              bimestres={bimestres}
              visaoInicial={visaoInicialDoRanking ?? undefined}
              revalidacao={desempatesGravados}
            />
          ) : null}

          {/*
           * A aba de relatórios é a mais barata da página em dados e a mais ampla
           * em leitura: ela não busca nada (as quatro telas de relatório
           * buscariam por conta própria se fossem montadas aqui) e só liga os
           * relatórios que a API já descreve. Os grupos vêm do `useGrupos` que a
           * página já tinha por causa da aba de Grupos, e os alunos da sala que a
           * tela de composição já carregava — nenhuma das duas listas é um custo
           * novo da aba.
           *
           * A `competicaoId` é passada para os links de aluno porque a API só a
           * exige quando o aluno participa de mais de uma competição, e o professor
           * está olhando uma competição específica: sem ela, o link seria um `400`.
           */}
          {aba === 'relatorios' ? (
            <RelatoriosDaCompeticao
              competicaoId={dados.id}
              grupos={listaDeGrupos}
              alunos={alunos.dados ?? []}
              carregando={grupos.carregando || alunos.carregando}
            />
          ) : null}
        </div>
      </div>

      {/*
       * O formulário fica na página, e não dentro do banner, porque ele é um
       * diálogo: o `Modal` se ancora em `document.body`, e quem o abre é a
       * pendência — que pode vir de qualquer uma das linhas do aviso.
       */}
      <DesempateForm
        aberto={desempateAberto !== null}
        competicaoId={dados.id}
        pendencia={desempateAberto}
        pendenciasDoEscopo={pendenciasDeDesempate}
        bimestres={bimestres}
        revalidacao={desempatesGravados}
        onClose={() => setDesempateAberto(null)}
        onResolvido={aoResolverDesempate}
      />

      <Modal
        open={editandoNome}
        onClose={fecharEdicaoDoNome}
        title="Editar nome"
        description="As datas dos bimestres, os grupos e a pontuação não mudam com o nome."
        footer={
          <>
            <Button variant="outline" onClick={fecharEdicaoDoNome} disabled={renomeando}>
              Cancelar
            </Button>
            <Button loading={renomeando} loadingText="Salvando…" onClick={() => void salvarNome()}>
              Salvar alterações
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nome da competição">
            <Input
              name="nome"
              value={nomeDaCompeticao}
              onChange={(evento) => setNomeDaCompeticao(evento.target.value)}
              disabled={renomeando}
            />
          </Field>

          {erroAoRenomear ? <Alert tone="erro">{erroAoRenomear}</Alert> : null}
        </div>
      </Modal>

      <Modal
        open={bimestreEmEdicao !== null}
        onClose={fecharEdicaoDoBimestre}
        title={
          bimestreEmEdicao
            ? `Editar datas do ${rotuloDoBimestre(bimestreEmEdicao.numero)}`
            : 'Editar datas'
        }
        description="As datas precisam continuar em ordem crescente, sem sobrepor os outros bimestres."
        footer={
          <>
            <Button variant="outline" onClick={fecharEdicaoDoBimestre} disabled={salvandoDatas}>
              Cancelar
            </Button>
            <Button
              loading={salvandoDatas}
              loadingText="Salvando…"
              onClick={() => void salvarDatas()}
            >
              Salvar alterações
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Início" error={erroDasDatas.dataInicio}>
            <Input
              name="inicio"
              type="date"
              value={datasEmEdicao.dataInicio}
              onChange={(evento) =>
                setDatasEmEdicao((atual) => ({ ...atual, dataInicio: evento.target.value }))
              }
              disabled={salvandoDatas}
            />
          </Field>

          <Field label="Fim" error={erroDasDatas.dataFim}>
            <Input
              name="fim"
              type="date"
              value={datasEmEdicao.dataFim}
              onChange={(evento) =>
                setDatasEmEdicao((atual) => ({ ...atual, dataFim: evento.target.value }))
              }
              disabled={salvandoDatas}
            />
          </Field>

          {erroGeralDasDatas ? <Alert tone="erro">{erroGeralDasDatas}</Alert> : null}
        </div>
      </Modal>

      <Modal
        open={confirmandoExclusao}
        onClose={fecharExclusao}
        title="Excluir competição"
        description={`A competição "${dados.nome}" será removida permanentemente. Esta ação não pode ser desfeita.`}
        footer={
          <>
            <Button variant="outline" onClick={fecharExclusao} disabled={excluindo}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={excluindo}
              loadingText="Excluindo…"
              onClick={() => void excluir()}
            >
              Excluir competição
            </Button>
          </>
        }
      >
        {/*
         * O 409 (competição em uso) cai aqui: a mensagem da API é mostrada e o
         * modal continua aberto — nada foi apagado, e o motivo é do servidor.
         */}
        {erroExclusao ? (
          <Alert tone="erro">{erroExclusao}</Alert>
        ) : (
          <p className="text-neutral-600 text-sm">
            Só é possível excluir uma competição sem uso: sem bimestre encerrado,
            sem pontuação definida e sem grupo com integrante. Se houver algum
            desses, nada é apagado e o motivo aparece aqui.
          </p>
        )}
      </Modal>
    </>
  )
}

/**
 * Rótulo da aba, que muda depois do encerramento.
 *
 * "Prévia" nomeia uma promessa — a de que o número ainda pode mudar. Com a
 * síntese gravada, a mesma aba passa a mostrar outra coisa, e o nome antigo
 * continuaria errado: o professor que lê "Prévia" acima de um valor congelado lê
 * a palavra errada, e é justamente a palavra que diria se aquilo ainda podia ser
 * mexido.
 */
function rotuloDaAba(
  aba: { id: AbaDaCompeticao; rotulo: string },
  resultado: ResultadoDoEncerramento | undefined,
): string {
  if (aba.id === 'previa' && resultado) return 'Síntese'
  return aba.rotulo
}

function BlocoDeBimestre({
  bimestre,
  editavel,
  onEditar,
}: {
  bimestre: Bimestre
  editavel: boolean
  onEditar: () => void
}) {
  const aberto = bimestre.situacao === SITUACAO_BIMESTRE.ABERTO

  return (
    <div className="border-line rounded-lg border p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-neutral-700">
          {rotuloDoBimestre(bimestre.numero)}
        </span>
        <span className="flex items-center gap-1">
          {/*
           * O lápis só aparece no bimestre aberto: a situação vem da competição
           * que a tela já carregou, então não há chamada extra para decidir. Se o
           * bimestre tiver pontuação — o que a tela não sabe daqui —, a API
           * recusa e o motivo aparece no próprio modal.
           */}
          {editavel ? (
            <button
              type="button"
              aria-label={`Editar datas do ${rotuloDoBimestre(bimestre.numero)}`}
              onClick={onEditar}
              className="text-neutral-400 hover:text-primary-700 hover:bg-primary-50 rounded-md p-1 transition-colors"
            >
              <IconeDeEdicao />
            </button>
          ) : null}
          <Badge tone={aberto ? 'primary' : 'neutro'}>{aberto ? 'Aberto' : 'Encerrado'}</Badge>
        </span>
      </div>
      <p className="text-neutral-500 mt-1.5 text-xs">
        {formatarData(bimestre.dataInicio)} a {formatarData(bimestre.dataFim)}
      </p>
    </div>
  )
}

/**
 * O cartão do grupo, com os atalhos para os dois relatórios dele.
 *
 * Os links ficam no cartão — e não só na aba de Relatórios — porque a tela de
 * grupos é onde o professor já está quando pergunta "esse time foi bem?". O atalho
 * é sempre o relatório **coletivo** do grupo, e não o comparado: comparar exige
 * saber que a comparação importa, e a lista da aba é onde se escolhe isso.
 */
function CartaoDeGrupo({ grupo }: { grupo: GrupoComMembros }) {
  return (
    <Card>
      <CardTitle className="flex flex-wrap items-center gap-2.5">
        {grupo.nome}
        <Badge tone="neutro">
          {grupo.membrosGrupos.length}{' '}
          {grupo.membrosGrupos.length === 1 ? 'integrante' : 'integrantes'}
        </Badge>
      </CardTitle>

      {grupo.membrosGrupos.length > 0 ? (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {grupo.membrosGrupos.map((membro) => (
            <li key={membro.alunoId}>
              <Badge tone="primary">{membro.aluno.nome}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-neutral-500 mt-2 text-sm">Nenhum integrante neste bimestre.</p>
      )}

      {/*
       * Os dois relatórios do grupo, sempre disponíveis — inclusive para o grupo
       * vazio, porque o relatório de um grupo sem ninguém neste bimestre ainda
       * mostra a síntese dos bimestres anteriores.
       */}
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        <Link
          className="text-primary-700 hover:text-primary-800 text-sm font-medium underline underline-offset-2"
          to={rotaDoRelatorioDoGrupo(grupo.id)}
        >
          Relatório do grupo
        </Link>
        <Link
          className="text-primary-700 hover:text-primary-800 text-sm font-medium underline underline-offset-2"
          to={rotaDoRelatorioComparativoDoGrupo(grupo.id)}
        >
          Comparar com os grupos
        </Link>
      </p>
    </Card>
  )
}
