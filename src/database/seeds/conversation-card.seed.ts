import { DataSource } from 'typeorm';
import {
  ConversationCard,
  ConversationCardVisual,
} from '../../entity/conversation-card.entity';

// The four cards previously hardcoded in DirectMessageService and the mobile
// obrolan provider, so the existing picker UI is preserved after switching to
// the CMS-managed catalog. Category assignment is done later through the CMS;
// these seed as uncategorized so they always appear as the general fallback.
export const DEFAULT_CONVERSATION_CARDS: Array<{
  title: string;
  color: string;
  textColor: string;
  prompt: string;
  subPrompt: string;
  visual: ConversationCardVisual;
}> = [
  {
    title: 'Kuliner',
    color: '#5B7C28',
    textColor: '#E6F34C',
    prompt: 'Bahas makanan enak di sekitar atau tempat nongkrong favorit.',
    subPrompt:
      'Kamu punya rekomendasi kafe atau kuliner yang wajib dicoba di sekitarmu?',
    visual: 'kuliner',
  },
  {
    title: 'Hobi & Minat',
    color: '#2B6CB0',
    textColor: '#E0F2FE',
    prompt:
      'Ceritakan hobi baru atau kegiatan seru yang lagi sering kamu lakuin.',
    subPrompt:
      'Lagi suka dengerin musik apa, atau ada buku/game yang lagi seru?',
    visual: 'hobi',
  },
  {
    title: 'Film & Serial',
    color: '#7C3AED',
    textColor: '#FDE047',
    prompt:
      'Tanya rekomendasi film atau serial favorit yang seru ditonton akhir pekan.',
    subPrompt: 'Ada tontonan Netflix atau bioskop yang menurutmu seru banget?',
    visual: 'film',
  },
  {
    title: 'Keseharian',
    color: '#D97706',
    textColor: '#FEF3C7',
    prompt: 'Ceritakan momen seru atau hal menarik yang kamu alami minggu ini.',
    subPrompt: 'Gimana harimu hari ini? Ada cerita lucu atau berkesan nggak?',
    visual: 'keseharian',
  },
];

/** Inserts the four default cards once; re-running skips cards already present per visual. */
export async function seedConversationCards(source: DataSource): Promise<{
  created: number;
  skipped: number;
}> {
  const repo = source.getRepository(ConversationCard);
  let created = 0;
  let skipped = 0;

  for (const item of DEFAULT_CONVERSATION_CARDS) {
    const existing = await repo.findOneBy({ visual: item.visual });
    if (existing) {
      skipped++;
      continue;
    }
    const card = repo.create({
      title: item.title,
      prompt: item.prompt,
      subPrompt: item.subPrompt,
      color: item.color,
      textColor: item.textColor,
      visual: item.visual,
      categoryId: null,
      sortOrder: DEFAULT_CONVERSATION_CARDS.indexOf(item),
      isActive: true,
      revision: 1,
    });
    await repo.save(card);
    console.log(`[+] Seeded conversation card: ${item.title} (${item.visual})`);
    created++;
  }

  return { created, skipped };
}
