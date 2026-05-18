import * as Haptics from 'expo-haptics';

/**
 * Wrapper haptic feedback.
 * Tất cả các function đều fire-and-forget (không await),
 * và silently fail nếu device không support haptics.
 */

export function lightTap(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function mediumTap(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function success(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function warning(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

export function error(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}

/**
 * Cho rating button: rating cao = feedback nhẹ (thoải mái),
 * rating thấp (Again) = warning (cảm giác "sai")
 */
export function ratingFeedback(rating: number): void {
  if (rating <= 2) {
    warning();
  } else if (rating === 3) {
    mediumTap();
  } else {
    lightTap();
  }
}