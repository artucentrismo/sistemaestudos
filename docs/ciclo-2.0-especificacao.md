# Ciclo 2.0 — especificação consolidada de produto e UX

Status: aprovada pelo responsável pelo produto e baseada nas avaliações do pedagogo e da profissional de UX.

## Princípio-mestre

O Ciclo é um copiloto de aprendizagem, não um planner, agenda, dashboard ou ERP de estudos. A complexidade permanece no motor; a interface reduz decisões e responde: o que estudar, por quê, como estou evoluindo e o que fazer depois.

A recomendação é forte, mas opcional. O estudante pode seguir a próxima ação ou escolher outro assunto.

## Navegação

### Desktop
Barra lateral fixa com seis destinos:
1. Início
2. Ciclo
3. Revisão (módulo interno Anki)
4. Redação
5. Relatórios
6. Ajustes

### Mobile
Navegação inferior com Início, Ciclo, Revisão e Mais. O menu Mais contém Redação, Relatórios e Ajustes.

## Início

- A próxima sessão domina a primeira dobra e apresenta matéria, assunto, duração sugerida, quantidade de questões e CTA Começar agora.
- Permitir escolher outra matéria sem competir com a recomendação.
- Segundo plano: meta diária (tempo e questões quando habilitadas), revisões pendentes, uma frase de situação atual e até três prioridades.
- Mostrar nome e objetivo do estudante quando disponíveis.
- Primeiro acesso sem matérias: orientar a criação do primeiro ciclo, sem diagnóstico.
- Sessão em rascunho: oferecer retomada.
- Dados ilustrativos de wireframes nunca podem ser exibidos como se fossem dados reais.

## Ciclo

- Funciona como GPS de estudos: agora, próximo e depois.
- Mostrar sessão atual, fila curta de próximas sessões e assuntos seguintes.
- Estrutura completa e informações operacionais ficam em seção expansível.
- Vocabulário principal: matéria, assunto e progresso.
- Preservar estrutura hierárquica e ponteiros existentes nos dados; ocultar a complexidade no uso cotidiano.

## Revisão (Anki)

- Renomear visualmente Anki para Revisão, mantendo identificadores e módulo internos.
- A ação principal é Revisar agora.
- Exibir contagens reais fornecidas pelo serviço de revisão. Não inventar números de cartões aprendendo ou maduros quando a fonte não os fornece.
- Editor, baralhos, subbaralhos, importação, exportação e gerenciamento são ferramentas secundárias.
- Preservar FSRS-7 e histórico de revisão.

## Redação

- Priorizar desempenho geral, competência/ponto de melhoria e próxima ação.
- Nova redação deve ser fácil de encontrar.
- Histórico, comparações, filtros e gerenciamento podem ficar em áreas expansíveis.
- Nunca inventar notas ou competências ausentes.

## Relatórios

- Modo Aluno é o padrão: diagnóstico em linguagem comum, pontos fortes, assuntos que precisam de atenção e prioridade atual.
- Análise Avançada é uma seção expansível, não uma aba adicional.
- Métricas técnicas continuam disponíveis: Maturidade, Learning Score, Retenção, Resiliência, Velocidade, Robustez/Fragilidade, Consistência e Domínio.
- Estado sem dados: “Seu diagnóstico ainda está sendo construído.”
- Estado em formação: explicar que a amostra ainda é insuficiente.
- Estado calculado: apresentar interpretação compreensível.
- Dados ausentes nunca viram zero.
- Assunto dominado requer domínio >=80, pelo menos três passagens e retenção aceitável. Se retenção ainda não puder ser medida, não declarar domínio confirmado.

## Sessão de estudo

- Tela focada em matéria, assunto, cronômetro, acertos e erros.
- Controles grandes e simples para registrar acerto/erro.
- XP, níveis, conquistas e relatórios não aparecem durante a sessão.
- Classificação de dificuldade fica em Mais opções.
- Preservar cronômetro, pausa, recuperação de rascunho, marcação automática de assunto estudado ao registrar questões e prevenção de registros duplicados.
- Após 10 minutos sem interação, perguntar se o estudante continua. Pausar automaticamente após 60 segundos sem resposta.
- Finalização grava o histórico definitivo e mostra resumo da sessão.

## Estratégia e recomendações pedagógicas

- Padrão sem prova próxima: revisão pendente 30%, baixo domínio 25%, erros recentes 20%, tempo sem contato 15%, importância da matéria 5%, proximidade da prova 5%.
- Com data de prova: proximidade da prova 30%, revisão pendente 25%, domínio 20%, erros 15%, tempo sem contato 10%.
- Recalcular pesos proporcionalmente entre fatores realmente disponíveis; dados ausentes não recebem pontuação zero nem distorcem a recomendação.
- A recomendação não expõe pontuações internas.
- Padrões de estratégia: estudo teórico sem prática sugere mais questões; muitos erros repetidos sugerem revisar teoria; perda após intervalo sugere flashcards/revisão; estagnação prolongada sugere voltar aos fundamentos.
- Duração sugerida adaptativa, normalmente entre 10 e 40 minutos, sem limite rígido.
- Metas não cumpridas não geram punição. Falhas recorrentes podem sugerir adequação da meta à rotina.

## Gamificação

- XP, nível e sequência permanecem secundários.
- Ocultar/reduzir escudos, multiplicadores e excesso de conquistas.
- Progresso real de domínio e retenção tem prioridade sobre pontos.

## Sistema visual e acessibilidade

- Primária #0F2744; sucesso #2E7D5B; atenção #D9A441; crítico #C65353; informação #4E7A99.
- Claro: fundo #F7F8FA, superfície #FFFFFF, texto #1D2939.
- Escuro: fundo #0B1220, superfície #131C2B, texto #F3F5F7.
- Tipografia: Manrope em títulos e Inter no corpo, com alternativas de sistema.
- Unidade base 8px; espaçamentos 8, 16, 24, 32, 48px; cartões com raio de 16px e borda discreta.
- Responsividade: mobile com uma ação por vez e navegação inferior; tablet híbrido; desktop com sidebar e duas colunas quando útil.
- Meta WCAG AA: contraste 4.5:1, navegação por teclado, foco visível, labels reais, fonte mínima 16px e alvos táteis de pelo menos 44px. Não depender apenas de cor.

## Prioridade de implementação

1. Experiência central: sistema visual, Início, sessão, Ciclo e navegação responsiva.
2. Ferramentas: Revisão, Redação e Relatórios no Modo Aluno.
3. Refinamento: Análise Avançada, recomendações estratégicas, gamificação secundária e ajustes.
4. Validação em desktop e celular.

## Testes obrigatórios

1. Primeiro acesso sem matérias, histórico ou metas.
2. Estudante com ciclo em andamento.
3. Estudante com dificuldades e revisões pendentes.
4. Estudante com histórico suficiente para relatórios.
5. Encontrar o que estudar em menos de cinco segundos, iniciar sessão, registrar questões e entender a próxima ação após finalizar.

## Preservação técnica

- Não alterar fórmulas oficiais do motor nesta etapa de redesign.
- Não apagar histórico, cadernos, cartões, redações ou preferências.
- Preservar compatibilidade com localStorage e backups existentes.
- Não introduzir serviços pagos, APIs pagas ou dependência de nuvem.
- Não remover funções importantes sem justificativa e validação.
