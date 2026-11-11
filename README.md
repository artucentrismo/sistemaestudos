# Ciclo de Estudos

Aplicação web gratuita de ciclo de estudos para o ENEM, com experiência otimizada para iPad e celular.

## Recursos do Ciclo
- Ciclo de matérias em blocos de 15 minutos, retomando de onde parou
- Blocos com 1 a 3 assuntos para orientar filtros de questões
- Registro de questões, metas, calendário, níveis e conquistas
- Redação com competências do ENEM
- Preferência de aparência: claro, escuro ou automático

## Contas e sincronização
- Cadastro, login, logout e recuperação de senha via Supabase Auth
- Sincronização do estado do Ciclo para uma conta individual
- Dados privados por padrão, protegidos por Row Level Security (RLS)
- Migração inicial dos dados locais para a nuvem e resolução de conflitos
- A chave publishable do Supabase é usada no navegador; nenhuma chave service-role/secret deve ser publicada

## Anki integrado
- Baralhos privados por usuário
- Notas Básicas, Básicas e reverso, e Cloze (omissão com vários cartões gerados por lacuna)
- Tags e busca
- Revisões Again / Hard / Good / Easy com FSRS-7
- Prévia do próximo agendamento, histórico de revisões e estatísticas básicas
- Importação/exportação TSV
- Suspensão e exclusão de cartões
- Migração manual dos cards antigos armazenados neste aparelho

## Desenvolvimento
O projeto usa HTML, CSS e JavaScript nativo, sem etapa de build. Os módulos em `js/` são carregados como ES modules.

Para desenvolvimento local, sirva a pasta por um servidor HTTP local (não abra diretamente via `file://`, pois os módulos ES e o Supabase precisam de origem HTTP/HTTPS).

## Supabase
Projeto: `ciclo-estudos`
- Região: `sa-east-1` (São Paulo)
- Project ref: `bjcmbzirgronavynbknh`
- URL: `https://bjcmbzirgronavynbknh.supabase.co`
- Plano criado: Free

O snapshot de schema está em `supabase/schema.sql`. Para recriar o banco em outro projeto usando Supabase CLI, aplique os arquivos de `supabase/migrations/` em ordem cronológica; o primeiro arquivo já cria o schema inicial. Não aplique o snapshot separadamente antes das migrações.

### Configuração obrigatória de autenticação
No Supabase Dashboard, abra **Authentication → URL Configuration** e configure:

- Site URL: `https://artucentrismo.github.io/sistemaestudos/`
- Redirect URLs: `https://artucentrismo.github.io/sistemaestudos/` e `https://artucentrismo.github.io/sistemaestudos/**`

Confirme que a confirmação de e-mail está habilitada. Para envio confiável de e-mails em produção, configure um SMTP próprio nas configurações de Auth. A recuperação de senha usa a mesma URL do GitHub Pages.

### Aplicar o banco
O schema inicial e as quatro migrações seguintes já foram aplicados ao projeto Supabase conectado. Para outro ambiente, use a pasta de migrações em ordem cronológica.

## Publicação
O GitHub Pages da versão atual continua apontando para a branch `main`. O trabalho novo está isolado em `feat/accounts-anki-foundation` e na PR #1. Só publique depois de configurar as URLs de autenticação e concluir os testes de cadastro, login, recuperação, sincronização e isolamento de duas contas.

## Limitações conhecidas / próximos incrementos
O Anki atual é uma implementação própria com FSRS-7 e cobre o fluxo principal de baralhos, notas, revisão e TSV. Ainda não é uma reprodução integral do Anki Desktop: tipos de nota e templates totalmente customizáveis, editor rico com mídia/áudio/LaTeX, limites diários avançados, estatísticas detalhadas e compatibilidade `.apkg` precisam de etapas próprias. Não importe material importante sem manter uma cópia de segurança.

Os cards antigos ficam no armazenamento local até que a pessoa use **Migrar cards antigos deste aparelho** no Anki novo.
