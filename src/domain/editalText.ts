export type ParsedDiscipline = { name: string; notebooks: string[] };

const clean = (value: string) => value.trim().toLocaleLowerCase("pt-BR");

export function parseEditalText(text: string): { disciplines: ParsedDiscipline[]; ignoredLines: number } {
  const disciplines: ParsedDiscipline[] = [];
  let ignoredLines = 0;
  let current: ParsedDiscipline | undefined;

  text.split(/\r?\n/).forEach(raw => {
    const line = raw.trim();
    if (!line) return;
    const discipline = line.match(/^disciplina\s*:\s*(.+)$/i);
    if (discipline) {
      const name = discipline[1].trim();
      const existing = disciplines.find(item => clean(item.name) === clean(name));
      if (existing) {
        current = existing;
        ignoredLines++;
        return;
      }
      current = { name, notebooks: [] };
      disciplines.push(current);
      return;
    }
    const notebook = line.match(/^caderno(?:\s*\d+)?\s*:\s*(.+)$/i);
    if (notebook && current) {
      const name = notebook[1].trim();
      if (!current.notebooks.some(item => clean(item) === clean(name))) current.notebooks.push(name);
      else ignoredLines++;
      return;
    }
    ignoredLines++;
  });

  const validDisciplines = disciplines.filter(item => item.notebooks.length > 0);
  ignoredLines += disciplines.length - validDisciplines.length;
  return { disciplines: validDisciplines, ignoredLines };
}
