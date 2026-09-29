import { Button, Modal } from '../../components'
import { CopiarCodigo } from './CopiarCodigo'
import type { Aluno } from './salas.tipos'

export interface ModalMatriculaProps {
  /** Aluno recém-criado, ou null quando não há nada para confirmar. */
  aluno: Aluno | null
  onClose: () => void
}

/**
 * Confirmação do cadastro, com o código de matrícula em destaque.
 *
 * Este é o único lugar da interface que diz que a senha inicial é o próprio
 * código de matrícula — a listagem mostra o código, mas não a senha. A
 * oportunidade é única: a API não devolve senha em nenhuma chamada, e o
 * professor precisa repassar o código ao aluno agora, no mesmo minuto do
 * cadastro, para o primeiro acesso funcionar. Por isso o modal não oferece
 * "cadastrar outro" que fecharia a confirmação: ele só fecha, e o formulário
 * abaixo dele já está limpo para o próximo aluno.
 *
 * O código aparece com o prefixo `#`, que é a forma como o campo de login o
 * mostra (`Input` com `prefix`), para o professor não digitar o `#` junto.
 */
export function ModalMatricula({ aluno, onClose }: ModalMatriculaProps) {
  if (!aluno) return null

  return (
    <Modal
      open
      onClose={onClose}
      title="Aluno cadastrado"
      description="Passe o código abaixo para o aluno. Ele entra com o código e a mesma senha."
      footer={
        <>
          <CopiarCodigo codigo={aluno.codigoMatricula} />
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </>
      }
    >
      <div className="border-line-strong bg-neutral-50 rounded-lg border p-4">
        <p className="text-neutral-500 text-xs font-semibold tracking-wide uppercase">
          {aluno.nome}
        </p>
        <p className="font-display text-neutral-900 mt-1 text-3xl font-bold tracking-wider select-all">
          #{aluno.codigoMatricula}
        </p>
      </div>

      <p className="text-neutral-600 mt-4 text-sm">
        A <span className="font-medium text-neutral-800">senha inicial é este
        mesmo código</span>. Vale pedir que o aluno troque a senha no primeiro
        acesso, em “Trocar senha”, no topo da tela.
      </p>
    </Modal>
  )
}
