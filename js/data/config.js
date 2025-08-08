// js/data/config.js
import { LOCATION_IDS } from './constants.js';

export const CONFIG = {
    INTEL_COST_PERCENTAGE: 0.20,
    INTEL_MIN_CREDITS: 5000,
    INTEL_CHANCE: 0.3,
    INTEL_DEMAND_MOD: 1.8,
    INTEL_DEPRESSION_MOD: 0.5,
    COMMODITY_MILESTONES: [
        { threshold: 30000, unlockLevel: 2, message: "Your growing reputation has unlocked access to more advanced industrial hardware.<br>New opportunities await." },
        { threshold: 300000, unlockLevel: 3, message: "Word of your success is spreading. High-tech biological and medical markets are now open to you.", unlocksLocation: LOCATION_IDS.URANUS },
        { threshold: 5000000, unlockLevel: 4, message: "Your influence is undeniable. Contracts for planetary-scale infrastructure are now within your reach.", unlocksLocation: LOCATION_IDS.NEPTUNE },
        { threshold: 75000000, unlockLevel: 5, message: "You now operate on a level few can comprehend. The most exotic and reality-bending goods are available to you.", unlocksLocation: LOCATION_IDS.PLUTO},
        { threshold: 100000000, message: "Your name is legend. You've been granted clearance to 'Kepler's Eye', a deep space observatory with unique scientific demands.", unlocksLocation: LOCATION_IDS.KEPLER},
        { threshold: 500000000, unlockLevel: 6, message: "You now operate on a level few can comprehend. The most exotic and reality-bending goods are available to you.", unlocksLocation: LOCATION_IDS.EXCHANGE }
    ]
};