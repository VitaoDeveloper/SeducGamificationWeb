import { useState } from 'react'
import {
  Button,
  Card,
  CardTitle,
  Field,
  Input,
  PageHeader,
  Spinner,
  Table,
  useToast,
} from '../../components'
import type { TableColumn } from '../../components'

/**
 * Página de validação visual dos tokens e dos componentes-base.
 *
 * Temporária: existe para conferir, no navegador, se a paleta, a tipografia e
 * as formas saem como o esperado antes de as telas de negócio entrarem. A
 * Etapa 02 a remove, quando a tela de login ocupar a rota `/`.
 */

const AMOSTRA = [
  { id: 'a1', nome: 'Turma Alfa', alunos: 32, media: '8,42' },
  { id: 'a2', nome: 'Turma Beta', alunos: 28, media: '7,95' },
  { id: 'a3', nome: 'Turma Gama', alunos: 30, media: '8,10' },
]

const COLUNAS: TableColumn<(typeof AMOSTRA)[number]>[] = [
  { key: 'nome', header: 'Sala', cell: (linha) => <span className="font-medium">{linha.nome}</span> },
  { key: 'alunos', header: 'Alunos', align: 'right', cell: (linha) => linha.alunos },
  { key: 'media', header: 'Média', align: 'right', cell: (linha) => linha.media },
  {
    key: 'acoes',
    header: 'Ações',
    align: 'right',
    hideBelow: 'md',
    cell: () => (
      <Button variant="outline" size="sm">
        Abrir
      </Button>
    ),
  },
]

const CORES = [
  { nome: 'primary-100', classe: 'bg-primary-100' },
  { nome: 'primary-500', classe: 'bg-primary-500' },
  { nome: 'primary-600', classe: 'bg-primary-600' },
  { nome: 'accent-500', classe: 'bg-accent-500' },
  { nome: 'accent-600', classe: 'bg-accent-600' },
  { nome: 'neutral-200', classe: 'bg-neutral-200' },
  { nome: 'line-strong', classe: 'bg-line-strong' },
  { nome: 'institucional', classe: 'bg-institucional' },
]

export function ShowcasePage() {
  const toast = useToast()
  const [carregando, setCarregando] = useState(false)

  return (
    <div className="min-h-screen">
      <div className="bg-institucional border-line border-b">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <p className="text-primary-600 text-sm font-semibold tracking-wide uppercase">
            Etapa 01 · setup e design system
          </p>
          <h1 className="mt-1 text-3xl">Seduc Gamification Web</h1>
          <p className="text-neutral-600 mt-2 max-w-2xl text-sm">
            Página temporária de validação dos tokens. O gradiente institucional aparece aqui
            como na referência, mas fica reservado à tela de login e ao cabeçalho do
            dashboard: as telas de trabalho ficam neutras.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <PageHeader
          title="Componentes-base"
          description="Abaixo, cada componente em uso, com os três estados que as telas das próximas etapas vão precisar."
          action={<Button>Nova sala</Button>}
        />

        <section className="grid gap-6 md:grid-cols-2">
          <Card tone="accent" bar="left">
            <CardTitle>Botões</CardTitle>
            <p className="text-neutral-500 mt-1 text-sm">
              Primário na cor de destaque, secundário na cor primária, outline para ação de
              apoio. Todos em pílula.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button>Primário</Button>
              <Button variant="secondary">Secundário</Button>
              <Button variant="outline">Outline</Button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button size="sm">Pequeno</Button>
              <Button size="md">Médio</Button>
              <Button size="lg">Grande</Button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button loading loadingText="Salvando…">
                Carregando
              </Button>
              <Button disabled>Desabilitado</Button>
              <span className="inline-flex items-center gap-2 text-neutral-500 text-sm">
                <Spinner size="sm" /> Carregando dados
              </span>
            </div>
          </Card>

          <Card tone="primary" bar="left">
            <CardTitle>Campos</CardTitle>
            <p className="text-neutral-500 mt-1 text-sm">
              A borda em repouso usa o tom forte, porque a borda é o que identifica o
              controle. O estado de erro usa a cor de destaque.
            </p>
            <div className="mt-5 space-y-4">
              <Field label="Nome da sala" required hint="Ex.: 2º DS">
                <Input placeholder="2º DS" />
              </Field>
              <Field label="Ano letivo">
                <Input type="number" defaultValue={2026} />
              </Field>
              <Field label="Escola" error="Selecione uma escola da lista.">
                <Input aria-invalid />
              </Field>
              <Field label="Código de matrícula" hint="Padrão 26XXX, gerado no cadastro.">
                <Input placeholder="26001" prefix="#" />
              </Field>
            </div>
          </Card>
        </section>

        <Card bare>
          <div className="border-line border-b px-6 py-4">
            <CardTitle>Tabela com dados</CardTitle>
          </div>
          <Table columns={COLUNAS} rows={AMOSTRA} rowKey={(linha) => linha.id} />
        </Card>

        <section className="grid gap-6 md:grid-cols-2">
          <Card bare>
            <div className="border-line border-b px-6 py-4">
              <CardTitle>Estados de carregamento e vazio</CardTitle>
            </div>
            <Table
              columns={COLUNAS}
              rows={AMOSTRA}
              rowKey={(linha) => linha.id}
              loading={carregando}
            />
            <div className="border-line border-t">
              <Table
                columns={COLUNAS}
                rows={[]}
                rowKey={(linha) => linha.id}
                emptyMessage="Nenhuma sala cadastrada. Crie a primeira para começar."
                emptyAction={<Button size="sm">Criar sala</Button>}
              />
            </div>
            <div className="border-line flex items-center gap-3 border-t px-6 py-4">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCarregando((valor) => !valor)}
              >
                {carregando ? 'Ver com dados' : 'Ver carregando'}
              </Button>
              <span className="text-neutral-500 text-sm">
                A tela de trabalho é majoritariamente neutra, para não cansar no uso diário.
              </span>
            </div>
          </Card>

          <Card tone="accent" bar="none">
            <CardTitle>Paleta</CardTitle>
            <p className="text-neutral-500 mt-1 text-sm">
              Nenhum componente escreve cor literal: tudo vem de token.
            </p>
            <ul className="mt-5 grid grid-cols-2 gap-3">
              {CORES.map((cor) => (
                <li key={cor.nome} className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={`${cor.classe} border-line size-9 shrink-0 rounded-lg border`}
                  />
                  <span className="text-neutral-600 font-mono text-xs">{cor.nome}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <Card bar="none" className="flex flex-wrap items-center gap-3">
          <Button onClick={() => toast.success('Sala criada com sucesso.')}>
            Notificar sucesso
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.error('Já existe uma sala com esse nome neste ano letivo.')}
          >
            Notificar erro
          </Button>
          <span className="text-neutral-500 text-sm">
            Toast próprio, sem biblioteca externa.
          </span>
        </Card>
      </main>
    </div>
  )
}
