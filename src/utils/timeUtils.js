/**
 * ミリ秒を時:分:秒.ミリ秒 形式にフォーマットする関数
 * @param {number} milliseconds - フォーマットするミリ秒
 * @returns {string} フォーマットされた時間文字列
 */
export function formatTime(milliseconds) {
  if (milliseconds === undefined || milliseconds === null) {
    return '00:00:00';
  }
  
  // 数値に変換
  const timeMs = Number(milliseconds);
  if (isNaN(timeMs)) {
    return '00:00:00';
  }
  
  const hours = Math.floor(timeMs / 3600000);
  const minutes = Math.floor((timeMs % 3600000) / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * ミリ秒を時:分:秒.ミリ秒 形式にフォーマットする関数（ミリ秒表示あり）
 * @param {number} milliseconds - フォーマットするミリ秒
 * @returns {string} フォーマットされた時間文字列
 */
export function formatTimeWithMs(milliseconds) {
  if (milliseconds === undefined || milliseconds === null) {
    return '00:00:00.00';
  }
  
  // 数値に変換
  const timeMs = Number(milliseconds);
  if (isNaN(timeMs)) {
    return '00:00:00.00';
  }
  
  const hours = Math.floor(timeMs / 3600000);
  const minutes = Math.floor((timeMs % 3600000) / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  const centiseconds = Math.floor((timeMs % 1000) / 10);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

/**
 * 日付をフォーマットする関数
 * @param {Date|string|number} date - フォーマットする日付
 * @returns {string} フォーマットされた日付文字列
 */
export function formatDate(date) {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
} 