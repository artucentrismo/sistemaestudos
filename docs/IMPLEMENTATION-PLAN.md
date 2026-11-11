# Ciclo — plano de evolução e estado da implementação

## Decisões de produto
- Cada estudante tem uma conta individual.
- Dados do Ciclo, redações, metas, histórico e baralhos são privados por padrão.
- Não há compartilhamento de baralhos nesta primeira versão.
- O Anki é uma implementação própria inspirada no fluxo do Anki, com FSRS-7.

## Arquitetura
- Frontend: HTML/CSS/JavaScript modular, hospedado no GitHub Pages.
- Identidade e banco: Supabase Auth + PostgreSQL.
- Segurança: RLS nas tabelas públicas; chave publishable no navegador; nenhuma chave secreta no repositório.
- Estado do Ciclo: armazenamento local com sincronização por conta e resolução de conflito.
- Anki: baralhos, notas, cartões, histórico append-only de revisões e agendamento FSRS-7 via ts-fsrs v6.

## Concluído nesta branch
- Projeto Supabase `ciclo-estudos` criado em `sa-east-1`, plano Free.
- Schema inicial aplicado: profiles, user_app_state, anki_decks, anki_note_types, anki_notes, anki_cards, anki_review_logs.
- RLS habilitado nas sete tabelas e políticas de isolamento por user_id.
- Integridade referencial composta para impedir que registros de uma conta apontem para baralhos/notas/cartões de outra conta.
- Permissão EXECUTE da função SECURITY DEFINER do trigger revogada para os papéis de API; Security Advisor sem alertas depois da correção.
- Cliente Supabase, cadastro/login/logout, recuperação de senha e sincronização privada.
- Interface de conta adicionada ao app; migração inicial do localStorage e tratamento de conflitos.
- Tela de Anki integrada: baralhos, notas básicas e cloze, tags, busca, revisão FSRS-7, suspensão, TSV e estatísticas básicas.
- Migração manual dos cards locais antigos para um baralho cloud.
- Tema claro/escuro/automático persistido no estado local e sincronizável.

## Pendências antes de publicar em produção
1. No Supabase Dashboard, configurar Authentication → URL Configuration:
   - Site URL: `https://artucentrismo.github.io/sistemaestudos/`
   - Redirect URLs: `https://artucentrismo.github.io/sistemaestudos/` e `https://artucentrismo.github.io/sistemaestudos/**`
2. Confirmar fluxo de e-mail e, se necessário, configurar SMTP próprio.
3. Testar cadastro, confirmação de e-mail, login, logout e recuperação de senha no domínio GitHub Pages.
4. Testar isolamento com duas contas reais e verificar que uma não lê nem altera registros da outra.
5. Testar sincronização offline/online, conflito entre local e nuvem e troca de conta no mesmo aparelho.
6. Testar agendamento FSRS em aprendizagem, revisão e lapsos; validar relógio e fuso.
7. Fazer revisão funcional em desktop, iPad e celular.
8. Atualizar a PR #1 e só então fazer merge na branch publicada.

## Escopo Anki ainda não coberto
A tela atual entrega o núcleo de estudo e revisão, mas não é paridade total com o Anki Desktop. Ficam para incrementos seguintes:
- Tipos de nota customizáveis e editor de templates.
- Editor rico, imagens, áudio, LaTeX e armazenamento de mídia.
- Limites diários configuráveis, enterro por nota e subbaralhos hierárquicos reais.
- Estatísticas avançadas e exportação/importação `.apkg`.
- Treino de parâmetros FSRS por histórico individual.

## Regras de segurança e dados
- Nunca publicar `service_role` ou `sb_secret`.
- Manter RLS habilitado em toda tabela acessível pelo cliente.
- Não substituir o estado da nuvem silenciosamente quando houver dados locais divergentes.
- Dados de redação, progresso e baralhos permanecem privados.
- Manter backup antes de migrações e importações em lote.
