# Requisitos pedagógicos — Método EstudosFlix

## Conceitos oficiais

- **Disciplina:** agrupador de cadernos e unidade de alocação do tempo recomendado.
- **Caderno:** unidade operacional e estatística primária de aprendizagem.
- **Bloco:** até 15 minutos líquidos de estudo contínuo no mesmo caderno; ao completar 15 minutos, o sistema pode avançar automaticamente.
- **Ciclo geral:** sequência de matérias, cada uma com tempo recomendado personalizado.
- **Ciclo de cadernos:** sequência ordenada de cadernos ativos dentro de uma disciplina.
- **Visita válida:** atividade encerrada intencionalmente ou bloco de 15 minutos concluído.
- **Passada:** visita a todos os cadernos ativos de uma disciplina ao menos uma vez desde a passada anterior.
- **Sessão:** período de estudo que pode conter mais de um bloco, caderno ou matéria.
- **Exposição válida:** evidência de desempenho baseada em questões; não se confunde com tempo, bloco, ciclo ou passada.

## RF-GERAL-001 — Ciclo geral por matéria

Cada disciplina possui tempo recomendado individual, em minutos. O sistema acumula tempo líquido real na matéria atual e avança para a próxima quando o tempo recomendado daquela matéria é alcançado. Se o estudante parar antes, a posição e o tempo acumulado permanecem para a retomada. Não existe dívida por meta não cumprida.

## RF-CICLO-001 — Ciclo de cadernos

A ordem dos cadernos define a sequência de execução. A identidade do caderno é seu ID permanente; a posição é apenas apresentação. O sistema seleciona automaticamente o próximo caderno não visitado na passada atual.

## RF-BLOCO-015 — Bloco e retomada parcial

O bloco de referência tem 15 minutos líquidos no mesmo caderno.
- Ao completar 15 minutos, registrar bloco concluído e avançar.
- Se houver interrupção ou pausa antes dos 15 minutos, salvar tempo, caderno e posição da questão; retomar o tempo restante no mesmo caderno.
- Pausar não conclui visita, não avança o ciclo e não conta para a passada.
- O estudante pode encerrar manualmente a atividade antes de 15 minutos. Nesse caso, registrar o tempo real, encerrar o bloco como antecipado e avançar para o próximo caderno. Essa visita conta para a passada, mas não deve ser contabilizada como bloco completo de 15 minutos.

## RF-CICLO-002 — Conclusão da passada

Uma passada é concluída quando todos os cadernos ativos da disciplina foram visitados ao menos uma vez desde o início daquela passada. A duração de cada visita não é condição para a passada quando o estudante encerra manualmente a atividade.

Ao completar a última visita:
1. Incrementar o contador de passadas.
2. Registrar data inicial, data final e IDs dos cadernos percorridos.
3. Limpar a lista de visitas da passada atual.
4. Retornar ao primeiro caderno ativo.

Com quatro cadernos, uma sequência de visitas válidas 01 → 02 → 03 → 04 conclui a passada. O estudante não precisa fazer isso no mesmo dia.

## RF-CICLO-003 — Reordenação e alterações

- Preservar domínio, retenção, confiança, questões, passadas, histórico, flashcards e travas pelo ID permanente.
- Reordenar altera somente a próxima sequência de execução.
- Cadernos adicionados entram como não visitados na passada atual.
- Cadernos removidos deixam de ser exigidos na passada atual; registros históricos permanecem.
- Mudanças não devem apagar ou reiniciar o progresso sem ação explícita do estudante.

## RF-UX-001 — Separação entre configuração e visualização

Abas principais:
1. Início.
2. Disciplinas — cadastro/edição de matérias, tempo recomendado e cadernos.
3. Ciclo — visualização do ciclo geral e dos ciclos de cadernos, sem edição.
4. Revisões — flashcards por caderno.
5. Evolução — estatísticas e histórico por caderno, com consolidação por disciplina.

Assuntos não são entidade principal da experiência e não devem ser exigidos para cadastrar cadernos, registrar desempenho ou criar flashcards.

## RF-REE-001 — Revisões orientadas por erros

Ao registrar o resultado de uma questão, as opções são:
- Acertei com certeza.
- Acertei no chute.
- Acertei com dúvida.
- Errei.

Chute, dúvida e erro podem gerar flashcard automaticamente quando o estudante preencher pergunta e resposta. Todo card é vinculado ao caderno de origem. Acerto com certeza não gera card automaticamente.

## RF-ESTAT-001 — Confiança e domínio

Confiança:
- <20 questões: insuficiente.
- 20–49: baixa.
- 50–99: média.
- ≥100: alta.

Limites máximos do domínio exibido:
- <20 questões: 70%.
- 20–49 questões: 85%.
- ≥50 questões: 100%.

Domínio, retenção, tendência, travas e indicadores de flashcards são calculados no nível do caderno. A disciplina consolida domínio por média ponderada pelo número de questões respondidas. Não classificar domínio com evidência insuficiente.

## RF-TESTE-001 — Isolamento de testes

Testes acelerados não podem contaminar estatísticas reais. No ambiente de desenvolvimento, os blocos duram 15 segundos e usam um banco IndexedDB separado (sandbox). A publicação usa 15 minutos e o banco real. O sandbox não é ativado na versão de produção e seus registros não se misturam com o histórico real.

## Princípio inegociável

O sistema nunca deve gerar sensação de atraso. O estudante não perde o cronograma: continua do ponto em que parou.
