import { useState } from 'react'
import { Button, useToast } from '../../components'
import { baixarPdfDoRelatorio, mensagemDoErroDoPdf } from './relatorios.api'
import { dispararDownload } from './relatorios.pdf'
import type { Relatorio } from './relatorios.tipos'

export interface BaixarPdfProps {
  relatorio: Relatorio
}

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
      toast.error(await mensagemDoErroDoPdf(falha))
    } finally {
      setGerando(false)
    }
  }

  return (
    <Button variant="outline" size="sm" className="shrink-0" loading={gerando} loadingText="Gerando o PDF..." onClick={aoClicar}>
      Baixar PDF
    </Button>
  )
}