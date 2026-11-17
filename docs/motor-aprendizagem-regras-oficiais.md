# Motor de aprendizagem do Ciclo — regras oficiais

Este documento registra as decisões aprovadas e a forma como foram incorporadas ao motor. Os registros antigos continuam válidos; propriedades novas são opcionais e acrescentadas aos registros.

## Índice de domínio
Mastery = Acertos (60%) + Consistência (20%) + Improvement Score (20%). A consistência usa as últimas quatro passadas, desvio padrão populacional × 4 e escala de 0 a 100. Improvement Score é max(0, última passada − primeira passada) dentro da janela móvel das últimas quatro.

## Travamento
TRAVADO quando há pelo menos 4 passadas, domínio abaixo de 50 e Improvement Score abaixo de 10. Sugestão de teoria: a partir de 6 passadas e domínio abaixo de 50. Reforço teórico obrigatório: a partir de 8 passadas e domínio abaixo de 40.

## Retenção
Compara a última passada antes da pausa com a primeira passada após o retorno. O retorno é reconhecido após 7 dias sem contato ou pelo menos um ciclo completo sem estudar o caderno. Retenção = desempenho no retorno / desempenho anterior × 100. Para os indicadores normalizados, o resultado é limitado a 0–100. Se o desempenho anterior for zero, a retenção fica indisponível.

## Learning Score
Learning Score = Progression × 0,50 + Error Reduction × 0,30 + Retention × 0,20. Progression e Error Reduction usam a janela móvel de até quatro passadas. Se não houver retenção válida ou se o erro inicial for zero, o Learning Score fica indisponível, sem substituir a ausência por zero.

## Fragilidade
Fragility = Easy Accuracy − Hard Accuracy. São necessárias pelo menos 20 questões fáceis e 20 difíceis classificadas. Sem essa amostra, a interface exibe “Amostra insuficiente”. A classificação permanece disponível como opção avançada recolhida no registro manual e nas sessões de estudo, pois a fórmula depende dessa informação. Registros antigos sem classificação não entram no cálculo.

## Estagnação
Exige oito passadas para comparar duas janelas completas: média de tempo das quatro passadas atuais maior que a média das quatro passadas imediatamente anteriores, e Improvement Score abaixo de 5 na janela atual. Diagnóstico: “O aluno está investindo mais tempo, mas não apresenta progresso relevante.”

## Resiliência
Um episódio de dificuldade começa quando domínio ou acurácia fica abaixo de 50. Retorno é registrado quando um caderno oferecido volta a ser estudado. Abandono é registrado apenas quando o estudante, em uma sessão ativa, pula a matéria ou troca por outra. Ausência da plataforma não gera abandono. Resiliência = retornos / (retornos + abandonos) × 100.

## Fila e desbloqueio
Modo padrão permite um caderno não dominado por disciplina. Modo avançado permite dois. Um caderno é dominado a partir de 80. Cadernos dominados continuam elegíveis para revisão, com prioridade menor. O modo avançado é liberado automaticamente quando a Maturidade de Estudos chega a 70, ou pode ser escolhido manualmente neste navegador. A escolha manual não representa permissão administrativa protegida.

## Maturidade de Estudos (SMS)
A fórmula aprovada é SMS = DM × 0,40 + CS × 0,30 + VS × 0,15 + RS × 0,15.

- **DM:** média dos Mastery Scores dos cadernos ativos. Na implementação, caderno ativo é aquele que já possui registro de questões.
- **CS:** média da Consistência dos cadernos ativos, calculada pelo desvio padrão populacional das últimas até quatro passadas: 100 − (DP × 4), limitada a 0–100. Cada caderno precisa ter pelo menos duas passadas válidas; se algum não tiver, o SMS fica em formação.
- **VS:** questões por minuto agregadas nos cadernos ativos, normalizadas por VS = ((LV − 0,5) / 2,5) × 100 e limitadas a 0–100.
- **RS:** retornos / (retornos + abandonos) × 100, agregados nos episódios dos cadernos ativos.

O SMS só é exibido quando CS, VS e RS estiverem disponíveis; componentes ausentes não são substituídos por zero nem redistribuídos entre os pesos. A classificação usa as faixas aprovadas: 0–30 Sobrevivência; 31–50 Aprendiz; 51–70 Competitivo; 71–85 Alto Nível; 86–100 Elite. O modo avançado é liberado automaticamente a partir de 70, salvo quando o estudante escolhe uma configuração manual local.

## Limitações
Esta versão continua local-first e não possui autenticação administrativa. A ativação manual do modo avançado é uma preferência local do navegador, não uma permissão protegida por conta. Indicadores sem dados suficientes aparecem como indisponíveis; nenhum histórico antigo é descartado.
