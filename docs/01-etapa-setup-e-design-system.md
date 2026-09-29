# Etapa 01 (GUI) — Setup do projeto e design system

**Pré-requisito:** nenhum. Primeira etapa do front-end.

## Contexto para o agente

Este é um repositório novo, do zero. A referência visual vem de um site pessoal existente (não deste projeto) — o objetivo é capturar a **linguagem visual** (paleta, tipografia, forma dos componentes), não copiar layout, textos ou imagens de lá. O sistema em si é acadêmico/institucional (professores e alunos de escolas técnicas), então o tom deve ficar um pouco mais sóbrio que um site de marca pessoal, mas mantendo a identidade de cor.

## Tarefas

### 1. Scaffold do projeto

- `npm create vite@latest . -- --template react-ts` (ou `pnpm create vite`, à escolha, mas manter consistência com o resto do projeto se o agente tiver preferência já estabelecida).
- Instalar: `react-router-dom` (rotas), `axios` (chamadas HTTP).
- Estrutura de pastas sugerida:
  ```
  src/
    app/              # rotas, providers globais
    components/       # componentes reutilizáveis (Button, Input, Card, ...)
    features/         # uma pasta por domínio (auth, salas, alunos, ...)
    lib/               # cliente axios, utilitários
    styles/            # tokens de design, estilos globais
  ```

### 2. Estilização

Escolher **Tailwind CSS** (recomendado, por ser rápido para aplicar um design system consistente via tokens, e por já ser comum no ecossistema React/Vite). Instalar e configurar conforme a versão estável atual do Tailwind para Vite no momento da implementação (conferir a documentação oficial, pois o comando de setup muda entre versões).

### 3. Tokens de design (extraídos da referência visual)

Definir como variáveis CSS (ou no `tailwind.config`, a depender da versão) — os valores exatos de cor abaixo são uma leitura aproximada da referência, ajustar ligeiramente se necessário para bom contraste (WCAG AA) em texto sobre fundo:

- **Cor primária (azul-petróleo/ciano):** tom próximo de `#0E8A94` (usar como `--color-primary`), com uma variação mais escura para hover/texto (`#0B6E76`) e uma mais clara para fundos suaves (`#E3F4F5`).
- **Cor de destaque (magenta/pink):** tom próximo de `#E6197A` (`--color-accent`), com variação mais escura para hover (`#C21467`).
- **Neutros:** texto principal quase preto (`#1A1A1E`), texto secundário cinza-escuro (`#5B5B63`), fundo padrão branco ou cinza muito claro (`#FAFAFA`), bordas em cinza claro (`#E5E5EA`).
- **Fundo de destaque (telas de login/institucionais):** gradiente suave lilás-rosado claro (`#F4EEF3` → `#ECE7F0`), como na referência — usar com moderação, não em toda a aplicação (o sistema é usado no dia a dia por professores, então as telas de trabalho — listagens, formulários — devem ser predominantemente neutras/brancas, para não cansar; reservar o gradiente para a tela de login e talvez o cabeçalho do dashboard).
- **Tipografia:** fonte sans-serif geométrica e em peso forte para títulos (ex.: Poppins ou Inter, pesos 600-700), peso regular/medium para texto de corpo. Carregar via `@fontsource` ou Google Fonts.
- **Formas:** botões em pílula (`border-radius` total/`rounded-full`), cards com cantos arredondados moderados (`rounded-lg`/`rounded-xl`) e uma barra de destaque colorida na base ou lateral (usar a cor primária ou de destaque, alternando conforme o contexto).
- **Botões:** primário sólido (cor de destaque, texto branco), secundário sólido (cor primária, texto branco), terciário outline (borda colorida, fundo transparente). Todos em pílula, com um leve efeito de hover (escurecer a cor).

Documentar esses tokens num arquivo `src/styles/tokens.css` (ou equivalente à ferramenta de estilização escolhida), com comentários explicando o que é o quê, para que as etapas seguintes (e outras pessoas) reaproveitem sem redefinir cores soltas pelo código.

### 4. Componentes-base (`src/components/`)

Construir, com Storybook **não** é necessário para este alpha — apenas os componentes React puros, usados pelas telas das próximas etapas:

- `Button` (variantes primário/secundário/outline, tamanhos, estado de loading e disabled).
- `Input` / `Field` (label, texto de erro, estado de foco/erro visualmente marcado com a cor de destaque).
- `Card` (com a barra de destaque na base/lateral, conforme a referência).
- `PageHeader` (título da página + ação principal, ex.: botão "Nova sala").
- `Table` ou `List` simples, para as listagens das próximas etapas (colunas configuráveis, estado vazio com mensagem amigável, estado de carregamento).
- `Spinner`/estado de carregamento reutilizável.
- `Toast`/notificação simples de sucesso e erro (pode ser uma implementação própria mínima, sem lib externa, já que a decisão foi não usar libs de cache/estado — mas uma lib leve só de toast, tipo `react-hot-toast`, é aceitável se o agente preferir; documentar a escolha).

### 5. Cliente HTTP (`src/lib/api.ts`)

Instância do Axios com `baseURL` vinda de `import.meta.env.VITE_API_BASE_URL`. Preparar (mas não implementar o conteúdo ainda, que é da Etapa 02) um ponto de extensão para interceptor de autenticação (anexar o token JWT no header, e tratar 401 redirecionando para o login).

## Critérios de aceite

- `npm run dev` sobe o projeto sem erros, com uma página inicial simples usando pelo menos `Button` e `Card` para validar visualmente os tokens (pode ser uma página de "showcase" temporária, removida ou substituída na Etapa 02).
- Os tokens de cor e tipografia estão centralizados (nenhuma cor "mágica" solta nos componentes desta etapa).
- `npm run build` gera o build de produção sem erros.

## Fora de escopo

Autenticação de verdade, rotas de negócio, chamadas reais à API (isso começa na Etapa 02).
