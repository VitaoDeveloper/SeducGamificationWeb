import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Field, TagsInput } from '../../components'
import { mensagemDeErro } from '../../lib/erro-api'
import { inscreverNaSala } from './salas.api'
import type { Lecionamento } from './salas.tipos'

export interface InscricaoFormProps {
  salaId: string
  /** Chamado com o lecionamento criado, para a tela recarregar. */
  onInscrito: (lecionamento: Lecionamento) => void
}

interface ErrosDoFormulario {
  componentes?: string
}

/**
 * Inscrição do professor na sala, com os componentes que ele leciona.
 *
 * A regra é do professor, não da API: ele atribui à sala **todos** os
 * componentes que leciona nela (RN3), e cada nome é livre. Não há lista
 * fechada de matérias na API — a escola tem um modelo de avaliação, não um
 * catálogo de disciplinas — então o campo aceita texto e vira etiqueta, em vez
 * de um select que esconderia metade do que a escola chama as coisas.
 *
 * A partir daqui é que nasce a competição da sala (Etapa 04), o que explica o
 * formulário ser inteiro só de um campo: a inscrição é o que transforma uma
 * turma em um trabalho avaliável, e não há nada mais a preencher.
 */
export function InscricaoForm({ salaId, onInscrito }: InscricaoFormProps) {
  const [componentes, setComponentes] = useState<string[]>([])
  const [erros, setErros] = useState<ErrosDoFormulario>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return

    /*
     * Conferido aqui, e não só pela API, porque "nenhuma matéria" é o erro que
     * o professor mais comete e o mais fácil de deixar passar: a tela ficaria
     * esperando a resposta para dizer algo que ela já sabe.
     */
    if (componentes.length === 0) {
      setErros({ componentes: 'Informe ao menos um componente curricular.' })
      setErroGeral(null)
      return
    }

    setErros({})
    setErroGeral(null)
    setEnviando(true)

    try {
      const lecionamento = await inscreverNaSala(salaId, componentes)
      onInscrito(lecionamento)
    } catch (erro) {
      /*
       * 409 é a resposta para quem já está inscrito, e a API traz a frase
       * pronta: "Professor já está inscrito nesta sala." O 403 é o professor
       * sem vínculo com a escola da sala. Nos dois casos quem escreve o texto
       * é o servidor — a tela não conhece esses casos, só mostra a mensagem.
       */
      setErroGeral(mensagemDeErro(erro, 'Não foi possível concluir a inscrição. Tente de novo.'))
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {erroGeral ? <Alert tone="erro">{erroGeral}</Alert> : null}

      <Field
        label="Componentes curriculares"
        error={erros.componentes}
        required
        hint="Digite uma matéria por vez e aperte Enter. São os componentes que você leciona nesta sala — todos eles entram na competição."
      >
        <TagsInput
          name="componentes"
          value={componentes}
          onValueChange={setComponentes}
          placeholder="Programação Web"
          disabled={enviando}
        />
      </Field>

      <Button type="submit" loading={enviando} loadingText="Inscrevendo…">
        Inscrever-se na sala
      </Button>
    </form>
  )
}
