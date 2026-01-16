// ============================================
// CONFIGURATION
// ============================================

export const CONFIG = {
    // Map dimensions
    tileSize: 32,
    mapWidth: 30,
    mapHeight: 22,
    
    // Colonist settings
    colonistSpeed: 2,
    startingColonists: 3,
    colonistNames: ['Ada', 'Bjorn', 'Celia', 'Dmitri', 'Elena', 'Fynn'],
    
    // Work timings (in frames, ~60fps)
    gatherTime: 60,
    buildTime: 45,
    demolishTime: 30,
    
    // Map generation
    treeChance: 0.12,
    rockChance: 0.05,  // 0.17 - 0.12 = 0.05 additional chance
    startingAreaRadius: 2,
};

// Building definitions
export const BUILDINGS = {
    wall: {
        cost: { stone: 1 },
        tile: 'WALL',
    },
    floor: {
        cost: { wood: 1 },
        tile: 'FLOOR',
    },
    door: {
        cost: { wood: 2 },
        tile: 'DOOR',
    },
    stockpile: {
        cost: {},
        tile: 'STOCKPILE',
    },
};
