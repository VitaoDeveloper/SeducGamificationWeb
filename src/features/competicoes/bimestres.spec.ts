import { dataParaISO, validarBimestres } from './bimestres'
import type { BimestreForm } from './bimestres'

/** Quatro bimestres encaixados, de fevereiro a dezembro, para partir de um caso bom. */
function bimestresValidos(): BimestreForm[] {
  return [
    { numero: 1, dataInicio: '2026-02-01', dataFim: '2026-04-30' },
    { numero: 2, dataInicio: '2026-05-01', dataFim: '2026-07-15' },
    { numero: 3, dataInicio: '2026-08-01', dataFim: '2026-10-15' },
    { numero: 4, dataInicio: '2026-10-16', dataFim: '2026-12-20' },
  ]
}

describe('validarBimestres', () => {
  it('aceita quatro bimestres crescentes e sem sobreposição', () => {
    const resultado = validarBimestres(bimestresValidos())

    expect(resultado.valido).toBe(true)
    expect(resultado.porNumero).toEqual({})
    expect(resultado.geral).toBeUndefined()
  })

  it('aceita o dia seguinte como início e recusa o mesmo dia do fim anterior', () => {
    const bimestres = bimestresValidos()
    // O primeiro termina em 30/04; começar em 01/05 é o limite do aceitável.
    expect(validarBimestres(bimestres).valido).toBe(true)

    bimestres[1] = { numero: 2, dataInicio: '2026-04-30', dataFim: '2026-07-15' }
    expect(validarBimestres(bimestres).geral).toBeDefined()
  })

  it('aponta cada data faltante no seu bimestre', () => {
    const bimestres = bimestresValidos()
    bimestres[0] = { numero: 1, dataInicio: '', dataFim: '' }
    bimestres[2] = { numero: 3, dataInicio: '2026-08-01', dataFim: '' }

    const resultado = validarBimestres(bimestres)

    expect(resultado.valido).toBe(false)
    expect(resultado.porNumero[1]).toEqual({
      dataInicio: 'Informe a data de início.',
      dataFim: 'Informe a data de fim.',
    })
    expect(resultado.porNumero[3]).toEqual({ dataFim: 'Informe a data de fim.' })
    expect(resultado.porNumero[2]).toBeUndefined()
  })

  it('recusa fim antes ou igual ao início, por bimestre', () => {
    const bimestres = bimestresValidos()
    bimestres[1] = { numero: 2, dataInicio: '2026-07-15', dataFim: '2026-05-01' }

    const resultado = validarBimestres(bimestres)

    expect(resultado.valido).toBe(false)
    expect(resultado.porNumero[2]?.dataFim).toBe(
      'A data de fim deve ser depois da data de início.',
    )
    // Sem erro de conjunto: as datas soltas já barram, e a mensagem geral só
    // confundiria quem ainda está corrigindo um bloco.
    expect(resultado.geral).toBeUndefined()
  })

  it('recusa fim igual ao início', () => {
    const bimestres = bimestresValidos()
    bimestres[0] = { numero: 1, dataInicio: '2026-02-01', dataFim: '2026-02-01' }

    expect(validarBimestres(bimestres).porNumero[1]?.dataFim).toBe(
      'A data de fim deve ser depois da data de início.',
    )
  })

  it('recusa bimestres que se sobrepõem', () => {
    const bimestres = bimestresValidos()
    // O terceiro começa no mesmo dia em que o segundo termina.
    bimestres[2] = { numero: 3, dataInicio: '2026-07-15', dataFim: '2026-10-15' }

    const resultado = validarBimestres(bimestres)

    expect(resultado.valido).toBe(false)
    expect(resultado.geral).toBe(
      'Os bimestres precisam ficar em ordem crescente, sem datas sobrepostas.',
    )
    expect(resultado.porNumero).toEqual({})
  })

  it('recusa bimestres fora de ordem', () => {
    const bimestres = bimestresValidos()
    // O segundo termina depois de o terceiro começar.
    bimestres[1] = { numero: 2, dataInicio: '2026-05-01', dataFim: '2026-09-01' }

    expect(validarBimestres(bimestres).geral).toBe(
      'Os bimestres precisam ficar em ordem crescente, sem datas sobrepostas.',
    )
  })
})

describe('dataParaISO', () => {
  it('interpreta a data digitada como meia-noite UTC, sem deslocar o dia', () => {
    expect(dataParaISO('2026-03-01')).toBe('2026-03-01T00:00:00.000Z')
  })
})
