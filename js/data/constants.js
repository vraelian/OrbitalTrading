// js/data/constants.js

export const SCREEN_IDS = Object.freeze({
    STATUS: 'status',
    NAVIGATION: 'navigation',
    SERVICES: 'services',
    MARKET: 'market',
    CARGO: 'cargo',
    HANGAR: 'hangar',
    MISSIONS: 'missions',
    FINANCE: 'finance',
    INTEL: 'intel',
});

export const NAV_IDS = Object.freeze({
    SHIP: 'ship',
    STARPORT: 'starport',
    ADMIN: 'admin',
});

export const SHIP_IDS = Object.freeze({
    WANDERER: 'starter',
    STALWART: 'hauler_c1',
    MULE: 'hauler_c2',
    PATHFINDER: 'explorer_b1',
    NOMAD: 'explorer_b2',
    VINDICATOR: 'frigate_a1',
    AEGIS: 'frigate_a2',
    ODYSSEY: 'luxury_s1',
    MAJESTIC: 'luxury_s2',
    TITAN_HAULER: 'rare_s1',
    VOID_CHASER: 'rare_s2',
    GUARDIAN: 'rare_s3',
    STARGAZER: 'rare_s4',
    BEHEMOTH: 'rare_o1',
});

export const COMMODITY_IDS = Object.freeze({
    WATER_ICE: 'water_ice',
    PLASTEEL: 'plasteel',
    HYDROPONICS: 'hydroponics',
    CYBERNETICS: 'cybernetics',
    PROPELLANT: 'propellant',
    PROCESSORS: 'processors',
    GMO_SEEDS: 'gmo_seeds',
    CRYO_PODS: 'cryo_pods',
    ATMO_PROCESSORS: 'atmos_processors',
    CLONED_ORGANS: 'cloned_organs',
    XENO_GEOLOGICALS: 'xeno_geologicals',
    SENTIENT_AI: 'sentient_ai',
    ANTIMATTER: 'antimatter',
    FOLDED_DRIVES: 'folded_drives',
});

export const LOCATION_IDS = Object.freeze({
    EARTH: 'loc_earth',
    LUNA: 'loc_luna',
    MARS: 'loc_mars',
    VENUS: 'loc_venus',
    BELT: 'loc_belt',
    SATURN: 'loc_saturn',
    JUPITER: 'loc_jupiter',
    URANUS: 'loc_uranus',
    NEPTUNE: 'loc_neptune',
    PLUTO: 'loc_pluto',
    EXCHANGE: 'loc_exchange',
    KEPLER: 'loc_kepler',
});

export const PERK_IDS = Object.freeze({
    TRADEMASTER: 'trademaster',
    NAVIGATOR: 'navigator',
    VENETIAN_SYNDICATE: 'venetian_syndicate',
    MERCHANT_GUILD_SHIP: 'merchant_guild_ship',
});

export const ACTION_IDS = Object.freeze({
    SET_SCREEN: 'set-screen',
    TRAVEL: 'travel',
    BUY_SHIP: 'buy-ship',
    SELL_SHIP: 'sell-ship',
    SELECT_SHIP: 'select-ship',
    PAY_DEBT: 'pay-debt',
    TAKE_LOAN: 'take-loan',
    PURCHASE_INTEL: 'purchase-intel',
    BUY_ITEM: 'buy-item',
    SELL_ITEM: 'sell-item',
    SET_MAX_BUY: 'set-max-buy',
    SET_MAX_SELL: 'set-max-sell',
    INCREMENT: 'increment',
    DECREMENT: 'decrement',
    SHOW_PRICE_GRAPH: 'show-price-graph',
    SHOW_FINANCE_GRAPH: 'show-finance-graph',
});

export const TUTORIAL_ACTION_TYPES = Object.freeze({
    SCREEN_LOAD: 'SCREEN_LOAD',
    ACTION: 'ACTION',
    INFO: 'INFO',
});

export const GAME_RULES = Object.freeze({
    STARTING_CREDITS: 8000,
    STARTING_DEBT_INTEREST: 125,
    REPAIR_COST_PER_HP: 75,
    REPAIR_AMOUNT_PER_TICK: 10, // Repair 10% of max hull per tick
    INTEREST_INTERVAL: 7,
    PASSIVE_REPAIR_RATE: 0.02,
    HULL_DECAY_PER_TRAVEL_DAY: 1 / 7,
    SHIP_SELL_MODIFIER: 0.75,
    RARE_SHIP_CHANCE: 0.3,
    PRICE_HISTORY_LENGTH: 50,
    FINANCE_HISTORY_LENGTH: 10,
    DAILY_PRICE_VOLATILITY: 0.035,
    MEAN_REVERSION_STRENGTH: 0.01,
    LOAN_GARNISHMENT_DAYS: 180,
    LOAN_GARNISHMENT_PERCENT: 0.14,
    RANDOM_EVENT_CHANCE: 0.07,
});

export const SAVE_KEY = 'orbitalTraderSave_v2';