# Ciclo de Estudos

Aplicação web gratuita de ciclo de estudos para o ENEM, otimizada para celular e iPad.

## Versão básica local-first

Esta versão não exige cadastro, login, banco de dados ou serviço pago. O Ciclo e o Anki salvam os dados no armazenamento local (\`localStorage\`) do navegador. Cada pessoa usa seus próprios dados no próprio navegador; não há sincronização entre dispositivos nem compartilhamento de progresso entre amigos.

**Importante:** o site do GitHub Pages é público e pode ser aberto por qualquer pessoa com o link. O que fica local é o progresso de cada navegador, não o acesso ao site. Não use este modo para guardar dados em computadores compartilhados. Baixe backups regularmente em Ajustes → Dados neste aparelho.

## Recursos

- Ciclo de matérias em blocos de 15 minutos
- Registro de acertos, erros, metas, calendário e redações
- Escore adaptativo de urgência por matéria
- Ajuste de tempo por matéria ao completar cada volta
- Reforço de blocos com desempenho crítico e ocultação temporária de blocos dominados
- XP, níveis, sequência, escudos de sequência e missão de retorno
- Tema claro, escuro ou automático
- Anki local com baralhos hierárquicos e subbaralhos, notas Básicas, reversas e Cloze
- Editor do Anki com campos separados para frente e verso, inserção de lacunas Cloze, tags, busca, suspensão, estatísticas básicas e importação/exportação TSV
- Organização em árvore com subbaralhos ilimitados; selecionar um baralho principal inclui automaticamente seus subbaralhos nas notas, estatísticas e revisões
- Backup e restauração dos dados do Ciclo e do Anki em JSON

## Dados e privacidade

- Todos os dados de estudo ficam exclusivamente no `localStorage` do navegador. O aplicativo não possui backend, banco de dados remoto, login ou sincronização.
- Limpar os dados do site, trocar de navegador ou de aparelho pode apagar ou deixar os dados inacessíveis.
- Use **Ajustes → Baixar backup completo** antes de trocar de dispositivo ou limpar o navegador.
- **Restaurar backup** substitui os dados locais atuais pelos dados do arquivo escolhido.

## Limitações desta versão

- Não há contas de usuário, login, sincronização em nuvem, API de dados ou compartilhamento de progresso entre pessoas.
- O Anki ainda não importa/exporta \`.apkg\`; por enquanto, oferece TSV.
- O agendador FSRS-7 é código de uma biblioteca pública carregada via CDN; essa dependência fornece apenas a lógica de repetição espaçada. Dados de estudo não são enviados para ela. A primeira inicialização do Anki exige internet.
- A evolução visual do Canto de Estudos e a trilha de checkpoints ainda serão ampliadas em versões futuras.
- Não há paridade completa com Anki Desktop (tipos de nota customizáveis, mídia/áudio/LaTeX, estatísticas avançadas e todos os recursos de agendamento).

## Desenvolvimento

O projeto usa HTML, CSS e JavaScript nativo, sem etapa de build. Os módulos em \`js/\` são carregados como ES modules.

Para testar localmente, sirva a pasta por HTTP (por exemplo, com a extensão Live Server ou \`python -m http.server\`). Não abra \`index.html\` diretamente com \`file://\`, pois os módulos ES precisam de origem HTTP/HTTPS.

## Publicação

Site: https://artucentrismo.github.io/sistemaestudos/

A hospedagem estática do GitHub Pages não exige um servidor próprio. Como o repositório é público, qualquer pessoa pode acessar o site; cada navegador mantém seus próprios dados locais.
