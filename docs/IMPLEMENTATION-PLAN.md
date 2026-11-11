# SistemaEstudos — arquitetura e estado do projeto

## Decisões de produto
- O SistemaEstudos é um projeto independente.
- Cada navegador mantém seus próprios dados de estudo.
- Não há contas de usuário, autenticação, banco de dados remoto ou sincronização entre dispositivos.
- O Anki integrado ao projeto também mantém seus dados localmente.

## Arquitetura atual
- Frontend: HTML, CSS e JavaScript nativo.
- Publicação: GitHub Pages.
- Persistência: exclusivamente `localStorage` do navegador.
- Backups: exportação e importação de arquivos JSON pelo próprio aplicativo.
- Repetição espaçada do Anki: biblioteca pública carregada via CDN para fornecer a lógica FSRS; os dados dos cartões e revisões permanecem no navegador.

## Regras de independência
- Este projeto não deve importar, chamar ou compartilhar código com o Estudaarthur.
- Este projeto não deve conter cliente, configuração, credenciais, autenticação ou sincronização do Supabase.
- Alterações em outro repositório não devem modificar este projeto, e vice-versa.

## Limitações
- Os dados não são sincronizados entre aparelhos ou navegadores.
- Limpar os dados do site pode apagar o progresso local. Recomenda-se exportar backups regularmente.
- A biblioteca FSRS carregada via CDN exige conexão com a internet na inicialização do Anki.

## Publicação
Site: https://artucentrismo.github.io/sistemaestudos/
