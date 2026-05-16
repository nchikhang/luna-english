import * as Speech from 'expo-speech';

export interface SpeakOptions {
  rate?: number; // 0.5 - 2.0 (1.0 = normal)
  pitch?: number; // 0.5 - 2.0
  language?: string; // 'en-US', 'en-GB', 'en-AU'
}

/**
 * Read text aloud using device's native TTS engine.
 * Free, works offline, no API needed.
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  Speech.speak(text, {
    language: options.language ?? 'en-US',
    rate: options.rate ?? 1.0,
    pitch: options.pitch ?? 1.0,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}

export async function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}

/**
 * Get list of available voices on device.
 * Useful for letting user pick accent (US, UK, AU).
 */
export async function getAvailableVoices(): Promise<Speech.Voice[]> {
  const voices = await Speech.getAvailableVoicesAsync();
  return voices.filter((v) => v.language.startsWith('en'));
}
