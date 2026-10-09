import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Card, Field, Input, Select } from '../../components'
import { mensagemDeErro } from '../../lib/erro-api'
import { atualizarSala, criarSala } from './salas.api'
import type { EscolaResumo, Sala } from './salas.tipos'

export interface NovaSalaFormProps {
  /** Escolas às quais o professor está vinculado, sem repetir. Só na criação. */
  escolas?: EscolaResumo[]
  /** Sala em edição. Sem ela, o formulário cria uma sala nova. */
  sala?: Sala
  /** Recebe a sala criada, ou a atualizada quando há `sala`. */
  onSalva: (sala: Sala) => void
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
 * Formulário de sala, dentro de um card.
 *
 * O mesmo formulário cria e edita: sem `sala`, cria; com `sala`, edita. O que
 * muda é o envio (`POST` ou `PATCH`) e o campo de escola — na edição ele não
 * é uma escolha, porque a sala não troca de escola, e aparece só para o
 * professor confirmar onde a turma está.
 *
 * Na criação, o campo de escola só aparece quando há mais de uma vinculada:
 * com uma única escola, a escolha é automática e um select com uma opção só
 * seria um campo a mais para o professor atravessar. Ainda assim a escola entra
 * no corpo enviado, porque é ela que a API exige.
 *
 * A lista vem de `GET /escolas`, que devolve exatamente as escolas às quais o
 * professor está vinculado. Lista vazia aqui quer dizer uma coisa só — não há
 * vínculo nenhum — e o aviso diz isso, porque é a única situação em que a
 * criação é impossível mesmo: sem escola, o `POST /salas` não tem o que
 * mandar.
 */
export function NovaSalaForm({ escolas = [], sala, onSalva, onCancelar }: NovaSalaFormProps) {
  const [nome, setNome] = useState(sala?.nome ?? '')
  const [anoLetivo, setAnoLetivo] = useState(String(sala?.anoLetivo ?? new Date().getFullYear()))
  const [escolaId, setEscolaId] = useState(escolas.length === 1 ? (escolas[0] as EscolaResumo).id : '')
  const [erros, setErros] = useState<ErrosDoFormulario>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const semEscolas = !sala && escolas.length === 0

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

    if (!sala && escolas.length > 1 && !escolaId) {
      novosErros.escolaId = 'Escolha a escola.'
    }

    setErros(novosErros)
    setErroGeral(null)
    if (Object.keys(novosErros).length > 0) return

    setEnviando(true)
    try {
      if (sala) {
        const atualizada = await atualizarSala(sala.id, { nome: nome.trim(), anoLetivo: ano })
        onSalva(atualizada)
      } else {
        const criada = await criarSala({
          nome: nome.trim(),
          anoLetivo: ano,
          // `escolas[0]` é a única opção quando o select não aparece, e o
          // `semEscolas` acima já garante que a lista não está vazia.
          escolaId: escolaId || (escolas[0] as EscolaResumo).id,
        })
        onSalva(criada)
      }
    } catch (erro) {
      setErroGeral(
        mensagemDeErro(
          erro,
          sala
            ? 'Não foi possível salvar as alterações. Tente de novo.'
            : 'Não foi possível criar a sala. Tente de novo.',
        ),
      )
      setEnviando(false)
    }
  }

  return (
    <Card tone="accent" bar="left" className="max-w-2xl">
      <h2 className="text-lg font-semibold">{sala ? 'Editar sala' : 'Nova sala'}</h2>
      <p className="text-neutral-500 mt-1.5 text-sm">
        {sala
          ? 'A escola não muda: a sala pertence à escola em que foi criada. Você pode ajustar o nome e o ano letivo.'
          : 'Criar a sala não te inscreve nela. Depois de criar, você se inscreve informando os componentes que leciona — é o que dá origem à competição.'}
      </p>

      <form onSubmit={enviar} noValidate className="mt-5 space-y-4">
        {erroGeral ? <Alert tone="erro">{erroGeral}</Alert> : null}

        {semEscolas ? (
          <Alert tone="info">
            Nenhuma escola está vinculada ao seu usuário. O vínculo entre
            professor e escola é feito pelo mantenedor, direto no banco de
            dados — sem ele a API recusa a criação da sala.
          </Alert>
        ) : null}

        {sala ? (
          <Field label="Escola" hint="A sala não troca de escola.">
            <Input name="escola" value={sala.escola.nome} readOnly disabled />
          </Field>
        ) : escolas.length > 1 ? (
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
            loadingText={sala ? 'Salvando...' : 'Criando...'}
            disabled={semEscolas}
          >
            {sala ? 'Salvar alterações' : 'Criar sala'}
          </Button>
          <Button variant="outline" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}
