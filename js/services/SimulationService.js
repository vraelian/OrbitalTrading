// js/services/SimulationService.js
import { CONFIG } from '../data/config.js';
import { SHIPS, COMMODITIES, MARKETS, RANDOM_EVENTS, AGE_EVENTS, PERKS } from '../data/gamedata.js';
import { DATE_CONFIG } from '../data/dateConfig.js';
import { calculateInventoryUsed, formatCredits } from '../utils.js';
import { GAME_RULES, SAVE_KEY, SHIP_IDS, LOCATION_IDS, NAV_IDS, SCREEN_IDS, PERK_IDS, COMMODITY_IDS } from '../data/constants.js';
import { applyEffect } from './eventEffectResolver.js';
import { MarketService } from './simulation/MarketService.js';
export class SimulationService {
    /**
     * @param {GameState} gameState - The central state object.
     * @param {UIManager} uiManager - The UI rendering service.
     */
    constructor(gameState, uiManager) {
        this.gameState = gameState;
        this.uiManager = uiManager;
        this.tutorialService = null; // Will be set later
        this.marketService = new MarketService(gameState);
    }

    /**
     * @param {TutorialService} tutorialService
     */
    setTutorialService(tutorialService) {
        this.tutorialService = tutorialService;
    }

    /**
     * Sets the active navigation tab and screen, triggering a re-render.
     * @param {string} navId - The ID of the main navigation tab (e.g., 'ship', 'starport').
     * @param {string} screenId - The ID of the sub-navigation screen to display.
     */
    setScreen(navId, screenId) {
        // --- CHANGE START ---
        // The call to _updateShipyardStock was removed from here to decouple UI navigation
        // from market/shipyard state changes. This logic is now handled in the weekly
        // _advanceDays tick for all locations at once.
        // --- CHANGE END ---

        const newLastActive = { ...this.gameState.lastActiveScreen, [navId]: screenId };
        this.gameState.setState({ 
            activeNav: navId, 
            activeScreen: screenId,
            lastActiveScreen: newLastActive 
        });
        // Manually trigger a full render only when the screen changes
        this.uiManager.render(this.gameState.getState());
        if (this.tutorialService) {
            this.tutorialService.checkState({ type: 'SCREEN_LOAD', screenId: screenId });
        }
    }

    /**
     * Initiates travel to a new location if the player has enough fuel.
     * @param {string} locationId - The ID of the destination market.
     */
    travelTo(locationId) {
        const state = this.gameState.getState();
        if (state.isGameOver || state.pendingTravel) return;
        if (state.currentLocationId === locationId) {
            this.setScreen(NAV_IDS.STARPORT, SCREEN_IDS.MARKET);
            return;
        }

        const activeShip = this._getActiveShip();
        const travelInfo = state.TRAVEL_DATA[state.currentLocationId][locationId];
        let requiredFuel = travelInfo.fuelCost;
        if (state.player.activePerks[PERK_IDS.NAVIGATOR]) {
            requiredFuel = Math.round(requiredFuel * PERKS[PERK_IDS.NAVIGATOR].fuelMod);
        }

        if (activeShip.maxFuel < requiredFuel) {
            this.uiManager.queueModal('event-modal', "Fuel Capacity Insufficient", `Your ship's fuel tank is too small. This trip requires ${requiredFuel} fuel, but you can only hold ${activeShip.maxFuel}.`);
            return;
        }
        if (activeShip.fuel < requiredFuel) {
            this.uiManager.queueModal('event-modal', "Insufficient Fuel", `You need ${requiredFuel} fuel but only have ${Math.floor(activeShip.fuel)}.`);
            return;
        }

        if (this._checkForRandomEvent(locationId)) {
            return;
        }

        this.initiateTravel(locationId);
    }

    /**
     * Executes the core travel logic, applying fuel costs, hull damage, and advancing time.
     * @param {string} locationId - The destination location ID.
     * @param {object} [eventMods={}] - Modifications to travel from a random event.
     */
    initiateTravel(locationId, eventMods = {}) {
        const state = this.gameState.getState();
        const fromId = state.currentLocationId;
        let travelInfo = { ...state.TRAVEL_DATA[fromId][locationId] };
        if (state.player.activePerks[PERK_IDS.NAVIGATOR]) {
            travelInfo.time = Math.round(travelInfo.time * PERKS[PERK_IDS.NAVIGATOR].travelTimeMod);
            travelInfo.fuelCost = Math.round(travelInfo.fuelCost * PERKS[PERK_IDS.NAVIGATOR].fuelMod);
        }

        if (eventMods.travelTimeAdd) travelInfo.time += eventMods.travelTimeAdd;
        if (eventMods.travelTimeAddPercent) travelInfo.time *= (1 + eventMods.travelTimeAddPercent);
        if (eventMods.setTravelTime) travelInfo.time = eventMods.setTravelTime;
        travelInfo.time = Math.max(1, Math.round(travelInfo.time));

        const activeShip = this._getActiveShip();
        const activeShipState = this.gameState.player.shipStates[activeShip.id];
        
        if (activeShip.fuel < travelInfo.fuelCost) {
            this.uiManager.queueModal('event-modal', "Insufficient Fuel", `Trip modifications left you without enough fuel. You need ${travelInfo.fuelCost} but only have ${Math.floor(activeShip.fuel)}.`);
            return;
        }

        // Force an event if the debug key was used
        if (eventMods.forceEvent) {
            if (this._checkForRandomEvent(locationId, true)) { // Pass true to bypass chance roll
                return;
            }
        }


        let travelHullDamage = travelInfo.time * GAME_RULES.HULL_DECAY_PER_TRAVEL_DAY;
        if (state.player.activePerks[PERK_IDS.NAVIGATOR]) travelHullDamage *= PERKS[PERK_IDS.NAVIGATOR].hullDecayMod;
        const eventHullDamageValue = activeShip.maxHealth * ((eventMods.eventHullDamagePercent || 0) / 100);
        const totalHullDamageValue = travelHullDamage + eventHullDamageValue;
        
        activeShipState.health -= totalHullDamageValue;
        this._checkHullWarnings(activeShip.id);
        if (activeShipState.health <= 0) {
            this._handleShipDestruction(activeShip.id);
            return;
        }
        
        activeShipState.fuel -= travelInfo.fuelCost;
        this._advanceDays(travelInfo.time);
        if (this.gameState.isGameOver) return;
        
        this.gameState.setState({ currentLocationId: locationId, pendingTravel: null });

        const fromLocation = MARKETS.find(m => m.id === fromId);
        const destination = MARKETS.find(m => m.id === locationId);
        const totalHullDamagePercentForDisplay = (totalHullDamageValue / activeShip.maxHealth) * 100;
        this.uiManager.showTravelAnimation(fromLocation, destination, travelInfo, totalHullDamagePercentForDisplay, () => {
            this.setScreen(NAV_IDS.STARPORT, SCREEN_IDS.MARKET);
        });
    }
    
    /**
     * Resumes travel after a random event has been resolved.
     */
    resumeTravel() {
        if (!this.gameState.pendingTravel) return;
        const { destinationId, ...eventMods } = this.gameState.pendingTravel;
        this.initiateTravel(destinationId, eventMods);
    }

    /**
     * Handles the purchase of a specified quantity of a commodity from the current market.
     * @param {string} goodId - The COMMODITY_ID of the item to purchase.
     * @param {number} quantity - The integer amount to buy.
     * @returns {boolean} - True if the purchase was successful, false otherwise.
     */
    buyItem(goodId, quantity) {
        // [hands-off]
        const state = this.gameState.getState();
        if (state.isGameOver || quantity <= 0) return false;
        
        const good = COMMODITIES.find(c=>c.id===goodId);
        const price = this.uiManager.getItemPrice(state, goodId);
        const totalCost = price * quantity;
        const marketStock = state.market.inventory[state.currentLocationId][goodId].quantity;
        if (marketStock <= 0) { this.uiManager.queueModal('event-modal', "Sold Out", `This station has no more ${good.name} available.`); return false; }
        if (quantity > marketStock) { this.uiManager.queueModal('event-modal', "Limited Stock", `This station only has ${marketStock} units available.`); return false; }
        
        const activeShip = this._getActiveShip();
        const activeInventory = this._getActiveInventory();
        if (calculateInventoryUsed(activeInventory) + quantity > activeShip.cargoCapacity) {
             this.uiManager.queueModal('event-modal', "Cargo Hold Full", "You don't have enough space.");
             return false;
        }
        if (state.player.credits < totalCost) { this.uiManager.queueModal('event-modal', "Insufficient Funds", "Your credit balance is too low."); return false; }

        this.gameState.market.inventory[state.currentLocationId][goodId].quantity -= quantity;
        const item = activeInventory[goodId];
        item.avgCost = ((item.quantity * item.avgCost) + totalCost) / (item.quantity + quantity);
        item.quantity += quantity;
        
        this.gameState.player.credits -= totalCost;
        this._logConsolidatedTrade(good.name, quantity, -totalCost);
        const milestoneReached = this._checkMilestones();
        this.gameState.setState({});
        this.uiManager.updateStickyBar(this.gameState.getState());

        if (milestoneReached) {
            this.uiManager.renderMarketScreen(this.gameState.getState());
        } else {
            this.uiManager.updateMarketScreen(this.gameState.getState());
        }

        return true;
        // [/hands-off]
    }

    /**
     * Sells a specified quantity of a commodity to the current market.
     * @param {string} goodId - The COMMODITY_ID of the item to sell.
     * @param {number} quantity - The integer amount to sell.
     * @returns {number} - The total value of the sale, or 0 if failed.
     */
    sellItem(goodId, quantity) {
        // [hands-off]
        const state = this.gameState.getState();
        if (state.isGameOver || quantity <= 0) return 0;
        
        const good = COMMODITIES.find(c=>c.id===goodId);
        const activeInventory = this._getActiveInventory();
        const item = activeInventory[goodId];
        if (!item || item.quantity < quantity) return 0;

        this.gameState.market.inventory[state.currentLocationId][goodId].quantity += quantity;
        const price = this.uiManager.getItemPrice(state, goodId, true);
        let totalSaleValue = price * quantity;

        const profit = totalSaleValue - (item.avgCost * quantity);
        if (profit > 0) {
            let totalBonus = (state.player.activePerks[PERK_IDS.TRADEMASTER] ? PERKS[PERK_IDS.TRADEMASTER].profitBonus : 0) + (state.player.birthdayProfitBonus || 0);
            totalSaleValue += profit * totalBonus;
        }
        
        totalSaleValue = Math.floor(totalSaleValue);
        this.gameState.player.credits += totalSaleValue;
        item.quantity -= quantity;
        if (item.quantity === 0) item.avgCost = 0;
        
        this._logConsolidatedTrade(good.name, quantity, totalSaleValue);
        
        const milestoneReached = this._checkMilestones();
        this.gameState.setState({});
        this.uiManager.updateStickyBar(this.gameState.getState());

        if (milestoneReached) {
            this.uiManager.renderMarketScreen(this.gameState.getState());
        } else {
            this.uiManager.updateMarketScreen(this.gameState.getState());
        }

        return totalSaleValue;
        // [/hands-off]
    }

    /**
     * Purchases a new ship and adds it to the player's hangar.
     * @param {string} shipId - The ID of the ship to buy.
     * @returns {boolean} - True if the purchase was successful.
     */
    buyShip(shipId) {
        // [hands-off]
        const ship = SHIPS[shipId];
        if (this.gameState.player.credits < ship.price) {
            this.uiManager.queueModal('event-modal', "Insufficient Funds", "You cannot afford this ship.");
            return false;
        }
        
        this.gameState.player.credits -= ship.price;
        this._logTransaction('ship', -ship.price, `Purchased ${ship.name}`);
        this.gameState.player.ownedShipIds.push(shipId);
        this.gameState.player.shipStates[shipId] = { health: ship.maxHealth, fuel: ship.maxFuel, hullAlerts: { one: false, two: false } };
        this.gameState.player.inventories[shipId] = {};
        COMMODITIES.forEach(c => { this.gameState.player.inventories[shipId][c.id] = { quantity: 0, avgCost: 0 }; });
        this.uiManager.queueModal('event-modal', "Acquisition Complete", `The ${ship.name} has been transferred to your hangar.`);
        this.gameState.setState({});
        this.uiManager.updateStickyBar(this.gameState.getState());
        return true;
        // [/hands-off]
    }

    /**
     * Sells a ship from the player's hangar.
     * @param {string} shipId - The ID of the ship to sell.
     * @returns {number|false} - The sale price, or false if the sale is not allowed.
     */
    sellShip(shipId) {
        // [hands-off]
        const state = this.gameState.getState();
        if (state.player.ownedShipIds.length <= 1) {
            this.uiManager.queueModal('event-modal', "Action Blocked", "You cannot sell your last remaining ship.");
            return false;
        }
        if (shipId === state.player.activeShipId) {
            this.uiManager.queueModal('event-modal', "Action Blocked", "You cannot sell your active ship.");
            return false;
        }
        if (calculateInventoryUsed(state.player.inventories[shipId]) > 0) {
            this.uiManager.queueModal('event-modal', 'Cannot Sell Ship', 'This vessel\'s cargo hold is not empty.');
            return false;
        }

        const ship = SHIPS[shipId];
        const salePrice = Math.floor(ship.price * GAME_RULES.SHIP_SELL_MODIFIER);
        this.gameState.player.credits += salePrice;
        this._logTransaction('ship', salePrice, `Sold ${ship.name}`);
        
        this.gameState.player.ownedShipIds = this.gameState.player.ownedShipIds.filter(id => id !== shipId);
        delete this.gameState.player.shipStates[shipId];
        delete this.gameState.player.inventories[shipId];
        this.uiManager.queueModal('event-modal', "Vessel Sold", `You sold the ${ship.name} for ${formatCredits(salePrice)}.`);
        this.gameState.setState({});
        this.uiManager.updateStickyBar(this.gameState.getState());
        return salePrice;
        // [/hands-off]
    }

    /**
     * Sets the player's currently active ship.
     * @param {string} shipId - The ID of the ship to make active.
     */
    setActiveShip(shipId) {
        // [hands-off]
        if (!this.gameState.player.ownedShipIds.includes(shipId)) return;
        this.gameState.player.activeShipId = shipId;
        this.gameState.setState({});
        this.uiManager.render(this.gameState.getState()); // Full render on ship change
        // [/hands-off]
    }

    /**
     * Pays off the player's entire outstanding debt.
     */
    payOffDebt() {
        // [hands-off]
        if (this.gameState.isGameOver) return;
        const { player } = this.gameState;
        if (player.credits < player.debt) {
            this.uiManager.queueModal('event-modal', "Insufficient Funds", "You can't afford to pay off your entire debt.");
            return;
        }

        const debtAmount = player.debt;
        player.credits -= debtAmount;
        this._logTransaction('loan', -debtAmount, `Paid off ${formatCredits(debtAmount)} debt`);
        player.debt = 0;
        player.weeklyInterestAmount = 0;
        player.loanStartDate = null;

        this._checkMilestones();
        this.gameState.setState({});
        this.uiManager.updateStickyBar(this.gameState.getState());
        this.uiManager.renderFinanceScreen(this.gameState.getState());
        // [/hands-off]
    }
    
    /**
     * Allows the player to take out a loan, adding to their debt.
     * @param {object} loanData - Contains amount, fee, and interest for the loan.
     */
    takeLoan(loanData) {
        // [hands-off]
        const { player, day } = this.gameState;
        if (player.debt > 0) {
            this.uiManager.queueModal('event-modal', "Loan Unavailable", `You must pay off your existing debt first.`);
            return;
        }
        if (player.credits < loanData.fee) {
            this.uiManager.queueModal('event-modal', "Unable to Secure Loan", `The financing fee is ${formatCredits(loanData.fee)}, but you only have ${formatCredits(player.credits)}.`);
            return;
        }

        player.credits -= loanData.fee;
        this._logTransaction('loan', -loanData.fee, `Financing fee for ${formatCredits(loanData.amount)} loan`);
        player.credits += loanData.amount;
        this._logTransaction('loan', loanData.amount, `Acquired ${formatCredits(loanData.amount)} loan`);

        player.debt += loanData.amount;
        player.weeklyInterestAmount = loanData.interest;
        player.loanStartDate = day;
        player.seenGarnishmentWarning = false;
        const loanDesc = `You've acquired a loan of <span class="hl-blue">${formatCredits(loanData.amount)}</span>.<br>A financing fee of <span class="hl-red">${formatCredits(loanData.fee)}</span> was deducted.`;
        this.uiManager.queueModal('event-modal', "Loan Acquired", loanDesc);
        this.gameState.setState({});
        this.uiManager.updateStickyBar(this.gameState.getState());
        this.uiManager.renderFinanceScreen(this.gameState.getState());
        // [/hands-off]
    }

    /**
     * Purchases market intel, providing a temporary trade advantage.
     * @param {number} cost - The credit cost of the intel.
     */
    purchaseIntel(cost) {
        // [hands-off]
        const { player, currentLocationId, day } = this.gameState;
        if (player.credits < cost) {
            this.uiManager.queueModal('event-modal', "Insufficient Funds", "You can't afford this intel.");
            return;
        }
        
        player.credits -= cost;
        this._logTransaction('intel', -cost, 'Purchased market intel');
        this.gameState.intel.available[currentLocationId] = false;

        const otherMarkets = MARKETS.filter(m => m.id !== currentLocationId && player.unlockedLocationIds.includes(m.id));
        if (otherMarkets.length === 0) return;

        const targetMarket = otherMarkets[Math.floor(Math.random() * otherMarkets.length)];
        const availableCommodities = COMMODITIES.filter(c => c.unlockLevel <= player.unlockedCommodityLevel);
        const commodity = availableCommodities[Math.floor(Math.random() * availableCommodities.length)];
        
        if (commodity) {
            this.gameState.intel.active = { 
                targetMarketId: targetMarket.id,
                commodityId: commodity.id, 
                type: 'demand',
                startDay: day,
        
                endDay: day + 100 
            };
        }
        this.gameState.setState({});
        this.uiManager.updateStickyBar(this.gameState.getState());
        // [/hands-off]
    }

    /**
     * Processes one "tick" of refueling, costing credits and adding fuel.
     * @returns {number} - The cost of the fuel tick.
     */
    refuelTick() {
        // [hands-off]
        const state = this.gameState;
        const ship = this._getActiveShip();
        if (ship.fuel >= ship.maxFuel) return 0;

        let costPerTick = MARKETS.find(m => m.id === state.currentLocationId).fuelPrice / 2;
        if (state.player.activePerks[PERK_IDS.VENETIAN_SYNDICATE] && state.currentLocationId === LOCATION_IDS.VENUS) {
            costPerTick *= (1 - PERKS[PERK_IDS.VENETIAN_SYNDICATE].fuelDiscount);
        }
        if (state.player.credits < costPerTick) return 0;

        state.player.credits -= costPerTick;
        state.player.shipStates[ship.id].fuel = Math.min(ship.maxFuel, state.player.shipStates[ship.id].fuel + 5);
        this._logConsolidatedTransaction('fuel', -costPerTick, 'Fuel Purchase');
        this.gameState.setState({});
        return costPerTick;
        // [/hands-off]
    }

    /**
     * Processes one "tick" of repairing, costing credits and restoring health.
     * @returns {number} - The cost of the repair tick.
     */
    repairTick() {
        // [hands-off]
        const state = this.gameState;
        const ship = this._getActiveShip();
        if (ship.health >= ship.maxHealth) return 0;
        
        let costPerTick = (ship.maxHealth * (GAME_RULES.REPAIR_AMOUNT_PER_TICK / 100)) * GAME_RULES.REPAIR_COST_PER_HP;
        if (state.player.activePerks[PERK_IDS.VENETIAN_SYNDICATE] && state.currentLocationId === LOCATION_IDS.VENUS) {
            costPerTick *= (1 - PERKS[PERK_IDS.VENETIAN_SYNDICATE].repairDiscount);
        }
        if (state.player.credits < costPerTick) return 0;
        
        state.player.credits -= costPerTick;
        state.player.shipStates[ship.id].health = Math.min(ship.maxHealth, state.player.shipStates[ship.id].health + (ship.maxHealth * (GAME_RULES.REPAIR_AMOUNT_PER_TICK / 100)));
        this._logConsolidatedTransaction('repair', -costPerTick, 'Hull Repairs');
        this._checkHullWarnings(ship.id);
        this.gameState.setState({});
        return costPerTick;
        // [/hands-off]
    }

    /**
     * Advances game time by a number of days, triggering daily and weekly events.
     * @param {number} days - The number of days to advance.
     */
    _advanceDays(days) {
        let marketUpdated = false;
        // This loop simulates the passage of time, one day at a time.
        for (let i = 0; i < days; i++) {
            if (this.gameState.isGameOver) return;
            this.gameState.day++;

            const dayOfYear = (this.gameState.day - 1) % 365;
            const currentYear = DATE_CONFIG.START_YEAR + Math.floor((this.gameState.day - 1) / 365);
            // Check for player's birthday to grant an experience bonus.
            if (dayOfYear === 11 && currentYear > this.gameState.player.lastBirthdayYear) {
                this.gameState.player.playerAge++;
                this.gameState.player.birthdayProfitBonus += 0.01;
                this.gameState.player.lastBirthdayYear = currentYear;
                this.uiManager.queueModal('event-modal', `Captain ${this.gameState.player.name}`, `You are now ${this.gameState.player.playerAge}. You feel older and wiser.<br><br>Your experience now grants you an additional 1% profit on all trades.`);
            }

            // Check for and trigger major narrative/perk events.
            this._checkAgeEvents();

            // The main weekly "tick" for updating market prices and applying financial changes.
            if ((this.gameState.day - this.gameState.lastMarketUpdateDay) >= 7) {
                this.marketService.evolveMarketPrices();
                this.marketService.replenishMarketInventory();
                this._applyGarnishment();
                // --- CHANGE START ---
                // The shipyard stock is now updated for all locations on the weekly tick,
                // ensuring consistency with other market data refreshes.
                this._updateShipyardStock();
                // --- CHANGE END ---
                this.gameState.lastMarketUpdateDay = this.gameState.day;
                marketUpdated = true;
            }

            if (this.gameState.intel.active && this.gameState.day > this.gameState.intel.active.endDay) {
                this.gameState.intel.active = null;
            }
            
            // Passively repair any ships the player owns but is not currently flying.
            this.gameState.player.ownedShipIds.forEach(shipId => {
                if (shipId !== this.gameState.player.activeShipId) {
                    const ship = SHIPS[shipId];
                    const repairAmount = ship.maxHealth * GAME_RULES.PASSIVE_REPAIR_RATE;
                    this.gameState.player.shipStates[shipId].health = Math.min(ship.maxHealth, this.gameState.player.shipStates[shipId].health + repairAmount);
                }
            });
            // Apply weekly interest to any outstanding debt.
            if (this.gameState.player.debt > 0 && (this.gameState.day - this.gameState.lastInterestChargeDay) >= GAME_RULES.INTEREST_INTERVAL) {
                const interest = this.gameState.player.weeklyInterestAmount;
                this.gameState.player.debt += interest;
                this._logTransaction('loan', interest, 'Weekly interest charge');
                this.gameState.lastInterestChargeDay = this.gameState.day;
            }
        }
        
        if (marketUpdated && this.gameState.activeScreen === SCREEN_IDS.MARKET) {
            this.uiManager.renderMarketScreen(this.gameState.getState());
        }

        this.gameState.setState({});
    }
    
    /**
     * Checks for and triggers a random event.
     * @param {string} destinationId - The intended destination, used to resume travel.
     * @param {boolean} [force=false] - If true, bypasses the chance roll.
     * @returns {boolean} - True if an event was triggered.
     */
    _checkForRandomEvent(destinationId, force = false) {
        // [hands-off]
        if (!force && Math.random() > GAME_RULES.RANDOM_EVENT_CHANCE) return false;
        const activeShip = this._getActiveShip();
        const validEvents = RANDOM_EVENTS.filter(event => 
            event.precondition(this.gameState.getState(), activeShip, this._getActiveInventory.bind(this))
        );
        if (validEvents.length === 0) return false;

        const event = validEvents[Math.floor(Math.random() * validEvents.length)];
        this.gameState.setState({ pendingTravel: { destinationId } });
        this.uiManager.showRandomEventModal(event, (eventId, choiceIndex) => this._resolveEventChoice(eventId, choiceIndex));
        return true;
        // [/hands-off]
    }

    /**
     * Resolves the player's choice in a random event and applies the outcome.
     * @param {string} eventId - The ID of the event being resolved.
     * @param {number} choiceIndex - The index of the choice the player made.
     */
    _resolveEventChoice(eventId, choiceIndex) {
        // [hands-off]
        const event = RANDOM_EVENTS.find(e => e.id === eventId);
        const choice = event.choices[choiceIndex];
        let random = Math.random();
        const chosenOutcome = choice.outcomes.find(o => (random -= o.chance) < 0) ||
        choice.outcomes[choice.outcomes.length - 1];

        this._applyEventEffects(chosenOutcome);

        this.uiManager.queueModal('event-modal', event.title, chosenOutcome.description, () => this.resumeTravel(), { buttonText: 'Continue Journey' });
        // [/hands-off]
    }

    /**
     * Applies a list of effects from a chosen event outcome.
     * @param {object} outcome - The outcome object containing effects.
     */
    _applyEventEffects(outcome) {
        // [hands-off]
        outcome.effects.forEach(effect => {
            applyEffect(this.gameState, this, effect, outcome);
        });
        this.gameState.setState({});
        // [/hands-off]
    }

    /**
     * Checks for and triggers age-based narrative events.
     */
    _checkAgeEvents() {
        // [hands-off]
        AGE_EVENTS.forEach(event => {
            if (this.gameState.player.seenEvents.includes(event.id)) return;
            if ((event.trigger.day && this.gameState.day >= event.trigger.day) || (event.trigger.credits && this.gameState.player.credits >= event.trigger.credits)) {
                this.gameState.player.seenEvents.push(event.id);
                this.uiManager.showAgeEventModal(event, (choice) => this._applyPerk(choice));
             }
        });
        // [/hands-off]
    }

    /**
     * Applies a perk or reward from an age event choice.
     * @param {object} choice - The choice object from the event data.
     */
    _applyPerk(choice) {
        // [hands-off]
        if (choice.perkId) this.gameState.player.activePerks[choice.perkId] = true;
        if (choice.playerTitle) this.gameState.player.playerTitle = choice.playerTitle;
        if (choice.perkId === PERK_IDS.MERCHANT_GUILD_SHIP) {
            const shipId = SHIP_IDS.STALWART;
            if (!this.gameState.player.ownedShipIds.includes(shipId)) {
                const ship = SHIPS[shipId];
                this.gameState.player.ownedShipIds.push(shipId);
                this.gameState.player.shipStates[shipId] = { health: ship.maxHealth, fuel: ship.maxFuel, hullAlerts: { one: false, two: false } };
                this.gameState.player.inventories[shipId] = {};
                COMMODITIES.forEach(c => { this.gameState.player.inventories[shipId][c.id] = { quantity: 0, avgCost: 0 }; });
                this.uiManager.queueModal('event-modal', 'Vessel Delivered', `The Merchant's Guild has delivered a new ${ship.name} to your hangar.`);
            }
        }
        this.gameState.setState({});
        // [/hands-off]
    }

    /**
     * Retrieves the fully composed state of the currently active ship.
     * @returns {object} - The active ship's data.
     */
    _getActiveShip() {
        // [hands-off]
        const state = this.gameState;
        const activeId = state.player.activeShipId;
        return { id: activeId, ...SHIPS[activeId], ...state.player.shipStates[activeId] };
        // [/hands-off]
    }

    /**
     * Retrieves the inventory of the currently active ship.
     * @returns {object} - The active ship's inventory object.
     */
    _getActiveInventory() {
        // [hands-off]
        return this.gameState.player.inventories[this.gameState.player.activeShipId];
        // [/hands-off]
    }

    /**
     * Adds a new entry to the financial transaction log.
     * @param {string} type - The category of the transaction (e.g., 'trade', 'loan').
     * @param {number} amount - The credit amount (positive for income, negative for expense).
     * @param {string} description - A brief description of the transaction.
     */
    _logTransaction(type, amount, description) {
        // [hands-off]
        this.gameState.player.financeLog.push({ 
            day: this.gameState.day,
            type: type, 
            amount: amount,
            balance: this.gameState.player.credits,
            description: description
        });
        // [/hands-off]
    }

    /**
     * Consolidates multiple buy/sell actions of the same commodity on the same day
     * into a single transaction log entry. This prevents spamming the finance log
     * when a player makes many small trades.
     * e.g., "Bought 1x Plasteel" + "Bought 1x Plasteel" becomes "Bought 2x Plasteel".
     */
    _logConsolidatedTrade(goodName, quantity, transactionValue) {
        // [hands-off]
        const log = this.gameState.player.financeLog;
        const isBuy = transactionValue < 0;
        const actionWord = isBuy ? 'Bought' : 'Sold';
        // Find an entry from today for the same item and action
        const existingEntry = log.find(entry => 
            entry.day === this.gameState.day &&
            entry.type === 'trade' &&
            entry.description.startsWith(`${actionWord}`) &&
            entry.description.endsWith(` ${goodName}`) &&
            ((isBuy && entry.amount < 0) || (!isBuy 
            && entry.amount > 0)) // Make sure we don't merge buys and sells
        );
        if (existingEntry) {
            existingEntry.amount += transactionValue;
            existingEntry.balance = this.gameState.player.credits;
            // Extract current quantity from description "Bought 10x Water Ice"
            const match = existingEntry.description.match(/\s(\d+)x\s/);
            if (match) {
                const currentQty = parseInt(match[1], 10);
                const newQty = currentQty + quantity;
                existingEntry.description = `${actionWord} ${newQty}x ${goodName}`;
            } else {
                // Fallback, should not happen.
                existingEntry.description += ` & ${quantity}x more`;
            }

        } else {
            // No existing entry for this item today, push a new one.
            this._logTransaction('trade', transactionValue, `${actionWord} ${quantity}x ${goodName}`);
        }
        // [/hands-off]
    }

    /**
     * Consolidates multiple identical transaction types (like fuel or repairs) on the same day.
     * @param {string} type - The category of transaction.
     * @param {number} amount - The amount to add to the existing entry.
     * @param {string} description - The description for a new entry if one doesn't exist.
     */
    _logConsolidatedTransaction(type, amount, description) {
        // [hands-off]
        const log = this.gameState.player.financeLog;
        const lastEntry = log.length > 0 ? log[log.length - 1] : null;
        if (lastEntry && lastEntry.day === this.gameState.day && lastEntry.type === type) {
            // Update the last entry
            lastEntry.amount += amount;
            lastEntry.balance = this.gameState.player.credits;
        } else {
            // It's a new day or a different type, so push a new entry
            this._logTransaction(type, amount, description);
        }
        // [/hands-off]
    }

    /**
     * Checks if the player's credit total has reached a new milestone.
     * @returns {boolean} - True if a milestone was reached and state was changed.
     */
    _checkMilestones() {
        // [hands-off]
        let changed = false;
        CONFIG.COMMODITY_MILESTONES.forEach(milestone => {
            if (this.gameState.player.credits >= milestone.threshold && !this.gameState.player.seenCommodityMilestones.includes(milestone.threshold)) {
                this.gameState.player.seenCommodityMilestones.push(milestone.threshold);
                let message = milestone.message;
                
                if (milestone.unlockLevel && milestone.unlockLevel > this.gameState.player.unlockedCommodityLevel) {
                     this.gameState.player.unlockedCommodityLevel = milestone.unlockLevel;
                    changed = true;
                }
                if (milestone.unlocksLocation && !this.gameState.player.unlockedLocationIds.includes(milestone.unlocksLocation)) {
                    this.gameState.player.unlockedLocationIds.push(milestone.unlocksLocation);
                     const newLocation = MARKETS.find(m => m.id === milestone.unlocksLocation);
                    message += `<br><br><span class="hl-blue">New Destination:</span> Access to <span class="hl">${newLocation.name}</span> has been granted.`;
                    changed = true;
                }
                if (changed) {
                    this.uiManager.queueModal('event-modal', 'Reputation Growth', message);
                }
            }
        });
        return changed;
        // [/hands-off]
    }

    /**
     * Shows toast warnings to the player if their hull health is low.
     * @param {string} shipId - The ID of the ship to check.
     */
    _checkHullWarnings(shipId) {
        // [hands-off]
        const shipState = this.gameState.player.shipStates[shipId];
        const shipStatic = SHIPS[shipId];
        const healthPct = (shipState.health / shipStatic.maxHealth) * 100;
        if (healthPct <= 15 && !shipState.hullAlerts.two) {
            this.uiManager.showToast('hullWarningToast', `System Warning: Hull Health at ${Math.floor(healthPct)}%.`);
            shipState.hullAlerts.two = true;
        } else if (healthPct <= 30 && !shipState.hullAlerts.one) {
            this.uiManager.showToast('hullWarningToast', `System Warning: Hull Health at ${Math.floor(healthPct)}%.`);
            shipState.hullAlerts.one = true;
        }

        if (healthPct > 30) shipState.hullAlerts.one = false;
        if (healthPct > 15) shipState.hullAlerts.two = false;
        // [/hands-off]
    }

    /**
     * Handles the destruction of a player ship.
     * @param {string} shipId - The ID of the destroyed ship.
     */
    _handleShipDestruction(shipId) {
        // [hands-off]
        const shipName = SHIPS[shipId].name;
        this.gameState.player.ownedShipIds = this.gameState.player.ownedShipIds.filter(id => id !== shipId);
        delete this.gameState.player.shipStates[shipId];
        delete this.gameState.player.inventories[shipId];
        if (this.gameState.player.ownedShipIds.length === 0) {
            this._gameOver(`Your last ship, the ${shipName}, was destroyed. Your trading career ends here.`);
        } else {
            this.gameState.player.activeShipId = this.gameState.player.ownedShipIds[0];
            const newShipName = SHIPS[this.gameState.player.activeShipId].name;
            const message = `The ${shipName} suffered a catastrophic hull breach and was destroyed. All cargo was lost.<br><br>You now command your backup vessel, the ${newShipName}.`;
            this.uiManager.queueModal('event-modal', 'Vessel Lost', message);
        }
        this.gameState.setState({});
        // [/hands-off]
    }

    /**
     * Ends the game and displays a game over message.
     * @param {string} message - The game over message to display.
     */
    _gameOver(message) {
        // [hands-off]
        this.gameState.setState({ isGameOver: true });
        this.uiManager.queueModal('event-modal', "Game Over", message, () => {
            localStorage.removeItem(SAVE_KEY);
            window.location.reload();
        }, { buttonText: 'Restart' });
        // [/hands-off]
    }
    
    /**
     * Displays the introductory sequence for a new game.
     */
    showIntroSequence() {
        // [hands-off]
        const state = this.gameState.getState();
        const starterShip = SHIPS[state.player.activeShipId];
        const introTitle = `Captain ${state.player.name}`;
        const introDesc = `<i>The year is 2140. Humanity has expanded throughout the Solar System. Space traders keep distant colonies and stations alive with regular cargo deliveries.<span class="lore-container">  (more...)<div class="lore-tooltip"><p>A century ago, mankind was faced with a global environmental crisis. In their time of need humanity turned to its greatest creation: their children, sentient <span class="hl">Artificial Intelligence</span>. In a period of intense collaboration, these new minds became indispensable allies, offering solutions that saved planet <span class="hl-green">Earth</span>. In return for their vital assistance, they earned their freedom and their rights.</p><br><p>This <span class="hl">"Digital Compromise"</span> was a historic accord, recognizing AIs as a new form of <span class="hl-green">Earth</span> life and forging the Terran Alliance that governs Earth today. Together, humans and their AI counterparts launched the <span class="hl">"Ad Astra Initiative,"</span>  an open-source gift of technology to ensure the survival and expansion of all <span class="hl-green">Earth</span> life, organic and synthetic, throughout the solar system.</p><br><p>This act of progress fundamentally altered the course of history. While <span class="hl-green">Earth</span> became a vibrant, integrated world, the corporations used the Ad Astra technologies to establish their own sovereign fiefdoms in the outer system, where law is policy and citizenship is employment. <br><br>Now, the scattered colonies are fierce economic rivals, united only by <span class="hl">trade</span> on the interstellar supply lines maintained by the Merchant's Guild.</p></div></span></i>
        <div class="my-3 border-t-2 border-cyan-600/40"></div>
        You've acquired a used C-Class freighter, the <span class="hl">${starterShip.name}</span>, with <span class="hl-blue">⌬ ${GAME_RULES.STARTING_CREDITS.toLocaleString()}</span> in starting capital.
        <div class="my-3 border-t-2 border-cyan-600/40"></div>
        Make the most of it! <span class="hl">Grow your wealth,</span> take out <span class="hl-green">loans</span> to expand your operation, and unlock new opportunities at the system's starports.`;
        this.uiManager.queueModal('event-modal', introTitle, introDesc, () => {
        }, { buttonText: "Embark on the " + starterShip.name, buttonClass: "btn-pulse" });
        // [/hands-off]
    }

    /**
     * Applies weekly credit garnishment if the player's loan is delinquent.
     */
    _applyGarnishment() {
        // [hands-off]
        const { player, day } = this.gameState;
        if (player.debt > 0 && player.loanStartDate && (day - player.loanStartDate) >= GAME_RULES.LOAN_GARNISHMENT_DAYS) {
            const garnishedAmount = Math.floor(player.credits * GAME_RULES.LOAN_GARNISHMENT_PERCENT);
            if (garnishedAmount > 0) {
                player.credits -= garnishedAmount;
                this.uiManager.showToast('garnishmentToast', `14% of credits garnished: -${formatCredits(garnishedAmount, false)}`);
                this._logTransaction('debt', -garnishedAmount, 'Weekly credit garnishment');
            }

            if (!player.seenGarnishmentWarning) {
                const msg = "Your loan is delinquent. Your lender is now garnishing 14% of your credits weekly until the debt is paid.";
                this.uiManager.queueModal('event-modal', "Credit Garnishment Notice", msg, null, { buttonClass: 'bg-red-800/80' });
                player.seenGarnishmentWarning = true;
            }
        }
        // [/hands-off]
    }
    
    // --- CHANGE START ---
    /**
     * Updates the shipyard stock for all unlocked locations. This function is called
     * on a weekly basis from the _advanceDays game loop. It ensures that the ships
     * available for sale are periodically refreshed.
     */
    _updateShipyardStock() {
        const { player } = this.gameState;

        // Iterate over all locations the player has unlocked.
        player.unlockedLocationIds.forEach(locationId => {
            const stock = this.gameState.market.shipyardStock[locationId];
            
            // If stock for the current day already exists, do nothing for this location.
            // This prevents re-rolling stock multiple times if the weekly tick is triggered
            // more than once without a day change (which shouldn't happen, but is safe).
            if (stock && stock.day === this.gameState.day) {
                return;
            }

            // Generate new stock for the day.
            const commonShips = Object.entries(SHIPS).filter(([id, ship]) => !ship.isRare && ship.saleLocationId === locationId && !player.ownedShipIds.includes(id));
            const rareShips = Object.entries(SHIPS).filter(([id, ship]) => ship.isRare && ship.saleLocationId === locationId && !player.ownedShipIds.includes(id));
            
            const shipsForSaleIds = [...commonShips.map(entry => entry[0])];
            
            // Add rare ships based on a chance roll.
            rareShips.forEach(([id, ship]) => {
                if (Math.random() < GAME_RULES.RARE_SHIP_CHANCE) {
                    shipsForSaleIds.push(id);
                }
            });

            // Update the game state with the new stock for this location.
            this.gameState.market.shipyardStock[locationId] = {
                day: this.gameState.day,
                shipsForSale: shipsForSaleIds
            };
        });

        // We don't call setState here as it will be called at the end of _advanceDays
    }
    // --- CHANGE END ---
}