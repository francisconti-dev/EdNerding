// Mirror of the server's avatar catalog emojis, for quick client-side rendering
// without an extra fetch. The server remains the source of truth for prices.
export const AVATAR_EMOJIS = {
  default: "🙂",
  robot: "🤖",
  cat: "🐱",
  dog: "🐶",
  fox: "🦊",
  panda: "🐼",
  alien: "👽",
  ninja: "🥷",
  dragon: "🐉",
  unicorn: "🦄",
  wizard: "🧙",
  crown: "👑"
};

export function avatarEmoji(avatarId) {
  return AVATAR_EMOJIS[avatarId] || AVATAR_EMOJIS.default;
}
