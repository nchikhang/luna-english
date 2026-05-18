import { useEffect, useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getAllDecks,
  getCardsDueForReview,
  getDueCountForDeck,
} from '@/db/queries';
import { Button } from '@/components/ui/Button';
import type { Card, Deck } from '@/types';

/**
 * Debug screen tạm thời cho Phase B Bước 1.
 * Sẽ thay bằng UI thật ở bước 3.
 */
export default function LearnScreen() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    getAllDecks().then(setDecks);
  }, []);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, msg]);
    console.log(msg);
  };

  const testDeck = async (deck: Deck) => {
    setLogs([]);
    addLog(`=== Testing deck: ${deck.name} ===`);

    try {
      // Test 1: getDueCountForDeck
      const counts = await getDueCountForDeck(deck.id);
      addLog(`Due counts: ${JSON.stringify(counts)}`);

      // Test 2: getCardsDueForReview
      const cards = await getCardsDueForReview(deck.id);
      addLog(`Cards due: ${cards.length}`);

      cards.forEach((card: Card, idx) => {
        const type = card.repetitions === 0 ? 'NEW' : 'REVIEW';
        addLog(`  ${idx + 1}. [${type}] ${card.word} (reps=${card.repetitions}, interval=${card.interval})`);
      });

      if (cards.length === 0) {
        addLog('→ No cards due. Add some cards first, or wait for review schedule.');
      } else {
        addLog('→ Ready to study! UI coming in Bước 2.');
      }
    } catch (err) {
      addLog(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <Text className="text-2xl font-bold mb-2">Học từ vựng</Text>
        <Text className="text-sm text-gray-600 mb-6">
          🚧 Debug screen — test backend logic Phase B Bước 1
        </Text>

        <Text className="text-sm font-semibold text-gray-700 mb-3">
          Chọn deck để test:
        </Text>

        {decks.length === 0 ? (
          <Text className="text-base text-gray-500">
            Chưa có deck. Vào tab Flashcards tạo deck trước.
          </Text>
        ) : (
          decks.map((deck) => (
            <Pressable
              key={deck.id}
              onPress={() => testDeck(deck)}
              className="bg-primary-50 rounded-xl px-4 py-3 mb-2 active:bg-primary-100"
            >
              <Text className="text-base font-medium text-primary-900">
                {deck.name}
              </Text>
              <Text className="text-xs text-primary-700">
                {deck.cardCount} thẻ
              </Text>
            </Pressable>
          ))
        )}

        {logs.length > 0 ? (
          <View className="mt-6 p-3 bg-gray-900 rounded-xl">
            <Text className="text-xs font-semibold text-gray-400 mb-2 uppercase">
              Console output
            </Text>
            {logs.map((log, idx) => (
              <Text
                key={`log-${idx}`}
                className="text-xs text-green-300 font-mono mb-1"
                selectable
              >
                {log}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}