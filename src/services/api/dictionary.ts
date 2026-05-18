/**
 * Free Dictionary API client.
 * Endpoint: https://api.dictionaryapi.dev/api/v2/entries/en/{word}
 *
 * Miễn phí, không cần API key, rate limit thoải mái cho dev.
 * Tài liệu: https://dictionaryapi.dev/
 */

const BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

// ============================================================
// Raw API response types
// ============================================================

interface ApiPhonetic {
  text?: string;
  audio?: string;
}

interface ApiDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
}

interface ApiMeaning {
  partOfSpeech: string;
  definitions: ApiDefinition[];
}

interface ApiEntry {
  word: string;
  phonetic?: string;
  phonetics: ApiPhonetic[];
  meanings: ApiMeaning[];
}

// ============================================================
// Simplified shape for our app
// ============================================================

export interface DictionaryResult {
  word: string;
  pronunciation?: string;
  audioUrl?: string;
  partOfSpeech: string;
  definitions: string[];
  examples: string[];
}

export class DictionaryError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'NETWORK' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'DictionaryError';
  }
}

/**
 * Tra từ trên Dictionary API. Trả về kết quả đơn giản hóa.
 * @throws DictionaryError với code NOT_FOUND nếu không tìm thấy từ
 */
export async function lookupWord(word: string): Promise<DictionaryResult> {
  const trimmed = word.trim().toLowerCase();
  if (!trimmed) {
    throw new DictionaryError('Empty word', 'UNKNOWN');
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/${encodeURIComponent(trimmed)}`);
  } catch (err) {
    throw new DictionaryError(
      'Không thể kết nối tới Dictionary API',
      'NETWORK'
    );
  }

  if (response.status === 404) {
    throw new DictionaryError(`Không tìm thấy từ "${word}"`, 'NOT_FOUND');
  }
  if (!response.ok) {
    throw new DictionaryError(`API error: ${response.status}`, 'UNKNOWN');
  }

  const entries = (await response.json()) as ApiEntry[];
  if (!entries || entries.length === 0) {
    throw new DictionaryError(`Không tìm thấy từ "${word}"`, 'NOT_FOUND');
  }

  return parseEntries(entries);
}

// ============================================================
// Parsing helpers
// ============================================================

function parseEntries(entries: ApiEntry[]): DictionaryResult {
  const first = entries[0];

  // Find pronunciation (ưu tiên có audio)
  const phoneticWithAudio = first.phonetics.find((p) => p.audio && p.text);
  const phoneticWithText = first.phonetics.find((p) => p.text);
  const pronunciation =
    phoneticWithAudio?.text ?? phoneticWithText?.text ?? first.phonetic;

  // Find audio URL
  const audioUrl = first.phonetics.find((p) => p.audio)?.audio;

  // Gộp tất cả meanings và definitions
  const allMeanings = entries.flatMap((e) => e.meanings);
  const firstMeaning = allMeanings[0];
  const partOfSpeech = firstMeaning?.partOfSpeech ?? '';

  const definitions: string[] = [];
  const examples: string[] = [];

  for (const meaning of allMeanings) {
    for (const def of meaning.definitions) {
      definitions.push(def.definition);
      if (def.example) examples.push(def.example);
    }
  }

  return {
    word: first.word,
    pronunciation,
    audioUrl,
    partOfSpeech,
    definitions: definitions.slice(0, 5), // top 5 definitions
    examples: examples.slice(0, 3),
  };
}