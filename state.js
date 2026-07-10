  // =============================================
  // PERSISTENCE + CLOUD SYNC
  // =============================================
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
      forecastLevel: this.forecastLevel,
      forecastQueue: this.forecastQueue,
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
      favorites: this.favorites,
    });

    // Cloud sync
    if (window.cloudSave) {
      await window.cloudSave(this);
    }

    this.notify();
  }

  subscribe(fn) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  notify() {
    for (const fn of this.listeners) fn();
  }
}

export const gameState = new GameState();
