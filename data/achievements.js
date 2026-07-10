export const ACHIEVEMENTS = [
  // Farming
  { id: 'beginner_farmer', name: 'Beginner Farmer', emoji: '🌱', cat: 'farming', desc: 'Harvest 100 crops', check: s => s.totalHarvests >= 100, reward: { type: 'peso', amount: 500 }, title: null },
  { id: 'green_thumb', name: 'Green Thumb', emoji: '🌿', cat: 'farming', desc: 'Harvest 1,000 crops', check: s => s.totalHarvests >= 1000, reward: { type: 'peso', amount: 5000 }, title: null },
  { id: 'harvest_king', name: 'Harvest King', emoji: '👑', cat: 'farming', desc: 'Harvest 10,000 crops', check: s => s.totalHarvests >= 10000, reward: { type: 'peso', amount: 50000 }, title: null },
  { id: 'pocket_legend', name: 'Pocket Legend', emoji: '🌟', cat: 'farming', desc: 'Harvest 100,000 crops', check: s => s.totalHarvests >= 100000, reward: { type: 'tokens', amount: 200 }, title: 'pocket_legend' },

  // Money
  { id: 'first_earnings', name: 'First Earnings', emoji: '💵', cat: 'money', desc: 'Earn ₱1,000 total', check: s => s.totalEarned >= 1000, reward: { type: 'fertilizer', amount: 5 }, title: null },
  { id: 'rich_farmer', name: 'Rich Farmer', emoji: '💰', cat: 'money', desc: 'Earn ₱100,000 total', check: s => s.totalEarned >= 100000, reward: { type: 'sprinkler', tier: 2, amount: 5 }, title: null },
  { id: 'millionaire', name: 'Millionaire', emoji: '💎', cat: 'money', desc: 'Earn ₱1,000,000 total', check: s => s.totalEarned >= 1000000, reward: { type: 'sprinkler', tier: 3, amount: 10 }, title: null },
  { id: 'billionaire', name: 'Billionaire', emoji: '🤑', cat: 'money', desc: 'Earn ₱100,000,000 total', check: s => s.totalEarned >= 100000000, reward: { type: 'tokens', amount: 200 }, title: 'millionaire' },

  // Mutations
  { id: 'first_mutation', name: 'First Mutation', emoji: '🧬', cat: 'mutations', desc: 'Obtain 1 mutation', check: s => s.totalMutations >= 1, reward: { type: 'peso', amount: 500 }, title: null },
  { id: 'mutation_hunter', name: 'Mutation Hunter', emoji: '🎯', cat: 'mutations', desc: 'Obtain 100 mutations', check: s => s.totalMutations >= 100, reward: { type: 'premium_seed_pack', amount: 1 }, title: null },
  { id: 'mutation_master', name: 'Mutation Master', emoji: '🧪', cat: 'mutations', desc: 'Obtain 500 mutations', check: s => s.totalMutations >= 500, reward: { type: 'weather_ticket', amount: 5 }, title: null },
  { id: 'mutation_god', name: 'Mutation God', emoji: '🌈', cat: 'mutations', desc: 'Obtain 5,000 mutations', check: s => s.totalMutations >= 5000, reward: { type: 'tokens', amount: 200 }, title: 'mutation_master' },

  // Weather
  { id: 'rain_watcher', name: 'Rain Watcher', emoji: '🌧️', cat: 'weather', desc: 'Experience 20 weather changes', check: s => s.weatherChangesExperienced >= 20, reward: { type: 'peso', amount: 1000 }, title: null },
  { id: 'weather_expert', name: 'Weather Expert', emoji: '🌦️', cat: 'weather', desc: 'Experience every weather type', check: s => (s.weatherTypesExperienced || []).length >= 15, reward: { type: 'sprinkler', tier: 3, amount: 5 }, title: 'weather_chaser' },
  { id: 'divine_witness', name: 'Divine Witness', emoji: '👑', cat: 'weather', desc: 'Experience Divine Weather', check: s => (s.weatherTypesExperienced || []).includes('divine'), reward: { type: 'premium_seed_pack', amount: 3 }, title: null },

  // Crop Collection
  { id: 'collector', name: 'Collector', emoji: '📚', cat: 'collection', desc: 'Harvest every Starter crop', check: s => ['kangkong','pechay','mustasa','sitaw','talong'].every(id => (s.cropsHarvested || {})[id] > 0), reward: { type: 'peso', amount: 1000 }, title: 'crop_specialist' },
  { id: 'expert_farmer', name: 'Expert Farmer', emoji: '🌾', cat: 'collection', desc: 'Harvest every Intermediate crop', check: s => ['kamatis','kalabasa','mais','palay','ampalaya'].every(id => (s.cropsHarvested || {})[id] > 0), reward: { type: 'peso', amount: 5000 }, title: null },
  { id: 'master_farmer', name: 'Master Farmer', emoji: '🌿', cat: 'collection', desc: 'Harvest every Advanced crop', check: s => ['sibuyas','bawang','kamote','gabi'].every(id => (s.cropsHarvested || {})[id] > 0), reward: { type: 'peso', amount: 15000 }, title: null },
  { id: 'legend_farmer', name: 'Legend Farmer', emoji: '💎', cat: 'collection', desc: 'Harvest every Premium crop', check: s => ['mangga','calamansi','dragonfruit','durian','mangosteen'].every(id => (s.cropsHarvested || {})[id] > 0), reward: { type: 'tokens', amount: 150 }, title: 'legend_farmer' },

  // Level
  { id: 'level_10', name: 'Level 10', emoji: '⭐', cat: 'level', desc: 'Reach Level 10', check: (s, p) => p.level >= 10, reward: { type: 'peso', amount: 2000 }, title: null },
  { id: 'level_25', name: 'Level 25', emoji: '🌟', cat: 'level', desc: 'Reach Level 25', check: (s, p) => p.level >= 25, reward: { type: 'premium_seed_pack', amount: 1 }, title: null },
  { id: 'level_50', name: 'Level 50', emoji: '💫', cat: 'level', desc: 'Reach Level 50', check: (s, p) => p.level >= 50, reward: { type: 'sprinkler', tier: 3, amount: 5 }, title: null },
  { id: 'level_100', name: 'Level 100', emoji: '🏆', cat: 'level', desc: 'Reach Level 100', check: (s, p) => p.level >= 100, reward: { type: 'tokens', amount: 200 }, title: 'pocket_farm_legend' },
];

export const ACHIEVEMENT_CATEGORIES = [
  { id: 'farming', name: '🌾 Farming' },
  { id: 'money', name: '💰 Money' },
  { id: 'mutations', name: '🧬 Mutations' },
  { id: 'weather', name: '🌦️ Weather' },
  { id: 'collection', name: '📚 Collection' },
  { id: 'level', name: '⭐ Level' },
];

export const TITLE_DISPLAY = {
  pocket_legend: { name: 'Pocket Legend', emoji: '🌟' },
  millionaire: { name: 'Millionaire', emoji: '💰' },
  mutation_master: { name: 'Mutation Master', emoji: '🧪' },
  legend_farmer: { name: 'Legend Farmer', emoji: '💎' },
  pocket_farm_legend: { name: 'Pocket Farm Legend', emoji: '🏆' },
  weather_chaser: { name: 'Weather Chaser', emoji: '🌦️' },
  crop_specialist: { name: 'Crop Specialist', emoji: '🌾' },
};
