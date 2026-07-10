export const WEATHER_TYPES = [
  { id: 'sunny', name: 'Sunny', emoji: '☀️', mutation: 'Sun-Kissed', mutationEmoji: '🌟', multiplier: 1.5, weight: 25 },
  { id: 'rain', name: 'Rain', emoji: '🌧️', mutation: 'Waterlogged', mutationEmoji: '💧', multiplier: 2, weight: 20 },
  { id: 'heatwave', name: 'Heatwave', emoji: '🔥', mutation: 'Scorched', mutationEmoji: '🔥', multiplier: 4, weight: 10 },
  { id: 'windstorm', name: 'Windstorm', emoji: '🌪️', mutation: 'Windblown', mutationEmoji: '💨', multiplier: 2.5, weight: 10 },
  { id: 'fog', name: 'Fog', emoji: '🌫️', mutation: 'Misty', mutationEmoji: '👻', multiplier: 3, weight: 12 },
  { id: 'cherry', name: 'Cherry Blossom', emoji: '🌸', mutation: 'Blooming', mutationEmoji: '🌸', multiplier: 6, weight: 8 },
  { id: 'thunderstorm', name: 'Thunderstorm', emoji: '⛈️', mutation: 'Shocked', mutationEmoji: '⚡', multiplier: 4, weight: 8 },
  { id: 'autumn', name: 'Autumn Wind', emoji: '🍂', mutation: 'Autumn', mutationEmoji: '🍁', multiplier: 3.5, weight: 5 },
  { id: 'snow', name: 'Snow', emoji: '❄️', mutation: 'Frozen', mutationEmoji: '🧊', multiplier: 5, weight: 5 },
  { id: 'fullmoon', name: 'Full Moon', emoji: '🌙', mutation: 'Moonlit', mutationEmoji: '🌙', multiplier: 10, weight: 4 },
  { id: 'rainbow', name: 'Rainbow', emoji: '🌈', mutation: 'Rainbow', mutationEmoji: '🌈', multiplier: 8, weight: 3 },
  { id: 'meteor', name: 'Meteor Shower', emoji: '☄️', mutation: 'Cosmic', mutationEmoji: '☄️', multiplier: 15, weight: 3 },
  { id: 'aurora', name: 'Aurora', emoji: '✨', mutation: 'Aurora', mutationEmoji: '💜', multiplier: 20, weight: 2 },
  { id: 'eclipse', name: 'Eclipse', emoji: '🌌', mutation: 'Eclipse', mutationEmoji: '🌑', multiplier: 25, weight: 1 },
  { id: 'divine', name: 'Divine Weather', emoji: '👑', mutation: 'Divine', mutationEmoji: '✨', multiplier: 50, weight: 0.5 },
];

export const SECRET_MUTATIONS = [
  { id: 'lunar_prism', name: 'Lunar Prism', emoji: '🌌', requires: ['rainbow', 'fullmoon'], bonusMultiplier: 5 },
  { id: 'galactic_storm', name: 'Galactic Storm', emoji: '⚡', requires: ['thunderstorm', 'meteor'], bonusMultiplier: 5 },
  { id: 'crystal', name: 'Crystal', emoji: '💎', requires: ['snow', 'aurora'], bonusMultiplier: 5 },
  { id: 'celestial', name: 'Celestial', emoji: '👑', requires: ['eclipse', 'divine'], bonusMultiplier: 10 },
];

export const WEATHER_CHANGE_INTERVAL = 120000;
export const MUTATION_CHANCE = 0.7;
