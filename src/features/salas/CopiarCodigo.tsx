import { useState } from 'react'
import { Button } from '../../components'

/**
 * Copia um texto e avisa o professor, sem depender de biblioteca.
 *
 * A Clipboard API só existe em contexto seguro (https ou localhost), e a
 * interface é servida em http://LAN-IP:3000 quando o professor abre a página de
 * outro computador da rede. Nesse caso `navigator.clipboard` é indefinido e o
 * botão precise cair no caminho antigo, que é o mesmo que o professor usaria
 * de qualquer outra forma: selecionar o texto e dar Ctrl+C. A seleção é o
 * plano B, e é por isso que o texto do código é selecionável.
 */
async function copiar(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto)
      return true
    }
  } catch {
    // Clipboard bloqueada por permissão: cai no plano B.
  }

  return selecionar(texto)
}

/** Seleciona o texto na tela para o professor copiar no teclado. */
function selecionar(texto: string): boolean {
  const area = document.createElement('textarea')
  area.value = texto
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()

  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    area.remove()
  }
}

export interface CopiarCodigoProps {
  codigo: string
}

/**
 * Botão de copiar o código de matrícula.
 *
 * Fica dentro do modal de confirmação do cadastro (Etapa 03) e em toda parte
 * que o código aparece a partir daí. O texto do botão muda depois de copiar,
 * porque "copiou" é a única confirmação que importa aqui: o professor precisa
 * saber que pode colar o código no caderno ou na lista e esquecer a tela.
 */
export function CopiarCodigo({ codigo }: CopiarCodigoProps) {
  const [estado, setEstado] = useState<'idle' | 'copiado' | 'falhou'>('idle')

  async function aoClicar() {
    const ok = await copiar(codigo)
    setEstado(ok ? 'copiado' : 'falhou')
  }

  return (
    <Button variant="secondary" onClick={aoClicar} className="shrink-0">
      {estado === 'copiado'
        ? 'Copiado'
        : estado === 'falhou'
          ? 'Selecione e copie'
          : 'Copiar código'}
    </Button>
  )
}
