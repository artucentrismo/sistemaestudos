# Experiência do estudante — fase de abstração

## Diretriz aprovada
Simplificar e melhorar o que já existe, preservando funções úteis. O escopo abrange todas as abas e funções. A complexidade dos cálculos deve ficar no motor; a interface deve explicar o que o estudante precisa saber e fazer.

## Organização principal
- **Início:** responde como o estudante está, o que merece atenção, sua maior evolução, próxima conquista e próximo estudo.
- **Ciclo:** mostra a ordem das matérias, a volta atual e o próximo caderno. Não duplica o diagnóstico de aprendizagem.
- **Anki:** permanece como espaço de cartões, baralhos, subbaralhos e revisões espaçadas.
- **Redação:** permanece como espaço de registro, notas e acompanhamento das competências.
- **Progresso:** concentra quatro camadas:
  1. Resumo do aprendizado.
  2. Estado de aprendizagem em linguagem comum.
  3. Mapa de domínio por matéria e assunto.
  4. Prioridades de estudo com motivo.
- **Ajustes:** mantém perfil, aparência, metas, duração dos blocos, organização de matérias, modo de liberação, backup/importação e reinício.

## Tradução da linguagem
- Retenção aparece como **Memória de longo prazo**.
- Fragilidade aparece como **Robustez do conhecimento**.
- Indicadores sem amostra suficiente geram orientação simples, não mensagens técnicas.
- O Learning Score não é exibido como métrica bruta; suas conquistas continuam condicionadas a dados válidos.
- SMS aparece na interface como **Maturidade de Estudos**, com classificação e ponto de atenção.
- O índice combina domínio médio (40%), consistência (30%), velocidade (15%) e resiliência (15%).
- Se algum componente não tiver dados suficientes, o índice fica “Em formação”; dados ausentes não viram zero.

## Gamificação
XP, níveis, sequência, bônus e escudos permanecem como elementos de motivação secundários. As conquistas passam a valorizar:
- melhoria de desempenho recente;
- domínio acima de 60%;
- domínio acima de 80%;
- retorno após episódio de dificuldade;
- recuperação de assunto após dificuldade;
- Learning Score acima de 60 e 80.

Conquistas desbloqueadas são persistidas no estado local do estudante.

## Preservação
Esta atualização reorganiza apresentação, navegação e linguagem. Não altera as fórmulas oficiais do motor, não apaga histórico e não migra o armazenamento para serviço pago. A sessão de estudo, registro manual de questões, cronômetro, calendário, Anki, redação, configurações e backup continuam disponíveis.


## Sessão de questões e Maturidade de Estudos
- Ao adicionar acertos ou erros em um bloco, o Ciclo marca automaticamente aquele bloco como estudado. O controle manual continua disponível.
- A classificação de dificuldade saiu do fluxo principal e fica recolhida como opção avançada, pois é necessária para a fórmula de Robustez do conhecimento (questões fáceis versus difíceis).
- A Maturidade de Estudos segue a fórmula aprovada: DM 40%, CS 30%, VS 15% e RS 15%. O modo avançado é liberado automaticamente a partir de 70, com possibilidade de escolha manual local.

## Fechamento de UX — decisões finais da profissional

### Navegação
A navegação principal tem seis abas: **Início, Ciclo, Anki, Redação, Relatórios e Ajustes**. Início absorve a função de orientação cotidiana que antes estava espalhada entre Início e Progresso. Relatórios concentra a análise detalhada.

### Início e recomendação
- A Próxima Ação é dinâmica, não uma sequência fixa.
- O motor considera urgência pedagógica, desempenho recente, tempo sem contato e posição no ciclo.
- O sistema apresenta uma recomendação principal e mantém alternativas acessíveis.
- O estudante pode escolher outra atividade sem perder a orientação do sistema.
- O primeiro acesso apresenta uma experiência vazia orientada para configurar o primeiro ciclo.
- O domínio médio considera apenas cadernos com dados válidos. Matérias cadastradas mas ainda não estudadas ficam em “Em formação” e não entram no denominador.

### Cronômetro e recuperação
- Após 10 minutos sem interação, a interface pergunta se o estudante continua estudando.
- O estudante tem 60 segundos para responder; sem resposta, o cronômetro pausa automaticamente.
- A sessão não finalizada é armazenada separadamente como rascunho (ciclo-session-draft-v1).
- O histórico definitivo só recebe os registros ao finalizar/avançar a sessão.
- Ao retornar, o estudante pode continuar a sessão não finalizada.
- O rascunho mantém matéria, blocos marcados, acertos, erros e estado do cronômetro; não deve gerar registros duplicados.

### Dificuldade e Robustez
- A classificação de dificuldade permanece opcional e recolhida em “Mais opções”.
- O fluxo principal de questões mostra apenas acertos e erros.
- A classificação é necessária para Robustez do conhecimento; sem amostra mínima, o relatório informa que os dados estão em formação.

### Dados insuficientes
Estados visuais oficiais:
- **Sem dados:** ainda não há informações suficientes.
- **Em formação:** há dados, mas a amostra ainda não permite um diagnóstico confiável.
- **Calculado:** apresentar a interpretação correspondente.
Dados ausentes nunca são exibidos como zero.

### Backup
- V1 oferece exportação e importação com substituição protegida.
- A importação avisa claramente que substituirá os dados atuais.
- Antes de substituir, o estudante pode baixar o backup atual.
- Mesclagem de backups fica fora da V1 para evitar duplicações e conflitos.

### Redação e recomendações
Sugestões de redação não seguem um prazo rígido de 14 dias. Consideram a meta definida pelo estudante, a frequência histórica e o prazo de prova/objetivo, quando disponível. A linguagem deve orientar sem cobrar ou culpabilizar.

### Identidade visual
Personalidade: séria, confiável, acadêmica, organizada e calma. Evitar estética infantil, excesso de gamificação, gradientes chamativos e animações que disputem atenção.

Paleta aprovada:
- Principal: #0F2744
- Sucesso / progresso: #2E7D5B
- Atenção: #D9A441
- Crítico: #C65353
- Informação / consolidando: #4E7A99
- Claro: fundo #F7F8FA, superfície #FFFFFF, texto #1D2939
- Escuro: fundo #0B1220, superfície #131C2B, texto #F3F5F7

### Cenários de validação obrigatórios
1. Primeiro acesso sem matérias, histórico ou metas.
2. Estudante com ciclo em andamento.
3. Estudante com dificuldades e revisões pendentes.
4. Estudante com histórico suficiente para relatórios e diagnósticos.

Os quatro cenários devem ser revisados em desktop e celular antes da aprovação final do redesign.
