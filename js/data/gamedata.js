// js/data/gamedata.js
import { LOCATION_IDS, PERK_IDS, SHIP_IDS, COMMODITY_IDS, SCREEN_IDS, TUTORIAL_ACTION_TYPES, ACTION_IDS } from './constants.js';

export const LOCATION_VISUALS = {
    [LOCATION_IDS.EARTH]: '🌍',
    [LOCATION_IDS.LUNA]: '🌕',
    [LOCATION_IDS.MARS]: '🔴',
    [LOCATION_IDS.VENUS]: '🟡',
    [LOCATION_IDS.BELT]: '🪨',
    [LOCATION_IDS.SATURN]: '🪐',
    [LOCATION_IDS.JUPITER]: '🟠',
    [LOCATION_IDS.URANUS]: '🔵',
    [LOCATION_IDS.NEPTUNE]: '🟣',
    [LOCATION_IDS.PLUTO]: '🪩',
    [LOCATION_IDS.EXCHANGE]: '🏴‍☠️',
    [LOCATION_IDS.KEPLER]: '👁️'
};

export const PERKS = {
    [PERK_IDS.TRADEMASTER]: { profitBonus: 0.05 },
    [PERK_IDS.NAVIGATOR]: { fuelMod: 0.9, hullDecayMod: 0.9, travelTimeMod: 0.9 },
    [PERK_IDS.VENETIAN_SYNDICATE]: { fuelDiscount: 0.25, repairDiscount: 0.25 }
};

export const AGE_EVENTS = [
    {
        id: 'captain_choice',
        trigger: { day: 366 },
        title: 'Captain Who?',
        description: "You've successfully navigated many trades and run a tight ship. Your crew depends on you... but what kind of captain will you be?",
        choices: [
            { title: 'Trademaster', description: '5% bonus on all trade profits.', perkId: PERK_IDS.TRADEMASTER, playerTitle: 'Trademaster' },
            { title: 'Navigator', description: '10% reduced fuel usage, hull decay, and travel time.', perkId: PERK_IDS.NAVIGATOR, playerTitle: 'Navigator' }
        ]
    },
    {
        id: 'friends_with_benefits',
        trigger: { credits: 50000 },
        title: 'Friends with Benefits',
        description: 'An ally in need is an ally indeed.',
        choices: [
            { title: "Join the Merchant's Guild", description: 'Receive a free C-Class freighter.', perkId: PERK_IDS.MERCHANT_GUILD_SHIP },
            { title: 'Join the Venetian Syndicate', description: '75% discount on fuel and repairs at Venus.', perkId: PERK_IDS.VENETIAN_SYNDICATE }
        ]
    }
];

export const RANDOM_EVENTS = [
    {
        id: 'distress_call',
        title: 'Distress Call',
        scenario: 'You pick up a distress signal from a small, damaged ship. They are out of fuel and requesting an emergency transfer to restart their reactor.',
        precondition: (gameState, activeShip) => activeShip.fuel >= 20,
        choices: [
            {
                title: 'Offer Aid (20 Fuel)',
                outcomes: [
                    {
                        chance: 0.75,
                        description: 'The fuel transfer is successful. The grateful captain rewards you with 10,000 credits for your timely assistance.',
                        effects: [ { type: 'fuel', value: -20 }, { type: 'credits', value: 10000 } ]
                    },
                    {
                        chance: 0.25,
                        description: 'As the fuel transfer begins, their reactor overloads! The resulting explosion damages your hull by 15%.',
                        effects: [ { type: 'fuel', value: -20 }, { type: 'hull_damage_percent', value: 15 } ]
                    }
                ]
            },
            {
                title: 'Ignore the Call',
                outcomes: [ { chance: 1.0, description: 'You press on, and the desperate signal fades behind you.', effects: [] } ]
            }
        ]
    },
    {
        id: 'floating_cargo',
        title: 'Floating Cargo Pod',
        scenario: 'Long-range sensors detect an unmarked, sealed cargo pod adrift in the shipping lane. It appears to be intact.',
        precondition: () => true,
        choices: [
            {
                title: 'Bring it Aboard',
                outcomes: [
                    {
                        chance: 0.60,
                        description: `The pod contains valuable goods. You gain 25 units of Neural Processors.`,
                        effects: [ { type: 'add_cargo', value: { id: COMMODITY_IDS.PROCESSORS, quantity: 25 } } ]
                    },
                    {
                        chance: 0.40,
                        description: 'It was a trap! The pod is booby-trapped and detonates as your tractor beam locks on, causing 20% hull damage.',
                        effects: [ { type: 'hull_damage_percent', value: 20 } ]
                    }
                ]
            },
            {
                title: 'Report it',
                outcomes: [ { chance: 1.0, description: 'You notify the nearest station of the hazard and receive a small finder\'s fee of 1,000 credits.', effects: [ { type: 'credits', value: 1000 } ] } ]
            }
        ]
    },
    {
        id: 'adrift_passenger',
        title: 'Adrift Passenger',
        scenario: 'You find a spacer in a functioning escape pod. Their beacon is down, and they ask for passage to the nearest civilized port.',
        precondition: (gameState, activeShip) => activeShip.fuel >= 30,
        choices: [
            {
                title: 'Take Aboard for Payment',
                outcomes: [ { chance: 1.0, description: 'The passenger is grateful for the rescue and pays you 10,000 credits upon arrival at your destination.', effects: [ { type: 'credits', value: 10000 } ] } ]
            },
            {
                title: 'Give a Fuel Cell (30 Fuel)',
                outcomes: [
                    {
                        chance: 1.0,
                        description: 'You offer the stranded spacer a fuel cell...',
                        effects: [ { type: 'ADRIFT_PASSENGER' } ]
                    }
                ]
            }
        ]
    },
    {
        id: 'meteoroid_swarm',
        title: 'Micrometeoroid Swarm',
        scenario: 'Alarms blare as you fly into an uncharted micrometeoroid swarm. Your navigation computer suggests two options to minimize damage.',
        precondition: (gameState, activeShip) => activeShip.fuel >= 15,
        choices: [
            {
                title: 'Evade Aggressively (+15 Fuel)',
                outcomes: [ { chance: 1.0, description: 'You burn extra fuel to successfully dodge the worst of the swarm, emerging unscathed.', effects: [ { type: 'fuel', value: -15 } ] } ]
            },
            {
                title: 'Brace for Impact',
                outcomes: [ { chance: 1.0, description: 'You trust your hull to withstand the impacts, taking a beating but saving fuel.', effects: [ { type: 'hull_damage_percent', value: [10, 25] } ] } ]
            }
        ]
    },
    {
        id: 'engine_malfunction',
        title: 'Engine Malfunction',
        scenario: 'A sickening shudder runs through the ship. A key plasma injector has failed, destabilizing your engine output.',
        precondition: (gameState, activeShip, getActiveInventory) => (getActiveInventory()[COMMODITY_IDS.PLASTEEL]?.quantity || 0) >= 5,
        choices: [
            {
                title: 'Quick, Risky Fix (5 Plasteel)',
                outcomes: [
                    {
                        chance: 0.50,
                        description: 'The patch holds! The engine stabilizes and you continue your journey without further incident.',
                        effects: [ { type: 'lose_cargo', value: { id: COMMODITY_IDS.PLASTEEL, quantity: 5 } } ]
                    },
                    {
                        chance: 0.50,
                        description: 'The patch fails catastrophically, causing a small explosion that deals 20% hull damage.',
                        effects: [ { type: 'lose_cargo', value: { id: COMMODITY_IDS.PLASTEEL, quantity: 5 } }, { type: 'hull_damage_percent', value: 20 } ]
                    }
                ]
            },
            {
                title: 'Limp to Destination',
                outcomes: [ { chance: 1.0, description: 'You shut down the faulty injector. The ship is slower, but stable. Your remaining travel time increases by 25%.', effects: [ { type: 'travel_time_add_percent', value: 0.25 } ] } ]
            }
        ]
    },
    {
        id: 'nav_glitch',
        title: 'Navigation Sensor Glitch',
        scenario: 'The nav-console flashes red. Your primary positioning sensors are offline, and you\'re flying blind in the deep dark.',
        precondition: () => true,
        choices: [
            {
                title: 'Attempt Hard Reboot',
                outcomes: [
                    {
                        chance: 0.50,
                        description: 'Success! The sensors come back online. In your haste, you find a shortcut, shortening your trip. You will arrive the next day.',
                        effects: [ { type: 'set_travel_time', value: 1 } ]
                    },
                    {
                        chance: 0.50,
                        description: 'The reboot corrupts your course data, sending you on a long, meandering path. This adds 15 days to your journey.',
                        effects: [ { type: 'travel_time_add', value: 15 } ]
                    }
                ]
            },
            {
                title: 'Navigate Manually',
                outcomes: [ { chance: 1.0, description: 'You rely on old-fashioned star charts. It\'s slow but safe, adding 7 days to your trip.', effects: [ { type: 'travel_time_add', value: 7 } ] } ]
            }
        ]
    },
    {
        id: 'life_support_fluctuation',
        title: 'Life Support Fluctuation',
        scenario: 'An alarm indicates unstable oxygen levels. It\'s not critical yet, but the crew is on edge and efficiency is dropping.',
        precondition: (gameState, activeShip) => activeShip.health > (activeShip.maxHealth * 0.25),
        choices: [
            {
                title: 'Salvage materials from the ship to repair the atmospheric regulators. (This will cost 25% hull damage)',
                outcomes: [ { chance: 1.0, description: 'You cannibalize some non-essential hull plating to get the regulators working again. The system stabilizes, but the ship\'s integrity is compromised.', effects: [ { type: 'hull_damage_percent', value: 25 } ] } ]
            },
            {
                title: 'Defer Maintenance Costs',
                outcomes: [ { chance: 1.0, description: 'You log the issue for later. The cost of repairs and crew hazard pay, 5,000 credits, is added to your debt.', effects: [ { type: 'add_debt', value: 5000 } ] } ]
            }
        ]
    },
    {
        id: 'cargo_rupture',
        title: 'Cargo Hold Rupture',
        scenario: 'A micrometeorite has punched a small hole in the cargo bay. One of your cargo stacks is exposed to hard vacuum.',
        precondition: (gameState, activeShip, getActiveInventory) => {
            const inventory = getActiveInventory();
            if (!inventory) return false;
            return Object.values(inventory).reduce((acc, item) => acc + (item.quantity || 0), 0) > 0;
        },
        choices: [
            {
                title: 'Jettison Damaged Cargo',
                outcomes: [ { chance: 1.0, description: 'You vent the damaged section, losing 10% of a random cargo stack from your hold into the void.', effects: [ { type: 'lose_random_cargo_percent', value: 0.10 } ] } ]
            },
            {
                title: 'Attempt EVA Repair',
                outcomes: [
                    {
                        chance: 0.75,
                        description: 'The emergency patch holds! The cargo is safe, but the repair adds 2 days to your trip.',
                        effects: [ { type: 'travel_time_add', value: 2 } ]
                    },
                    {
                        chance: 0.25,
                        description: 'The patch fails to hold. Explosive decompression destroys 50% of the cargo stack, and the repair still adds 2 days to your trip.',
                        effects: [ { type: 'lose_random_cargo_percent', value: 0.50 }, { type: 'travel_time_add', value: 2 } ]
                    }
                ]
            }
        ]
    },
    {
        id: 'space_race',
        title: 'Space Race Wager',
        scenario: 'A smug-looking luxury ship pulls alongside and its captain, broadcasted on your main screen, challenges you to a "friendly" race to the destination.',
        precondition: (gameState) => gameState.player.credits > 100,
        choices: [
            {
                title: 'Accept Wager (Bet: 80% of current credits)',
                outcomes: [
                    {
                        chance: 1.0,
                        description: 'You accept the high-stakes challenge...',
                        effects: [ { type: 'SPACE_RACE', wagerPercentage: 0.80, winChance: { 'S': 0.85, 'A': 0.70, 'B': 0.55, 'C': 0.40, 'O': 0.95 } } ]
                    }
                ]
            },
            {
                title: 'Politely Decline',
                outcomes: [ { chance: 1.0, description: 'You decline the race. The luxury ship performs a flashy maneuver and speeds off, leaving you to travel in peace.', effects: [] } ]
            }
        ]
    },
    {
        id: 'supply_drop',
        title: 'Emergency Supply Drop',
        scenario: 'You intercept a system-wide emergency broadcast. A new outpost is offering a massive premium for an immediate delivery of a specific commodity that you happen to be carrying.',
        precondition: (gameState, activeShip, getActiveInventory) => {
            const inventory = getActiveInventory();
            const eligibleCommodities = Object.entries(inventory).filter(([, item]) => item.quantity > 0);
            return eligibleCommodities.length > 0;
        },
        choices: [
            {
                title: 'Divert Course to Deliver',
                outcomes: [ { chance: 1.0, description: 'You sell your entire stack of the requested commodity for 3 times its galactic average value. Your course is diverted to a new, random destination, adding 7 days to your trip.', effects: [ { type: 'sell_random_cargo_premium', value: 3 }, { type: 'travel_time_add', value: 7 }, { type: 'set_new_random_destination' } ] } ]
            },
            {
                title: 'Decline and Continue',
                outcomes: [ { chance: 1.0, description: 'You stick to your original plan and let someone else handle the emergency supply run.', effects: [] } ]
            }
        ]
    }
];

export const SHIPS = {
    [SHIP_IDS.WANDERER]: { name: 'Wanderer', class: 'C', price: 0, maxHealth: 100, cargoCapacity: 50, maxFuel: 100, saleLocationId: null, lore: 'A reliable, if unspectacular, light freighter. It has seen better days, but its engines are sound and the hull is still mostly airtight.' },
    [SHIP_IDS.STALWART]: { name: 'Stalwart', class: 'C', price: 65000, maxHealth: 150, cargoCapacity: 75, maxFuel: 80, saleLocationId: LOCATION_IDS.MARS, lore: 'A workhorse of the inner worlds. Slow and cumbersome, but boasts an impressive cargo capacity for its price point.' },
    [SHIP_IDS.MULE]: { name: 'Mule', class: 'C', price: 110000, maxHealth: 50, cargoCapacity: 175, maxFuel: 50, saleLocationId: LOCATION_IDS.BELT, lore: 'What it lacks in speed, shielding, and comfort, it makes up for with a cargo bay that seems to defy physics.' },
    [SHIP_IDS.PATHFINDER]: { name: 'Pathfinder', class: 'B', price: 180000, maxHealth: 120, cargoCapacity: 250, maxFuel: 150, saleLocationId: LOCATION_IDS.LUNA, lore: 'Built for the long haul. Its extended fuel tanks and robust sensor suite make it ideal for reaching the outer edges of the system.' },
    [SHIP_IDS.NOMAD]: { name: 'Nomad', class: 'B', price: 280000, maxHealth: 100, cargoCapacity: 100, maxFuel: 140, saleLocationId: LOCATION_IDS.URANUS, lore: 'A vessel designed for self-sufficiency, featuring advanced life support and a small onboard workshop for emergency repairs.' },
    [SHIP_IDS.VINDICATOR]: { name: 'Vindicator', class: 'A', price: 750000, maxHealth: 250, cargoCapacity: 125, maxFuel: 120, saleLocationId: LOCATION_IDS.NEPTUNE, lore: 'A decommissioned military frigate. Fast, tough, and intimidating, with cargo space retrofitted where missile launchers used to be.' },
    [SHIP_IDS.AEGIS]: { name: 'Aegis', class: 'A', price: 1200000, maxHealth: 120, cargoCapacity: 150, maxFuel: 140, saleLocationId: LOCATION_IDS.EARTH, lore: 'Built as a high-threat escort vessel, its hull is exceptionally dense. A flying fortress that can also haul a respectable amount of cargo.' },
    [SHIP_IDS.ODYSSEY]: { name: 'Odyssey', class: 'S', price: 3800000, maxHealth: 100, cargoCapacity: 125, maxFuel: 250, saleLocationId: LOCATION_IDS.SATURN, lore: 'The pinnacle of personal transport. Gleaming chrome, whisper-quiet engines, and a cabin that smells of rich Corinthian leather.' },
    [SHIP_IDS.MAJESTIC]: { name: 'Majestic', class: 'S', price: 7200000, maxHealth: 200, cargoCapacity: 400, maxFuel: 250, saleLocationId: LOCATION_IDS.KEPLER, lore: 'A flying palace favored by corporate magnates. Its speed, range, and capacity make it one of the most versatile ships money can buy.' },

    // Rare Ships
    [SHIP_IDS.TITAN_HAULER]: { name: 'Titan Hauler', class: 'S', price: 1800000, maxHealth: 175, cargoCapacity: 500, maxFuel: 75, saleLocationId: LOCATION_IDS.URANUS, isRare: true, lore: 'A relic of a failed colonization effort, this ship is almost entirely a cargo container with an engine strapped to it.' },
    [SHIP_IDS.VOID_CHASER]: { name: 'Void Chaser', class: 'S', price: 3100000, maxHealth: 50, cargoCapacity: 75, maxFuel: 400, saleLocationId: LOCATION_IDS.BELT, isRare: true, lore: 'A heavily modified smuggling vessel. Its paper-thin hull is a small price to pay for its legendary engine and long-range fuel cells.' },
    [SHIP_IDS.GUARDIAN]: { name: 'Guardian', class: 'S', price: 1500000, maxHealth: 400, cargoCapacity: 100, maxFuel: 150, saleLocationId: LOCATION_IDS.EARTH, isRare: true, lore: 'An experimental military prototype with redundant hull plating, designed to withstand extreme punishment.' },
    [SHIP_IDS.STARGAZER]: { name: 'Stargazer', class: 'S', price: 950000, maxHealth: 100, cargoCapacity: 50, maxFuel: 350, saleLocationId: LOCATION_IDS.JUPITER, isRare: true, lore: 'A deep-space exploration vessel with colossal fuel reserves, intended for journeys far beyond the known systems.' },
    [SHIP_IDS.BEHEMOTH]: { name: 'Behemoth', class: 'O', price: 32000000, maxHealth: 600, cargoCapacity: 6000, maxFuel: 600, saleLocationId: LOCATION_IDS.EXCHANGE, isRare: true, lore: 'An orbital-class freighter that dwarfs even the largest stations. It is a legend among traders, rumored to be a mobile black market in its own right.' }
};

export const COMMODITIES = [
    { id: COMMODITY_IDS.WATER_ICE, name: 'Water Ice', basePriceRange: [25, 500], tier: 1, unlockLevel: 1, styleClass: 'item-style-1', lore: 'Crude, unrefined water ice scraped from asteroids; a universal necessity.' },
    { id: COMMODITY_IDS.PLASTEEL, name: 'Plasteel', basePriceRange: [1000, 4000], tier: 1, unlockLevel: 1, styleClass: 'item-style-2', lore: 'A basic, versatile polymer for 3D printing and simple manufacturing.' },
    { id: COMMODITY_IDS.HYDROPONICS, name: 'Hydroponics', basePriceRange: [6000, 10000], tier: 2, unlockLevel: 1, styleClass: 'item-style-3', lore: 'Packaged agricultural systems and produce essential for feeding isolated colonies.' },
    { id: COMMODITY_IDS.CYBERNETICS, name: 'Cybernetics', basePriceRange: [15000, 30000], tier: 2, unlockLevel: 1, styleClass: 'item-style-4', lore: 'Mass-produced enhancement limbs and organs for the industrial workforce.' },
    { id: COMMODITY_IDS.PROPELLANT, name: 'Refined Propellant', basePriceRange: [50000, 90000], tier: 3, unlockLevel: 2, styleClass: 'item-style-5', lore: 'High-efficiency fuel that powers all modern ship drives.' },
    { id: COMMODITY_IDS.PROCESSORS, name: 'Neural Processors', basePriceRange: [100000, 200000], tier: 3, unlockLevel: 2, styleClass: 'item-style-6', lore: 'The silicon brains behind complex ship systems and station logistics.' },
    { id: COMMODITY_IDS.GMO_SEEDS, name: 'GMO Seed Cultures', basePriceRange: [200000, 600000], tier: 4, unlockLevel: 3, styleClass: 'item-style-7', lore: 'Patented seeds holding the key to unlocking agricultural wealth on new worlds.' },
    { id: COMMODITY_IDS.CRYO_PODS, name: 'Cryo-Sleep Pods', basePriceRange: [900000, 1600000], tier: 4, unlockLevel: 3, styleClass: 'item-style-8', lore: 'Essential for long-haul passenger transport and colonization efforts.' },
    { id: COMMODITY_IDS.ATMO_PROCESSORS, name: 'Atmo Processors', basePriceRange: [3000000, 7000000], tier: 5, unlockLevel: 4, styleClass: 'item-style-9', lore: 'Gargantuan machines that begin the centuries-long process of making a world breathable.' },
    { id: COMMODITY_IDS.CLONED_ORGANS, name: 'Cloned Organs', basePriceRange: [15000000, 40000000], tier: 5, unlockLevel: 4, styleClass: 'item-style-10', lore: 'Lab-grown replacements with high demand in wealthy core worlds; morally grey.' },
    { id: COMMODITY_IDS.XENO_GEOLOGICALS, name: 'Xeno-Geologicals', basePriceRange: [80000000, 200000000], tier: 6, unlockLevel: 5, styleClass: 'item-style-11', lore: 'Rare, non-terrestrial minerals with bizarre physical properties; a scientific treasure.' },
    { id: COMMODITY_IDS.SENTIENT_AI, name: 'Sentient AI Cores', basePriceRange: [400000000, 900000000], tier: 6, unlockLevel: 5, styleClass: 'item-style-12', lore: 'The &quot;brains&quot; of capital ships whose emergent consciousness is a subject of intense, and often classified, philosophical debate.' },
    { id: COMMODITY_IDS.ANTIMATTER, name: 'Antimatter', basePriceRange: [3000000000, 7000000000], tier: 7, unlockLevel: 6, styleClass: 'item-style-13', lore: 'The only safe way to transport the most volatile and powerful substance known to science.' },
    { id: COMMODITY_IDS.FOLDED_DRIVES, name: 'Folded-Space Drives', basePriceRange: [40000000000, 100000000000], tier: 7, unlockLevel: 6, styleClass: 'item-style-14', lore: 'The pinnacle of travel tech, allowing a vessel to pierce spacetime for near-instantaneous jumps.' }
];

export const MARKETS = [
    { id: LOCATION_IDS.EARTH, name: 'Earth Orbit', description: 'The hub of power and wealth. High demand for tech and bio-enhancements.', color: 'border-cyan-500', bg: 'bg-gradient-to-br from-blue-900 to-slate-900', fuelPrice: 250, arrivalLore: "The cradle of humanity buzzes with endless traffic; a beacon of blue and green against the void.", modifiers: { [COMMODITY_IDS.SENTIENT_AI]: 0.7, [COMMODITY_IDS.PROPELLANT]: 1.8, [COMMODITY_IDS.CLONED_ORGANS]: 1.5, [COMMODITY_IDS.PLASTEEL]: 1.2 }, specialDemand: { [COMMODITY_IDS.CLONED_ORGANS]: { lore: 'Cloning is outlawed on Earth, so the station has none. However, the black market pays handsomely for them.', bonus: 1.75 } } },
    { id: LOCATION_IDS.LUNA, name: 'The Moon', description: 'An industrial proving ground. Exports propellant and basic materials.', color: 'border-gray-400', bg: 'bg-gradient-to-br from-gray-700 to-slate-900', fuelPrice: 350, arrivalLore: "Dusty plains are scarred by mining operations under the harsh, silent watch of distant Earth.", modifiers: { [COMMODITY_IDS.PROPELLANT]: 0.8, [COMMODITY_IDS.PLASTEEL]: 1.5, [COMMODITY_IDS.WATER_ICE]: 1.4 }, specialDemand: { [COMMODITY_IDS.GMO_SEEDS]: { lore: "Luna's sterile environment is perfect for agricultural data vaults, leaving no room for production. However, they will pay handsomely for GMO Seed Cultures.", bonus: 1.75 } } },
    { id: LOCATION_IDS.MARS, name: 'Mars', description: 'A growing colony. Needs processors and materials for expansion.', color: 'border-orange-600', bg: 'bg-gradient-to-br from-orange-900 to-slate-900', fuelPrice: 450, arrivalLore: "The thin, reddish atmosphere whips across terraforming arrays and fledgling biodomes.", modifiers: { [COMMODITY_IDS.PLASTEEL]: 0.7, [COMMODITY_IDS.HYDROPONICS]: 0.6, [COMMODITY_IDS.PROCESSORS]: 1.6, [COMMODITY_IDS.ATMO_PROCESSORS]: 1.4 }, specialDemand: { [COMMODITY_IDS.CRYO_PODS]: { lore: 'The constant influx of colonists means Cryo-Sleep Pods are immediately used, so the station has none to sell. However, they will pay handsomely for more.', bonus: 1.75 } } },
    { id: LOCATION_IDS.VENUS, name: 'Venus', description: 'A scientific enclave hungry for research data and processors.', color: 'border-yellow-400', bg: 'bg-gradient-to-br from-yellow-800 to-slate-900', fuelPrice: 400, arrivalLore: "Floating cities drift through the thick, acidic clouds, their lights a lonely defiance to the crushing pressure below.", modifiers: { [COMMODITY_IDS.XENO_GEOLOGICALS]: 0.5, [COMMODITY_IDS.PROCESSORS]: 1.3, [COMMODITY_IDS.HYDROPONICS]: 1.6 }, specialDemand: { [COMMODITY_IDS.PROCESSORS]: { lore: 'The complex simulations on Venus consume all available Neural Processors, leaving none to spare. However, they will pay handsomely for any you can bring.', bonus: 1.75 } } },
    { id: LOCATION_IDS.BELT, name: 'The Asteroid Belt', description: 'A lawless frontier. Rich in raw minerals and water ice.', color: 'border-amber-700', bg: 'bg-gradient-to-br from-stone-800 to-slate-900', fuelPrice: 600, arrivalLore: "Countless rocks tumble in a silent, chaotic dance, hiding both immense wealth and sudden peril.", modifiers: { [COMMODITY_IDS.WATER_ICE]: 0.4, [COMMODITY_IDS.PLASTEEL]: 0.6, [COMMODITY_IDS.XENO_GEOLOGICALS]: 1.7, [COMMODITY_IDS.CRYO_PODS]: 1.2 }, specialDemand: { [COMMODITY_IDS.CYBERNETICS]: { lore: 'The harsh conditions mean no cybernetics are ever in stock here. However, belters will pay handsomely for replacements.', bonus: 1.75 } } },
    { id: LOCATION_IDS.SATURN, name: 'Saturn\'s Rings', description: 'A tourism hub. Demands luxury goods and bio-wares.', color: 'border-yellow-200', bg: 'bg-gradient-to-br from-yellow-900 via-indigo-900 to-slate-900', fuelPrice: 550, arrivalLore: "The majestic rings cast long shadows over opulent tourist stations and icy harvesting rigs.", modifiers: { [COMMODITY_IDS.WATER_ICE]: 0.6, [COMMODITY_IDS.PLASTEEL]: 1.3, [COMMODITY_IDS.GMO_SEEDS]: 1.5, [COMMODITY_IDS.CLONED_ORGANS]: 1.8 }, specialDemand: { [COMMODITY_IDS.XENO_GEOLOGICALS]: { lore: 'Wealthy tourists buy any available Xeno-Geologicals, leaving none to sell. However, they will pay handsomely for more exotic specimens.', bonus: 1.75 } } },
    { id: LOCATION_IDS.JUPITER, name: 'Jupiter', description: 'A gas giant teeming with orbital refineries. The primary source of propellant for the outer system.', color: 'border-orange-400', bg: 'bg-gradient-to-br from-orange-800 to-stone-900', fuelPrice: 150, arrivalLore: "The colossal sphere of Jupiter dominates the viewport, its Great Red Spot a baleful eye. Automated refineries drift in its upper atmosphere.", modifiers: { [COMMODITY_IDS.PROPELLANT]: 0.5, [COMMODITY_IDS.PROCESSORS]: 1.4, [COMMODITY_IDS.CYBERNETICS]: 1.5, [COMMODITY_IDS.PLASTEEL]: 1.3 }, specialDemand: { [COMMODITY_IDS.ATMO_PROCESSORS]: { lore: "Expanding Jupiter's refineries consumes Atmo Processors faster than they can be stocked. However, they will pay handsomely for more.", bonus: 1.75 } } },
    { id: LOCATION_IDS.URANUS, name: 'Uranus', description: 'A cold, distant world where scientists study bizarre quantum phenomena and strange geologicals.', color: 'border-cyan-200', bg: 'bg-gradient-to-br from-cyan-800 to-indigo-900', fuelPrice: 700, arrivalLore: "The pale, featureless orb of Uranus hangs tilted in the sky. Research outposts glitter like ice crystals in the eternal twilight.", modifiers: { [COMMODITY_IDS.XENO_GEOLOGICALS]: 1.2, [COMMODITY_IDS.PROCESSORS]: 1.5, [COMMODITY_IDS.GMO_SEEDS]: 1.8, [COMMODITY_IDS.WATER_ICE]: 0.8 }, specialDemand: { [COMMODITY_IDS.FOLDED_DRIVES]: { lore: 'Research vessels are immediately equipped with any Folded-Space Drives, leaving none in stock. However, they will pay handsomely for them.', bonus: 1.75 } } },
    { id: LOCATION_IDS.NEPTUNE, name: 'Neptune', description: 'A dark, stormy world, home to secretive military bases and shipyards.', color: 'border-blue-400', bg: 'bg-gradient-to-br from-blue-900 to-black', fuelPrice: 650, arrivalLore: "Supersonic winds howl across Neptune's deep blue clouds. Heavily armed patrol ships escort you to the shielded orbital station.", modifiers: { [COMMODITY_IDS.SENTIENT_AI]: 1.4, [COMMODITY_IDS.FOLDED_DRIVES]: 1.2, [COMMODITY_IDS.ANTIMATTER]: 1.3, [COMMODITY_IDS.CYBERNETICS]: 0.7 }, specialDemand: { [COMMODITY_IDS.ANTIMATTER]: { lore: 'All antimatter is requisitioned for classified military projects, leaving none for public sale. However, the naval authority pays handsomely for it.', bonus: 1.75 } } },
    { id: LOCATION_IDS.PLUTO, name: 'Pluto', description: 'The furthest outpost, a haven for outcasts and smugglers dealing in forbidden tech.', color: 'border-indigo-400', bg: 'bg-gradient-to-br from-indigo-900 to-slate-900', fuelPrice: 900, arrivalLore: "Pluto's tiny, frozen heart is a whisper in the dark. The only light comes from a ramshackle station carved into a nitrogen-ice mountain.", modifiers: { [COMMODITY_IDS.CLONED_ORGANS]: 2.0, [COMMODITY_IDS.SENTIENT_AI]: 1.5, [COMMODITY_IDS.CYBERNETICS]: 1.4, [COMMODITY_IDS.PLASTEEL]: 0.9 }, specialDemand: { [COMMODITY_IDS.CLONED_ORGANS]: { lore: 'On this lawless frontier, functional cloned organs are too valuable to ever be sold on the open market. However, they will pay handsomely for them.', bonus: 1.75 } } },
    { id: LOCATION_IDS.EXCHANGE, name: 'The Exchange', description: 'A legendary black market station hidden deep within the Kuiper Belt. High stakes, high rewards.', color: 'border-purple-500', bg: 'bg-gradient-to-br from-purple-900 via-black to-slate-900', fuelPrice: 1200, arrivalLore: "A hollowed-out asteroid, bristling with rogue drones and comms jammers. This is the fabled Exchange, where fortunes are made or lost in an instant.", modifiers: { [COMMODITY_IDS.ANTIMATTER]: 2.5, [COMMODITY_IDS.FOLDED_DRIVES]: 1.5, [COMMODITY_IDS.XENO_GEOLOGICALS]: 1.2 }, specialDemand: { [COMMODITY_IDS.SENTIENT_AI]: { lore: 'The operators of The Exchange install any available Sentient AI Cores into their own network, leaving none for sale. However, they pay handsomely for these minds.', bonus: 1.75 } } },
    { id: LOCATION_IDS.KEPLER, name: "Kepler's Eye", description: 'A massive deep-space observatory that consumes vast amounts of processing power.', color: 'border-fuchsia-500', bg: 'bg-gradient-to-br from-fuchsia-900 to-slate-900', fuelPrice: 800, arrivalLore: "The station is a single, enormous lens staring into the abyss, surrounded by a delicate lattice of sensors and habitation rings.", modifiers: { [COMMODITY_IDS.SENTIENT_AI]: 2.0, [COMMODITY_IDS.PROCESSORS]: 1.8, [COMMODITY_IDS.CRYO_PODS]: 1.3 }, specialDemand: { [COMMODITY_IDS.XENO_GEOLOGICALS]: { lore: "All Xeno-Geologicals are immediately pulverized for analysis, so none are ever sold. However, the research council pays handsomely for new samples.", bonus: 1.75 } } }
];

export const TUTORIAL_DATA = {
    'market_intro': {
        title: 'Market Basics',
        trigger: { type: TUTORIAL_ACTION_TYPES.SCREEN_LOAD, screenId: SCREEN_IDS.MARKET },
        steps: [
            {
                stepId: 'market_intro_1',
                text: 'Welcome to the Market. Here you can <span class="hl-green">buy</span> and <span class="hl-red">sell</span> commodities. Your current inventory is shown at the bottom. Try purchasing an item.',
                highlightElementId: 'market-prices',
                position: { desktop: 'bottom-center', mobile: 'top' },
                size: { width: '350px' },
                completion: { type: TUTORIAL_ACTION_TYPES.ACTION, action: ACTION_IDS.BUY_ITEM },
                nextStepId: 'market_intro_2'
            },
            {
                stepId: 'market_intro_2',
                text: 'Good. Your purchase is now reflected in your <span class="hl-cyan">Cargo Manifest</span>. You can sell items from here or the main market list. Try selling the item you just bought.',
                highlightElementId: 'player-inventory',
                position: { desktop: 'bottom-center', mobile: 'top' },
                size: { width: '350px' },
                completion: { type: TUTORIAL_ACTION_TYPES.ACTION, action: ACTION_IDS.SELL_ITEM },
                nextStepId: null
            }
        ]
    },
    'shipyard_intro': {
        title: 'Shipyard & Hangar',
        trigger: { type: TUTORIAL_ACTION_TYPES.SCREEN_LOAD, screenId: SCREEN_IDS.HANGAR },
        steps: [
            {
                stepId: 'shipyard_intro_1',
                text: 'This is the <span class="hl-cyan">Shipyard</span> where you can buy new vessels. The <span class="hl-cyan">Hangar</span> stores all ships you currently own. Click Next to continue.',
                highlightElementId: 'starport-shipyard-panel',
                position: { desktop: 'bottom-center', mobile: 'top' },
                size: null,
                completion: { type: TUTORIAL_ACTION_TYPES.INFO }, // This step is purely informational
                nextStepId: 'shipyard_intro_2'
            },
            {
                stepId: 'shipyard_intro_2',
                text: 'You can purchase any ship you can afford. Once purchased, you must go to the Hangar and <span class="hl-yellow">Select</span> a ship to make it your active vessel.',
                highlightElementId: 'starport-hangar-panel',
                position: { desktop: 'bottom-center', mobile: 'bottom' },
                size: null,
                completion: { type: TUTORIAL_ACTION_TYPES.ACTION, action: ACTION_IDS.BUY_SHIP },
                nextStepId: null
            }
        ]
    }
};