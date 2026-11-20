import { ArrowRight, BookOpen, Brain, CheckCircle2, FileText, GraduationCap, Layers3, Repeat, Sparkles, Target, TrendingUp } from "lucide-react";
import ImportEdital from "./ImportEdital";
type Props = { onStart: () => void; reload: () => void };
const steps = [
{number:"01",title:"Crie suas disciplinas",text:"Adicione as áreas que deseja estudar, como Direito Constitucional, Português ou Matemática.",icon:GraduationCap},
{number:"02",title:"Organize seus cadernos",text:"Divida cada disciplina em cadernos na sequência em que pretende aprender.",icon:Layers3},
{number:"03",title:"Deixe o EstudosFlix organizar seu ciclo",text:"O sistema organiza a ordem dos cadernos. A aba Ciclo permite acompanhar a passada e o próximo caderno.",icon:Repeat},
{number:"04",title:"Estude o próximo caderno",text:"Na página Início, veja o próximo estudo indicado, a passada e o tempo previsto. Você não precisa escolher o que estudar.",icon:BookOpen},
{number:"05",title:"Registre seu desempenho",text:"Depois do estudo, informe questões resolvidas, acertos e como foi seu desempenho: certeza, dúvida, chute ou erro.",icon:Target},
{number:"06",title:"Corrija lacunas com flashcards",text:"Transforme dificuldades em perguntas e respostas vinculadas ao caderno estudado.",icon:Brain},
{number:"07",title:"Evolua continuamente",text:"Acompanhe domínio, retenção, passadas, revisões e pontos que merecem atenção.",icon:TrendingUp}];
const areas = [
{icon:Sparkles,title:"Início",text:"O próximo estudo, as revisões do dia e um resumo do progresso."},
{icon:GraduationCap,title:"Disciplinas",text:"Suas disciplinas, seus cadernos e a organização de cada área."},
{icon:Repeat,title:"Ciclo",text:"A ordem dos cadernos, a passada atual e o próximo caderno."},
{icon:Brain,title:"Revisões",text:"Biblioteca de baralhos, subbaralhos e missão de revisão do dia."},
{icon:FileText,title:"Redações",text:"Registre suas produções, notas por competência e evolução textual."},
{icon:TrendingUp,title:"Evolução",text:"Seu progresso, histórico, gargalos e recomendações."}];
const principles=[["01","Menos planejamento","Você não precisa montar cronogramas complexos."],["02","Mais execução","O foco está em estudar, não em organizar estudos."],["03","Evolução contínua","Cada visita aos cadernos gera progresso e reforço do aprendizado."],["04","Correção de erros","As dificuldades identificadas viram revisões objetivas."]];
export default function MethodWelcome({onStart,reload}:Props){
return <div className="method-page">
<section className="method-hero"><div className="method-hero-copy"><span className="method-kicker"><Sparkles size={14}/> MÉTODO ESTUDOSFLIX</span><h1>Bem-vindo ao <span>EstudosFlix</span></h1><h2>O aluno estuda. O EstudosFlix orienta.</h2><p>O EstudosFlix é um sistema de organização inteligente dos seus estudos baseado em ciclos de cadernos, evolução contínua e revisão orientada por erros.</p><p>Você não precisa criar cronogramas complexos, decidir o que estudar todos os dias ou controlar revisões manualmente. <strong>O sistema organiza essas decisões para você.</strong></p><button className="button primary method-start" onClick={onStart}>Começar agora <ArrowRight size={17}/></button></div><div className="method-hero-art" aria-hidden="true"><div className="method-orbit orbit-one"/><div className="method-orbit orbit-two"/><div className="method-mark"><GraduationCap size={48}/><span>ESTUDOS<br/>FLIX</span></div><div className="method-float float-top"><CheckCircle2 size={17}/> Próximo passo definido</div><div className="method-float float-bottom"><Repeat size={17}/> Ciclo em movimento</div></div></section>
<section className="method-section"><div className="method-section-heading"><span>SEU CAMINHO</span><h2>Como o EstudosFlix funciona</h2><p>Uma sequência simples para transformar intenção em constância.</p></div><div className="method-steps">{steps.map(({number,title,text,icon:Icon})=><article className="method-step" key={number}><div className="method-step-top"><span>{number}</span><Icon size={20}/></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
<div className="method-onboarding-group">
<section className="method-getting-started"><div><span className="method-kicker">SEU PRIMEIRO PASSO</span><h2>Comece de onde você está.</h2><p>Crie sua primeira disciplina e adicione os cadernos. O EstudosFlix cuida da organização do ciclo.</p></div><ol><li>Crie sua primeira disciplina</li><li>Adicione seus cadernos</li><li>Confira seu ciclo de estudos</li><li>Inicie o primeiro bloco</li><li>Registre seu desempenho</li><li>Evolua continuamente</li></ol><button className="button primary method-start" onClick={onStart}>Começar agora <ArrowRight size={17}/></button></section>
<ImportEdital reload={reload}/>
</div>
<section className="method-section"><div className="method-section-heading"><span>SEU ESPAÇO</span><h2>O que você verá no menu</h2><p>Cada aba tem uma função clara no seu percurso.</p></div><div className="method-areas">{areas.map(({icon:Icon,title,text})=><article className="method-area" key={title}><span className="method-area-icon"><Icon size={20}/></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
<section className="method-section"><div className="method-section-heading"><span>NOSSA FILOSOFIA</span><h2>O Método EstudosFlix</h2><p>Menos carga mental para planejar. Mais energia para aprender.</p></div><div className="method-principles">{principles.map(([number,title,text])=><article className="method-principle" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
<footer className="method-footer"><blockquote>“O EstudosFlix organiza o caminho. Você apenas dá o próximo passo.”</blockquote><p>Bem-vindo ao Método EstudosFlix.</p><small>Criado por artucentrismo.</small></footer></div>;}
