# EstudosFlix

**Seu GPS pedagógico para estudar por questões.**

O EstudosFlix é um WebApp responsivo, gratuito e multiplataforma para organização de estudos por ciclos de cadernos. Usa o **Método EstudosFlix**, criado por Artucentrismo, para reduzir o esforço de planejamento e apresentar sempre o próximo passo possível.

## Princípios

- Acessível por navegador em computadores, iPads e celulares.
- Aplicação estática, hospedável gratuitamente no GitHub Pages.
- Dados armazenados localmente no navegador com IndexedDB.
- Sem serviços pagos, contas online, nuvem, APIs externas, telemetria ou sincronização automática.
- Backup e importação manuais para transferir os dados entre dispositivos.
- Metas de tempo flexíveis: não há atraso, dívida ou punição por não cumprir o planejado.

## Como funciona

- **Início:** apresenta a matéria atual e o próximo caderno, além do tempo investido e das revisões.
- **Disciplinas e ciclo:** configura a ordem das matérias, a quantidade de cadernos por passagem e os cadernos dentro de cada disciplina.
- **Revisões:** organiza flashcards vinculados ao caderno de origem.
- **Evolução:** acompanha domínio, retenção, confiança, tendências, gargalos e histórico por caderno.

O ciclo geral trabalha em blocos por disciplina, definidos pela quantidade de cadernos escolhida pela pessoa. Cada caderno possui duração própria, configurável em múltiplos de cinco minutos (15 minutos por padrão). A fila é circular e contínua: com cinco cadernos e limite quatro, a primeira passagem percorre 1–2–3–4; a próxima começa no 5 e segue 1–2–3. Se a pessoa interromper uma passagem, o próximo acesso retoma no caderno pendente. A quantidade é limitada aos cadernos disponíveis, sem repetição artificial.

Um bloco de referência dura 15 minutos. Pausar preserva o tempo e não conclui uma visita. O estudante também pode encerrar manualmente a atividade de um caderno antes dos 15 minutos; o tempo real é registrado e a visita pode contar para a passada. Uma passagem termina quando a quantidade configurada de cadernos distintos for concluída, limitada ao total disponível.

## Documentação

- [Método EstudosFlix](docs/METODO-ESTUDOSFLIX.md)
- [Especificação do produto](docs/ESPECIFICACAO-PRODUTO.md)
- [Arquitetura técnica](docs/ARQUITETURA-TECNICA.md)
- [Decisões e pontos de validação](docs/DECISOES-PENDENTES.md)
- [Requisitos pedagógicos do ciclo e dos blocos](docs/requisitos-blocos-15-minutos.md)
- [UX estruturada v3.0](docs/UX-ESTUDOSFLIX-v2.md)

## Stack e privacidade

React + TypeScript + Vite + PWA + IndexedDB. O GitHub Pages hospeda apenas os arquivos estáticos; não hospeda dados pessoais. Cada navegador mantém sua própria base local.

## Estado do projeto

A arquitetura v3 foi integrada à branch `main` pelo PR #4. Os testes automatizados e o build de produção passaram antes da integração. A publicação no GitHub Pages é automática; confirme a conclusão da ação de deploy antes de considerar a nova versão disponível publicamente.
