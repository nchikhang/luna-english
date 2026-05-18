import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MatchTile {
  id: string;
  pairId: string;
  side: 'left' | 'right';
  text: string;
  isMatched: boolean;
}

interface MatchPairsProps {
  tiles: MatchTile[];
  selectedLeftId: string | null;
  selectedRightId: string | null;
  wrongPair: { leftId: string; rightId: string } | null;
  matchedCount: number;
  totalPairs: number;
  wrongAttempts: number;
  onSelectTile: (tileId: string) => void;
}

/**
 * Match Pairs UI: 2 cột (từ EN bên trái, nghĩa VN bên phải).
 * Tap 1 từ + 1 nghĩa → match đúng/sai có visual feedback.
 */
export function MatchPairs({
  tiles,
  selectedLeftId,
  selectedRightId,
  wrongPair,
  matchedCount,
  totalPairs,
  wrongAttempts,
  onSelectTile,
}: MatchPairsProps) {
  const leftTiles = tiles.filter((t) => t.side === 'left');
  const rightTiles = tiles.filter((t) => t.side === 'right');

  return (
    <View className="flex-1 px-4 py-4">
      <Text className="text-xs font-semibold text-primary-600 uppercase mb-3">
        Ghép cặp
      </Text>
      <Text className="text-base font-semibold text-gray-900 mb-1">
        Nối từ tiếng Anh với nghĩa tiếng Việt
      </Text>

      <View className="flex-row justify-between mb-4">
        <Text className="text-sm text-gray-500">
          Đã ghép: {matchedCount} / {totalPairs}
        </Text>
        <Text className="text-sm text-gray-500">
          Sai: {wrongAttempts}
        </Text>
      </View>

      <View className="flex-row gap-3 flex-1">
        {/* Cột trái: từ tiếng Anh */}
        <View className="flex-1 gap-2">
          <Text className="text-xs font-semibold text-gray-500 uppercase text-center mb-1">
            English
          </Text>
          {leftTiles.map((tile) => (
            <TileButton
              key={tile.id}
              tile={tile}
              isSelected={tile.id === selectedLeftId}
              isWrong={wrongPair?.leftId === tile.id}
              onPress={() => onSelectTile(tile.id)}
            />
          ))}
        </View>

        {/* Cột phải: nghĩa tiếng Việt */}
        <View className="flex-1 gap-2">
          <Text className="text-xs font-semibold text-gray-500 uppercase text-center mb-1">
            Nghĩa
          </Text>
          {rightTiles.map((tile) => (
            <TileButton
              key={tile.id}
              tile={tile}
              isSelected={tile.id === selectedRightId}
              isWrong={wrongPair?.rightId === tile.id}
              onPress={() => onSelectTile(tile.id)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

interface TileButtonProps {
  tile: MatchTile;
  isSelected: boolean;
  isWrong: boolean;
  onPress: () => void;
}

function TileButton({ tile, isSelected, isWrong, onPress }: TileButtonProps) {
  const state = getTileState(tile, isSelected, isWrong);

  const classes = {
    idle: 'bg-white border-gray-200 active:bg-gray-50',
    selected: 'bg-primary-50 border-primary-500',
    matched: 'bg-green-50 border-green-500',
    wrong: 'bg-red-50 border-red-500',
  }[state];

  const textColor = {
    idle: 'text-gray-900',
    selected: 'text-primary-900',
    matched: 'text-green-900',
    wrong: 'text-red-900',
  }[state];

  return (
    <Pressable
      onPress={onPress}
      disabled={tile.isMatched}
      className={`flex-1 min-h-[60px] p-3 rounded-2xl border-2 items-center justify-center ${classes}`}
    >
      <Text
        className={`text-base font-medium text-center ${textColor}`}
        numberOfLines={3}
      >
        {tile.text}
      </Text>
      {state === 'matched' ? (
        <Ionicons
          name="checkmark-circle"
          size={16}
          color="#10b981"
          style={{ position: 'absolute', top: 4, right: 4 }}
        />
      ) : null}
    </Pressable>
  );
}

type TileState = 'idle' | 'selected' | 'matched' | 'wrong';

function getTileState(
  tile: MatchTile,
  isSelected: boolean,
  isWrong: boolean
): TileState {
  if (tile.isMatched) return 'matched';
  if (isWrong) return 'wrong';
  if (isSelected) return 'selected';
  return 'idle';
}
