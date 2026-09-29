import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Card, Field, Input } from '../../components'
import { mensagemDeErro } from '../../lib/erro-api'
import { criarCompeticao } from './competicoes.api'
import { dataParaISO, rotuloDoBimestre, validarBimestres } from './bimestres'
import type { BimestreForm, ErroDeBimestre } from './bimestres'
import type { CompeticaoCompleta } from './competicoes.tipos'

export interface NovaCompeticaoFormProps {
  /** Lecionamento a que a competição pertence (professor + sala). */
  lecionamentoId: string
  /** Chamado com a competição criada, já com os 4 bimestres. */
  onCriada: (competicao: CompeticaoCompleta) => void
  onCancelar: () => void
}

/** Os quatro bimestres em branco, na ordem em que a escola os numera. */
function bimestresVazios(): BimestreForm[] {
  return [1, 2, 3, 4].map((numero) => ({ numero, dataInicio: '', dataFim: '' }))
}

/**
 * Formulário de criação de competição.
 *
 * As quatro datas são pedidas de uma vez porque a API não aceita competição sem
 * os quatro bimestres: criar depois, um a um, deixaria a competição num estado
 * que o servidor não reconhece. A validação de ordem e sobreposição roda aqui
 * também, mas quem manda continua sendo a API — a checagem local existe para o
 * erro aparecer no bloco errado enquanto se digita, não para substituir a regra.
 */
export function NovaCompeticaoForm({
  lecionamentoId,
  onCriada,
  onCancelar,
}: NovaCompeticaoFormProps) {
  const [nome, setNome] = useState('')
  const [bimestres, setBimestres] = useState<BimestreForm[]>(bimestresVazios)
  const [erroNome, setErroNome] = useState<string>()
  const [erros, setErros] = useState<Record<number, ErroDeBimestre>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function alterarData(numero: number, campo: 'dataInicio' | 'dataFim', valor: string) {
    setBimestres((atuais) =>
      atuais.map((bimestre) =>
        bimestre.numero === numero ? { ...bimestre, [campo]: valor } : bimestre,
      ),
    )
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return

    const semNome = !nome.trim()
    const validacao = validarBimestres(bimestres)

    setErroNome(semNome ? 'Informe o nome da competição.' : undefined)
    setErros(validacao.porNumero)
    setErroGeral(validacao.geral ?? null)

    if (semNome || !validacao.valido) return

    setEnviando(true)
    try {
      const competicao = await criarCompeticao({
        nome: nome.trim(),
        lecionamentoId,
        bimestres: bimestres.map((bimestre) => ({
          numero: bimestre.numero,
          dataInicio: dataParaISO(bimestre.dataInicio),
          dataFim: dataParaISO(bimestre.dataFim),
        })),
      })
      onCriada(competicao)
    } catch (erro) {
      setErroGeral(mensagemDeErro(erro, 'Não foi possível criar a competição. Tente de novo.'))
      setEnviando(false)
    }
  }

  return (
    <Card tone="accent" bar="left" className="max-w-3xl">
      <h2 className="text-lg font-semibold">Nova competição</h2>
      <p className="text-neutral-500 mt-1.5 text-sm">
        A competição reúne os quatro bimestres do ano. Os grupos e a composição
        de cada equipe serão definidos depois, bimestre a bimestre — por ora,
        só as datas de cada período.
      </p>

      <form onSubmit={enviar} noValidate className="mt-5 space-y-5">
        {erroGeral ? <Alert tone="erro">{erroGeral}</Alert> : null}

        <Field label="Nome da competição" error={erroNome} required>
          <Input
            name="nome"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            placeholder="Copa do Conhecimento"
            disabled={enviando}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          {bimestres.map((bimestre) => {
            const rotulo = rotuloDoBimestre(bimestre.numero)
            const erro = erros[bimestre.numero]

            return (
              <fieldset
                key={bimestre.numero}
                className="border-line rounded-lg border p-4"
              >
                <legend className="px-1.5 text-sm font-semibold text-neutral-700">
                  {rotulo}
                </legend>

                <div className="space-y-3">
                  <Field label="Início" error={erro?.dataInicio}>
                    <Input
                      name={`inicio-${bimestre.numero}`}
                      type="date"
                      value={bimestre.dataInicio}
                      onChange={(evento) =>
                        alterarData(bimestre.numero, 'dataInicio', evento.target.value)
                      }
                      disabled={enviando}
                    />
                  </Field>

                  <Field label="Fim" error={erro?.dataFim}>
                    <Input
                      name={`fim-${bimestre.numero}`}
                      type="date"
                      value={bimestre.dataFim}
                      onChange={(evento) =>
                        alterarData(bimestre.numero, 'dataFim', evento.target.value)
                      }
                      disabled={enviando}
                    />
                  </Field>
                </div>
              </fieldset>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" loading={enviando} loadingText="Criando…">
            Criar competição
          </Button>
          <Button variant="outline" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}
