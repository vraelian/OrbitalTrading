// js/services/event-effects/effectAdriftPassenger.js
import { formatCredits, calculateInventoryUsed } from '../../utils.js';
import { COMMODITY_IDS } from '../../data/constants.js';

/**
 * @typedef {import('../../services/GameState.js').GameState} GameState
 * @typedef {import('../../services/SimulationService.js').SimulationService} SimulationService
 */

/**
 * Resolves the "Adrift Passenger" event outcome where the player gives them a fuel cell.
 * The outcome is conditional, depending on the player's available cargo space and current debt status.
 * This function modifies the outcome description directly to reflect the result.
 *
 * @param {GameState} gameState - The mutable game state object.
 * @param {SimulationService} simulationService - The simulation service instance, used here to log transactions.
 * @param {object} effectData - The raw effect data from the event definition in gamedata.js (not used in this specific function but part of the standard signature).
 * @param {object} outcome - The chosen outcome object from gamedata.js. This function will modify its `description` property.
 * @returns {void}
 */
export function resolveAdriftPassenger(gameState, simulationService, effectData, outcome) {
    const ship = simulationService._getActiveShip();
    const shipState = gameState.player.shipStates[ship.id];
    const inventory = simulationService._getActiveInventory();

    shipState.fuel = Math.max(0, shipState.fuel - 30);

    // Ensure the awarded commodity exists in the inventory before attempting to modify it.
    if (!inventory[COMMODITY_IDS.CYBERNETICS]) {
        inventory[COMMODITY_IDS.CYBERNETICS] = { quantity: 0, avgCost: 0 };
    }

    if (calculateInventoryUsed(inventory) + 40 <= ship.cargoCapacity) {
        inventory[COMMODITY_IDS.CYBERNETICS].quantity += 40;
        outcome.description = `In gratitude, the passenger gives you a crate of <span class="hl-green">40 Cybernetics</span>.`;
    } else if (gameState.player.debt > 0) {
        const paid = Math.floor(gameState.player.debt * 0.20);
        gameState.player.debt -= paid;
        simulationService._logTransaction('event', paid, 'Passenger paid off debt');
        outcome.description = `Seeing your tight cargo, the passenger pays off 20% of your debt, reducing it by <span class="hl-green">${formatCredits(paid)}</span>.`;
    } else {
        const credits = Math.floor(gameState.player.credits * 0.05);
        gameState.player.credits += credits;
        simulationService._logTransaction('event', credits, 'Passenger payment');
        outcome.description = `With no room and no debt, the passenger transfers you <span class="hl-green">${formatCredits(credits)}</span>.`;
    }
}