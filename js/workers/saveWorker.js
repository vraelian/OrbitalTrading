// js/workers/saveWorker.js

/**
 * @fileoverview Dedicated Web Worker for handling the heavy serialization,
 * compression, and IndexedDB I/O of game state saving to prevent main-thread UI blocking.
 */

/**
 * Utilizes the browser's native CompressionStream API to compress JSON payloads 
 * without bringing in heavy JavaScript libraries.
 * @param {Object} data - The raw JSON chunk.
 * @returns {Promise<ArrayBuffer>} The deflated raw bytes.
 */
async function compressChunk(data) {
    const stream = new Blob([JSON.stringify(data)], { type: 'application/json' }).stream();
    const compressed = stream.pipeThrough(new CompressionStream('deflate-raw'));
    return await new Response(compressed).arrayBuffer();
}

self.onmessage = async (event) => {
    const { action, slotId, payload } = event.data;
    
    if (action === 'SAVE') {
        try {
            // 1. Shatter the monolithic payload into relational chunks
            const metaChunk = {
                slotId,
                version: payload.version,
                metadata: payload.metadata
            };

            const playerChunk = {
                slotId,
                player: payload.state.player,
                tutorials: payload.state.tutorials,
                missions: payload.state.missions,
                uiState: payload.state.uiState,
                telemetry: payload.state.telemetry
            };

            const solChunk = {
                slotId,
                solStation: payload.state.solStation
            };

            // Capture the remaining universe state organically
            const worldChunk = {
                slotId,
                market: payload.state.market,
                systemStates: payload.state.systemStates,
                intelMarket: payload.state.intelMarket,
                activeIntelDeal: payload.state.activeIntelDeal,
                activeHotIntel: payload.state.activeHotIntel,
                day: payload.state.day,
                currentLocationId: payload.state.currentLocationId,
                activeNav: payload.state.activeNav,
                activeScreen: payload.state.activeScreen,
                isGameOver: payload.state.isGameOver,
                subNavCollapsed: payload.state.subNavCollapsed,
                lastActiveScreen: payload.state.lastActiveScreen,
                pendingTravel: payload.state.pendingTravel,
                pendingEventChains: payload.state.pendingEventChains,
                pendingStoryEvents: payload.state.pendingStoryEvents,
                lastHotIntelDay: payload.state.lastHotIntelDay
            };

            // 2. Concurrency Block: Compress all chunks in parallel
            const [metaComp, playerComp, worldComp, solComp] = await Promise.all([
                compressChunk(metaChunk),
                compressChunk(playerChunk),
                compressChunk(worldChunk),
                compressChunk(solChunk)
            ]);

            // 3. Pipelining: Route the compressed chunks into the chunked IndexedDB stores
            const request = indexedDB.open('OrbitalSavesDB', 2);
            
            request.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction(['saves_metadata', 'saves_player', 'saves_world', 'saves_sol'], 'readwrite');
                
                tx.objectStore('saves_metadata').put({ slotId, data: metaComp });
                tx.objectStore('saves_player').put({ slotId, data: playerComp });
                tx.objectStore('saves_world').put({ slotId, data: worldComp });
                tx.objectStore('saves_sol').put({ slotId, data: solComp });

                tx.oncomplete = () => {
                    self.postMessage({ status: 'SUCCESS', slotId });
                    db.close();
                };
                
                tx.onerror = (err) => {
                    self.postMessage({ status: 'ERROR', error: err.target.error });
                    db.close();
                };
            };
            
            request.onerror = (err) => {
                self.postMessage({ status: 'ERROR', error: err.target.error });
            };

        } catch (error) {
            self.postMessage({ status: 'ERROR', error: error.message });
        }
    }
};