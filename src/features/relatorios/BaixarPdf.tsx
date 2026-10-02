import { useState } from 'react'

import { Button, useToast } from '../../components'

import { baixarPdfDoRelatorio, mensagemDoErroDoPdf } from './relatorios.api'
import { dispararDownload } from './relatorios.pdf'
import type { Relatorio } from './relatorios.tipos'

export interface BaixarPdfProps {
  /**
   * O relatório que já está carregado na tela.
   *
   * O botão não recebe `(alunoId, tipo)` nem `(grupoId, tipo)`: recebe o relatório,
   * e é dele que saem a rota do `.pdf`, o `competicaoId` e o nome do arquivo. É a
   * forma que impede o botão de estar na tela de um relatório e baixar o outro —
   * não há como os dois se separarem, porque é o mesmo objeto.
   */
  relatorio: Relatorio
}

/**
 * Baixa o PDF do relatório.
 *
 * Fica no cabeçalho das quatro telas da Etapa 10, ao lado do link que leva ao
 * outro relatório, porque é ali que o professor já está olhando: ele viu o
 * relatório na tela e quer a mesma coisa offline, para levar à reunião ou
 * imprimir — e não quer achar o botão depois de subir e descer a página.
 *
 * **Por que o relatório pode ser exportado a qualquer estágio.** O botão não
 * pergunta se os bimestres acabaram: a API gera o PDF parcial e carimba nele que o
 * resultado é parcial (RN32). Reimplementar essa regra na tela criaria um segundo
 * lugar onde a decisão pode divergir da gravada no servidor — e o pior desfecho
 * seria recusar um PDF que a API entregaria de bom grado, ou aceitar um completo
 * que não é.
 *
 * **Por que o loading é do `Button` e não um overlay.** A geração leva segundos e
 * pode levar mais, com gráficos; sem estado, o professor clica de novo e dispara
 * quatro gerações do mesmo arquivo. O `loading` do botão trava o clique, troca o
 * texto (para o professor ver que aconteceu alguma coisa) e devolve o botão ao
 * estado normal no `finally` — inclusive quando a geração falha, porque uma falha
 * não pode deixar a página com um botão morto.
 */
export function BaixarPdf({ relatorio }: BaixarPdfProps) {
  const [gerando, setGerando] = useState(false)
  const toast = useToast()

  async function aoClicar() {
    setGerando(true)

    try {
      const { blob, nomeDoArquivo } = await baixarPdfDoRelatorio(relatorio)
      dispararDownload(blob, nomeDoArquivo)
      toast.success('PDF gerado. O download começou.')
    } catch (falha) {
      /*
       * O toast, e não um alerta na página: a tela do relatório continua inteira
       * e navegável por baixo da mensagem, que é o que o critério de aceite da
       * Etapa 11 pede — o relatório já carregado não tem por que sumir porque o
       * arquivo não saiu.
       *
       * O `await` é do `mensagemDoErroDoPdf`: ler o corpo do erro, que chega
       * como blob por causa do `responseType` do PDF, é uma leitura assíncrona.
       */
      toast.error(await mensagemDoErroDoPdf(falha))
    } finally {
      setGerando(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="shrink-0"
      loading={gerando}
      loadingText="Gerando o PDF…"
      onClick={aoClicar}
    >
      Baixar PDF
    </Button>
  )
}