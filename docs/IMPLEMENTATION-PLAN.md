# Ciclo — plano de evolução

## Decisões de produto
- Cada estudante terá uma conta individual.
- Dados do Ciclo, redações, metas, histórico e baralhos são privados por padrão.
- Não haverá baralhos públicos ou compartilhamento nesta primeira versão.
- O Anki terá notas, tipos de nota, modelos de cartão, baralhos, tags, busca, revisão, estatísticas, importação/exportação e FSRS.
- A versão publicada atual deve continuar utilizável durante a migração.

## Arquitetura alvo
- Frontend: HTML/CSS/JavaScript modular, mantendo GitHub Pages.
- Identidade e banco: Supabase Auth + PostgreSQL.
- Segurança: RLS em todas as tabelas acessíveis pelo navegador; nunca distribuir chaves secretas.
- Estado do Ciclo: migração gradual do localStorage para user_app_state, com backup e resolução explícita de conflitos.
- Anki: decks, note types, notes, cards e review logs; agendamento FSRS-7 via ts-fsrs.
- Mídia: Supabase Storage privado, com políticas por usuário, em etapa posterior.

## Etapas

### 0. Fundação (branch atual)
- Criar branch isolada.
- Preparar cliente Supabase e funções de autenticação.
- Preparar sincronização privada do estado atual do Ciclo.
- Adicionar adaptador FSRS-7 sem substituir ainda o agendador antigo.
- Reforçar integridade referencial para impedir referências cruzadas entre contas.

### 1. Backend
- Selecionar/criar projeto Supabase e configurar URL/chave publishable.
- Aplicar schema e migrations.
- Testar RLS com dois usuários: cada um só lê e altera seus próprios registros.
- Configurar confirmação de e-mail, recuperação de senha e proteções antiabuso.

### 2. Migração segura do Ciclo
- Implementar cadastro/login/logout e recuperação de senha.
- Definir se haverá modo local para visitantes ou se login será obrigatório.
- Ao entrar pela primeira vez, oferecer importação dos dados locais para a conta.
- Não sobrescrever dados da nuvem automaticamente: comparar timestamps e pedir decisão em caso de conflito.
- Sincronizar redações e progresso somente após autenticação.

### 3. Anki completo
- Baralhos e sub-baralhos, contagens e limites diários.
- Tipos de nota configuráveis, campos e modelos de cartão.
- Cartões Basic, Basic (and reversed), Cloze e cartões gerados por modelos.
- Editor com formatação, imagens/áudio e LaTeX.
- Tags, busca, suspensão, enterro, edição em lote e navegador de cartões.
- Sessão com Again / Hard / Good / Easy, prévia dos intervalos e atalhos.
- FSRS-7, retenção configurável, passos de aprendizagem/reaprendizagem e histórico imutável.
- Estatísticas por período, baralho, matéria e estado de aprendizagem.
- Formato próprio de importação/exportação primeiro; compatibilidade .apkg em etapa dedicada.

### 4. Qualidade e publicação
- Testes de migração local → nuvem e isolamento entre contas.
- Testes FSRS com relógio controlado e estados de aprendizagem/reaprendizagem.
- Acessibilidade, responsividade e uso em iPad.
- Revisão dos Security/Performance Advisors do Supabase.
- Publicação por pull request após validação; não publicar mudanças incompletas na branch principal.

## Estado atual
- A aplicação existente é um único index.html e usa localStorage.
- O repositório já contém supabase/schema.sql com tabelas de perfis, estado do app e dados do Anki.
- Nenhum projeto Supabase está conectado/criado até esta etapa.
- Os módulos em js/ são uma fundação reutilizável; a integração visual no index.html ainda precisa ser feita.
