import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Field, Input, Select } from '../../components'
import { mensagemDeErro } from '../../lib/erro-api'
import { criarComponentePontuacao } from './componentes-pontuacao.api'
import { validarPesoPercentual } from './pesos'
import type { ComponentePontuacao } from './componentes-pontuacao.tipos'
import type { ComponenteCurricular } from '../salas/salas.tipos'

export interface NovoComponenteFormProps {
  bimestreId: string
  /**
   * Matérias do lecionamento — e só elas.
   *
   * A API recusa com 400 a matéria de outro lecionamento, então oferecer uma
   * matéria que a escola não leciona ali seria um erro que só apareceria depois
   * do envio.
   */
  componentesCurriculares: ComponenteCurricular[]
  /** Chamado com o componente criado, para a tela recarregar a lista. */
  onCriado: (componente: ComponentePontuacao) => void
}

/**
 * Criação de um componente de pontuação no bimestre.
 *
 * Os três campos são os do `CriarComponentePontuacaoDto`, e a conferência do peso
 * roda aqui para o erro aparecer no campo enquanto se digita. Quem decide se o
 * peso cabe é a API: só ela soma o que já existe na matéria, e um peso que
 * fecharia a matéria em mais de 100% só é detectável no servidor.
 */
export function NovoComponenteForm({
  bimestreId,
  componentesCurriculares,
  onCriado,
}: NovoComponenteFormProps) {
  const [componenteCurricularId, setComponenteCurricularId] = useState('')
  const [nome, setNome] = useState('')
  const [peso, setPeso] = useState('')
  const [erroMateria, setErroMateria] = useState<string>()
  const [erroNome, setErroNome] = useState<string>()
  const [erroPeso, setErroPeso] = useState<string>()
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return

    const semMateria = !componenteCurricularId
    const semNome = !nome.trim()
    const pesoValidado = validarPesoPercentual(peso)

    setErroMateria(semMateria ? 'Escolha a matéria do componente.' : undefined)
    setErroNome(semNome ? 'Informe o nome do componente.' : undefined)
    setErroPeso(pesoValidado.erro)

    if (semMateria || semNome || pesoValidado.valor === undefined) return

    setErroGeral(null)
    setEnviando(true)
    try {
      const componente = await criarComponentePontuacao(bimestreId, {
        componenteCurricularId,
        nome: nome.trim(),
        pesoPercentual: pesoValidado.valor,
      })
      setComponenteCurricularId('')
      setNome('')
      setPeso('')
      onCriado(componente)
    } catch (falha) {
      setErroGeral(
        mensagemDeErro(falha, 'Não foi possível criar o componente. Tente de novo.'),
      )
    } finally {
      // Nos dois desfechos, inclusive no que deu certo: deixar `enviando` ligado
      // no sucesso travaria o formulário em "Criando…" para o próximo componente
      // da matéria, que é exatamente o que o professor faz em seguida.
      setEnviando(false)
    }
  }

  const semMaterias = componentesCurriculares.length === 0

  return (
    <form onSubmit={enviar} noValidate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {erroGeral ? (
        <div className="sm:col-span-2 lg:col-span-4">
          <Alert tone="erro">{erroGeral}</Alert>
        </div>
      ) : null}

      <Field label="Matéria" error={erroMateria} required>
        <Select
          name="componente-curricular"
          value={componenteCurricularId}
          onChange={(evento) => setComponenteCurricularId(evento.target.value)}
          disabled={enviando || semMaterias}
        >
          <option value="">{semMaterias ? 'Nenhuma matéria no lecionamento' : 'Escolha…'}</option>
          {componentesCurriculares.map((componente) => (
            <option key={componente.id} value={componente.id}>
              {componente.nome}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Componente" error={erroNome} required>
        <Input
          name="nome-do-componente"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          placeholder="Prova bimestral"
          disabled={enviando}
        />
      </Field>

      <Field
        label="Peso"
        error={erroPeso}
        required
        hint="Porcentagem que este componente vale dentro da matéria, no bimestre."
      >
        <Input
          name="peso"
          type="number"
          min={0.01}
          max={100}
          step={0.01}
          value={peso}
          onChange={(evento) => setPeso(evento.target.value)}
          placeholder="40"
          disabled={enviando}
        />
      </Field>

      <div className="flex items-end">
        <Button
          type="submit"
          variant="secondary"
          loading={enviando}
          loadingText="Criando…"
          disabled={semMaterias}
        >
          Criar componente
        </Button>
      </div>
    </form>
  )
}
