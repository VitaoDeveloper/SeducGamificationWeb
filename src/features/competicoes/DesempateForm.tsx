import { useState } from 'react'
import { Alert, Button, Modal, Select, Spinner, useToast } from '../../components'
import { mensagemDeErro } from '../../lib/erro-api'
import { formatarSintese } from '../../lib/sinteseCalculo'
import { useRankingDeGrupos } from '../rankings'
import { formatarPosicao } from '../rankings/rankings.tipos'
import {
  ordemDoDesempate,
  posicaoDoBlocoEmpatado,
  posicaoRepetida,
  posicoesIniciaisDoDesempate,
  rotuloDoEscopoDoDesempate,
} from './desempate'
import {
  aplicarCriterioAutomatico,
  resolverDesempate,
  traduzirErroDoDesempate,
} from './desempate.api'
import type { Bimestre } from './competicoes.tipos'
import type { GrupoEmpatado } from './encerramento.tipos'
import type { PendenciaDeDesempate, RespostaDoDesempateAutomatico } from './desempate.tipos'

/** Em que passo da tela o professor está. */
type Passo =
  /** Escolher a posição de cada equipe, ou partir para o critério automático. */
  | 'ordem'
  /** Confirmar que quer o critério automático, antes de chamar a API. */
  | 'confirmar'
  /** Mostrar o que o critério automático gravou, e o que ele não resolveu. */
  | 'resultado'

const MENSAGEM_PADRAO = 'Não foi possível resolver o desempate.'

export interface DesempateFormProps {
  /** Aberto ou não; é a pendência que o formulário resolve. */
  aberto: boolean
  competicaoId: string
  /** O empate a resolver; `null` quando não há desempate em aberto. */
  pendencia: PendenciaDeDesempate | null
  /**
   * Todas as pendências da competição, não só a que está aberta.
   *
   * O caminho automático grava **todos** os empates do escopo, não só o que o
   * professor abriu: a API itera a lista inteira e devolve as posições de todos
   * os blocos de uma vez. Sem as pendências do escopo, a confirmação não tem de
   * onde tirar o nome das equipes que não estavam no empate aberto e cairia no
   * `grupoId` — um id no lugar de um nome, que é a pior das confirmações.
   */
  pendenciasDoEscopo?: PendenciaDeDesempate[]
  /** Bimestres da competição, para nomear o escopo parcial. */
  bimestres: Bimestre[]
  /**
   * Quantos desempates já foram gravados, para buscar o ranking de novo.
   *
   * É o mesmo contador que a aba de rankings recebe da página. Ele entra aqui
   * porque o formulário também lê o ranking — e ler a versão antiga dele é
   * oferecer ao professor as posições de antes do último desempate.
   */
  revalidacao?: number
  onClose: () => void
  /**
   * Chamado depois que a API grava um desempate, manual ou automático.
   *
   * Quem recarrega as pendências e o ranking é a página, e não o formulário: a
   * tela precisa atualizar duas listas que moram fora do diálogo, e o formulário
   * não tem o menor interesse em saber onde elas estão.
   */
  onResolvido: () => void
}

/**
 * Desempate de um empate pendente: a ordem na mão do professor, ou a regra.
 *
 * São duas respostas para a mesma pergunta — qual das equipes que fecharam com a
 * mesma pontuação fica na frente — e elas ficam **na mesma tela**, lado a lado,
 * de propósito. A Etapa 09 pede que a diferença entre as duas apareça em texto
 * antes de o professor decidir, e a única forma de ele comparar as duas é ver as
 * duas: um atrás do outro, a comparação viria de memória.
 *
 * Quatro decisões que valem conhecer:
 *
 * 1. **As posições são as do ranking, não "1º e 2º entre as empatadas".** A API
 *    grava a posição que vem no corpo e o ranking substitui a posição do grupo
 *    por ela, então a posição do bloco é lida do ranking do escopo (ver
 *    `posicaoDoBlocoEmpatado`). Duas equipes empatadas em 3º e 4º recebem 3º e
 *    4º — e não 1º e 2º, que jogaria a tabela para o topo.
 * 2. **Repetir posição é erro conhecido da tela, não recusa do servidor.** A API
 *    exige posições únicas; aqui o botão de salvar desabilita e o aviso aparece,
 *    porque uma regra que o professor só descobre depois de enviar é uma regra
 *    que ele não teve como respeitar.
 * 3. **O caminho automático não depende da busca do ranking.** Ele só precisa do
 *    `bimestreId`; a base das posições é que vem do ranking. Se a busca falhar,
 *    quem perde a escolha manual é o professor — não a possibilidade de deixar a
 *    API decidir — e por isso o botão automático continua disponível sem ela.
 * 4. **O resultado do critério automático fica na tela, com os residuais.** A
 *    regra pode terminar empatada de verdade, e aí a API não grava nada e devolve
 *    o bloco em `residuais`. Fechar o diálogo em silêncio diria ao professor que
 *    o empate foi resolvido; a parte que sobrou continua sendo decisão dele, e é
 *    manual.
 */
export function DesempateForm({
  aberto,
  competicaoId,
  pendencia,
  pendenciasDoEscopo,
  bimestres,
  revalidacao = 0,
  onClose,
  onResolvido,
}: DesempateFormProps) {
  const toast = useToast()
  const [posicoes, setPosicoes] = useState<Record<string, number>>({})
  const [passo, setPasso] = useState<Passo>('ordem')
  const [emAndamento, setEmAndamento] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)
  const [automatico, setAutomatico] = useState<RespostaDoDesempateAutomatico | null>(null)

  /*
   * O ranking do escopo do empate, que é o que diz onde o bloco está na tabela.
   *
   * A busca só sai com o diálogo aberto: o formulário fechado não tem ranking
   * que consultar, e pedir um para a competição inteira a cada encerramento da
   * tela seria uma requisição que ninguém está usando.
   *
   * O `revalidacao` é o mesmo contador que a aba de rankings usa, e pela mesma
   * razão: a posição gravada no desempate é a que `GET .../ranking` devolve, e sem
   * buscar de novo o formulário continuaria oferecendo as posições de antes — o
   * que faria o professor gravar, duas vezes, a ordem que a API já tinha gravado.
   */
  const ranking = useRankingDeGrupos(
    aberto && pendencia ? competicaoId : undefined,
    pendencia?.bimestreId ?? undefined,
    revalidacao,
  )

  /*
   * Cada abertura recomeça, e o ajuste acontece no próprio render.
   *
   * Guardar a chave que o estado pertence e, quando ela muda, reescrever o estado
   * durante o render — em vez de num efeito — é o caminho que o React dá para
   * "resetar quando a prop muda": o efeito escreveria depois do desenho, e o
   * professor veria por um quadro o desempate anterior na tela do novo.
   *
   * O `key` da página seria a outra forma de resolver (remontar o componente),
   * e foi descartada de propósito: a página monta o formulário uma vez e o liga e
   * desliga, e um remonte a cada abertura jogaria fora o `useToast` e a busca em
   * voo junto — para ganhar um reset que cabe em três linhas.
   */
  const [chaveEmEdicao, setChaveEmEdicao] = useState<string | null>(null)
  if (chaveEmEdicao !== desempateAberto(pendencia)) {
    setChaveEmEdicao(desempateAberto(pendencia))
    setPasso('ordem')
    setFalha(null)
    setAutomatico(null)
    setPosicoes({})
  }

  /*
   * A posição inicial do bloco sai do ranking do escopo. Sem ela não há posição
   * válida para oferecer, e o formulário diz isso em vez de chutar a primeira —
   * um palpite aqui gravaria posições que jogam o ranking para o topo.
   */
  const posicaoDoBloco =
    pendencia && ranking.dados
      ? posicaoDoBlocoEmpatado(ranking.dados.itens, pendencia.grupos)
      : null

  // Tudo abaixo já é do empate aberto; sem pendência não há o que resolver.
  if (!pendencia) return null

  const alvo = pendencia
  const escopo = rotuloDoEscopoDoDesempate(alvo, bimestres)
  const posicoesAtuais = posicoesEmUso(posicoes, alvo, posicaoDoBloco)
  const ordemInvalida = posicaoRepetida(posicoesAtuais)

  /*
   * Os nomes da confirmação do automático.
   *
   * A API resolve o escopo inteiro, então as posições que ela devolve podem ser
   * de blocos que não são o que o professor abriu. As pendências do mesmo escopo
   * são a única fonte de nome dessas equipes: o `DesempateGravado` que a API
   * devolve é o registro gravado (id e posição), não a linha do ranking.
   */
  const nomesDasEquipes = new Map(
    [...(pendenciasDoEscopo ?? []), alvo]
      .filter((item) => item.bimestreId === alvo.bimestreId)
      .flatMap((item) => item.grupos.map((grupo) => [grupo.grupoId, grupo.nome] as const)),
  )

  /*
   * Fechar é recusado enquanto a chamada está em voo: o diálogo existe para
   * registrar uma decisão, e sumir no meio dela deixaria o professor sem saber
   * se a ordem foi gravada. Mesma regra do modal de encerramento (Etapa 07).
   */
  function fechar() {
    if (emAndamento) return
    onClose()
  }

  function trocarPosicao(grupoId: string, posicao: number) {
    setPosicoes((atuais) => ({ ...atuais, [grupoId]: posicao }))
    setFalha(null)
  }

  /*
   * Ir para a confirmação leva o que o professor já escolheu junto.
   *
   * A ordem escolhida continua no estado de propósito: se ele voltar atrás para
   * corrigir uma posição, ela não foi perdida — e o que ele estava confiando ao
   * critério não muda por causa da ida e volta. A falha some na mudança de passo
   * porque ela descrevia a última chamada, e a próxima tela é outra decisão.
   */
  function irParaConfirmacao() {
    setFalha(null)
    setPasso('confirmar')
  }

  function voltarParaOrdem() {
    setFalha(null)
    setPasso('ordem')
  }

  async function salvarOrdem() {
    setEmAndamento(true)
    setFalha(null)

    try {
      await resolverDesempate(competicaoId, {
        bimestreId: alvo.bimestreId,
        ordem: ordemDoDesempate(alvo.grupos, posicoesAtuais),
      })
      toast.success(`Desempate do ${escopo} gravado. O ranking já mostra a nova ordem.`)
      onResolvido()
      onClose()
    } catch (erro) {
      setFalha(mensagemDeFalha(erro))
    } finally {
      setEmAndamento(false)
    }
  }

  async function confirmarAutomatico() {
    setEmAndamento(true)
    setFalha(null)

    try {
      const resposta = await aplicarCriterioAutomatico(competicaoId, alvo.bimestreId ?? undefined)
      setAutomatico(resposta)
      setPasso('resultado')
      onResolvido()
    } catch (erro) {
      setFalha(mensagemDeFalha(erro))
    } finally {
      setEmAndamento(false)
    }
  }

  return (
    <Modal
      open={aberto}
      onClose={fechar}
      size="md"
      title={`Desempatar o ${escopo}`}
      description={`${alvo.grupos.length} equipes fecharam com ${formatarSintese(alvo.valor)} e continuam empatadas.`}
      footer={
        <RodapeDoDesempate
          passo={passo}
          emAndamento={emAndamento}
          ordemInvalida={ordemInvalida}
          fechar={fechar}
          salvar={salvarOrdem}
          irParaConfirmacao={irParaConfirmacao}
          voltar={voltarParaOrdem}
          confirmar={confirmarAutomatico}
        />
      }
    >
      {passo === 'ordem' ? (
        <div className="space-y-5">
          <OrdemManual
            grupos={alvo.grupos}
            valor={alvo.valor}
            escopo={escopo}
            posicoes={posicoesAtuais}
            posicaoDoBloco={posicaoDoBloco}
            ranking={ranking}
            desabilitado={emAndamento}
            ordemInvalida={ordemInvalida}
            aoTrocarPosicao={trocarPosicao}
          />

          {falha ? <Alert tone="erro">{falha}</Alert> : null}

          <ExplicacaoDoAutomatico />
        </div>
      ) : null}

      {passo === 'confirmar' ? (
        <div className="space-y-3">
          <p className="text-neutral-700 text-sm">
            A API vai comparar as {alvo.grupos.length} equipes do {escopo} e gravar a ordem que o
            critério automático definir. As posições gravadas passam a valer no ranking.
          </p>
          <p className="text-neutral-500 text-sm">
            Aqui você não escolhe qual equipe vence — escolhe deixar a regra decidir. Dá para
            corrigir depois com o desempate manual, que substitui a ordem gravada.
          </p>

          {falha ? <Alert tone="erro">{falha}</Alert> : null}
        </div>
      ) : null}

      {passo === 'resultado' && automatico ? (
        <ResultadoDoAutomatico resposta={automatico} nomesDasEquipes={nomesDasEquipes} />
      ) : null}
    </Modal>
  )
}

/**
 * As ações do diálogo, que mudam conforme o passo.
 *
 * No passo da ordem as duas saídas são do mesmo peso: salvar é a decisão do
 * professor, o automático é a da regra, e por isso nenhum dos dois é o botão
 * "certo" a ser destacado como primário. O `secondary` do automático é o que
 * diz isso — é uma saída legítima, não um atalho.
 *
 * A confirmação é um passo à parte, e não um `confirm()` do navegador: o que
 * precisa ser confirmado aqui não é "tem certeza?", é a informação de que a
 * ordem gravada pelo critério pode deixar um empate sem decisão. Um alerta nativo
 * não teria onde dizer isso.
 */
function RodapeDoDesempate({
  passo,
  emAndamento,
  ordemInvalida,
  fechar,
  salvar,
  irParaConfirmacao,
  voltar,
  confirmar,
}: {
  passo: Passo
  emAndamento: boolean
  ordemInvalida: boolean
  fechar: () => void
  salvar: () => void
  irParaConfirmacao: () => void
  voltar: () => void
  confirmar: () => void
}) {
  if (passo === 'resultado') {
    return <Button onClick={fechar}>Fechar</Button>
  }

  if (passo === 'confirmar') {
    return (
      <>
        <Button variant="outline" onClick={voltar} disabled={emAndamento}>
          Voltar
        </Button>
        <Button loading={emAndamento} loadingText="Aplicando…" onClick={confirmar}>
          Sim, aplicar o critério automático
        </Button>
      </>
    )
  }

  return (
    <>
      <Button variant="outline" onClick={fechar} disabled={emAndamento}>
        Cancelar
      </Button>
      <Button variant="secondary" onClick={irParaConfirmacao} disabled={emAndamento}>
        Aplicar critério automático agora
      </Button>
      <Button
        loading={emAndamento}
        loadingText="Gravando…"
        onClick={salvar}
        disabled={ordemInvalida}
        title={ordemInvalida ? 'Cada posição só pode valer para uma equipe.' : undefined}
      >
        Salvar esta ordem
      </Button>
    </>
  )
}

/**
 * Chave do empate em edição: o escopo e as equipes que empataram.
 *
 * Serve para o estado do formulário ser de um empate só — a ordem escolhida por
 * um não pode sobrar na tela do outro — e devolve `''` sem pendência, que é um
 * valor que nenhum empate produz e que por isso marca "nada em edição".
 *
 * O id do grupo entra porque dois empates do **mesmo** bimestre, na mesma
 * pontuação, são empates diferentes: o que os distingue são as equipes.
 */
function desempateAberto(pendencia: PendenciaDeDesempate | null): string {
  if (!pendencia) return ''

  return `${pendencia.bimestreId ?? 'anual'}:${pendencia.grupos
    .map((grupo) => grupo.grupoId)
    .join('-')}`
}

/**
 * As posições que valem agora, com a inicial do bloco quando o estado ainda não
 * tem nada daquela pendência.
 *
 * Separar "o que está no estado" de "o que vale" é o que deixa o diálogo abrir já
 * com a ordem inicial sem um efeito que escreve depois do primeiro desenho: o
 * seletor nunca mostra um `1º` antes de a posição do bloco ser conhecida, e a
 * troca de pendência não deixa vazar a ordem anterior.
 */
function posicoesEmUso(
  posicoes: Record<string, number>,
  pendencia: PendenciaDeDesempate,
  posicaoDoBloco: number | null,
): Record<string, number> {
  const temTodas = pendencia.grupos.every((grupo) => posicoes[grupo.grupoId] !== undefined)

  if (temTodas || posicaoDoBloco === null) return posicoes

  return posicoesIniciaisDoDesempate(pendencia.grupos, posicaoDoBloco)
}

/** Mensagem da falha, com o 403 traduzido e o resto lido do corpo da API. */
function mensagemDeFalha(erro: unknown): string {
  return traduzirErroDoDesempate(erro) ?? mensagemDeErro(erro, MENSAGEM_PADRAO)
}

interface OrdemManualProps {
  grupos: GrupoEmpatado[]
  valor: number
  escopo: string
  posicoes: Record<string, number>
  /** `null` enquanto o ranking não diz onde o bloco começa. */
  posicaoDoBloco: number | null
  ranking: { carregando: boolean; erro: string | null; recarregar: () => void }
  desabilitado: boolean
  ordemInvalida: boolean
  aoTrocarPosicao: (grupoId: string, posicao: number) => void
}

/**
 * A escolha da posição de cada equipe.
 *
 * Um `select` por equipe, e não um quadro de arrastar: as posições são um
 * conjunto pequeno e fechado — as do bloco, do começo dele até o fim — e um
 * select mostra as posições possíveis em vez de o professor descobri-las
 * arrastando. Também não sugere o que um quadro sugeriria: que a ordem pode sair
 * do bloco, que é exatamente a regra da API.
 *
 * As equipes vêm na ordem em que a API entregou (por nome), com a pontuação que
 * empatou e a posição que hoje ocupam. Nenhuma posição chega escolhida: enquanto
 * o desempate não existe, elas estão empatadas de verdade.
 */
function OrdemManual({
  grupos,
  valor,
  escopo,
  posicoes,
  posicaoDoBloco,
  ranking,
  desabilitado,
  ordemInvalida,
  aoTrocarPosicao,
}: OrdemManualProps) {
  if (ranking.erro) {
    return (
      <Alert tone="erro">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>{ranking.erro}</span>
          <Button variant="outline" size="sm" onClick={ranking.recarregar}>
            Tentar de novo
          </Button>
        </div>
      </Alert>
    )
  }

  if (posicaoDoBloco === null) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-6">
        <Spinner size="sm" />
        <span className="text-neutral-500 text-sm">
          {ranking.carregando
            ? `Lendo a posição do empate no ${escopo}…`
            : `A API não devolveu a posição deste empate no ${escopo}.`}
        </span>
      </div>
    )
  }

  const opcoes = grupos.map((_grupo, indice) => posicaoDoBloco + indice)

  return (
    <div className="space-y-3">
      <ul className="border-line divide-line divide-y rounded-lg border">
        {grupos.map((grupo) => (
          <li key={grupo.grupoId} className="flex items-center gap-3 px-3.5 py-3">
            <span className="min-w-0 flex-1">
              <span className="text-neutral-800 block text-sm font-medium">{grupo.nome}</span>
              <span className="text-neutral-500 text-xs">
                {formatarSintese(valor)} no {escopo} · {formatarPosicao(posicaoDoBloco)} posição
              </span>
            </span>

            <Select
              aria-label={`Posição de ${grupo.nome}`}
              className="w-24"
              value={String(posicoes[grupo.grupoId] ?? '')}
              disabled={desabilitado}
              onChange={(evento) => aoTrocarPosicao(grupo.grupoId, Number(evento.target.value))}
            >
              {opcoes.map((posicao) => (
                <option key={posicao} value={String(posicao)}>
                  {formatarPosicao(posicao)}
                </option>
              ))}
            </Select>
          </li>
        ))}
      </ul>

      {ordemInvalida ? (
        <p role="alert" className="text-accent-700 text-sm">
          Cada posição só pode valer para uma equipe. Troque a posição de uma delas para continuar.
        </p>
      ) : null}
    </div>
  )
}

/**
 * O texto do critério automático, ao lado da escolha manual.
 *
 * A regra é escrita por extenso porque o botão não pode falar só "aplicar
 * automático": o professor precisa saber o que está cedendo ao escolher não
 * decidir — que a comparação é por matéria, da de maior soma de pesos para a
 * menor, e que vence a equipe com a maior média dos integrantes no componente.
 *
 * O último parágrafo é o que torna a ação honesta: no sistema completo isto
 * aconteceria sozinho no fim do prazo, e o endpoint é o substituto manual daquela
 * rotina. Sem esse aviso, um botão que grava posições do nada pareceria uma
 * normalidade do sistema em vez de uma simulação.
 */
function ExplicacaoDoAutomatico() {
  return (
    <div className="border-line rounded-lg border border-dashed px-3.5 py-3">
      <p className="text-neutral-800 text-sm font-medium">Ou deixar a API decidir</p>
      <p className="text-neutral-600 mt-1 text-sm">
        O critério automático compara as equipes empatadas matéria por matéria, da de maior peso
        somado para a de menor peso; vence a que tem a maior média dos integrantes naquele
        componente.
      </p>
      <p className="text-neutral-500 mt-1.5 text-xs">
        No sistema completo, essa aplicação aconteceria sozinha no fim do prazo. Aqui o disparo é
        manual — use o botão abaixo quando quiser forçar o critério agora.
      </p>
    </div>
  )
}

/** O que o critério automático gravou, e o que ele não conseguiu decidir. */
function ResultadoDoAutomatico({
  resposta,
  nomesDasEquipes,
}: {
  resposta: RespostaDoDesempateAutomatico
  /** `grupoId → nome`, montado com as pendências do escopo inteiro. */
  nomesDasEquipes: ReadonlyMap<string, string>
}) {
  const { aplicados, desempates, residuais } = resposta

  /*
   * A API devolve o id do grupo gravado e não o nome dele (o `DesempateGravado`
   * é o registro, não a linha do ranking), então o nome vem das pendências. O
   * `?? grupoId` no fim é o caso em que a equipe nem estava na lista de
   * pendências — nenhum nome conhecido, e o id é melhor do que a linha sumir.
   */
  const nomeDe = (grupoId: string) => nomesDasEquipes.get(grupoId) ?? grupoId

  if (aplicados === 0 && residuais.length === 0) {
    return (
      <Alert tone="info">
        <p className="font-medium">Nada a fazer neste escopo.</p>
        <p className="mt-1">
          A API não encontrou mais nenhum empate pendente aqui. Se o aviso de desempate continuar
          na página, ele é de outro bimestre ou do ranking anual.
        </p>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <Alert tone={residuais.length > 0 ? 'info' : 'sucesso'}>
        <p className="font-medium">
          {/*
           * A API resolve o escopo inteiro, então o plural não é "vários
           * empates resolvidos" e sim o número de posições gravadas — que é o
           * que a lista abaixo mostra. Dizer "este empate" esconderia os demais
           * blocos que a mesma chamada gravou.
           */}
          {desempates.length === 1
            ? 'O critério automático gravou esta posição.'
            : `O critério automático gravou ${desempates.length} posições.`}
        </p>
        <p className="mt-1">Posições gravadas pela API:</p>
        <ul className="mt-1.5 list-inside list-disc">
          {desempates.map((desempate) => (
            <li key={desempate.grupoId}>
              {formatarPosicao(desempate.posicao)} — {nomeDe(desempate.grupoId)}
            </li>
          ))}
        </ul>
      </Alert>

      {/*
       * Empate residual é o que sobrou depois que a regra comparou tudo: as
       * equipes são iguais em todas as matérias, então a comparação não tem como
       * escolher. A API não grava nada nesse caso (`README-API.md`, seção 11.12),
       * e o texto diz isso — é pendência de decisão do professor, não erro.
       */}
      {residuais.length > 0 ? (
        <Alert tone="erro">
          <p className="font-medium">
            {residuais.length === 1
              ? 'Um empate ficou sem decisão.'
              : `${residuais.length} empates ficaram sem decisão.`}
          </p>
          <p className="mt-1">
            As equipes terminaram empatadas em todas as matérias, então o critério automático não
            tem como escolher. Nada foi gravado para elas: o desempate manual é o caminho.
          </p>
          <ul className="mt-1.5 space-y-1">
            {residuais.map((residual) => (
              <li key={`${residual.bimestreId ?? 'anual'}:${residual.posicao}`}>
                <span className="font-medium tabular-nums">{formatarPosicao(residual.posicao)}</span>{' '}
                — {residual.grupos.map((grupo) => grupo.nome).join(' e ')} (
                {formatarSintese(residual.valor)})
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
    </div>
  )
}