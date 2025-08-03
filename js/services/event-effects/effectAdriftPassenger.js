// js/services/event-effects/effectAdriftPassenger.js
import { formatCredits } from '../../utils.js';
import { COMMODITY_IDS } from '../../data/constants.js';

export function resolveAdriftPassenger(gameState, effectData, outcome) {
    const ship = gameState._getActiveShip();
    const shipState = gameState.player.shipStates[ship.id];
    const inventory = gameState._getActiveInventory();

    shipState.fuel = Math.max(0, shipState.fuel - 30);

    if (calculateInventoryUsed(inventory) + 40 <= ship.cargoCapacity) {
        inventory[COMMODITY_IDS.CYBERNETICS].quantity += 40;
        outcome.description = `In gratitude, the passenger gives you a crate of <span class="hl-green">40 Cybernetics</span>.`;
    } else if (gameState.player.debt > 0) {
        const paid = Math.floor(gameState.player.debt * 0.20);
        gameState.player.debt -= paid;
        gameState._logTransaction('event', paid, 'Passenger paid off debt');
        outcome.description = `Seeing your tight cargo, the passenger pays off 20% of your debt, reducing it by <span class="hl-green">${formatCredits(paid)}</span>.`;
    } else {
        const credits = Math.floor(gameState.player.credits * 0.05);
        gameState.player.credits += credits;
        gameState._logTransaction('event', credits, 'Passenger payment');
        outcome.description = `With no room and no debt, the passenger transfers you <span class="hl-green">${formatCredits(credits)}</span>.`;
    }
}