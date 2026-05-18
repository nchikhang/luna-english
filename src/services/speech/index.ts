import * as Speech from 'expo-speech';

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  language?: string;
}

/**
 * Phát âm text qua native TTS.
 *
 * Behavior: tự động STOP lệnh đang phát trước khi phát mới.
 * Tránh trường hợp user tap loa nhiều lần → audio queue lên,
 * hoặc chuyển câu mà từ cũ vẫn còn phát.
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  // Stop bất kỳ lệnh đang phát trước. Fire-and-forget vì
  // Speech.stop() có thể throw nếu không có gì đang phát.
  Speech.stop().catch(() => {});

  Speech.speak(text, {
    language: options.language ?? 'en-US',
    rate: options.rate ?? 1.0,
    pitch: options.pitch ?? 1.0,
  });
}

export function stopSpeaking(): void {
  Speech.stop().catch(() => {});
}

export async function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}

export async function getAvailableVoices(): Promise<Speech.Voice[]> {
  const voices = await Speech.getAvailableVoicesAsync();
  return voices.filter((v) => v.language.startsWith('en'));
}