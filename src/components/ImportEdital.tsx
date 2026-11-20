import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, FileText, Sparkles, Trash2, Upload } from "lucide-react";
import { disciplineRepository, notebookRepository, settingsRepository } from "../storage/repositories";
import { reconcileStudyCycle, type StudyCycleProgress } from "../domain/studyCycles";
import { parseEditalText } from "../domain/editalText";

type ExistingRow = { id: string; name: string; disciplineId?: string; cycleOrder?: number };
type Props = { reload: () => void };
const clean = (value: string) => value.trim().toLocaleLowerCase("pt-BR");
const aiPrompt = "Analise o edital/conteúdo programático que vou fornecer e organize-o para cadastro no EstudosFlix.\n\nREGRAS OBRIGATÓRIAS:\n- Identifique todas as disciplinas e agrupe os tópicos do edital em cadernos coerentes.\n- Cada caderno deve representar um núcleo de conteúdo que possa ser estudado e avaliado por questões.\n- Organize os cadernos em sequência pedagógica, do conhecimento básico aos conteúdos mais específicos/avançados.\n- Preserve os tópicos relevantes do edital dentro do nome do caderno, sem criar dezenas de cadernos minúsculos.\n- Quando houver pré-requisitos evidentes, coloque o conteúdo-base antes do conteúdo que depende dele.\n- NÃO crie uma categoria separada chamada \"assuntos\".\n- Responda exclusivamente no formato abaixo, sem introdução, explicações, tabelas, marcadores ou comentários.\n- Use exatamente os rótulos \"disciplina:\" e \"caderno:\".\n- Não invente conteúdos que não estejam no edital.\n- Se houver tópicos muito específicos, agrupe-os no caderno principal correspondente.\n- Não inclua linhas que não sejam disciplinas ou cadernos.\n\nFORMATO:\ndisciplina: Nome da disciplina\ncaderno 01: Nome do primeiro caderno\ncaderno 02: Nome do segundo caderno\n\ndisciplina: Outra disciplina\ncaderno 01: Nome do caderno\n\nAgora organize este edital:\n[COLE AQUI O EDITAL]";

export default function ImportEdital({ reload }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const parsed = useMemo(() => parseEditalText(text), [text]);
  const notebookCount = parsed.disciplines.reduce((total, item) => total + item.notebooks.length, 0);
  const canImport = parsed.disciplines.length > 0 && notebookCount > 0 && !busy;

  function updateText(value: string) {
    setText(value);
    setError("");
    setMessage("");
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(aiPrompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Não foi possível copiar automaticamente. Tente selecionar e copiar o prompt.");
    }
  }

  async function importStructure() {
    if (!canImport) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const currentDisciplines = await disciplineRepository.list() as unknown as ExistingRow[];
      const currentNotebooks = await notebookRepository.list() as unknown as ExistingRow[];
      const disciplineIds = new Map<string, string>();
      const createdDisciplines: ExistingRow[] = [];
      const createdNotebooks: ExistingRow[] = [];
      for (const item of parsed.disciplines) {
        const existing = currentDisciplines.find(row => clean(row.name) === clean(item.name));
        const saved = existing ?? await disciplineRepository.save({
          name: item.name,
          notebooksPerPass: 4,
          durationMinutes: 15,
          generalOrder: currentDisciplines.length + createdDisciplines.length
        });
        disciplineIds.set(clean(item.name), saved.id);
        if (!existing) createdDisciplines.push(saved as unknown as ExistingRow);
      }
      for (const item of parsed.disciplines) {
        const disciplineId = disciplineIds.get(clean(item.name))!;
        for (const notebookName of item.notebooks) {
          const existing = currentNotebooks.find(row => row.disciplineId === disciplineId && clean(row.name) === clean(notebookName))
            ?? createdNotebooks.find(row => row.disciplineId === disciplineId && clean(row.name) === clean(notebookName));
          if (existing) continue;
          const saved = await notebookRepository.save({
            name: notebookName,
            disciplineId,
            cycleOrder: currentNotebooks.filter(row => row.disciplineId === disciplineId).length
              + createdNotebooks.filter(row => row.disciplineId === disciplineId).length
          });
          createdNotebooks.push(saved as unknown as ExistingRow);
        }
      }
      for (const disciplineId of disciplineIds.values()) {
        const ids = [...currentNotebooks, ...createdNotebooks]
          .filter(notebook => notebook.disciplineId === disciplineId)
          .sort((a, b) => (a.cycleOrder ?? 0) - (b.cycleOrder ?? 0))
          .map(notebook => notebook.id);
        const savedCycle = await settingsRepository.get("studyCycle:" + disciplineId);
        await settingsRepository.set("studyCycle:" + disciplineId, reconcileStudyCycle(
          savedCycle && typeof savedCycle === "object" ? savedCycle as StudyCycleProgress : undefined,
          disciplineId, ids
        ));
      }
      setMessage(`Importação concluída! ${createdDisciplines.length} disciplina(s) e ${createdNotebooks.length} caderno(s) novo(s) cadastrados. Linhas fora do padrão foram ignoradas; itens existentes foram mantidos sem duplicação.`);
      setText("");
      reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível concluir a importação. Tente novamente.");
    } finally { setBusy(false); }
  }

  return <section className="panel edital-import-panel">
    <div className="panel-heading">
      <div><span className="eyebrow">COMECE MAIS RÁPIDO</span><h2>Importar edital com ajuda da IA</h2></div>
      <span className="edital-import-icon"><FileText size={21}/></span>
    </div>
    <p className="muted-copy">Copie o prompt e cole-o na IA junto com o edital completo. Depois, cole a resposta que ela gerar no campo abaixo.</p>

    <div className="edital-text-instructions">
      <div className="edital-instruction-title"><Sparkles size={16}/> 1. Copie o prompt para a IA</div>
      <p>Baixe ou abra o edital do concurso, copie o prompt e cole-o em qualquer IA (ChatGPT, Gemini, Claude ou outra) junto com o conteúdo programático. Peça a organização e, depois, cole aqui a resposta. A IA organiza a estrutura; o motor do sistema acompanha suas métricas e libera os próximos cadernos conforme sua evolução.</p>
      <button type="button" className="button secondary edital-example-button" onClick={() => void copyPrompt()}>
        <Copy size={15}/> {copied ? "Prompt copiado!" : "Copiar prompt"}
      </button>
    </div>

    <label className="edital-text-label" htmlFor="edital-text-input">2. Cole aqui a resposta da IA
      <textarea id="edital-text-input" className="edital-textarea" value={text} onChange={event => updateText(event.target.value)} rows={7} spellCheck={false} placeholder={`disciplina: Matemática
caderno 01: Aritmética
caderno 02: Álgebra

disciplina: Português
caderno 01: Gramática`} />
    </label>

    {text.trim() && <div className="edital-import-preview">
      <div className="edital-preview-heading"><strong>Prévia do que será importado</strong><span>{parsed.disciplines.length} disciplina(s) · {notebookCount} caderno(s)</span></div>
      {parsed.disciplines.map(item => <div className="diagnostic-row" key={item.name}><span className="diagnostic-dot blue-dot"/><div><strong>{item.name}</strong><small>{item.notebooks.map((name, index) => `${String(index + 1).padStart(2, "0")} · ${name}`).join("  |  ")}</small></div><b>{item.notebooks.length}</b></div>)}
      {parsed.ignoredLines > 0 && <p className="edital-ignored-note">{parsed.ignoredLines} linha(s) fora do padrão ou repetida(s) serão ignoradas.</p>}
      <div className="edital-import-actions">
        <button type="button" className="button secondary" disabled={busy} onClick={() => updateText("")}><Trash2 size={15}/> Limpar texto</button>
        <button type="button" className="button primary" disabled={!canImport} onClick={() => void importStructure()}><Upload size={16}/> {busy ? "Importando…" : "Confirmar e importar"}</button>
      </div>
    </div>}
    {error && <p className="edital-import-error" role="alert"><AlertCircle size={16}/>{error}</p>}
    {message && <p className="edital-import-success" role="status"><CheckCircle2 size={16}/>{message}</p>}
    <small className="edital-import-footnote">Somente linhas válidas de disciplina e caderno entram no cadastro. O que não seguir o padrão é desconsiderado. Os dados ficam salvos apenas neste dispositivo.</small>
  </section>;
}
