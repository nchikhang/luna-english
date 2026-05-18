import { getDatabase } from './schema';
import { createDeck } from './queries';

/**
 * Seed sample data — chỉ chạy khi database chưa có deck nào.
 * Idempotent: gọi nhiều lần cũng không nhân đôi data.
 */
export async function seedSampleData(): Promise<void> {
  const db = await getDatabase();

  // Check xem đã có deck chưa
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM decks'
  );
  if (result && result.count > 0) {
    console.log('[Seed] Skipped — database already has data');
    return;
  }

  console.log('[Seed] Creating sample decks...');

  await createDeck({
    name: 'Top 100 từ thông dụng',
    description: 'Những từ tiếng Anh được dùng nhiều nhất hằng ngày',
  });

  await createDeck({
    name: 'Business English',
    description: 'Từ vựng giao tiếp công việc và email',
  });

  await createDeck({
    name: 'IELTS Vocabulary',
    description: 'Từ vựng band 6.5+ cho kỳ thi IELTS',
  });

  console.log('[Seed] Done — 3 sample decks created');
}