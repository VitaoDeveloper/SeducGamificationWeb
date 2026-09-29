import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Card, Field, Input, Select } from '../../components'
import { mensagemDeErro } from '../../lib/erro-api'
import { criarSala } from './salas.api'
import type { EscolaResumo, Sala } from './salas.tipos'

export interface NovaSalaFormProps {
  /** Escolas às quais o professor está vinculado, sem repetir. */
  escolas: EscolaResumo[]
  /** Chamado depois que a API devolve a sala criada. */
  onCriada: (sala: Sala) => void
  onCancelar: () => void
}

interface ErrosDoFormulario {
  nome?: string
  anoLetivo?: string
  escolaId?: string
}

/**
 * Ano letivo padrão: o que está terminando.
 *
 * A escola cadastrou a sala para o ano em curso, e é para ele que o professor
 * quase sempre quer criar uma turma. A API aceita de 2000 a 2100 e trata
 * número, então a validação local só precisa seguir a mesma faixa — se a regra
 * mudar na API, os dois lados precisam mudar juntos.
 */
const ANO_MINIMO = 2000
const ANO_MAXIMO = 2100

/**
 * Formulário de criação de sala, dentro de um card.
 *
 * O campo de escola só aparece quando há mais de uma: com uma única escola
 * vinculada, a escolha é automática e um select com uma opção só seria um
 * campo a mais para o professor atravessar. Ainda assim a escola entra no
 * corpo enviado, porque é ela que a API exige.
 *
 * A lista de escolas vem das salas que o professor já tem: a API não expõe as
 * escolas vinculadas a um professor (o vínculo é feito pelo mantenedor, direto
 * no banco), e `GET /salas` traz a escola de cada sala. Um professor sem
 * nenhuma sala não tem como escolher escola aqui — e a tela diz isso em vez de
 * oferecer um select vazio.
 */
export function NovaSalaForm({ escolas, onCriada, onCancelar }: NovaSalaFormProps) {
  const [nome, setNome] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(String(new Date().getFullYear()))
  const [escolaId, setEscolaId] = useState(escolas.length === 1 ? (escolas[0] as EscolaResumo).id : '')
  const [erros, setErros] = useState<ErrosDoFormulario>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const semEscolas = escolas.length === 0

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return

    const novosErros: ErrosDoFormulario = {}
    if (!nome.trim()) {
      novosErros.nome = 'Informe o nome da sala.'
    }

    const ano = Number(anoLetivo)
    if (!anoLetivo.trim()) {
      novosErros.anoLetivo = 'Informe o ano letivo.'
    } else if (!Number.isInteger(ano) || ano < ANO_MINIMO || ano > ANO_MAXIMO) {
      novosErros.anoLetivo = `O ano letivo deve estar entre ${ANO_MINIMO} e ${ANO_MAXIMO}.`
    }

    if (escolas.length > 1 && !escolaId) {
      novosErros.escolaId = 'Escolha a escola.'
    }

    setErros(novosErros)
    setErroGeral(null)
    if (Object.keys(novosErros).length > 0) return

    setEnviando(true)
    try {
      const sala = await criarSala({
        nome: nome.trim(),
        anoLetivo: ano,
        // `escolas[0]` é a única opção quando o select não aparece, e o length
        // acima já garantindo que a lista não está vazia.
        escolaId: escolaId || (escolas[0] as EscolaResumo).id,
      })
      onCriada(sala)
    } catch (erro) {
      setErroGeral(mensagemDeErro(erro, 'Não foi possível criar a sala. Tente de novo.'))
      setEnviando(false)
    }
  }

  return (
    <Card tone="accent" bar="left" className="max-w-2xl">
      <h2 className="text-lg font-semibold">Nova sala</h2>
      <p className="text-neutral-500 mt-1.5 text-sm">
        Criar a sala não te inscreve nela. Depois de criar, você se inscreve
        informando os componentes que leciona — é o que dá origem à competição.
      </p>

      <form onSubmit={enviar} noValidate className="mt-5 space-y-4">
        {erroGeral ? <Alert tone="erro">{erroGeral}</Alert> : null}

        {semEscolas ? (
          <Alert tone="info">
            Nenhuma escola aparece para você ainda. O vínculo entre professor e
            escola é feito pelo mantenedor, direto no banco de dados — sem ele a
            API recusa a criação da sala.
          </Alert>
        ) : null}

        {escolas.length > 1 ? (
          <Field label="Escola" error={erros.escolaId} required>
            <Select
              name="escolaId"
              value={escolaId}
              onChange={(evento) => setEscolaId(evento.target.value)}
              disabled={enviando || semEscolas}
            >
              <option value="">Escolha a escola</option>
              {escolas.map((escola) => (
                <option key={escola.id} value={escola.id}>
                  {escola.nome}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field
          label="Nome da sala"
          error={erros.nome}
          required
          hint="Como a turma é chamada na escola. Ex.: 2º DS, Técnico em Informática — Manhã."
        >
          <Input
            name="nome"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            placeholder="2º DS"
            disabled={enviando}
          />
        </Field>

        <Field
          label="Ano letivo"
          error={erros.anoLetivo}
          required
          hint={`Entre ${ANO_MINIMO} e ${ANO_MAXIMO}.`}
        >
          <Input
            name="anoLetivo"
            type="number"
            value={anoLetivo}
            onChange={(evento) => setAnoLetivo(evento.target.value)}
            min={ANO_MINIMO}
            max={ANO_MAXIMO}
            inputMode="numeric"
            disabled={enviando}
          />
        </Field>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="submit"
            loading={enviando}
            loadingText="Criando…"
            disabled={semEscolas}
          >
            Criar sala
          </Button>
          <Button variant="outline" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}
