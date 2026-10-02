import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Select, Table, useToast } from '../../components'
import type { TableColumn } from '../../components'
import { mensagemDeErro } from '../../lib/erro-api'
import { adicionarMembro, removerMembro } from './competicoes.api'
import type { GrupoComMembros } from './competicoes.tipos'
import { rotaDoRelatorioIndividual } from '../relatorios/rotas'
import type { Aluno } from '../salas/salas.tipos'

export interface GerenciarMembrosProps {
  /** Bimestre em exibição; é ele que define quais vínculos existem. */
  bimestreId: string
  /** Bimestre encerrado: os controles ficam só de leitura. */
  encerrado: boolean
  grupos: GrupoComMembros[]
  alunos: Aluno[]
  /**
   * Competição em exibição, para o atalho do relatório individual.
   *
   * Opcional de propósito: a composição aparece na tela de grupos mesmo antes de
   * a lista de relatórios existir, e o atalho só é montado quando há competição.
   */
  competicaoId?: string
  /** Chamado depois de uma mudança aceita, para a tela recarregar os grupos. */
  onAlterado: () => void
}

/** Linha da tabela de composição: o aluno e o grupo em que está neste bimestre. */
interface LinhaDeComposicao {
  aluno: Aluno
  /** Grupo atual, ou vazio quando o aluno ainda não está em nenhum. */
  grupoAtual: string
}

/**
 * Composição dos grupos no bimestre selecionado.
 *
 * Um `select` por aluno, e não um quadro de arrastar: o aluno está em no máximo
 * um grupo por bimestre (a API recusa o segundo vínculo com 409), então a
 * pergunta que a tela faz é "de quem é este aluno?", que é exatamente o que um
 * select responde. Um quadro poderia sugerir que a mesma pessoa cabe em duas
 * equipes no mesmo período, o que a regra não permite.
 *
 * Trocar de grupo é remover do antigo e adicionar no novo — duas chamadas que a
 * API não conhece como uma só. A interface nunca mostra o aluno em dois grupos
 * porque o `value` de cada select sai dos dados do servidor, e não de um estado
 * local que poderia divergir deles.
 *
 * A última coluna é o atalho para o relatório individual do aluno (Etapa 10). Ele
 * fica aqui porque a composição é a tela em que o professor tem o nome do aluno na
 * frente: é de onde a pergunta "como foi este aluno no ano?" sai, e o relatório
 * responde o ano inteiro, não o bimestre que está selecionado.
 */
export function GerenciarMembros({
  bimestreId,
  encerrado,
  grupos,
  alunos,
  competicaoId,
  onAlterado,
}: GerenciarMembrosProps) {
  const toast = useToast()
  const [emAndamento, setEmAndamento] = useState<string[]>([])

  const grupoDeAluno = new Map<string, string>()
  for (const grupo of grupos) {
    for (const membro of grupo.membrosGrupos) {
      grupoDeAluno.set(membro.alunoId, grupo.id)
    }
  }

  function marcar(alunoId: string, ativo: boolean) {
    setEmAndamento((atuais) =>
      ativo ? [...atuais, alunoId] : atuais.filter((id) => id !== alunoId),
    )
  }

  async function trocar(aluno: Aluno, destino: string) {
    const atual = grupoDeAluno.get(aluno.id) ?? ''
    if (destino === atual) return

    marcar(aluno.id, true)
    try {
      if (atual && !destino) {
        await removerMembro(atual, aluno.id, bimestreId)
      } else if (!atual && destino) {
        await adicionarMembro(destino, aluno.id, bimestreId)
      } else {
        await removerMembro(atual, aluno.id, bimestreId)
        try {
          await adicionarMembro(destino, aluno.id, bimestreId)
        } catch (falha) {
          // A API exige remover antes de adicionar; se o novo vínculo falha, o
          // aluno ficaria fora de qualquer grupo — pior do que não ter mudado.
          // Devolvê-lo ao grupo antigo mantém a composição como estava.
          await adicionarMembro(atual, aluno.id, bimestreId).catch(() => undefined)
          throw falha
        }
      }
      onAlterado()
    } catch (falha) {
      toast.error(mensagemDeErro(falha, 'Não foi possível mudar o grupo do aluno.'))
    } finally {
      marcar(aluno.id, false)
    }
  }

  if (alunos.length === 0) {
    return (
      <Alert tone="info">
        Nenhum aluno matriculado nesta sala ainda. Cadastre os alunos antes de
        montar os grupos.
      </Alert>
    )
  }

  if (grupos.length === 0) {
    return (
      <Alert tone="info">
        Crie ao menos um grupo para distribuir os alunos deste bimestre.
      </Alert>
    )
  }

  const linhas: LinhaDeComposicao[] = alunos.map((aluno) => ({
    aluno,
    grupoAtual: grupoDeAluno.get(aluno.id) ?? '',
  }))

  const colunas: TableColumn<LinhaDeComposicao>[] = [
    {
      key: 'aluno',
      header: 'Aluno',
      cell: (linha) => (
        <span>
          <span className="font-medium text-neutral-800">{linha.aluno.nome}</span>
          <span className="text-neutral-500 block text-xs">
            #{linha.aluno.codigoMatricula}
          </span>
        </span>
      ),
    },
    {
      key: 'grupo',
      header: 'Grupo neste bimestre',
      cell: (linha) => (
        <Select
          aria-label={`Grupo de ${linha.aluno.nome}`}
          value={linha.grupoAtual}
          onChange={(evento) => trocar(linha.aluno, evento.target.value)}
          disabled={encerrado || emAndamento.includes(linha.aluno.id)}
        >
          <option value="">Sem grupo</option>
          {grupos.map((grupo) => (
            <option key={grupo.id} value={grupo.id}>
              {grupo.nome}
            </option>
          ))}
        </Select>
      ),
    },
    /*
     * O atalho do relatório individual é a terceira coluna, e não um botão ao
     * lado do nome: a pergunta "como foi este aluno no ano?" é do mesmo tamanho da
     * pergunta "de quem é este grupo?", e as duas linhas da tabela precisam ficar
     * alinhadas para o professor percorrer a turma olhando as duas coisas.
     *
     * A coluna some quando a tela não sabe a competição — o atalho não pode levar
     * a um `400` de "informe competicaoId" só porque quem abriu a tela não tinha o
     * id à mão.
     */
    ...(competicaoId
      ? [
          {
            key: 'relatorio',
            header: 'Relatório',
            cell: (linha: LinhaDeComposicao) => (
              <Link
                className="text-primary-700 hover:text-primary-800 text-sm font-medium underline underline-offset-2"
                to={rotaDoRelatorioIndividual(linha.aluno.id, competicaoId)}
              >
                Ver relatório
              </Link>
            ),
          } satisfies TableColumn<LinhaDeComposicao>,
        ]
      : []),
  ]

  return (
    <div className="space-y-3">
      {encerrado ? (
        <Alert tone="info">
          Este bimestre está encerrado. A composição dos grupos fica só de
          leitura — reabra o bimestre para mexer nas equipes.
        </Alert>
      ) : null}

      <Table
        columns={colunas}
        rows={linhas}
        rowKey={(linha) => linha.aluno.id}
        emptyMessage="Nenhum aluno nesta sala ainda."
      />
    </div>
  )
}
