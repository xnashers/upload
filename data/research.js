// ===========================================
// Research Lab — Permanent upgrades, exponential cost
// ===========================================
export const RESEARCH_LAB = [
  { id: 'growth_speed', name: 'Growth Speed', emoji: '⚡', desc: '+2% per level', maxLevel: 20 },
  { id: 'weight_research', name: 'Weight Research', emoji: '⚖️', desc: '+1% crop weight', maxLevel: 20 },
  { id: 'harvest_xp', name: 'Harvest XP', emoji: '✨', desc: '+3% XP per harvest', maxLevel: 20 },
  { id: 'mutation_chance', name: 'Mutation Chance', emoji: '🧪', desc: '+0.5% mutation chance', maxLevel: 20 },
  { id: 'fertilizer_boost', name: 'Fertilizer Boost', emoji: '💩', desc: '+2% fertilizer effect', maxLevel: 20 },
];

// Cost: level 1=500, 2=1500, 3=4000, ... 20=10,000,000
// Formula: floor(500 * 3^(level-1) * (1 + level*0.15))
export function getResearchCost(level) {
  if (level <= 0) return 0;
  return Math.floor(500 * Math.pow(3, level - 1) * (1 + level * 0.15));
}

// ===========================================
// Mutation Lab — Enhance mutations
// ===========================================
export const MUTATION_LAB = [
  { id: 'mutation_duration', name: 'Weather Duration', emoji: '⏳', desc: 'Weather lasts 5% longer per level', maxLevel: 20 },
  { id: 'stack_limit', name: 'Mutation Stacking', emoji: '📚', desc: '+1 max mutations per level', maxLevel: 10 },
  { id: 'secret_chance', name: 'Secret Finder', emoji: '🔮', desc: '+2% secret mutation chance', maxLevel: 20 },
];

// Cost: floor(2000 * 3^(level-1) * (1 + level*0.2))
export function getMutationLabCost(level) {
  if (level <= 0) return 0;
  return Math.floor(2000 * Math.pow(3, level - 1) * (1 + level * 0.2));
}

// ===========================================
// Weather Center — Spend peso to manipulate weather
// ===========================================
export const WEATHER_CENTER = {
  forecast: { name: 'Forecast', emoji: '📡', cost: 5000, desc: 'See the next weather event' },
  skip: { name: 'Skip Weather', emoji: '⏭️', cost: 25000, desc: 'Change weather right now' },
  rareBoost: { name: 'Rare Weather Boost', emoji: '🌟', cost: 100000, desc: '+rare weather chance for 10 min', duration: 600000 },
};

// ===========================================
// Seed Genetics — Upgrade crop tiers (same crop, better stats)
// ===========================================
export const GENETICS_TIERS = [
  { tier: 1, name: 'Improved', emoji: '⬆️', priceMultiplier: 1.5 },
  { tier: 2, name: 'Superior', emoji: '🏅', priceMultiplier: 2.25 },
  { tier: 3, name: 'Elite', emoji: '👑', priceMultiplier: 3.375 },
  { tier: 4, name: 'Legendary', emoji: '🌟', priceMultiplier: 5.0625 },
  { tier: 5, name: 'Mythic', emoji: '✨', priceMultiplier: 7.59375 },
];

// Cost to upgrade genetics: cropSeedCost * 100 * 5^currentTier
export function getGeneticsCost(crop, currentTier) {
  return Math.floor(crop.seedCost * 100 * Math.pow(5, currentTier));
}

// ===========================================
// Mastery System — Per-crop mastery levels (max 100)
// ===========================================
export const MASTERY_CONFIG = {
  maxLevel: 100,
  // Bonuses per mastery level:
  weightBonus: 0.005,      // +0.5% weight per level
};

// Cost: floor(cropSeedCost * 20 * 1.08^level * (1 + level*0.05))
export function getMasteryCost(crop, level) {
  if (level <= 0) return 0;
  return Math.floor(crop.seedCost * 20 * Math.pow(1.08, level) * (1 + level * 0.05));
}
