import type { FeedbackItem, FeedbackKind } from '../types/models.ts';

export const FEEDBACK_KINDS: FeedbackKind[] = ['too-hard', 'too-easy', 'boring', 'note'];

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  'too-hard': '太难了',
  'too-easy': '太简单',
  'boring': '没意思',
  note: '想说的话',
};

export function normalizeFeedbackKind(value: unknown): FeedbackKind {
  return FEEDBACK_KINDS.includes(value as FeedbackKind) ? (value as FeedbackKind) : 'note';
}

export function normalizeFeedbackList(raw: unknown): FeedbackItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const data = item as Partial<FeedbackItem>;
      return {
        id: typeof data.id === 'string' ? data.id : 'fb_unknown',
        text: typeof data.text === 'string' ? data.text : '',
        kind: normalizeFeedbackKind(data.kind),
        createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
        read: Boolean(data.read),
        handled: Boolean(data.handled),
      };
    })
    .filter((item) => item.id !== 'fb_unknown');
}

export function buildFeedbackText(kind: FeedbackKind, note: string): string {
  const trimmed = note.trim();
  const label = FEEDBACK_KIND_LABELS[kind];
  if (kind === 'note') return trimmed;
  return trimmed ? `${label}。${trimmed}` : label;
}

export function markFeedbackHandled(items: FeedbackItem[], id: string): FeedbackItem[] {
  return items.map((item) => (item.id === id ? { ...item, handled: true, read: true } : item));
}
