import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { espiarNoDownload } from '../../test/download'
import type { EspiaDeDownload } from '../../test/download'

import { dispararDownload, nomeDoArquivoDoPdf, nomeDoArquivoNaDisposicao } from './relatorios.pdf'

let download: EspiaDeDownload

beforeEach(() => {
  download = espiarNoDownload()
})

afterEach(() => {
  download.restaurar()
})

describe('nomeDoArquivoDoPdf', () => {
  it('junta o prefixo do relatório ao nome do aluno', () => {
    expect(nomeDoArquivoDoPdf('individual', 'João da Silva')).toBe(
      'relatorio-individual-joao-da-silva.pdf',
    )
    expect(nomeDoArquivoDoPdf('comparativo-grupo', 'João da Silva')).toBe(
      'relatorio-comparativo-grupo-joao-da-silva.pdf',
    )
  })

  it('usa o prefixo da rota em cada um dos quatro relatórios', () => {
    // O prefixo é o segmento da rota `.pdf`, e não o `tipo` da resposta: o
    // coletivo do grupo é `relatorio` e o comparativo é `relatorio-comparativo`.
    // Se os dois divergirem, o nome do arquivo mente sobre o que foi baixado.
    expect(nomeDoArquivoDoPdf('individual', 'Ana Souza')).toBe('relatorio-individual-ana-souza.pdf')
    expect(nomeDoArquivoDoPdf('comparativo-grupo', 'Ana Souza')).toBe(
      'relatorio-comparativo-grupo-ana-souza.pdf',
    )
    expect(nomeDoArquivoDoPdf('coletivo-grupo', 'Equipe Alfa')).toBe('relatorio-equipe-alfa.pdf')
    expect(nomeDoArquivoDoPdf('comparativo-grupos', 'Equipe Alfa')).toBe(
      'relatorio-comparativo-equipe-alfa.pdf',
    )
  })

  it('tira acento e troca separador por hífen, em vez de apagar', () => {
    // `Equipe Alfa` e `EquipeAlfa` são nomes diferentes: apagar o separador os
    // fundiria no mesmo arquivo, e a pasta de downloads viraria uma confusão.
    expect(nomeDoArquivoDoPdf('coletivo-grupo', 'A turbo equipe 2ª')).toBe(
      'relatorio-a-turbo-equipe-2a.pdf',
    )
    expect(nomeDoArquivoDoPdf('individual', 'João  da   Silva')).toBe(
      'relatorio-individual-joao-da-silva.pdf',
    )
  })

  it('usa o prefixo sozinho quando o nome não tem nada aproveitável', () => {
    expect(nomeDoArquivoDoPdf('coletivo-grupo', '***')).toBe('relatorio.pdf')
    expect(nomeDoArquivoDoPdf('individual', '')).toBe('relatorio-individual.pdf')
    expect(nomeDoArquivoDoPdf('individual', null)).toBe('relatorio-individual.pdf')
    expect(nomeDoArquivoDoPdf('individual', undefined)).toBe('relatorio-individual.pdf')
  })

  it('prefere o nome do Content-Disposition quando a API manda um', () => {
    // O cabeçalho é a fonte que o servidor controla: se ele nomeia o arquivo, é
    // esse nome que vale — não o que a tela adivinhou.
    expect(
      nomeDoArquivoDoPdf('individual', 'Ana Souza', 'attachment; filename="relatorio-da-ana.pdf"'),
    ).toBe('relatorio-da-ana.pdf')
  })
})

describe('nomeDoArquivoNaDisposicao', () => {
  it('lê o filename simples, com ou sem aspas', () => {
    expect(nomeDoArquivoNaDisposicao('attachment; filename="relatorio.pdf"')).toBe('relatorio.pdf')
    expect(nomeDoArquivoNaDisposicao('attachment; filename=relatorio.pdf')).toBe('relatorio.pdf')
  })

  it('decodifica o filename* da RFC 5987, que é o que sobrevive ao acento', () => {
    expect(
      nomeDoArquivoNaDisposicao("attachment; filename*=UTF-8''relat%C3%B3rio%20da%20Ana.pdf"),
    ).toBe('relatório da Ana.pdf')
  })

  it('prefere o filename* quando os dois formatos estão no cabeçalho', () => {
    // Com acento e sem acento no mesmo cabeçalho, o específico (`filename*`) é o
    // que o cliente deve obedecer.
    expect(
      nomeDoArquivoNaDisposicao(
        'attachment; filename="relatorio.pdf"; filename*=UTF-8\'\'relat%C3%B3rio.pdf',
      ),
    ).toBe('relatório.pdf')
  })

  it('devolve null quando o cabeçalho não nomeia o arquivo', () => {
    // O `inline` é o que a API usaria para abrir o PDF na aba em vez de baixar:
    // nesse caso não há nome, e o nome montado pela tela entra no lugar.
    expect(nomeDoArquivoNaDisposicao('inline')).toBeNull()
    expect(nomeDoArquivoNaDisposicao('attachment')).toBeNull()
    expect(nomeDoArquivoNaDisposicao('')).toBeNull()
    expect(nomeDoArquivoNaDisposicao(null)).toBeNull()
    expect(nomeDoArquivoNaDisposicao(undefined)).toBeNull()
  })
})

describe('dispararDownload', () => {
  const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' })

  it('entrega o blob ao navegador com o nome do arquivo', () => {
    dispararDownload(pdf, 'relatorio-individual-ana-souza.pdf')

    expect(download.criarUrl).toHaveBeenCalledWith(pdf)
    expect(download.clicar).toHaveBeenCalledTimes(1)
    expect(download.baixados).toEqual([
      { nomeDoArquivo: 'relatorio-individual-ana-souza.pdf', blob: pdf },
    ])
  })

  it('devolve o link à página e revoga a URL, que segura o PDF em memória', () => {
    dispararDownload(pdf, 'relatorio.pdf')

    // O link não pertence à tela: entra para poder ser clicado e sai na mesma
    // hora. E a URL de objeto vira lixo assim que o navegador a lê — enquanto
    // ninguém revogar, o PDF inteiro fica preso na memória da aba.
    expect(document.querySelector('a[download]')).toBeNull()
    expect(download.revogarUrl).toHaveBeenCalledWith('blob:espiao/0')
  })

  it('revoga a URL mesmo quando o clique não chega ao navegador', () => {
    download.clicar.mockImplementation(() => {
      throw new Error('clique bloqueado')
    })

    expect(() => dispararDownload(pdf, 'relatorio.pdf')).toThrow('clique bloqueado')
    expect(download.revogarUrl).toHaveBeenCalledWith('blob:espiao/0')
    expect(document.querySelector('a[download]')).toBeNull()
  })
})