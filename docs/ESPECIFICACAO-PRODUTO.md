# EstudosFlix — Especificação do Produto v3.0

## 1. Visão do produto

O EstudosFlix é um WebApp responsivo, gratuito e multiplataforma para organizar estudos por ciclos de cadernos. Utiliza o **Método EstudosFlix**, criado por Artucentrismo, para reduzir o esforço de planejamento, registrar evidências de aprendizagem e indicar sempre um próximo passo possível.

**Promessa:** o aluno não perde o cronograma. Continua de onde parou.

## 2. Princípios inegociáveis

1. **Continuidade sem punição:** metas de tempo são referências, nunca obrigações; não existe atraso ou dívida de estudo.
2. **Caderno como unidade primária:** domínio, retenção, confiança, questões, passadas, tendências, gargalos e flashcards são analisados por caderno.
3. **Disciplina como agrupador:** consolida os resultados dos cadernos e define uma alocação de tempo personalizada.
4. **Passada por cobertura:** uma passada termina quando todos os cadernos ativos da disciplina foram visitados ao menos uma vez.
5. **Evidência antes de conclusão:** amostras pequenas não podem classificar um caderno como dominado.
6. **Recomendação explicável:** o sistema mostra por que recomenda um próximo caderno.
7. **Privacidade local:** dados pessoais e acadêmicos permanecem no dispositivo.

## 3. Estrutura de navegação

- **Início:** matéria atual, próximo caderno, tempo acumulado na matéria e revisões.
- **Disciplinas:** cadastro/edição de matérias, tempo recomendado e cadernos.
- **Ciclo:** visualização do ciclo geral por matéria e dos cadernos em cada disciplina; não é uma área de edição.
- **Revisões:** flashcards vinculados a cadernos.
- **Evolução:** estatísticas, gargalos, recomendações e histórico por caderno.

Assuntos e subassuntos legados podem permanecer no armazenamento para compatibilidade, mas não são entidades principais da experiência e não devem ser exigidos no cadastro ou estudo.

## 4. Modelo de aprendizagem

Disciplina → Cadernos → Flashcards.

A disciplina possui nome, tempo recomendado personalizado e posição configurável no ciclo geral. O caderno possui nome, posição de exibição e ID permanente. A posição pode mudar; o ID não muda e preserva todo o histórico.

## 5. Ciclo geral por matéria

O ciclo geral organiza blocos por matéria. Cada disciplina tem uma alocação individual de tempo, por exemplo 60 minutos para Constitucional e 60 minutos para Português.

- O sistema acumula tempo líquido real na matéria atual.
- Ao atingir a alocação recomendada, avança para a próxima matéria com cadernos.
- Se o aluno parar antes, o tempo acumulado permanece para a retomada.
- Concluir a última matéria reinicia a volta geral.
- Não há dívida, atraso, punição ou exigência de cumprir todas as alocações no mesmo dia.

## 6. Blocos, visitas e passadas

O bloco de referência é de 15 minutos líquidos no mesmo caderno.

- Completar 15 minutos conclui automaticamente o bloco e registra a visita.
- Pausar/interromper antes dos 15 minutos preserva o tempo e a posição, sem registrar visita concluída.
- O aluno pode encerrar manualmente a atividade antes dos 15 minutos. O tempo real é registrado, o bloco é marcado como encerrado antecipadamente e a visita conta para a passada.
- Uma passada termina quando todos os cadernos ativos da disciplina foram visitados.
- O sistema registra contador, início, fim e IDs dos cadernos percorridos.
- Após concluir, a sequência retorna ao primeiro caderno ativo.

## 7. Revisões e flashcards

O flashcard pertence diretamente ao caderno. Ao registrar uma questão, o aluno informa:
- Acertei com certeza.
- Acertei no chute.
- Acertei com dúvida.
- Errei.

Chute, dúvida ou erro geram flashcard quando pergunta e resposta forem registradas. Acerto com certeza não gera card automaticamente. Cards podem ser arquivados e reativados; o histórico de reativação é preservado.

## 8. Evolução e estatística

Indicadores por caderno:
- Domínio e retenção.
- Confiança da amostra.
- Questões respondidas.
- Passadas completas.
- Tendência.
- Dificuldades persistentes.
- Flashcards ativos, arquivados, reativados e índice de dificuldade.

Confiança:
- Menos de 20 questões: insuficiente.
- 20–49: baixa.
- 50–99: média.
- 100 ou mais: alta.

Teto de domínio exibido:
- Menos de 20 questões: 70%.
- 20–49: 85%.
- 50 ou mais: 100%.

A disciplina consolida domínio por média ponderada pelo número de questões respondidas. Ausência de evidência nunca significa domínio saudável.

## 9. Plataforma, custo e privacidade

React + TypeScript + Vite + PWA + IndexedDB. GitHub Pages hospeda apenas arquivos estáticos. Não há backend, contas online, banco remoto, sincronização, telemetria, IA ou API paga.

O ambiente de desenvolvimento utiliza IndexedDB separado e blocos acelerados de 15 segundos. A versão publicada utiliza 15 minutos e a base real. Backup/importação manuais preservam ciclos e histórico.
