import { useState } from 'react'
import { Alert, Button, Modal } from '../../components'
import { rotuloDoBimestre } from './bimestres'
import { encerrarBimestre, recusaDoEncerramento } from './encerramento.api'
import { formatarPercentual } from './pesos'
import { SITUACAO_BIMESTRE } from './competicoes.tipos'
import type { Bimestre } from './competicoes.tipos'
import type { RecusaDoEncerramento, ResultadoDoEncerramento } from './encerramento.tipos'

export interface EncerrarBimestreProps {
  bimestre: Bimestre
  /** Recebe o resultado para a página atualizar a situação e o painel de sínteses. */
  onEncerrado: (resultado: ResultadoDoEncerramento) => void
  /** Leva à aba de componentes (Etapa 05), onde os pesos são corrigidos. */
  onIrParaComponentes: () => void
}

/** Consequências do encerramento, na ordem em que a API as aplica. */
const CONSEQUENCIAS = [
  'A API calcula e grava a síntese de cada aluno e de cada equipe deste bimestre.',
  'Depois disso, os lançamentos de nota, os pesos dos componentes e a composição das equipes deste bimestre ficam congelados — não há como desfazer.',
  'A situação do bimestre passa para Encerrado e as abas de montagem desabilitam.',
]

/**
 * Botão "Encerrar bimestre" e o modal que pede a confirmação.
 *
 * O encerramento é a única ação da tela que **não tem volta**: depois dela a API
 * recusa lançamento de nota, peso novo e mudança de equipe (RN22). Por isso a
 * confirmação é um modal com o que vai acontecer escrito em linguagem simples —
 * "vai congelar" e "não tem como desfazer" — e não um `confirm()` do navegador,
 * que o professor clica no automático e depois não sabe se confirmou.
 *
 * Três decisões que valem conhecer:
 *
 * 1. **Abrir o modal não chama a API.** Só o clique em "Sim, encerrar" chama.
 *    Aber e desistir é parte do fluxo normal de quem está conferindo a prévia da
 *    síntese antes de decidir, e não pode custar uma transação no servidor.
 * 2. **A recusa vira o próximo passo, não um erro genérico.** Quando a API
 *    devolve as matérias que não fecham 100%, o modal passa a listar cada uma com
 *    o quanto falta e oferece ir direto para os componentes (Etapa 05) — o botão
 *    de confirmar sai de cena, porque insistir sem corrigir peso devolve o mesmo
 *    400. A aba de componentes já avisa dos pesos abertos, então esta é a segunda
 *    vez que o professor vê a pendência, agora com a consequência de não poder
 *    encerrar.
 * 3. **O botão desabilita no bimestre encerrado, e não some.** A regra da tela é
 *    "encerrar é irreversível": um botão fora de alcance já dá a informação, mas
 *    a versão que continua visível e apagada diz também *onde* a ação está quando
 *    o professor olha para o bimestre já fechado. O `title` diz o motivo, que é
 *    o que o botão desabilitado não consegue mostrar.
 */
export function EncerrarBimestre({ bimestre, onEncerrado, onIrParaComponentes }: EncerrarBimestreProps) {
  const [aberto, setAberto] = useState(false)
  const [emAndamento, setEmAndamento] = useState(false)
  const [recusa, setRecusa] = useState<RecusaDoEncerramento | null>(null)
  const [falha, setFalha] = useState<RecusaDoEncerramento | null>(null)

  const encerrado = bimestre.situacao === SITUACAO_BIMESTRE.ENCERRADO
  const rotulo = rotuloDoBimestre(bimestre.numero)

  function abrir() {
    setRecusa(null)
    setFalha(null)
    setAberto(true)
  }

  /*
   * Fechar é recusado enquanto a chamada está em voo: o modal existe para
   * confirmar a ação irreversível, e sumir no meio dela deixaria o professor
   * sem a resposta da API e sem a mínima forma de reenviar.
   */
  function fechar() {
    if (emAndamento) return
    setAberto(false)
  }

  /*
   * O atalho para os componentes é uma saída do modal, não só uma troca de aba.
   * Deixar a janela aberta em cima da aba de destino esconderia justamente o
   * formulário de pesos que o professor precisa corrigir.
   */
  function irParaComponentes() {
    setAberto(false)
    onIrParaComponentes()
  }

  async function confirmar() {
    setEmAndamento(true)
    setRecusa(null)
    setFalha(null)

    try {
      const resultado = await encerrarBimestre(bimestre.id)
      setAberto(false)
      onEncerrado(resultado)
    } catch (erro) {
      const lida = recusaDoEncerramento(erro)

      // Só a recusa com lista de matérias vira o painel de pendências; o resto
      // (rede, 500, bimestre já encerrado por outra aba) é erro do momento e
      // ganha a chance de ser tentado de novo.
      if (lida.materiasPendentes.length > 0) setRecusa(lida)
      else setFalha(lida)
    } finally {
      setEmAndamento(false)
    }
  }

  return (
    <>
      <Button
        variant="primary"
        onClick={abrir}
        disabled={encerrado}
        title={encerrado ? `${rotulo} já está encerrado.` : undefined}
      >
        Encerrar bimestre
      </Button>

      <Modal
        open={aberto}
        onClose={fechar}
        title={`Encerrar o ${rotulo}?`}
        description={
          recusa
            ? 'O bimestre continua aberto. A API recusou o encerramento:'
            : 'Esta ação não pode ser desfeita. Confira antes de continuar.'
        }
        footer={
          <RodapeDoModal
            recusa={recusa}
            falha={falha}
            emAndamento={emAndamento}
            rotulo={rotulo}
            fechar={fechar}
            confirmar={confirmar}
            onIrParaComponentes={irParaComponentes}
          />
        }
      >
        {recusa ? (
          <RecusaDePesos recusa={recusa} />
        ) : falha ? (
          <Alert tone="erro">{falha.mensagem}</Alert>
        ) : (
          <div className="space-y-3">
            <ul className="text-neutral-700 list-inside list-disc space-y-1.5 text-sm">
              {CONSEQUENCIAS.map((consequencia) => (
                <li key={consequencia}>{consequencia}</li>
              ))}
            </ul>
            <p className="text-neutral-500 text-sm">
              Para conferir os números antes, veja a prévia da síntese na aba Prévia.
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}

/** A lista de matérias que a API apontou, com o quanto falta em cada uma. */
function RecusaDePesos({ recusa }: { recusa: RecusaDoEncerramento }) {
  return (
    <Alert tone="erro">
      <p>{recusa.mensagem}</p>
      <ul className="mt-1.5 list-inside list-disc">
        {recusa.materiasPendentes.map((materia) => (
          <li key={materia.componenteCurricularId}>
            {materia.materiaNome} — soma em {formatarPercentual(materia.somaPesoPercentual)},
            faltam {formatarPercentual(materia.faltaParaFechar)}
          </li>
        ))}
      </ul>
    </Alert>
  )
}

/**
 * Ações do modal, que mudam conforme o que a última chamada respondeu.
 *
 * Com pendência de pesos, quem fecha o caminho é o atalho para os componentes; sem
 * ela, o caminho é reenviar. Os dois casos de "sair sem fazer nada" são o mesmo
 * botão, e a diferença de texto (Cancelar/Fechar) é o que diz ao professor se
 * ele está abandonando uma decisão ou uma lista de tarefas.
 *
 * A exceção é o tempo estourado: ali não há reenvio, só o botão de sair. A
 * transação pode ter sido gravada, e a mensagem já manda recarregar a página —
 * oferecer "tentar de novo" seria convidar o professor a esperar mais 60 s para
 * receber a mesma resposta.
 */
function RodapeDoModal({
  recusa,
  falha,
  emAndamento,
  rotulo,
  fechar,
  confirmar,
  onIrParaComponentes,
}: {
  recusa: RecusaDoEncerramento | null
  falha: RecusaDoEncerramento | null
  emAndamento: boolean
  rotulo: string
  fechar: () => void
  confirmar: () => void
  onIrParaComponentes: () => void
}) {
  const sair = (
    <Button variant="outline" onClick={fechar} disabled={emAndamento}>
      {recusa || falha ? 'Fechar' : 'Cancelar'}
    </Button>
  )

  if (recusa) {
    return (
      <>
        {sair}
        <Button onClick={onIrParaComponentes}>Ir para os componentes</Button>
      </>
    )
  }

  if (falha?.tempoEsgotado) {
    return sair
  }

  return (
    <>
      {sair}
      <Button loading={emAndamento} loadingText="Encerrando…" onClick={confirmar}>
        {falha ? 'Tentar de novo' : `Sim, encerrar o ${rotulo}`}
      </Button>
    </>
  )
}
