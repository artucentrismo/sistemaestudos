# EstudosFlix — Registro de decisões e validações

## Decisões oficiais do produto

- Nome público do método: **Método EstudosFlix**.
- Criado por **Artucentrismo**.
- Hierarquia principal: Disciplina → Cadernos → Flashcards.
- Caderno é a unidade primária de aprendizagem e estatística.
- Disciplina agrupa cadernos e define tempo recomendado personalizado.
- Ciclo não é entidade de cadastro: é visualização do ciclo geral e dos ciclos de cadernos.
- Navegação: Início, Disciplinas, Ciclo, Revisões e Evolução.
- O ciclo geral é organizado em blocos por matéria, com tempo personalizado por disciplina.
- O planejamento não gera atraso, dívida ou punição.
- Bloco de referência: 15 minutos líquidos; pausa parcial preserva tempo e posição.
- Encerramento manual antecipado registra tempo real e visita, mas não é bloco completo de 15 minutos.
- Passada completa quando todos os cadernos ativos da disciplina foram visitados ao menos uma vez.
- IDs permanentes de cadernos preservam estatísticas em reordenação.
- Flashcards são vinculados ao caderno e podem nascer de erro, chute ou dúvida.
- Assuntos legados podem permanecer no banco para compatibilidade, mas não na experiência principal.
- Ambiente de desenvolvimento usa sandbox IndexedDB e timer acelerado; não mistura dados reais.

## Decisões estatísticas

- Domínio, retenção, confiança, tendência, dificuldades e flashcards são calculados por caderno.
- Disciplina consolida resultados por média ponderada pelo número de questões respondidas.
- Confiança: <20 insuficiente; 20–49 baixa; 50–99 média; ≥100 alta.
- Teto de domínio: 70% com <20 questões; 85% entre 20 e 49; até 100% com ≥50.
- Ausência de evidência não equivale a domínio.
- Índice de dificuldade de flashcards = cards ativos / questões × 100.
- Taxa de resolução = cards já arquivados / cards criados × 100.
- Taxa de reativação = reativações / cards já arquivados × 100.

## Validações empíricas futuras

- Calibrar suavização do domínio e tetos com dados reais.
- Validar limiares de confiança e retenção com amostras maiores.
- Avaliar se as faixas do índice de dificuldade dos flashcards predizem gargalos.
- Testar a experiência de continuidade em Safari/iPadOS e dispositivos físicos.
- Revisar recomendações e gargalos após coleta de uso real.
- Confirmar que backup/importação mantém integridade de IDs e histórico após reordenação, arquivamento e exclusão.
