// js/services/event-effects/effectResolver.js
import { resolveSpaceRace } from './event-effects/effectSpaceRace.js';
import { resolveAdriftPassenger } from './event-effects/effectAdriftPassenger.js';
import { calculateInventoryUsed } from '../utils.js';
import { MARKETS, COMMODITIES } from '../data/gamedata.js';
import { COMMODITY_IDS } from '../data/constants.js';

const effectHandlers = {
    'SPACE_RACE': resolveSpaceRace,
    'ADRIFT_PASSENGER': resolveAdriftPassenger,
    // --- Standard Effects ---
    'credits': (gameState, simulationService, effect) => {
        gameState.player.credits += effect.value;
        simulationService._logTransaction('event', effect.value, 'Received credits from event');
    },
    'fuel': (gameState, simulationService, effect) => {
        const ship = simulationService._getActiveShip();
        const shipState = gameState.player.shipStates[ship.id];
        shipState.fuel = Math.max(0, shipState.fuel + effect.value);
    },
    'hull_damage_percent': (gameState, simulationService, effect) => {
        let dmg = Array.isArray(effect.value) ?
            Math.random() * (effect.value[1] - effect.value[0]) + effect.value[0] : effect.value;
        gameState.pendingTravel.eventHullDamagePercent = (gameState.pendingTravel.eventHullDamagePercent || 0) + dmg;
    },
    'travel_time_add': (gameState, simulationService, effect) => {
        gameState.pendingTravel.travelTimeAdd = (gameState.pendingTravel.travelTimeAdd || 0) + effect.value;
    },
    'travel_time_add_percent': (gameState, simulationService, effect) => {
        gameState.pendingTravel.travelTimeAddPercent = (gameState.pendingTravel.travelTimeAddPercent || 0) + effect.value;
    },
    'set_travel_time': (gameState, simulationService, effect) => {
        gameState.pendingTravel.setTravelTime = effect.value;
    },
    'add_debt': (gameState, simulationService, effect) => {
        if (gameState.player.debt <= 0) { // Only set these if there's no existing debt
            gameState.player.loanStartDate = gameState.day;
            gameState.player.weeklyInterestAmount = 0; // Ensure it starts at zero
        }
        // Calculate interest on the new debt portion and add it to the weekly total
        const newInterest = Math.ceil(effect.value * 0.013);
        gameState.player.weeklyInterestAmount += newInterest;

        // Add the principal to the total debt
        gameState.player.debt += effect.value;
        simulationService._logTransaction('loan', effect.value, 'Incurred debt from event');
    },
    'add_cargo': (gameState, simulationService, effect, outcome) => {
        const ship = simulationService._getActiveShip();
        const inventory = simulationService._getActiveInventory();
        const commodity = COMMODITIES.find(c => c.id === effect.value.id);
        // This effect is conditional. Only add cargo if there is space.
        if (calculateInventoryUsed(inventory) + effect.value.quantity <= ship.cargoCapacity) {
            inventory[effect.value.id].quantity += effect.value.quantity;
            // The original description from gamedata.js is the success description, so no text change is needed.
        } else {
            // If there's no space, we must modify the outcome description to inform the player.
            outcome.description = `You try to tractor the pod, but there's no room in your cargo hold! You're forced to leave the <span class="hl">${commodity.name}</span> behind.`;
        }
    },
    'lose_cargo': (gameState, simulationService, effect) => {
        const inventory = simulationService._getActiveInventory();
        inventory[effect.value.id].quantity = Math.max(0, inventory[effect.value.id].quantity - effect.value.quantity);
    },
    'lose_random_cargo_percent': (gameState, simulationService, effect) => {
        const inventory = simulationService._getActiveInventory();
        const held = Object.entries(inventory).filter(([, item]) => item.quantity > 0);
        if (held.length > 0) {
            const [id, item] = held[Math.floor(Math.random() * held.length)];
            item.quantity = Math.max(0, item.quantity - Math.ceil(item.quantity * effect.value));
        }
    },
    'sell_random_cargo_premium': (gameState, simulationService, effect) => {
        const inventory = simulationService._getActiveInventory();
        const toSell = Object.entries(inventory).filter(([, item]) => item.quantity > 0);
        if (toSell.length > 0) {
            const [id, item] = toSell[Math.floor(Math.random() * toSell.length)];
            const saleValue = gameState.market.galacticAverages[id] * effect.value * item.quantity;
            gameState.player.credits += saleValue;
            simulationService._logTransaction('trade', saleValue, 'Emergency supply drop sale');
            item.quantity = 0;
        }
    },
    'set_new_random_destination': (gameState, simulationService, effect) => {
        const otherMarkets = MARKETS.filter(m => m.id !== gameState.currentLocationId && gameState.player.unlockedLocationIds.includes(m.id));
        if(otherMarkets.length > 0) gameState.pendingTravel.destinationId = otherMarkets[Math.floor(Math.random() * otherMarkets.length)].id;
    }
};

export function applyEffect(gameState, simulationService, effect, outcome) {
    const handler = effectHandlers[effect.type];
    if (handler) {
        handler(gameState, simulationService, effect, outcome);
    } else {
        console.warn(`No handler found for event effect type: ${effect.type}`);
    }
}