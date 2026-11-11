/**
 * FSRS-7 adapter for Ciclo using ts-fsrs v6 (MIT).
 * Keep scheduling decisions here, not in UI code.
 */
let schedulerPromise;
async function getScheduler() {
  if (!schedulerPromise) schedulerPromise = (async () => {
    const { DefaultScheduler } = await import('https://esm.sh/ts-fsrs@6.0.0');
    return await DefaultScheduler({
      version: 'FSRS-7', desiredRetention: 0.9,
      enableShortTerm: true, learningSteps: ['1m', '10m'],
      relearningSteps: ['10m'], enableFuzz: true, maximumInterval: 36500
    });
  })();
  try { return await schedulerPromise; }
  catch (error) { schedulerPromise = undefined; throw error; }
}
function hydrateCard(card) {
  if (!card) throw new TypeError('Estado FSRS do cartão ausente.');
  return { ...card, dueAt: new Date(card.dueAt),
    lastReviewAt: card.lastReviewAt ? new Date(card.lastReviewAt) : null };
}
function serialize(value) {
  return JSON.parse(JSON.stringify(value, (_key, item) =>
    item instanceof Date ? item.toISOString() : item));
}
export async function createFsrsCard(cardId) {
  const scheduler = await getScheduler();
  return serialize(scheduler.newCard({ cardId, now: new Date() }));
}
export async function previewFsrs(cardState) {
  const [{ Rating }, scheduler] = await Promise.all([
    import('https://esm.sh/ts-fsrs@6.0.0'), getScheduler()
  ]);
  const labels = new Map([[Rating.Again,'again'],[Rating.Hard,'hard'],
    [Rating.Good,'good'],[Rating.Easy,'easy']]);
  return Array.from(scheduler.preview({ card: hydrateCard(cardState), now: new Date() }),
    item => ({ grade: item.grade, label: labels.get(item.grade),
      card: serialize(item.card), revlog: serialize(item.revlog) }));
}
export async function reviewFsrs(cardState, grade) {
  const [{ Rating }, scheduler] = await Promise.all([
    import('https://esm.sh/ts-fsrs@6.0.0'), getScheduler()
  ]);
  const grades = { again: Rating.Again, hard: Rating.Hard,
    good: Rating.Good, easy: Rating.Easy };
  const normalized = typeof grade === 'string' ? grades[grade.toLowerCase()] : grade;
  if (!Object.values(grades).includes(normalized))
    throw new TypeError('Nota inválida. Use again, hard, good ou easy.');
  const result = scheduler.review({ card: hydrateCard(cardState),
    grade: normalized, now: new Date() });
  return { card: serialize(result.card), revlog: serialize(result.revlog) };
}
export const FSRS_GRADES = Object.freeze({
  AGAIN: 'again', HARD: 'hard', GOOD: 'good', EASY: 'easy'
});
