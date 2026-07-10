// Daily Objectives — deterministic generation based on date
function dateSeed(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pickSeeded(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function pickReward(min, max, rng) {
  return Math.floor(min + rng() * (max - min + 1));
}

const EASY = [
  { type: 'harvest', minT: 8, maxT: 15, minR: 100, maxR: 300, minTk: 5, maxTk: 10, label: 'Harvest {target} crops' },
  { type: 'plant', minT: 8, maxT: 15, minR: 100, maxR: 250, minTk: 5, maxTk: 8, label: 'Plant {target} seeds' },
  { type: 'sell', minT: 8, maxT: 15, minR: 150, maxR: 300, minTk: 5, maxTk: 10, label: 'Sell {target} crops' },
  { type: 'weight', minT: 3, maxT: 8, minR: 100, maxR: 300, minTk: 5, maxTk: 10, label: 'Harvest {target}kg of crops' },
  { type: 'buy_fertilizer', minT: 2, maxT: 5, minR: 100, maxR: 200, minTk: 5, maxTk: 8, label: 'Buy {target} fertilizers' },
  { type: 'buy_sprinkler', minT: 1, maxT: 1, minR: 150, maxR: 300, minTk: 8, maxTk: 12, label: 'Buy {target} sprinkler' },
];

const MEDIUM = [
  { type: 'harvest', minT: 30, maxT: 60, minR: 300, maxR: 800, minTk: 10, maxTk: 25, label: 'Harvest {target} crops' },
  { type: 'sell_amount', minT: 1500, maxT: 3000, minR: 400, maxR: 800, minTk: 15, maxTk: 25, label: 'Sell ₱{target} worth' },
  { type: 'weight', minT: 30, maxT: 60, minR: 300, maxR: 700, minTk: 10, maxTk: 20, label: 'Harvest {target}kg' },
  { type: 'different_crops', minT: 3, maxT: 6, minR: 400, maxR: 800, minTk: 15, maxTk: 25, label: 'Grow {target} different crops' },
  { type: 'mutated_harvests', minT: 2, maxT: 5, minR: 400, maxR: 800, minTk: 15, maxTk: 25, label: 'Harvest {target} mutated crops' },
  { type: 'buy_fertilizer', minT: 5, maxT: 15, minR: 300, maxR: 600, minTk: 10, maxTk: 20, label: 'Use {target} fertilizers' },
];

const HARD = [
  { type: 'harvest', minT: 100, maxT: 250, minR: 800, maxR: 2000, minTk: 25, maxTk: 50, label: 'Harvest {target} crops' },
  { type: 'sell_amount', minT: 5000, maxT: 15000, minR: 1000, maxR: 2000, minTk: 30, maxTk: 50, label: 'Sell ₱{target}' },
  { type: 'premium_mutation', minT: 1, maxT: 1, minR: 1000, maxR: 2000, minTk: 40, maxTk: 60, label: 'Obtain a Premium mutation' },
  { type: 'secret_mutation', minT: 1, maxT: 1, minR: 1000, maxR: 2000, minTk: 40, maxTk: 60, label: 'Trigger a Secret Mutation' },
  { type: 'weight', minT: 200, maxT: 600, minR: 1000, maxR: 2000, minTk: 30, maxTk: 50, label: 'Harvest {target}kg' },
  { type: 'buy_sprinkler', minT: 3, maxT: 6, minR: 800, maxR: 1500, minTk: 25, maxTk: 40, label: 'Buy {target} sprinklers' },
];

export function generateDailyObjectives(dateStr) {
  const seed = dateSeed(dateStr);
  const rng = seededRandom(seed);
  const pick = (pool) => {
    const t = pickSeeded(pool, rng);
    const target = pickReward(t.minT, t.maxT, rng);
    const reward = pickReward(t.minR, t.maxR, rng);
    const tokens = pickReward(t.minTk, t.maxTk, rng);
    return {
      type: t.type, target, reward, tokens,
      label: t.label.replace('{target}', target.toLocaleString()),
      current: 0, completed: false, claimed: false,
    };
  };
  return [pick(EASY), pick(MEDIUM), pick(HARD)];
}

export const CHEST_REWARDS = [
  { type: 'peso', amount: 1000, chance: 35, label: '₱1,000', emoji: '💰' },
  { type: 'fertilizer', amount: 10, chance: 25, label: 'Fertilizer ×10', emoji: '💩' },
  { type: 'sprinkler', tier: 1, amount: 3, chance: 15, label: 'Basic Sprinkler ×3', emoji: '💧' },
  { type: 'sprinkler', tier: 2, amount: 2, chance: 10, label: 'Advanced Sprinkler ×2', emoji: '💦' },
  { type: 'sprinkler', tier: 3, amount: 1, chance: 8, label: 'Golden Sprinkler ×1', emoji: '🌈' },
  { type: 'premium_seed_pack', amount: 1, chance: 5, label: 'Premium Seed Pack', emoji: '📦' },
  { type: 'weather_ticket', amount: 1, chance: 2, label: 'Weather Ticket', emoji: '🎫' },
];

export const CRATE_REWARDS = [
  { type: 'peso', amount: 5000, chance: 30, label: '₱5,000', emoji: '💰' },
  { type: 'fertilizer', amount: 25, chance: 20, label: 'Fertilizer ×25', emoji: '💩' },
  { type: 'sprinkler', tier: 3, amount: 3, chance: 15, label: 'Golden Sprinkler ×3', emoji: '🌈' },
  { type: 'premium_seed_pack', amount: 2, chance: 15, label: 'Premium Seed Pack ×2', emoji: '📦' },
  { type: 'weather_ticket', amount: 2, chance: 10, label: 'Weather Ticket ×2', emoji: '🎫' },
  { type: 'random_premium_seed', amount: 5, chance: 7, label: 'Random Premium Seed ×5', emoji: '🌱' },
  { type: 'divine_seed_pack', amount: 1, chance: 3, label: '🌟 Divine Seed Pack', emoji: '🌟' },
];

export function rollReward(pool) {
  const total = pool.reduce((s, r) => s + r.chance, 0);
  let roll = Math.random() * total;
  for (const r of pool) {
    roll -= r.chance;
    if (roll <= 0) return r;
  }
  return pool[0];
}
