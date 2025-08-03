// js/services/eventEffectResolver.js
import { resolveSpaceRace } from './event-effects/effectSpaceRace.js';
import { resolveAdriftPassenger } from './event-effects/effectAdriftPassenger.js';
import { calculateInventoryUsed } from '../utils.js';
import { MARKETS } from '../data/gamedata.js';

const effectHandlers = {
    'SPACE_RACE': resolveSpaceRace,
    'ADRIFT_PASSENGER': resolveAdriftPassenger,
    // --- Standard Effects ---
    'credits': (gameState, effect) => {
        gameState.player.credits += effect.value;
        gameState._logTransaction('event', effect.value, 'Received credits from event');
    },
    'fuel': (gameState, effect) => {
        const ship = gameState._getActiveShip();
        const shipState = gameState.player.shipStates[ship.id];
        shipState.fuel = Math.max(0, shipState.fuel + effect.value);
    },
    'hull_damage_percent': (gameState, effect) => {
        let dmg = Array.isArray(effect.value) ? Math.random() * (effect.value[1] - effect.value[0]) + effect.value[0] : effect.value;
        gameState.pendingTravel.eventHullDamagePercent = (gameState.pendingTravel.eventHullDamagePercent || 0) + dmg;
    },
    'travel_time_add': (gameState, effect) => {
        gameState.pendingTravel.travelTimeAdd = (gameState.pendingTravel.travelTimeAdd || 0) + effect.value;
    },
    'travel_time_add_percent': (gameState, effect) => {
        gameState.pendingTravel.travelTimeAddPercent = (gameState.pendingTravel.travelTimeAddPercent || 0) + effect.value;
    },
    'set_travel_time': (gameState, effect) => {
        gameState.pendingTravel.setTravelTime = effect.value;
    },
    'add_debt': (gameState, effect) => {
        gameState.player.debt += effect.value;
        gameState._logTransaction('loan', effect.value, 'Incurred debt from event');
    },
    'add_cargo': (gameState, effect) => {
        const ship = gameState._getActiveShip();
        const inventory = gameState._getActiveInventory();
        if (calculateInventoryUsed(inventory) + effect.value.quantity <= ship.cargoCapacity) {
            inventory[effect.value.id].quantity += effect.value.quantity;
        }
    },
    'lose_cargo': (gameState, effect) => {
        const inventory = gameState._getActiveInventory();
        inventory[effect.value.id].quantity = Math.max(0, inventory[effect.value.id].quantity - effect.value.quantity);
    },
    'lose_random_cargo_percent': (gameState, effect) => {
        const inventory = gameState._getActiveInventory();
        const held = Object.entries(inventory).filter(([, item]) => item.quantity > 0);
        if (held.length > 0) {
            const [id, item] = held[Math.floor(Math.random() * held.length)];
            item.quantity = Math.max(0, item.quantity - Math.ceil(item.quantity * effect.value));
        }
    },
    'sell_random_cargo_premium': (gameState, effect) => {
        const inventory = gameState._getActiveInventory();
        const toSell = Object.entries(inventory).filter(([, item]) => item.quantity > 0);
        if (toSell.length > 0) {
            const [id, item] = toSell[Math.floor(Math.random() * toSell.length)];
            const saleValue = gameState.market.galacticAverages[id] * effect.value * item.quantity;
            gameState.player.credits += saleValue;
            gameState._logTransaction('trade', saleValue, 'Emergency supply drop sale');
            item.quantity = 0;
        }
    },
    'set_new_random_destination': (gameState, effect) => {
        const otherMarkets = MARKETS.filter(m => m.id !== gameState.currentLocationId && gameState.player.unlockedLocationIds.includes(m.id));
        if(otherMarkets.length > 0) gameState.pendingTravel.destinationId = otherMarkets[Math.floor(Math.random() * otherMarkets.length)].id;
    }
};

export function applyEffect(gameState, effect, outcome) {
    const handler = effectHandlers[effect.type];
    if (handler) {
        handler(gameState, effect, outcome);
    } else {
        console.warn(`No handler found for event effect type: ${effect.type}`);
    }
}