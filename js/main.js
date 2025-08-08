/**
 * @file main.js
 * @description Main entry point for the Orbital Trading game.
 *
 * APPLICATION ARCHITECTURE:
 * -------------------------
 * 1.  **main.js**: Initializes the application. On game start, it instantiates all core services.
 * 2.  **GameState.js**: A centralized object holding the entire game state. It's the "single source of truth."
 * 3.  **SimulationService.js**: The core game engine. It contains all the primary game logic for player actions (travel, trade, etc.), time progression, and event triggers. It modifies the GameState.
 * 4.  **UIManager.js**: Responsible for rendering the entire UI based on the current GameState. It reads from the GameState but does not modify it.
 * 5.  **EventManager.js**: Listens for all user inputs (clicks, keys). It translates these inputs into calls to the SimulationService, acting as the bridge between the UI and the game logic.
 * 6.  **TutorialService.js**: A specialized service that hooks into the game loop to trigger and manage interactive tutorials.
 *
 * DATA FLOW:
 * ------------
 * User Input -> EventManager -> SimulationService -> GameState (mutated) -> UIManager (re-renders UI)
 */

// js/main.js
import { GameState } from './services/GameState.js';
import { SimulationService } from './services/SimulationService.js';
import { UIManager } from './services/UIManager.js';
import { EventManager } from './services/EventManager.js';
import { TutorialService } from './services/TutorialService.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- App Initialization ---
    const splashScreen = document.getElementById('splash-screen');
    const gameContainer = document.getElementById('game-container');
    const startButton = document.getElementById('start-game-btn');

    startButton.addEventListener('click', showNamePrompt, { once: true });

    function showNamePrompt() {
        splashScreen.classList.add('modal-hiding');
        splashScreen.addEventListener('animationend', () => {
            splashScreen.style.display = 'none';
        }, { once: true });

        gameContainer.classList.remove('hidden');
        
        const nameModal = document.getElementById('name-modal');
        const nameInput = document.getElementById('player-name-input');
        const buttonContainer = document.getElementById('name-modal-buttons');
        buttonContainer.innerHTML = '';

        const confirmButton = document.createElement('button');
        confirmButton.id = 'confirm-name-button';
        confirmButton.className = 'btn px-6 py-2 w-full sm:w-auto';
        confirmButton.textContent = 'Confirm';
        const startGameWithName = () => {
            // Sanitize the player name
            let playerName = nameInput.value.trim();
            // Remove any characters that are not letters, numbers, or spaces
            playerName = playerName.replace(/[^a-zA-Z0-9 ]/g, '');
            // If the name is empty after sanitizing, default to 'Captain'
            if (!playerName) {
                playerName = 'Captain';
            }

            nameModal.classList.add('hidden');
            startGame(playerName);
        };
        
        confirmButton.onclick = startGameWithName;
        nameInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') confirmButton.click();
        });
        buttonContainer.appendChild(confirmButton);
        nameModal.classList.remove('hidden');
        nameInput.focus();
    }

    function startGame(playerName) {
        // --- Service Instantiation ---
        const gameState = new GameState();
        const uiManager = new UIManager();
        const simulationService = new SimulationService(gameState, uiManager);
        // --- CHANGE START ---
        const tutorialService = new TutorialService(gameState, uiManager, simulationService, uiManager.navStructure);
        // --- CHANGE END ---
        // Now that all services are created, inject dependencies
        simulationService.setTutorialService(tutorialService);
        const eventManager = new EventManager(gameState, simulationService, uiManager, tutorialService);

        // --- Game Initialization ---
        const hasSave = gameState.loadGame();
        if (!hasSave) {
            gameState.startNewGame(playerName);
            simulationService.showIntroSequence();
        }

        // --- Bindings ---
        eventManager.bindEvents();
        // Initial render
        uiManager.render(gameState.getState());
        tutorialService.checkState({ type: 'SCREEN_LOAD', screenId: gameState.activeScreen });
    }
});