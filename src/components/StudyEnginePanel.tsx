import { useMemo } from "react";
import { Activity, Award, LockKeyhole, Unlock } from "lucide-react";
import { classifyStudyLevel, evaluateNotebookGates, type EngineAttempt } from "../domain/studyEngine";

type Notebook = { id: string; name: string; disciplineId?: string; cycleOrder?: number; createdAt?: string };
type Discipline = { id: string; name: string };
type Segment = { notebookId?: string; questions: number; correct: number; date: string };
type Props = { disciplines: Discipline[]; notebooks: Notebook[]; segments: Segment[] };

export default function StudyEnginePanel({ disciplines, notebooks, segments }: Props) {
  const attempts: EngineAttempt[] = useMemo(() => segments.filter(x => x.notebookId).map(x => ({
    notebookId: x.notebookId!, questions: x.questions, correct: x.correct, date: x.date
  })), [segments]);
  const result = classifyStudyLevel(attempts);
  const total = result.totalQuestions;
  const progress = Math.min(100, result.level === 4 ? 100 : result.level === 1 ? total / 20 * 100 : result.level === 2 ? total / 50 * 100 : total / 100 * 100);
  const accuracyText = result.accuracy === null ? "—" : Math.round(result.accuracy) + "%";
  const recentText = result.recentAccuracy === null ? "—" : Math.round(result.recentAccuracy) + "%";
  return <section className="panel evolution-panel study-engine-panel">
    <div className="panel-heading"><div><span className="eyebrow">MOTOR DE ORIENTAÇÃO</span><h2>Seu nível de preparação</h2></div><Award/></div>
    <div className="engine-level-head"><div><span className="engine-level-kicker">NÍVEL {result.level} DE 4</span><h3>{result.title}</h3><p className="muted-copy">{result.description}</p></div><strong className="engine-level-number">{result.level}<small>/4</small></strong></div>
    <div className="trail-bar"><span style={{width: progress + "%"}}/></div>
    <div className="engine-metrics">
      <div><strong>{total.toLocaleString("pt-BR")}</strong><small>Questões registradas</small></div>
      <div><strong>{accuracyText}</strong><small>Aproveitamento geral</small></div>
      <div><strong>{recentText}</strong><small>Últimas até 50 questões</small></div>
      <div><strong>{result.confidence}</strong><small>Confiança da amostra</small></div>
    </div>
    <p className="muted-copy engine-next-level"><Activity size={15}/> Próximo marco: {result.nextLevelAt}. A classificação combina volume de questões, aproveitamento geral e desempenho recente; não usa horas estudadas como prova de domínio.</p>
    <div className="divider"/>
    <div className="panel-heading"><div><span className="eyebrow">PROGRESSÃO PEDAGÓGICA</span><h3>Liberação de cadernos</h3></div></div>
    <p className="muted-copy">A sequência é liberada conforme as evidências do caderno anterior. Com 20 questões e 60% de aproveitamento, o próximo caderno é liberado. Se o desempenho estiver baixo, 50 questões permitem avançar sem ficar preso indefinidamente — mantendo o aviso de reforço.</p>
    {disciplines.map(d => {
      const list = notebooks.filter(n => n.disciplineId === d.id).sort((a,b) => (a.cycleOrder??0)-(b.cycleOrder??0) || (a.createdAt??"").localeCompare(b.createdAt??""));
      const gates = evaluateNotebookGates(list.map(n=>n.id), attempts);
      if (!list.length) return null;
      return <div className="engine-discipline" key={d.id}><strong>{d.name}</strong><small>{gates.filter(x=>x.released).length} de {gates.length} cadernos liberados</small>
        {list.map((n,i) => { const gate = gates[i]; return <div className="diagnostic-row engine-notebook-row" key={n.id}><span className={gate.released?"diagnostic-dot green-dot":"diagnostic-dot amber-dot"}/><div><strong>{String(i+1).padStart(2,"0")} · {n.name}</strong><small>{gate.reason}</small></div>{gate.released?<Unlock size={16}/>:<LockKeyhole size={16}/>}</div>; })}
      </div>;
    })}
    <small className="muted-copy engine-footnote">Os níveis são indicadores de acompanhamento, não previsão de aprovação. Uma amostra maior aumenta a confiança, mas não transforma automaticamente um percentual em domínio.</small>
  </section>;
}
