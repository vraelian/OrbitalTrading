// js/services/event-effects/effectSpaceRace.js
import { formatCredits } from '../../utils.js';

export function resolveSpaceRace(gameState, effectData, outcome) {
    const ship = gameState._getActiveShip();
    const wager = Math.floor(gameState.player.credits * effectData.wagerPercentage);
    const winChance = effectData.winChance[ship.class] || 0.40;

    if (Math.random() < winChance) {
        gameState.player.credits += wager;
        gameState._logTransaction('event', wager, 'Won space race wager');
        outcome.description = `Your Class ${ship.class} ship wins! You gain <span class="hl-green">${formatCredits(wager)}</span>.`;
    } else {
        gameState.player.credits -= wager;
        gameState._logTransaction('event', -wager, 'Lost space race wager');
        outcome.description = `The luxury ship was too fast. You lose <span class="hl-red">${formatCredits(wager)}</span>.`;
    }
}