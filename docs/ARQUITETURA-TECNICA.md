# EstudosFlix — Arquitetura Técnica v3.0

## Decisão arquitetural

Uma aplicação WebApp responsiva, gratuita, estática e local-first.

- React + TypeScript + Vite.
- PWA opcional, com cache de recursos.
- IndexedDB para dados locais.
- GitHub Pages para distribuição dos arquivos estáticos.
- Sem backend, banco remoto, contas online, APIs pagas, nuvem, telemetria ou sincronização.

## Camadas

1. Interface: navegação, formulários, acessibilidade e responsividade.
2. Aplicação: iniciar/pausar/retomar blocos, registrar visitas, avançar ciclos, criar/revisar flashcards e exportar/importar backup.
3. Domínio: ciclos, métricas, retenção, flashcards e regras pedagógicas puras.
4. Persistência: repositórios IndexedDB e configurações.
5. Plataforma: PWA, service worker e publicação estática.

## Modelo principal

- **Discipline:** nome e tempo recomendado personalizado.
- **Notebook:** ID permanente, disciplina, nome e posição de exibição.
- **GeneralStudyCycleProgress:** ordem das disciplinas, matéria atual, tempo real acumulado por matéria e voltas gerais concluídas.
- **StudyCycleProgress:** IDs dos cadernos, posição atual, IDs visitados na passada, contador e histórico de passadas.
- **StudyBlock:** disciplina/caderno, tempo acumulado, estado, questão atual e tempo já creditado ao ciclo geral.
- **StudySession:** período de estudo, duração líquida e cadernos visitados.
- **SessionSegment:** evidência por caderno (questões, acertos e resposta/dificuldade).
- **Flashcard:** caderno de origem, frente, verso, espaçamento, estado de arquivamento e reativações.
- **FlashcardReview:** histórico de cada revisão.
- **AppSettings:** tema, limites, ciclos e preferências.

## Compatibilidade legada

Entidades antigas de assuntos/subassuntos e vínculos podem permanecer armazenadas para não quebrar backups existentes. Não são exigidas pela interface principal. Registros antigos de desempenho e flashcards são migrados para cadernos somente quando o vínculo é inequívoco; caso contrário, são preservados sem atribuição inventada.

## Ciclo e consistência

- A identidade do caderno é seu ID permanente; a posição não participa de métricas.
- Reordenação reconcilia o ciclo sem alterar estatísticas.
- Cadernos adicionados entram como não visitados na passada atual.
- Cadernos removidos são retirados da sequência, enquanto registros históricos permanecem no armazenamento.
- Pausa não registra visita. Conclusão automática ou encerramento manual registra visita.
- A passada é concluída quando todos os cadernos ativos foram visitados.

## Estatística

Domínio, retenção, confiança, tendência e indicadores de flashcard são calculados no nível do caderno. Disciplina consolida por média ponderada pelas questões respondidas. Amostras pequenas recebem confiança insuficiente/baixa e teto de domínio.

## Sandbox de desenvolvimento

Quando `import.meta.env.DEV` é verdadeiro:
- IndexedDB usa o nome `estudosflix-local-sandbox`.
- O bloco de 15 minutos é acelerado para 15 segundos.
- A alocação de tempo do ciclo geral é escalada na mesma proporção.

A versão de produção usa `estudosflix-local` e blocos de 900 segundos. Os dados do sandbox não são misturados à base real.

## Backup

O backup inclui disciplinas, cadernos, sessões, segmentos, blocos, flashcards, revisões e configurações dos ciclos geral e por disciplina. A importação mantém compatibilidade com versões anteriores e valida referências antes de mesclar.
