// js/services/GameState.js
import { GAME_RULES, SAVE_KEY, SHIP_IDS, LOCATION_IDS, NAV_IDS, SCREEN_IDS } from '../data/constants.js';
import { SHIPS, COMMODITIES, MARKETS } from '../data/gamedata.js';
import { DATE_CONFIG } from '../data/dateConfig.js';
import { skewedRandom } from '../utils.js';

function procedurallyGenerateTravelData(markets) {
    const travelData = {};
    const fuelScalar = 3;
    markets.forEach((fromMarket, i) => {
        travelData[fromMarket.id] = {};
        markets.forEach((toMarket, j) => {
            if (i === j) return;
            const distance = Math.abs(i - j);
            const fuelTime = distance * 2 + Math.floor(Math.random() * 3);
            let fuelCost = Math.round(fuelTime * fuelScalar * (1 + (j / markets.length) * 0.5));
            let travelTime;
            if ((fromMarket.id === LOCATION_IDS.EARTH && toMarket.id === LOCATION_IDS.LUNA) || (fromMarket.id === LOCATION_IDS.LUNA && toMarket.id === LOCATION_IDS.EARTH)) {
                travelTime = 1 + Math.floor(Math.random() * 3);
            } else {
                travelTime = 15 + (distance * 10) + Math.floor(Math.random() * 5);
            }
            travelData[fromMarket.id][toMarket.id] = { time: travelTime, fuelCost: Math.max(1, fuelCost) };
         });
    });
    return travelData;
}

export class GameState {
    constructor() {
        this.state = {};
        this.subscribers = [];
        this.TRAVEL_DATA = procedurallyGenerateTravelData(MARKETS);
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    _notify() {
        this.subscribers.forEach(callback => callback(this));
    }

    setState(partialState) {
        Object.assign(this, partialState);
        this._notify();
        // this.saveGame();
    }
    
    getState() {
        return JSON.parse(JSON.stringify(this));
    }

    saveGame() {
        // try {
        //     const stateToSave = { ...this };
        //     delete stateToSave.subscribers;
        //     localStorage.setItem(SAVE_KEY, JSON.stringify(stateToSave));
        // } catch (error) {
        //     console.error("Error saving game state:", error);
        // }
    }

    loadGame() {
        return false;
        // try {
        //     const serializedState = localStorage.getItem(SAVE_KEY);
        //     if (serializedState === null) return false;
            
        //     const loadedState = JSON.parse(serializedState);
        //     Object.assign(this, loadedState);
        //     this.TRAVEL_DATA = procedurallyGenerateTravelData(MARKETS);
        //     this._notify();
        //     return true;
        // } catch (error) {
        //     console.warn("Could not parse save data. Starting new game.", error);
        //     localStorage.removeItem(SAVE_KEY);
        //     return false;
        // }
    }

    startNewGame(playerName) {
        const initialState = {
            day: 1, lastInterestChargeDay: 1, lastMarketUpdateDay: 1, currentLocationId: LOCATION_IDS.MARS, activeNav: NAV_IDS.SHIP, activeScreen: SCREEN_IDS.NAVIGATION, isGameOver: false, popupsDisabled: false,
            lastActiveScreen: {
                [NAV_IDS.SHIP]: SCREEN_IDS.STATUS,
                [NAV_IDS.STARPORT]: SCREEN_IDS.MARKET,
                [NAV_IDS.ADMIN]: SCREEN_IDS.MISSIONS,
            },
            pendingTravel: null,
            player: {
                name: playerName, playerTitle: 'Captain', playerAge: 24, lastBirthdayYear: DATE_CONFIG.START_YEAR, birthdayProfitBonus: 0,
                credits: GAME_RULES.STARTING_CREDITS, debt: 0, weeklyInterestAmount: 0,
                loanStartDate: null, seenGarnishmentWarning: false,
                unlockedCommodityLevel: 1, unlockedLocationIds: [LOCATION_IDS.EARTH, LOCATION_IDS.LUNA, LOCATION_IDS.MARS, LOCATION_IDS.VENUS, LOCATION_IDS.BELT, LOCATION_IDS.SATURN],
                seenCommodityMilestones: [], financeLog: [],
                activePerks: {}, seenEvents: [], activeShipId: SHIP_IDS.WANDERER, ownedShipIds: [SHIP_IDS.WANDERER],
                shipStates: { [SHIP_IDS.WANDERER]: { health: SHIPS[SHIP_IDS.WANDERER].maxHealth, fuel: SHIPS[SHIP_IDS.WANDERER].maxFuel, hullAlerts: { one: false, two: false } } },
                inventories: { [SHIP_IDS.WANDERER]: {} }
             },
            market: { prices: {}, inventory: {}, galacticAverages: {}, priceHistory: {}, },
            intel: { active: null, available: {} },
            tutorials: {
                activeBatchId: null,
                activeStepId: null,
                seenBatchIds: [],
                skippedTutorialBatches: []
            }
        };

        COMMODITIES.forEach(c => { initialState.player.inventories.starter[c.id] = { quantity: 0, avgCost: 0 }; });
        MARKETS.forEach(m => {
            initialState.market.priceHistory[m.id] = {};
            initialState.intel.available[m.id] = (Math.random() < 0.3); // Using literal instead of CONFIG for now
            initialState.market.inventory[m.id] = {};
            COMMODITIES.forEach(c => {
                initialState.market.priceHistory[m.id][c.id] = [];
                const avail = this._getTierAvailability(c.tier);
                let quantity = skewedRandom(avail.min, avail.max);
                if (m.modifiers[c.id] && m.modifiers[c.id] > 1.0) quantity = Math.floor(quantity * 1.5);
                if (m.specialDemand && m.specialDemand[c.id]) quantity = 0;
                initialState.market.inventory[m.id][c.id] = { quantity: Math.max(0, quantity) };
             });
        });
        
        Object.assign(this, initialState);
        this._calculateGalacticAverages();
        this._seedInitialMarketPrices();
        this._recordPriceHistory();
        this.setState({});
    }

    _getTierAvailability(tier) {
        switch (tier) {
            case 1: return { min: 6, max: 240 };
            case 2: return { min: 4, max: 200 };
            case 3: return { min: 3, max: 120 };
            case 4: return { min: 2, max: 40 };
            case 5: return { min: 1, max: 20 };
            case 6: return { min: 0, max: 20 };
            case 7: return { min: 0, max: 10 };
            default: return { min: 0, max: 5 };
        }
    }

    _calculateGalacticAverages() {
        this.market.galacticAverages = {};
        COMMODITIES.forEach(good => {
            this.market.galacticAverages[good.id] = (good.basePriceRange[0] + good.basePriceRange[1]) / 2;
        });
    }

    _seedInitialMarketPrices() {
        MARKETS.forEach(location => {
            this.market.prices[location.id] = {};
            COMMODITIES.forEach(good => {
                let price = this.market.galacticAverages[good.id] * (1 + (Math.random() - 0.5) * 0.5);
                price *= (location.modifiers[good.id] || 1.0);
                this.market.prices[location.id][good.id] = Math.max(1, Math.round(price));
            });
        });
    }

    _recordPriceHistory() {
        if (!this || !this.market) return;
        MARKETS.forEach(market => {
            if (!this.market.priceHistory[market.id]) this.market.priceHistory[market.id] = {};
            COMMODITIES.forEach(good => {
                if (!this.market.priceHistory[market.id][good.id]) this.market.priceHistory[market.id][good.id] = [];
                const history = this.market.priceHistory[market.id][good.id];
                const currentPrice = this.market.prices[market.id][good.id];
                history.push({ day: this.day, price: currentPrice });
                while (history.length > GAME_RULES.PRICE_HISTORY_LENGTH) {
                    history.shift();
                }
            });
        });
    }
}