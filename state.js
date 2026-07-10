import { CROPS } from './data/crops.js';
import { LEVELS, getLevelReward } from './data/levels.js';
import { SPRINKLERS } from './data/gear.js';
import { WEATHER_TYPES, SECRET_MUTATIONS, WEATHER_CHANGE_INTERVAL, MUTATION_CHANCE } from './data/weather.js';
import { loadGame, saveGame } from './storage.js';
import { RESEARCH_LAB, MUTATION_LAB, WEATHER_CENTER, GENETICS_TIERS, MASTERY_CONFIG, getResearchCost, getMutationLabCost, getGeneticsCost, getMasteryCost } from './data/research.js';
import { generateDailyObjectives, CHEST_REWARDS, CRATE_REWARDS, rollReward } from './data/objectives.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { LOGIN_CYCLE, MONTHLY_MILESTONES } from './data/login-rewards.js';

class GameState {
  constructor() {
    this.player = { peso: 100, xp: 0, level: 1, farmName: '' };
    this.plots = [];
    this.seeds = {};
    this.inventory = {};
    this.gear = {
      fertilizerCount: 0,
      sprinklerInventory: [],
      activeSprinkler: null,
    };
    this.boughtPlots = 0;
    this.isNewPlayer = false;
    this.currentWeather = null;
    this.lastWeatherChange = 0;
    this.cropAvailability = {};
    this.lastAvailabilityRefresh = 0;
    this.sprinklerAvailability = {};
    this.lastSprinklerRefresh = 0;
    this.listeners = [];
    this.events = {};
    this.researchLevels = {};
    this.mutationLabLevels = {};
    this.cropGenetics = {};
    this.cropMastery = {};
    this.weatherBoostExpiresAt = 0;
    this.forecastResult = null;
    this.farmerTokens = 0;
    this.titles = { owned: [], active: null };
    this.giftCrates = 0;
    this.weatherTickets = 0;
    this.stats = {
      totalHarvests: 0, totalPlanted: 0, totalSold: 0, totalEarned: 0,
      totalWeightHarvested: 0, totalMutations: 0, totalFertilizersBought: 0,
      totalSprinklersBought: 0, weatherChangesExperienced: 0,
      cropsHarvested: {}, weatherTypesExperienced: [],
      secretMutationsObtained: 0, premiumMutationsObtained: 0,
    };
    this.dailyStats = {
      date: '', harvests: 0, planted: 0, sold: 0, sellAmount: 0,
      weightHarvested: 0, fertilizersBought: 0, sprinklersBought: 0,
      mutatedHarvests: 0, differentCrops: [], premiumMutations: 0, secretMutations: 0,
    };
    this.dailyObjectives = { date: '', objectives: [], chestClaimed: false };
    this.achievements = {};
    this.loginRewards = { lastLoginDate: '', streak: 0, totalLoginDays: 0, monthlyClaimed: {} };
    this.pendingLoginReward = null;
    this.levelRewardsClaimed = {};
  }

  async init() {
    const saved = await loadGame();
    if (saved) {
      this.player = { ...this.player, ...saved.player };
      if (this.player.coins !== undefined) {
        this.player.peso = this.player.coins;
        delete this.player.coins;
      }
      this.plots = (saved.plots || []).map(p => ({
        ...p,
        mutations: p.mutations || [],
        fertilized: p.fertilized || false,
        harvestCount: p.harvestCount || 0,
      }));
      for (const plot of this.plots) {
        if (plot.cropId && !this.getCrop(plot.cropId)) {
          plot.status = 'empty';
          plot.cropId = null;
          plot.plantedAt = null;
          plot.harvestAt = null;
          plot.mutations = [];
          plot.fertilized = false;
          plot.harvestCount = 0;
        }
      }
      this.seeds = saved.seeds || {};
      for (const cropId of Object.keys(this.seeds)) {
        if (!this.getCrop(cropId)) delete this.seeds[cropId];
      }
      if (saved.gear) {
        this.gear.fertilizerCount = saved.gear.fertilizerCount || 0;
        if (saved.gear.sprinklerInventory) {
          this.gear.sprinklerInventory = saved.gear.sprinklerInventory;
        } else if (saved.gear.sprinklerLevel && saved.gear.sprinklerLevel > 0) {
          const sp = SPRINKLERS.find(s => s.tier === saved.gear.sprinklerLevel);
          if (sp) {
            this.gear.sprinklerInventory = [{ tier: sp.tier, duration: sp.duration }];
          }
        }
        this.gear.activeSprinkler = saved.gear.activeSprinkler || null;
      }
      this.boughtPlots = saved.boughtPlots || 0;
      this.currentWeather = saved.currentWeather || null;
      this.lastWeatherChange = saved.lastWeatherChange || 0;
      this.cropAvailability = this._migrateAvailability(saved.cropAvailability || {});
      this.lastAvailabilityRefresh = saved.lastAvailabilityRefresh || 0;
      this.sprinklerAvailability = this._migrateSprinklerAvailability(saved.sprinklerAvailability || {});
      this.lastSprinklerRefresh = saved.lastSprinklerRefresh || 0;
      if (saved.inventory) {
        this.inventory = this._migrateInventory(saved.inventory);
      }
      this.researchLevels = saved.researchLevels || {};
      this.mutationLabLevels = saved.mutationLabLevels || {};
      this.cropGenetics = saved.cropGenetics || {};
      this.cropMastery = saved.cropMastery || {};
      this.weatherBoostExpiresAt = saved.weatherBoostExpiresAt || 0;
      this.forecastResult = saved.forecastResult || null;
      this.farmerTokens = saved.farmerTokens || 0;
      this.titles = saved.titles || { owned: [], active: null };
      this.giftCrates = saved.giftCrates || 0;
      this.weatherTickets = saved.weatherTickets || 0;
      this.stats = {
        ...this.stats, ...saved.stats,
        cropsHarvested: saved.stats?.cropsHarvested || {},
        weatherTypesExperienced: saved.stats?.weatherTypesExperienced || [],
      };
      this.dailyStats = {
        ...this.dailyStats, ...saved.dailyStats,
        differentCrops: saved.dailyStats?.differentCrops || [],
      };
      this.dailyObjectives = saved.dailyObjectives || { date: '', objectives: [], chestClaimed: false };
      this.achievements = saved.achievements || {};
      this.loginRewards = saved.loginRewards || { lastLoginDate: '', streak: 0, totalLoginDays: 0, monthlyClaimed: {} };
      this.levelRewardsClaimed = saved.levelRewardsClaimed || {};
    } else {
      this.isNewPlayer = true;
      this._giveStarterSeeds();
    }
    this._initPlots();
    this._processOfflineGrowth();
    this._checkWeather();
    this._refreshCropAvailability();
    this._refreshSprinklerAvailability();
    this._ensureDailyReset();
    this.pendingLoginReward = this._checkLoginReward();
    this.notify();
  }

  _giveStarterSeeds() {
    this.seeds = { kangkong: 5, pechay: 3, mustasa: 2 };
  }

  _migrateInventory(inv) {
    const migrated = {};
    for (const [cropId, value] of Object.entries(inv)) {
      if (!this.getCrop(cropId)) continue;
      if (Array.isArray(value)) {
        const filtered = value.filter(item => {
          if (item && typeof item === 'object' && typeof item.weight === 'number' && item.weight > 0) {
            if (!item.mutations) item.mutations = [];
            return true;
          }
          if (typeof item === 'number' && item > 0) return true;
          return false;
        });
        if (filtered.length > 0) {
          migrated[cropId] = filtered.map(item =>
            typeof item === 'number' ? { weight: item, mutations: [] } : item
          );
        }
      }
    }
    return migrated;
  }

  _migrateAvailability(data) {
    const STOCK = { starter: 5, intermediate: 3, advanced: 1, premium: 1 };
    const migrated = {};
    for (const [cropId, entry] of Object.entries(data)) {
      if (entry && typeof entry.stockRemaining === 'number') {
        migrated[cropId] = entry; // Already new format
      } else if (entry && typeof entry.available === 'boolean') {
        // Old format: convert to stock-based
        const crop = this.getCrop(cropId);
        const maxStock = crop ? (STOCK[crop.category] || 3) : 3;
        migrated[cropId] = { stockRemaining: entry.available ? maxStock : 0, expiresAt: entry.expiresAt };
      }
    }
    return migrated;
  }

  _migrateSprinklerAvailability(data) {
    const STOCK = { 1: 3, 2: 2, 3: 1 };
    const migrated = {};
    for (const [key, entry] of Object.entries(data)) {
      if (entry && typeof entry.stockRemaining === 'number') {
        migrated[key] = entry; // Already new format
      } else if (entry && typeof entry.available === 'boolean') {
        // Old format: convert to stock-based
        const maxStock = STOCK[key] || (key === 'fertilizer' ? 5 : 1);
        migrated[key] = { stockRemaining: entry.available ? maxStock : 0, expiresAt: entry.expiresAt };
      }
    }
    return migrated;
  }

  _initPlots() {
    const count = this.getPlotCount();
    while (this.plots.length < count) {
      this.plots.push({ id: this.plots.length, status: 'empty', cropId: null, plantedAt: null, harvestAt: null, mutations: [], fertilized: false, harvestCount: 0 });
    }
  }

  getPlotCount() {
    return 4 + (this.player.level - 1) * 2 + this.boughtPlots;
  }

  _processOfflineGrowth() {
    const now = Date.now();
    for (const plot of this.plots) {
      if (plot.status === 'growing' && plot.harvestAt && now >= plot.harvestAt) {
        plot.status = 'ready';
      }
    }
  }

  _updatePlotStatuses() {
    const now = Date.now();
    for (const plot of this.plots) {
      if (plot.status === 'growing' && plot.harvestAt && now >= plot.harvestAt) {
        plot.status = 'ready';
      }
    }
  }

  updatePlotStatuses() {
    this._updatePlotStatuses();
  }

  getCrop(cropId) {
    return CROPS.find(c => c.id === cropId);
  }

  isCropUnlocked(cropId) {
    return this.isCropAvailable(cropId);
  }

  isCropAvailable(cropId) {
    const entry = this.cropAvailability[cropId];
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this._refreshCropAvailability();
      return (this.cropAvailability[cropId]?.stockRemaining || 0) > 0;
    }
    return (entry.stockRemaining || 0) > 0;
  }

  getSeedStock(cropId) {
    const entry = this.cropAvailability[cropId];
    if (!entry) return 0;
    if (Date.now() > entry.expiresAt) {
      this._refreshCropAvailability();
      return this.cropAvailability[cropId]?.stockRemaining || 0;
    }
    return entry.stockRemaining || 0;
  }

  _refreshCropAvailability() {
    const AVAILABILITY_DURATION = 5 * 60 * 1000;
    const now = Date.now();
    const expiresAt = now + AVAILABILITY_DURATION;
    const STOCK = { starter: 5, intermediate: 3, advanced: 1, premium: 1 };
    let changed = false;

    // Helper to refresh a whole category at once
    const refreshCategory = (category) => {
      const catCrops = CROPS.filter(c => c.category === category);
      const needsRefresh = catCrops.some(c => {
        const ex = this.cropAvailability[c.id];
        return !ex || now >= ex.expiresAt;
      });
      if (!needsRefresh) return;
      const availableCount = Math.max(1, Math.round(catCrops.length * 0.3));
      const shuffled = [...catCrops].sort(() => Math.random() - 0.5);
      const availableIds = new Set(shuffled.slice(0, availableCount).map(c => c.id));
      for (const c of catCrops) {
        this.cropAvailability[c.id] = availableIds.has(c.id)
          ? { stockRemaining: STOCK[c.category], expiresAt }
          : { stockRemaining: 0, expiresAt };
      }
      changed = true;
    };

    // 30% availability for Advanced & Premium
    refreshCategory('advanced');
    refreshCategory('premium');

    // Starter & Intermediate: all available with fixed stock
    for (const crop of CROPS) {
      if (crop.category === 'advanced' || crop.category === 'premium') continue;
      const existing = this.cropAvailability[crop.id];
      if (existing && now < existing.expiresAt) continue;
      const stock = STOCK[crop.category] || 3;
      this.cropAvailability[crop.id] = { stockRemaining: stock, expiresAt };
      changed = true;
    }

    if (changed) {
      this.lastAvailabilityRefresh = now;
      this.save();
    }
  }

  getAvailabilityTimeRemaining() {
    const entries = Object.values(this.cropAvailability);
    if (entries.length === 0) return 0;
    const nextExpiry = Math.min(...entries.map(e => e.expiresAt));
    return Math.max(0, nextExpiry - Date.now());
  }

  isSprinklerAvailable(tier) {
    const entry = this.sprinklerAvailability[tier];
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this._refreshSprinklerAvailability();
      return (this.sprinklerAvailability[tier]?.stockRemaining || 0) > 0;
    }
    return (entry.stockRemaining || 0) > 0;
  }

  getSprinklerStock(tier) {
    const entry = this.sprinklerAvailability[tier];
    if (!entry) return 0;
    if (Date.now() > entry.expiresAt) {
      this._refreshSprinklerAvailability();
      return this.sprinklerAvailability[tier]?.stockRemaining || 0;
    }
    return entry.stockRemaining || 0;
  }

  _refreshSprinklerAvailability() {
    const SPRINKLER_DURATION = 5 * 60 * 1000;
    const now = Date.now();
    const expiresAt = now + SPRINKLER_DURATION;
    const STOCK = { 1: 3, 2: 2, 3: 1 };
    const FERT_STOCK = 5;
    let changed = false;
    for (const sp of SPRINKLERS) {
      const existing = this.sprinklerAvailability[sp.tier];
      if (existing && now < existing.expiresAt) continue;
      this.sprinklerAvailability[sp.tier] = { stockRemaining: STOCK[sp.tier] || 1, expiresAt };
      changed = true;
    }
    // Fertilizer stock
    const fertExisting = this.sprinklerAvailability.fertilizer;
    if (!fertExisting || now >= fertExisting.expiresAt) {
      this.sprinklerAvailability.fertilizer = { stockRemaining: FERT_STOCK, expiresAt };
      changed = true;
    }
    if (changed) {
      this.lastSprinklerRefresh = now;
      this.save();
    }
  }

  getSprinklerAvailabilityTimeRemaining() {
    const entries = Object.values(this.sprinklerAvailability);
    if (entries.length === 0) return 0;
    const nextExpiry = Math.min(...entries.map(e => e.expiresAt));
    return Math.max(0, nextExpiry - Date.now());
  }

  getActiveSprinkler() {
    if (!this.gear.activeSprinkler) return null;
    if (Date.now() >= this.gear.activeSprinkler.expiresAt) {
      this.gear.activeSprinkler = null;
      this.save();
      return null;
    }
    return this.gear.activeSprinkler;
  }

  getActiveSprinklerTimeRemaining() {
    const active = this.getActiveSprinkler();
    if (!active) return 0;
    return Math.max(0, active.expiresAt - Date.now());
  }

  useSprinkler(inventoryIndex) {
    const item = this.gear.sprinklerInventory[inventoryIndex];
    if (!item) return false;
    if (this.getActiveSprinkler()) return false;
    const sp = SPRINKLERS.find(s => s.tier === item.tier);
    if (!sp) return false;
    this.gear.sprinklerInventory.splice(inventoryIndex, 1);
    this.gear.activeSprinkler = {
      tier: item.tier,
      expiresAt: Date.now() + (item.duration || sp.duration) * 1000,
    };
    this.save();
    return true;
  }

  getEffectiveGrowTime(cropId) {
    const crop = this.getCrop(cropId);
    if (!crop) return 0;
    const researchBonus = (this.researchLevels.growth_speed || 0) * 0.02;
    const active = this.getActiveSprinkler();
    const sp = active ? SPRINKLERS.find(s => s.tier === active.tier) : null;
    const bonus = sp ? sp.speedBonus : 0;
    return Math.max(1, Math.floor(crop.growTime * (1 - bonus) * (1 - researchBonus)));
  }

  // === Seeds ===
  buySeed(cropId, quantity = 1) {
    const crop = this.getCrop(cropId);
    if (!crop || !this.isCropAvailable(cropId)) return false;
    const stock = this.getSeedStock(cropId);
    const maxBuy = Math.min(quantity, stock);
    if (maxBuy <= 0) return false;
    const totalCost = crop.seedCost * maxBuy;
    if (this.player.peso < totalCost) return false;
    this.player.peso -= totalCost;
    this.seeds[cropId] = (this.seeds[cropId] || 0) + maxBuy;
    // Decrement stock
    const entry = this.cropAvailability[cropId];
    if (entry) entry.stockRemaining = Math.max(0, (entry.stockRemaining || 0) - maxBuy);
    this.save();
    return maxBuy;
  }

  // === Planting ===
  plantCrop(plotIndex, cropId) {
    const plot = this.plots[plotIndex];
    if (!plot || plot.status !== 'empty') return false;
    if (!this.seeds[cropId] || this.seeds[cropId] <= 0) return false;
    if (!this.getCrop(cropId)) return false;
    // Weather planting restrictions
    const blockInfo = this.getWeatherPlantingBlock(cropId);
    if (blockInfo.blocked) return { success: false, reason: 'weather_blocked', message: blockInfo.message };
    this.seeds[cropId]--;
    if (this.seeds[cropId] <= 0) delete this.seeds[cropId];
    const now = Date.now();
    const growMs = this.getEffectiveGrowTime(cropId) * 1000;
    plot.status = 'growing';
    plot.cropId = cropId;
    plot.plantedAt = now;
    plot.harvestAt = now + growMs;
    plot.mutations = [];
    plot.fertilized = false;
    plot.harvestCount = 0;
    // Track planting for daily objectives
    this._trackObjective('plant');
    this.stats.totalPlanted++;
    this.save();
    return { success: true };
  }

  // === Harvesting ===
  harvestCrop(plotIndex) {
    const plot = this.plots[plotIndex];
    if (!plot || !plot.cropId) return null;
    if (plot.status === 'growing' && plot.harvestAt && Date.now() >= plot.harvestAt) {
      plot.status = 'ready';
    }
    if (plot.status !== 'ready') return null;
    const crop = this.getCrop(plot.cropId);
    if (!crop) return null;

    const active = this.getActiveSprinkler();
    const sp = active ? SPRINKLERS.find(s => s.tier === active.tier) : null;
    const doubleChance = sp && sp.doubleHarvestBonus ? sp.doubleHarvestBonus * 100 : 0;
    const isDouble = Math.random() * 100 < doubleChance;
    const qty = isDouble ? 2 : 1;

    const items = [];
    for (let i = 0; i < qty; i++) {
      const w = this._generateWeight(crop, plot.fertilized, crop.id);
      const item = { weight: w, mutations: [...(plot.mutations || [])] };
      items.push(item);
      if (!this.inventory[crop.id]) this.inventory[crop.id] = [];
      this.inventory[crop.id].push(item);
    }

    this.addXP(crop.xp * qty);

    // Always destroy crop on harvest — player must replant
    plot.status = 'empty';
    plot.cropId = null;
    plot.plantedAt = null;
    plot.harvestAt = null;
    plot.mutations = [];
    plot.fertilized = false;
    plot.harvestCount = 0;

    // Track harvest for stats + objectives
    this.stats.totalHarvests += qty;
    this.stats.totalWeightHarvested += items.reduce((s, i) => s + i.weight, 0);
    this.stats.cropsHarvested[crop.id] = (this.stats.cropsHarvested[crop.id] || 0) + qty;
    this._trackObjective('harvest', qty);
    this._trackObjective('weight', items.reduce((s, i) => s + i.weight, 0));
    this._trackCropHarvested(crop.id);
    if (items.some(i => (i.mutations || []).length > 0)) {
      this.stats.totalMutations += qty;
      this._trackObjective('mutated', qty);
    }

    this.save();
    return { crop, quantity: qty, isDouble, items };
  }

  _generateWeight(crop, fertilized, cropId) {
    const range = crop.maxWeight - crop.minWeight;
    const r = (Math.random() + Math.random() + Math.random()) / 3;
    let weight = crop.minWeight + range * r;
    weight *= 1 + (this.researchLevels.weight_research || 0) * 0.01;
    const masteryLevel = this.cropMastery[cropId] || 0;
    weight *= 1 + masteryLevel * MASTERY_CONFIG.weightBonus;
    if (fertilized) {
      const fertBoost = 1 + (this.researchLevels.fertilizer_boost || 0) * 0.02;
      weight *= 1 + (0.2 + Math.random() * 0.3) * fertBoost;
    }
    return Math.round(weight * 100) / 100;
  }

  // === Fertilizer ===
  fertilizeCrop(plotIndex) {
    const plot = this.plots[plotIndex];
    if (!plot || plot.status !== 'growing' || plot.fertilized) return false;
    if (this.gear.fertilizerCount <= 0) return false;
    this.gear.fertilizerCount--;
    plot.fertilized = true;
    this._trackObjective('fertilizer');
    this.save();
    return true;
  }

  // === Gear ===
  isFertilizerAvailable() {
    const entry = this.sprinklerAvailability.fertilizer;
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this._refreshSprinklerAvailability();
      return (this.sprinklerAvailability.fertilizer?.stockRemaining || 0) > 0;
    }
    return (entry.stockRemaining || 0) > 0;
  }

  getFertilizerStock() {
    const entry = this.sprinklerAvailability.fertilizer;
    if (!entry) return 0;
    if (Date.now() > entry.expiresAt) {
      this._refreshSprinklerAvailability();
      return this.sprinklerAvailability.fertilizer?.stockRemaining || 0;
    }
    return entry.stockRemaining || 0;
  }

  buyFertilizer(quantity = 1) {
    const stock = this.getFertilizerStock();
    const maxBuy = Math.min(quantity, stock);
    if (maxBuy <= 0) return false;
    const cost = 5 * maxBuy;
    if (this.player.peso < cost) return false;
    this.player.peso -= cost;
    this.gear.fertilizerCount += maxBuy;
    // Decrement stock
    const entry = this.sprinklerAvailability.fertilizer;
    if (entry) entry.stockRemaining = Math.max(0, (entry.stockRemaining || 0) - maxBuy);
    this.stats.totalFertilizersBought += maxBuy;
    this._trackObjective('fertilizer', maxBuy);
    this.save();
    return maxBuy;
  }

  buySprinkler(tier) {
    const sp = SPRINKLERS.find(s => s.tier === tier);
    if (!sp) return false;
    if (!this.isSprinklerAvailable(tier)) return false;
    if (this.player.peso < sp.cost) return false;
    this.player.peso -= sp.cost;
    this.gear.sprinklerInventory.push({ tier: sp.tier, duration: sp.duration });
    // Decrement stock
    const entry = this.sprinklerAvailability[tier];
    if (entry) entry.stockRemaining = Math.max(0, (entry.stockRemaining || 0) - 1);
    this.stats.totalSprinklersBought++;
    this._trackObjective('sprinkler');
    this.save();
    return true;
  }

  // === Plots ===
  getPlotPrice() {
    return 20 * Math.pow(2, this.boughtPlots);
  }

  buyPlot() {
    const cost = this.getPlotPrice();
    if (this.player.peso < cost) return false;
    this.player.peso -= cost;
    this.boughtPlots++;
    this.plots.push({ id: this.plots.length, status: 'empty', cropId: null, plantedAt: null, harvestAt: null, mutations: [], fertilized: false, harvestCount: 0 });
    this.save();
    return true;
  }

  // === Mutations ===
  getMutationMultiplier(mutations) {
    if (!mutations || mutations.length === 0) return 1;
    let total = 1;
    for (const m of mutations) {
      total *= m.isSecret ? m.bonusMultiplier : m.multiplier;
    }
    return total;
  }

  getItemSellPrice(cropId, item) {
    const crop = this.getCrop(cropId);
    if (!crop) return 0;
    const geneticsTier = this.cropGenetics[cropId] || 0;
    const geneticsMult = geneticsTier > 0 ? GENETICS_TIERS[geneticsTier - 1].priceMultiplier : 1;
    const masteryLevel = this.cropMastery[cropId] || 0;
    const masteryMult = 1 + masteryLevel * MASTERY_CONFIG.weightBonus;
    const basePrice = Math.floor(crop.sellPrice * item.weight * this.getMutationMultiplier(item.mutations) * geneticsMult * masteryMult);
    const minPrice = crop.seedCost * 5;
    return Math.max(basePrice, minPrice);
  }

  // === Selling ===
  sellCrop(cropId, itemIndex) {
    const items = this.inventory[cropId];
    if (!items || !items[itemIndex]) return null;
    const item = items[itemIndex];
    const price = this.getItemSellPrice(cropId, item);
    items.splice(itemIndex, 1);
    if (items.length === 0) delete this.inventory[cropId];
    this.player.peso += price;
    this.stats.totalSold++;
    this.stats.totalEarned += price;
    this._trackObjective('sold');
    this._trackObjective('sell_amount', price);
    this.save();
    return { amount: price, item };
  }

  sellHeaviest(cropId) {
    const items = this.inventory[cropId];
    if (!items || items.length === 0) return null;
    let maxIdx = 0;
    for (let i = 1; i < items.length; i++) {
      if (items[i].weight > items[maxIdx].weight) maxIdx = i;
    }
    return this.sellCrop(cropId, maxIdx);
  }

  sellAll(cropId) {
    const items = this.inventory[cropId];
    if (!items || items.length === 0) return null;
    let totalAmount = 0;
    const count = items.length;
    for (const item of items) {
      totalAmount += this.getItemSellPrice(cropId, item);
    }
    delete this.inventory[cropId];
    this.player.peso += totalAmount;
    this.stats.totalSold += count;
    this.stats.totalEarned += totalAmount;
    this._trackObjective('sold', count);
    this._trackObjective('sell_amount', totalAmount);
    this.save();
    return { amount: totalAmount, count };
  }

  // === Weather ===
  _checkWeather() {
    this._updatePlotStatuses();
    const now = Date.now();
    if (!this.currentWeather || now - this.lastWeatherChange >= this.getEffectiveWeatherInterval()) {
      this._changeWeather();
    }
  }

  _changeWeather() {
    this.currentWeather = this._pickRandomWeather();
    this.lastWeatherChange = Date.now();
    // Forecast must be purchased — clear stale forecast on weather change
    if (this.forecastResult && Date.now() >= this.forecastResult.expiresAt) {
      this.forecastResult = null;
    }
    const mutChanceResearch = (this.researchLevels.mutation_chance || 0) * 0.005;
    const weatherMutBonus = this.getWeatherMutationBonus();
    const effectiveMutationChance = Math.min(0.95, MUTATION_CHANCE + mutChanceResearch + weatherMutBonus);
    const secretBonus = (this.mutationLabLevels.secret_chance || 0) * 0.02;
    const maxStack = 5 + (this.mutationLabLevels.stack_limit || 0);

    // Track weather change for stats
    this.stats.weatherChangesExperienced++;
    if (!this.stats.weatherTypesExperienced.includes(this.currentWeather.id)) {
      this.stats.weatherTypesExperienced.push(this.currentWeather.id);
    }

    for (const plot of this.plots) {
      if (plot.status === 'ready' && Math.random() < effectiveMutationChance) {
        if (!plot.mutations) plot.mutations = [];
        if (plot.mutations.length < maxStack && !plot.mutations.find(m => m.weatherId === this.currentWeather.id)) {
          plot.mutations.push({
            weatherId: this.currentWeather.id,
            name: this.currentWeather.mutation,
            emoji: this.currentWeather.mutationEmoji,
            multiplier: this.currentWeather.multiplier,
          });
          this._checkSecretMutations(plot, secretBonus);
        }
      }
    }
    this.save();
    this.emit('weatherChange', this.currentWeather);
  }

  _pickRandomWeather() {
    const isRareActive = this.isRareBoostActive();
    const weights = WEATHER_TYPES.map(w => {
      if (isRareActive && w.weight <= 5) return w.weight * 3;
      return w.weight;
    });
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < WEATHER_TYPES.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return WEATHER_TYPES[i];
    }
    return WEATHER_TYPES[0];
  }

  _checkSecretMutations(plot, secretBonus = 0) {
    if (!plot.mutations) return;
    const weatherIds = new Set(plot.mutations.map(m => m.weatherId));
    for (const secret of SECRET_MUTATIONS) {
      if (secret.requires.every(id => weatherIds.has(id))) {
        if (!plot.mutations.find(m => m.weatherId === secret.id)) {
          const secretRoll = Math.random();
          if (secretRoll < (1 + secretBonus)) {
            plot.mutations.push({
              weatherId: secret.id,
              name: secret.name,
              emoji: secret.emoji,
              multiplier: 1,
              isSecret: true,
              bonusMultiplier: secret.bonusMultiplier,
            });
            this.stats.secretMutationsObtained++;
            this._trackObjective('secret_mutation');
          }
        }
      }
    }
  }

  checkAndApplyWeather() {
    this._checkWeather();
  }

  // === Weather Planting Restrictions ===
  getWeatherPlantingBlock(cropId) {
    if (!this.currentWeather) return { blocked: false };
    const crop = this.getCrop(cropId);
    if (!crop) return { blocked: false };
    const w = this.currentWeather;
    // Snow: block premium & advanced crops
    if (w.id === 'snow' && (crop.category === 'premium' || crop.category === 'advanced')) {
      return { blocked: true, message: `${w.emoji} Too cold! ${crop.name} can't be planted during ${w.name}.` };
    }
    // Thunderstorm: block planting (dangerous!)
    if (w.id === 'thunderstorm' && crop.category === 'premium') {
      return { blocked: true, message: `${w.emoji} Lightning danger! Premium crops can't be planted during ${w.name}.` };
    }
    return { blocked: false };
  }

  // Weather mutation bonus (some weather increases mutation chance)
  getWeatherMutationBonus() {
    if (!this.currentWeather) return 0;
    const w = this.currentWeather;
    // Cherry Blossom, Full Moon, Aurora, Divine: +15% mutation chance
    if (['cherry', 'fullmoon', 'aurora', 'divine'].includes(w.id)) return 0.15;
    // Rainbow, Meteor, Eclipse: +10%
    if (['rainbow', 'meteor', 'eclipse'].includes(w.id)) return 0.10;
    return 0;
  }

  // === Farm Name ===
  setFarmName(name) {
    this.player.farmName = (name || '').slice(0, 10).trim();
    this.save();
  }

  getDisplayName() {
    return this.player.farmName ? `${this.player.farmName} Farm` : 'Pocket Farm';
  }

  // === Level ===
  getLevelTitle() {
    const levelData = LEVELS.find(l => l.level === this.player.level);
    return levelData ? levelData.title : 'Newbie';
  }

  addXP(amount) {
    const researchBonus = 1 + (this.researchLevels.harvest_xp || 0) * 0.03;
    const finalXP = Math.floor(amount * researchBonus);
    this.player.xp += finalXP;
    let leveledUp = false;
    while (true) {
      const next = LEVELS.find(l => l.level === this.player.level + 1);
      if (!next || this.player.xp < next.xpRequired) break;
      this.player.level = next.level;
      leveledUp = true;
      this._initPlots();
    }
    if (leveledUp) this.emit('levelup', this.player.level);
    return leveledUp;
  }

  getNextLevelXP() {
    const next = LEVELS.find(l => l.level === this.player.level + 1);
    return next ? next.xpRequired : null;
  }

  getCurrentLevelXP() {
    const current = LEVELS.find(l => l.level === this.player.level);
    return current ? current.xpRequired : 0;
  }

  // =============================================
  // RESEARCH LAB
  // =============================================
  getResearchLevel(id) {
    return this.researchLevels[id] || 0;
  }

  getResearchEffect(id) {
    const level = this.getResearchLevel(id);
    const defs = { growth_speed: 2, weight_research: 1, harvest_xp: 3, mutation_chance: 0.5, fertilizer_boost: 2 };
    return level * (defs[id] || 0);
  }

  buyResearch(id, config) {
    const level = this.getResearchLevel(id);
    if (level >= config.maxLevel) return { success: false, reason: 'max' };
    const cost = getResearchCost(level + 1);
    if (this.player.peso < cost) return { success: false, reason: 'cost' };
    this.player.peso -= cost;
    this.researchLevels[id] = level + 1;
    this.save();
    return { success: true, level: level + 1, cost };
  }

  // =============================================
  // MUTATION LAB
  // =============================================
  getMutationLabLevel(id) {
    return this.mutationLabLevels[id] || 0;
  }

  getMutationLabEffect(id) {
    const level = this.getMutationLabLevel(id);
    if (id === 'mutation_duration') return level * 5;
    if (id === 'stack_limit') return level;
    if (id === 'secret_chance') return level * 2;
    return 0;
  }

  buyMutationLab(id, config) {
    const level = this.getMutationLabLevel(id);
    if (level >= config.maxLevel) return { success: false, reason: 'max' };
    const cost = getMutationLabCost(level + 1);
    if (this.player.peso < cost) return { success: false, reason: 'cost' };
    this.player.peso -= cost;
    this.mutationLabLevels[id] = level + 1;
    this.save();
    return { success: true, level: level + 1, cost };
  }

  getEffectiveWeatherInterval() {
    const durationBonus = (this.mutationLabLevels.mutation_duration || 0) * 0.05;
    return Math.floor(WEATHER_CHANGE_INTERVAL * (1 + durationBonus));
  }

  getWeatherTimeRemaining() {
    if (!this.currentWeather) return 0;
    return Math.max(0, this.getEffectiveWeatherInterval() - (Date.now() - this.lastWeatherChange));
  }

  // =============================================
  // WEATHER CENTER
  // =============================================
  forecastWeather() {
    if (this.player.peso < WEATHER_CENTER.forecast.cost) return { success: false, reason: 'cost' };
    this.player.peso -= WEATHER_CENTER.forecast.cost;
    const next = this._pickRandomWeather();
    this.forecastResult = { weatherId: next.id, emoji: next.emoji, name: next.name, expiresAt: Date.now() + this.getEffectiveWeatherInterval(), purchased: true };
    this.save();
    return { success: true, weather: this.forecastResult };
  }

  skipWeather() {
    if (this.player.peso < WEATHER_CENTER.skip.cost) return { success: false, reason: 'cost' };
    this.player.peso -= WEATHER_CENTER.skip.cost;
    this._changeWeather();
    this.save();
    return { success: true, weather: this.currentWeather };
  }

  activateRareBoost() {
    if (this.player.peso < WEATHER_CENTER.rareBoost.cost) return { success: false, reason: 'cost' };
    if (Date.now() < this.weatherBoostExpiresAt) return { success: false, reason: 'active' };
    this.player.peso -= WEATHER_CENTER.rareBoost.cost;
    this.weatherBoostExpiresAt = Date.now() + WEATHER_CENTER.rareBoost.duration;
    this.save();
    return { success: true, expiresAt: this.weatherBoostExpiresAt };
  }

  isRareBoostActive() {
    return Date.now() < this.weatherBoostExpiresAt;
  }

  getRareBoostTimeRemaining() {
    return Math.max(0, this.weatherBoostExpiresAt - Date.now());
  }

  // =============================================
  // SEED GENETICS
  // =============================================
  getCropGeneticsTier(cropId) {
    return this.cropGenetics[cropId] || 0;
  }

  upgradeCropGenetics(cropId) {
    const crop = this.getCrop(cropId);
    if (!crop) return { success: false, reason: 'invalid' };
    const currentTier = this.getCropGeneticsTier(cropId);
    if (currentTier >= GENETICS_TIERS.length) return { success: false, reason: 'max' };
    const cost = getGeneticsCost(crop, currentTier);
    if (this.player.peso < cost) return { success: false, reason: 'cost' };
    this.player.peso -= cost;
    this.cropGenetics[cropId] = currentTier + 1;
    this.save();
    return { success: true, tier: currentTier + 1, cost };
  }

  getCropGeneticsBonus(cropId) {
    const tier = this.getCropGeneticsTier(cropId);
    if (tier <= 0) return 1;
    return GENETICS_TIERS[tier - 1].priceMultiplier;
  }

  // =============================================
  // MASTERY SYSTEM
  // =============================================
  getCropMasteryLevel(cropId) {
    return this.cropMastery[cropId] || 0;
  }

  getCropMasteryBonus(cropId) {
    const level = this.getCropMasteryLevel(cropId);
    return {
      weightBonus: level * MASTERY_CONFIG.weightBonus * 100,
    };
  }

  upgradeCropMastery(cropId) {
    const crop = this.getCrop(cropId);
    if (!crop) return { success: false, reason: 'invalid' };
    const level = this.getCropMasteryLevel(cropId);
    if (level >= MASTERY_CONFIG.maxLevel) return { success: false, reason: 'max' };
    const cost = getMasteryCost(crop, level + 1);
    if (this.player.peso < cost) return { success: false, reason: 'cost' };
    this.player.peso -= cost;
    this.cropMastery[cropId] = level + 1;
    this.save();
    return { success: true, level: level + 1, cost };
  }

  getResearchBonusesSummary() {
    const speedBonus = (this.researchLevels.growth_speed || 0) * 2;
    const weightBonus = (this.researchLevels.weight_research || 0) * 1;
    const xpBonus = (this.researchLevels.harvest_xp || 0) * 3;
    const mutBonus = (this.researchLevels.mutation_chance || 0) * 0.5;
    const fertBonus = (this.researchLevels.fertilizer_boost || 0) * 2;
    return { speedBonus, weightBonus, xpBonus, mutBonus, fertBonus };
  }

  // =============================================
  // DAILY OBJECTIVES
  // =============================================
  getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  _ensureDailyReset() {
    const today = this.getTodayStr();
    if (this.dailyStats.date !== today) {
      this.dailyStats = {
        date: today, harvests: 0, planted: 0, sold: 0, sellAmount: 0,
        weightHarvested: 0, fertilizersBought: 0, sprinklersBought: 0,
        mutatedHarvests: 0, differentCrops: [], premiumMutations: 0, secretMutations: 0,
      };
    }
    if (this.dailyObjectives.date !== today) {
      this.dailyObjectives = { date: today, objectives: generateDailyObjectives(today), chestClaimed: false };
      this._syncObjectiveProgress();
      this.save();
    }
  }

  _syncObjectiveProgress() {
    for (const obj of this.dailyObjectives.objectives) {
      if (obj.completed) continue;
      obj.current = this._getObjectiveCurrent(obj.type);
      if (obj.current >= obj.target) obj.completed = true;
    }
  }

  _getObjectiveCurrent(type) {
    const d = this.dailyStats;
    switch (type) {
      case 'harvest': return d.harvests;
      case 'plant': return d.planted;
      case 'sell': return d.sold;
      case 'sell_amount': return d.sellAmount;
      case 'weight': return Math.floor(d.weightHarvested);
      case 'different_crops': return d.differentCrops.length;
      case 'mutated_harvests': return d.mutatedHarvests;
      case 'buy_fertilizer': return d.fertilizersBought;
      case 'buy_sprinkler': return d.sprinklersBought;
      case 'premium_mutation': return d.premiumMutations;
      case 'secret_mutation': return d.secretMutations;
      default: return 0;
    }
  }

  _trackObjective(type, amount = 1) {
    const d = this.dailyStats;
    switch (type) {
      case 'harvest': d.harvests += amount; break;
      case 'plant': d.planted += amount; break;
      case 'sold': d.sold += amount; break;
      case 'sell_amount': d.sellAmount += amount; break;
      case 'weight': d.weightHarvested += amount; break;
      case 'fertilizer': d.fertilizersBought += amount; break;
      case 'sprinkler': d.sprinklersBought += amount; break;
      case 'mutated': d.mutatedHarvests += amount; break;
      case 'premium_mutation': d.premiumMutations += amount; break;
      case 'secret_mutation': d.secretMutations += amount; break;
    }
    this._syncObjectiveProgress();
  }

  _trackCropHarvested(cropId) {
    if (!this.dailyStats.differentCrops.includes(cropId)) {
      this.dailyStats.differentCrops.push(cropId);
    }
  }

  getDailyProgress() {
    this._syncObjectiveProgress();
    return this.dailyObjectives;
  }

  claimObjective(index) {
    const obj = this.dailyObjectives.objectives[index];
    if (!obj || !obj.completed || obj.claimed) return { success: false };
    obj.claimed = true;
    this.player.peso += obj.reward;
    this.farmerTokens += obj.tokens;
    this.save();
    return { success: true, reward: obj.reward, tokens: obj.tokens };
  }

  claimDailyChest() {
    if (this.dailyObjectives.chestClaimed) return { success: false, reason: 'claimed' };
    const objs = this.dailyObjectives.objectives;
    if (!objs.every(o => o.completed && o.claimed)) return { success: false, reason: 'incomplete' };
    this.dailyObjectives.chestClaimed = true;
    const reward = rollReward(CHEST_REWARDS);
    this._grantReward(reward);
    this.save();
    return { success: true, reward };
  }

  // =============================================
  // ACHIEVEMENTS
  // =============================================
  checkAchievements() {
    const newlyUnlocked = [];
    for (const ach of ACHIEVEMENTS) {
      if (this.achievements[ach.id]) continue;
      if (ach.check(this.stats, this.player)) {
        this.achievements[ach.id] = { unlockedAt: Date.now(), claimed: false };
        newlyUnlocked.push(ach);
      }
    }
    if (newlyUnlocked.length > 0) this.save();
    return newlyUnlocked;
  }

  claimAchievement(achId) {
    const entry = this.achievements[achId];
    if (!entry || entry.claimed) return { success: false };
    const ach = ACHIEVEMENTS.find(a => a.id === achId);
    if (!ach) return { success: false };
    entry.claimed = true;
    if (ach.title) {
      if (!this.titles.owned.includes(ach.title)) this.titles.owned.push(ach.title);
    }
    this._grantReward(ach.reward);
    this.save();
    return { success: true, reward: ach.reward };
  }

  getUnclaimedAchievements() {
    return ACHIEVEMENTS.filter(a => {
      const entry = this.achievements[a.id];
      return entry && !entry.claimed;
    });
  }

  // =============================================
  // LOGIN REWARDS
  // =============================================
  _checkLoginReward() {
    const today = this.getTodayStr();
    const lr = this.loginRewards;
    if (lr.lastLoginDate === today) return null;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (lr.lastLoginDate === yesterdayStr) {
      lr.streak = (lr.streak % 7) + 1;
    } else {
      lr.streak = 1;
    }
    lr.totalLoginDays++;
    lr.lastLoginDate = today;
    const cycleDay = LOGIN_CYCLE.find(l => l.day === lr.streak);
    if (!cycleDay) return null;
    // Check monthly milestones
    let monthlyReward = null;
    for (const milestone of MONTHLY_MILESTONES) {
      if (lr.totalLoginDays >= milestone.days && !lr.monthlyClaimed[milestone.days]) {
        lr.monthlyClaimed[milestone.days] = true;
        monthlyReward = milestone;
        break;
      }
    }
    this.save();
    return { daily: cycleDay, monthly: monthlyReward };
  }

  claimLoginReward() {
    if (!this.pendingLoginReward) return { success: false };
    const { daily, monthly } = this.pendingLoginReward;
    this._grantReward(daily.reward);
    if (monthly) this._grantReward(monthly.reward);
    this.pendingLoginReward = null;
    this.save();
    return { success: true, daily, monthly };
  }

  // =============================================
  // GIFT CRATES
  // =============================================
  openGiftCrate() {
    if (this.giftCrates <= 0) return { success: false };
    this.giftCrates--;
    const reward = rollReward(CRATE_REWARDS);
    this._grantReward(reward);
    this.save();
    return { success: true, reward };
  }

  // =============================================
  // TOKEN SHOP
  // =============================================
  buyTokenShopItem(item) {
    if (this.farmerTokens < item.cost) return { success: false, reason: 'tokens' };
    this.farmerTokens -= item.cost;
    this._grantReward(item.reward);
    this.save();
    return { success: true };
  }

  // =============================================
  // REWARD GRANTING (shared helper)
  // =============================================
  _grantReward(reward) {
    switch (reward.type) {
      case 'peso':
        this.player.peso += reward.amount;
        break;
      case 'fertilizer':
        this.gear.fertilizerCount += reward.amount;
        break;
      case 'sprinkler':
        for (let i = 0; i < reward.amount; i++) {
          const sp = SPRINKLERS.find(s => s.tier === reward.tier);
          if (sp) this.gear.sprinklerInventory.push({ tier: sp.tier, duration: sp.duration });
        }
        break;
      case 'premium_seed_pack': {
        const premiumCrops = CROPS.filter(c => c.category === 'premium');
        for (let i = 0; i < (reward.amount || 1) * 3; i++) {
          const crop = premiumCrops[Math.floor(Math.random() * premiumCrops.length)];
          if (crop) this.seeds[crop.id] = (this.seeds[crop.id] || 0) + 1;
        }
        break;
      }
      case 'weather_ticket':
        this.weatherTickets += reward.amount;
        break;
      case 'gift_crate':
        this.giftCrates += reward.amount;
        break;
      case 'random_premium_seed': {
        const premiumCrops = CROPS.filter(c => c.category === 'premium');
        for (let i = 0; i < reward.amount; i++) {
          const crop = premiumCrops[Math.floor(Math.random() * premiumCrops.length)];
          if (crop) this.seeds[crop.id] = (this.seeds[crop.id] || 0) + 1;
        }
        break;
      }
      case 'divine_seed_pack': {
        const allCrops = CROPS;
        for (let i = 0; i < 10; i++) {
          const crop = allCrops[Math.floor(Math.random() * allCrops.length)];
          if (crop) this.seeds[crop.id] = (this.seeds[crop.id] || 0) + 1;
        }
        break;
      }
      case 'tokens':
        this.farmerTokens += reward.amount;
        break;
    }
  }

  // =============================================
  // TITLES
  // =============================================
  setActiveTitle(titleId) {
    if (titleId && !this.titles.owned.includes(titleId)) return false;
    this.titles.active = titleId || null;
    this.save();
    return true;
  }

  getActiveTitle() {
    return this.titles.active;
  }

  // =============================================
  // LEVEL REWARDS
  // =============================================
  isLevelRewardClaimed(level) {
    return !!this.levelRewardsClaimed[level];
  }

  claimLevelReward(level) {
    if (this.player.level < level) return { success: false, reason: 'not_reached' };
    if (this.levelRewardsClaimed[level]) return { success: false, reason: 'claimed' };
    const reward = getLevelReward(level);
    if (!reward) return { success: false, reason: 'invalid' };
    this.seeds[reward.cropId] = (this.seeds[reward.cropId] || 0) + reward.quantity;
    this.levelRewardsClaimed[level] = true;
    this.save();
    return { success: true, reward };
  }

  getUnclaimedLevelCount() {
    let count = 0;
    for (let i = 1; i <= this.player.level; i++) {
      if (!this.levelRewardsClaimed[i]) count++;
    }
    return count;
  }

  // === Progress ===
  getProgress(plot) {
    if (plot.status !== 'growing' || !plot.harvestAt) return 0;
    const now = Date.now();
    if (now >= plot.harvestAt) return 1;
    return Math.min(1, (now - plot.plantedAt) / (plot.harvestAt - plot.plantedAt));
  }

  getRemainingMs(plot) {
    if (plot.status !== 'growing' || !plot.harvestAt) return 0;
    return Math.max(0, plot.harvestAt - Date.now());
  }

  // =============================================
  // ADMIN / TESTING
  // =============================================
  async resetAllData() {
    const storage = window.miniappsAI?.storage;
    if (storage) {
      await storage.removeItem('pocketfarm_save');
    } else {
      localStorage.removeItem('pocketfarm_save');
    }
    // Reload page to start fresh
    window.location.reload();
  }

  applyCheatCode(code) {
    const c = (code || '').trim().toLowerCase();
    if (c === 'hesoyam') {
      this.player.peso += 9999999;
      this.addXP(9999999);
      this.save();
      return { success: true, message: '💰 +₱9,999,999 · ⭐ +9,999,999 XP' };
    }
    if (c === 'growall') {
      let count = 0;
      for (const plot of this.plots) {
        if (plot.status === 'growing' && plot.cropId) {
          plot.status = 'ready';
          count++;
        }
      }
      this.save();
      return { success: true, message: `🌱 ${count} crops instantly grown!` };
    }
    return { success: false, message: '❌ Invalid cheat code' };
  }

  // === Persistence ===
  async save() {
    await saveGame({
      player: this.player,
      plots: this.plots,
      seeds: this.seeds,
      inventory: this.inventory,
      gear: this.gear,
      boughtPlots: this.boughtPlots,
      currentWeather: this.currentWeather,
      lastWeatherChange: this.lastWeatherChange,
      cropAvailability: this.cropAvailability,
      lastAvailabilityRefresh: this.lastAvailabilityRefresh,
      sprinklerAvailability: this.sprinklerAvailability,
      lastSprinklerRefresh: this.lastSprinklerRefresh,
      researchLevels: this.researchLevels,
      mutationLabLevels: this.mutationLabLevels,
      cropGenetics: this.cropGenetics,
      cropMastery: this.cropMastery,
      weatherBoostExpiresAt: this.weatherBoostExpiresAt,
      forecastResult: this.forecastResult,
      farmerTokens: this.farmerTokens,
      titles: this.titles,
      giftCrates: this.giftCrates,
      weatherTickets: this.weatherTickets,
      stats: this.stats,
      dailyStats: this.dailyStats,
      dailyObjectives: this.dailyObjectives,
      achievements: this.achievements,
      loginRewards: this.loginRewards,
      levelRewardsClaimed: this.levelRewardsClaimed,
    });
    this.notify();
  }

  subscribe(fn) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  notify() {
    for (const fn of this.listeners) fn();
  }

  on(event, fn) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(fn);
  }

  emit(event, data) {
    if (this.events[event]) {
      for (const fn of this.events[event]) fn(data);
    }
  }
}

export const gameState = new GameState();
