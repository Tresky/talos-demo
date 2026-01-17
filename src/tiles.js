// ============================================
// TILE SYSTEM
// ============================================

export const TILE = {
    GRASS: 0,
    TREE: 1,
    ROCK: 2,
    WALL: 3,
    FLOOR: 4,
    STOCKPILE: 5,
    STUMP: 6,
    RUBBLE: 7,
    DOOR: 8,
    FOUNDATION: 9,  // Under construction - not walkable
    BED: 10,
    WORKBENCH: 11,
    CRATE: 12,
};

// Tile metadata - extensible for future tile types
export const TILE_DATA = {
    [TILE.GRASS]: {
        name: 'Grass',
        color: '#3d5c3d',
        walkable: true,
        buildable: true,
    },
    [TILE.TREE]: {
        name: 'Tree',
        color: '#2d4a2d',
        walkable: false,
        buildable: false,
        gatherable: true,
        resource: 'wood',
        depletedTile: TILE.STUMP,
    },
    [TILE.ROCK]: {
        name: 'Rock',
        color: '#5a5a6a',
        walkable: false,
        buildable: false,
        gatherable: true,
        resource: 'stone',
        depletedTile: TILE.RUBBLE,
    },
    [TILE.WALL]: {
        name: 'Wall',
        color: '#8b7355',
        walkable: false,
        buildable: false,
        demolishable: true,
    },
    [TILE.FLOOR]: {
        name: 'Floor',
        color: '#a08060',
        walkable: true,
        buildable: false,
    },
    [TILE.STOCKPILE]: {
        name: 'Stockpile',
        color: '#4a4a3a',
        walkable: true,
        buildable: false,
        isStockpile: true,
    },
    [TILE.STUMP]: {
        name: 'Stump',
        color: '#4a3a2a',
        walkable: true,
        buildable: true,
    },
    [TILE.RUBBLE]: {
        name: 'Rubble',
        color: '#6a6a7a',
        walkable: true,
        buildable: true,
    },
    [TILE.DOOR]: {
        name: 'Door',
        color: '#6a4a2a',
        walkable: true,
        buildable: false,
        isDoor: true,
        demolishable: true,
    },
    [TILE.FOUNDATION]: {
        name: 'Foundation',
        color: '#5a5a4a',
        walkable: false,
        buildable: false,
    },
    [TILE.BED]: {
        name: 'Bed',
        color: '#8b4513',
        walkable: false,
        buildable: false,
        furniture: true,
        roomType: 'house',
    },
    [TILE.WORKBENCH]: {
        name: 'Workbench',
        color: '#deb887',
        walkable: false,
        buildable: false,
        furniture: true,
        roomType: 'carpenter',
    },
    [TILE.CRATE]: {
        name: 'Crate',
        color: '#8b7355',
        walkable: false,
        buildable: false,
        furniture: true,
        roomType: 'storage',
        isStorage: true,
    },
};

// Helper functions
export function getTileData(tileType) {
    return TILE_DATA[tileType] || TILE_DATA[TILE.GRASS];
}

export function isGatherable(tileType) {
    return getTileData(tileType).gatherable === true;
}

export function isBuildable(tileType) {
    return getTileData(tileType).buildable === true;
}

export function getResourceType(tileType) {
    return getTileData(tileType).resource || null;
}

export function getDepletedTile(tileType) {
    return getTileData(tileType).depletedTile ?? TILE.GRASS;
}

export function isDemolishable(tileType) {
    return getTileData(tileType).demolishable === true;
}
