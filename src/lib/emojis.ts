// src/lib/emojis.ts
// Emoji list for folder icons — matching Laravel VueFileManager emoji picker

export interface Emoji {
  name: string;
  emoji: string;
}

export const FOLDER_EMOJIS: Emoji[] = [
  // Folders
  { name: 'folder', emoji: '📁' },
  { name: 'folder_open', emoji: '📂' },
  { name: 'folder_zip', emoji: '🗂️' },
  { name: 'document', emoji: '📄' },
  { name: 'picture', emoji: '🖼️' },
  { name: 'music', emoji: '🎵' },
  { name: 'video', emoji: '🎬' },
  { name: 'archive', emoji: '📦' },

  // Business
  { name: 'briefcase', emoji: '💼' },
  { name: 'building', emoji: '🏢' },
  { name: 'money', emoji: '💰' },
  { name: 'chart', emoji: '📊' },
  { name: 'calendar', emoji: '📅' },
  { name: 'clock', emoji: '🕐' },
  { name: 'lock', emoji: '🔒' },
  { name: 'key', emoji: '🔑' },

  // Development
  { name: 'code', emoji: '💻' },
  { name: 'database', emoji: '🗄️' },
  { name: 'server', emoji: '🖥️' },
  { name: 'bug', emoji: '🐛' },
  { name: 'rocket', emoji: '🚀' },
  { name: 'gear', emoji: '⚙️' },
  { name: 'wrench', emoji: '🔧' },
  { name: 'hammer', emoji: '🔨' },

  // Communication
  { name: 'envelope', emoji: '✉️' },
  { name: 'phone', emoji: '📞' },
  { name: 'megaphone', emoji: '📢' },
  { name: 'bell', emoji: '🔔' },
  { name: 'speech', emoji: '💬' },
  { name: 'star', emoji: '⭐' },
  { name: 'heart', emoji: '❤️' },
  { name: 'thumbs_up', emoji: '👍' },

  // Nature
  { name: 'sun', emoji: '☀️' },
  { name: 'moon', emoji: '🌙' },
  { name: 'cloud', emoji: '☁️' },
  { name: 'rain', emoji: '🌧️' },
  { name: 'snow', emoji: '❄️' },
  { name: 'tree', emoji: '🌳' },
  { name: 'flower', emoji: '🌸' },
  { name: 'leaf', emoji: '🍃' },

  // Food
  { name: 'coffee', emoji: '☕' },
  { name: 'apple', emoji: '🍎' },
  { name: 'pizza', emoji: '🍕' },
  { name: 'cake', emoji: '🎂' },

  // Transport
  { name: 'car', emoji: '🚗' },
  { name: 'airplane', emoji: '✈️' },
  { name: 'ship', emoji: '🚢' },
  { name: 'bicycle', emoji: '🚲' },

  // Symbols
  { name: 'check', emoji: '✅' },
  { name: 'cross', emoji: '❌' },
  { name: 'warning', emoji: '⚠️' },
  { name: 'info', emoji: 'ℹ️' },
  { name: 'question', emoji: '❓' },
  { name: 'exclamation', emoji: '❗' },
  { name: 'lightning', emoji: '⚡' },
  { name: 'fire', emoji: '🔥' },
  { name: 'sparkle', emoji: '✨' },
  { name: 'rainbow', emoji: '🌈' },

  // People
  { name: 'user', emoji: '👤' },
  { name: 'users', emoji: '👥' },
  { name: 'family', emoji: '👨‍👩‍👧‍👦' },
  { name: 'ghost', emoji: '👻' },
  { name: 'robot', emoji: '🤖' },
  { name: 'alien', emoji: '👽' },
  { name: 'clown', emoji: '🤡' },

  // Objects
  { name: 'gift', emoji: '🎁' },
  { name: 'trophy', emoji: '🏆' },
  { name: 'crown', emoji: '👑' },
  { name: 'gem', emoji: '💎' },
  { name: 'ball', emoji: '⚽' },
  { name: 'game', emoji: '🎮' },
  { name: 'music_note', emoji: '🎶' },
  { name: 'microphone', emoji: '🎤' },
  { name: 'camera', emoji: '📷' },
  { name: 'paintbrush', emoji: '🖌️' },
  { name: 'pencil', emoji: '✏️' },
  { name: 'scissors', emoji: '✂️' },
  { name: 'ruler', emoji: '📏' },
  { name: 'book', emoji: '📚' },
  { name: 'newspaper', emoji: '📰' },
  { name: 'magazine', emoji: '📖' },
  { name: 'bookmark', emoji: '🔖' },
  { name: 'label', emoji: '🏷️' },
  { name: 'link', emoji: '🔗' },
  { name: 'paperclip', emoji: '📎' },
  { name: 'pin', emoji: '📌' },
  { name: 'thumbtack', emoji: '📍' },
  { name: 'pushpin', emoji: '📍' },
  { name: 'magnet', emoji: '🧲' },
  { name: 'battery', emoji: '🔋' },
  { name: 'bulb', emoji: '💡' },
  { name: 'candle', emoji: '🕯️' },
  { name: 'flashlight', emoji: '🔦' },
  { name: 'glasses', emoji: '👓' },
  { name: 'sunglasses', emoji: '🕶️' },
  { name: 'watch', emoji: '⌚' },
  { name: 'ring', emoji: '💍' },
  { name: 'necklace', emoji: '📿' },
  { name: 'crown_jewel', emoji: '👑' },
  { name: 'umbrella', emoji: '☂️' },
  { name: 'bag', emoji: '👜' },
  { name: 'suitcase', emoji: '🧳' },
  { name: 'shoe', emoji: '👟' },
  { name: 'boot', emoji: '👢' },
  { name: 'hat', emoji: '🎩' },
  { name: 'cap', emoji: '🧢' },
  { name: 'shirt', emoji: '👕' },
  { name: 'pants', emoji: '👖' },
  { name: 'dress', emoji: '👗' },
  { name: 'scarf', emoji: '🧣' },
  { name: 'gloves', emoji: '🧤' },
  { name: 'socks', emoji: '🧦' },
];

export const FOLDER_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#a855f7', // purple
] as const;
