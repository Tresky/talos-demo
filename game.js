// ============================================
// TALOS DEMO - Gather & Build Core Loop
// ============================================

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    tileSize: 32,
    mapWidth: 30,
    mapHeight: 22,
    colonistSpeed: 2,
    gatherTime: 60,  // frames to gather
    buildTime: 45,   // frames to build
};

// Resize canvas
canvas.width = CONFIG.mapWidth * CONFIG.tileSize;
canvas.height = CONFIG.mapHeight * CONFIG.tileSize;

// ============================================
// GAME STATE
// ============================================

const state = {
    resources: { wood: 0, stone: 0 },
    buildMode: null,  // null | 'wall' | 'floor' | 'stockpile'
    tiles: [],
    colonists: [],
    tasks: [],        // Task queue
    stockpiles: [],   // Stockpile zones
};

// Building costs
const BUILDING_COSTS = {
    wall: { stone: 5 },
    floor: { wood: 2 },
    stockpile: {},
};

// ============================================
// TILE TYPES
// ============================================

const TILE = {
    GRASS: 0,
    TREE: 1,
    ROCK: 2,
    WALL: 3,
    FLOOR: 4,
    STOCKPILE: 5,
    STUMP: 6,
    RUBBLE: 7,
};

const TILE_COLORS = {
    [TILE.GRASS]: '#3d5c3d',
    [TILE.TREE]: '#2d4a2d',
    [TILE.ROCK]: '#5a5a6a',
    [TILE.WALL]: '#8b7355',
    [TILE.FLOOR]: '#a08060',
    [TILE.STOCKPILE]: '#4a4a3a',
    [TILE.STUMP]: '#4a3a2a',
    [TILE.RUBBLE]: '#6a6a7a',
};

// ============================================
// INITIALIZATION
// ============================================

function initMap() {
    state.tiles = [];
    for (let y = 0; y < CONFIG.mapHeight; y++) {
        const row = [];
        for (let x = 0; x < CONFIG.mapWidth; x++) {
            let tile = TILE.GRASS;
            const rand = Math.random();
            if (rand < 0.12) tile = TILE.TREE;
            else if (rand < 0.17) tile = TILE.ROCK;
            row.push(tile);
        }
        state.tiles.push(row);
    }
    
    // Clear starting area
    const cx = Math.floor(CONFIG.mapWidth / 2);
    const cy = Math.floor(CONFIG.mapHeight / 2);
    for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
            const x = cx + dx;
            const y = cy + dy;
            if (x >= 0 && x < CONFIG.mapWidth && y >= 0 && y < CONFIG.mapHeight) {
                state.tiles[y][x] = TILE.GRASS;
            }
        }
    }
    
    // Create initial stockpile
    state.tiles[cy][cx] = TILE.STOCKPILE;
    state.stockpiles.push({ x: cx, y: cy });
}

function initColonists() {
    const cx = Math.floor(CONFIG.mapWidth / 2);
    const cy = Math.floor(CONFIG.mapHeight / 2);
    
    const names = ['Ada', 'Bjorn', 'Celia'];
    for (let i = 0; i < 3; i++) {
        state.colonists.push({
            id: i,
            name: names[i],
            x: (cx + i - 1) * CONFIG.tileSize + CONFIG.tileSize / 2,
            y: (cy + 1) * CONFIG.tileSize + CONFIG.tileSize / 2,
            task: null,
            carrying: null,  // { type: 'wood'|'stone', amount: 1 }
            workProgress: 0,
            targetX: null,
            targetY: null,
        });
    }
}

// ============================================
// TASK SYSTEM
// ============================================

function createGatherTask(tileX, tileY) {
    const tile = state.tiles[tileY][tileX];
    if (tile !== TILE.TREE && tile !== TILE.ROCK) return null;
    
    // Check if task already exists
    if (state.tasks.find(t => t.type === 'gather' && t.x === tileX && t.y === tileY)) {
        return null;
    }
    
    return {
        type: 'gather',
        x: tileX,
        y: tileY,
        resource: tile === TILE.TREE ? 'wood' : 'stone',
        assigned: null,
    };
}

function createBuildTask(tileX, tileY, buildType) {
    const tile = state.tiles[tileY][tileX];
    if (tile !== TILE.GRASS && tile !== TILE.STUMP && tile !== TILE.RUBBLE) return null;
    
    // Check cost
    const cost = BUILDING_COSTS[buildType];
    for (const [res, amount] of Object.entries(cost)) {
        if (state.resources[res] < amount) return null;
    }
    
    // Deduct cost
    for (const [res, amount] of Object.entries(cost)) {
        state.resources[res] -= amount;
    }
    
    return {
        type: 'build',
        x: tileX,
        y: tileY,
        buildType: buildType,
        assigned: null,
    };
}

function createHaulTask(colonist) {
    // Find nearest stockpile
    let nearest = null;
    let nearestDist = Infinity;
    
    for (const sp of state.stockpiles) {
        const dist = Math.abs(sp.x - Math.floor(colonist.x / CONFIG.tileSize)) + 
                     Math.abs(sp.y - Math.floor(colonist.y / CONFIG.tileSize));
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = sp;
        }
    }
    
    if (nearest) {
        return {
            type: 'haul',
            x: nearest.x,
            y: nearest.y,
            assigned: colonist.id,
        };
    }
    return null;
}

function assignTasks() {
    for (const colonist of state.colonists) {
        if (colonist.task) continue;
        
        // If carrying something, haul it
        if (colonist.carrying) {
            colonist.task = createHaulTask(colonist);
            if (colonist.task) {
                colonist.targetX = colonist.task.x * CONFIG.tileSize + CONFIG.tileSize / 2;
                colonist.targetY = colonist.task.y * CONFIG.tileSize + CONFIG.tileSize / 2;
            }
            continue;
        }
        
        // Find unassigned task
        for (const task of state.tasks) {
            if (task.assigned === null) {
                task.assigned = colonist.id;
                colonist.task = task;
                colonist.targetX = task.x * CONFIG.tileSize + CONFIG.tileSize / 2;
                colonist.targetY = task.y * CONFIG.tileSize + CONFIG.tileSize / 2;
                break;
            }
        }
    }
}

// ============================================
// COLONIST BEHAVIOR
// ============================================

function updateColonists() {
    for (const colonist of state.colonists) {
        if (!colonist.task) continue;
        
        // Move towards target
        if (colonist.targetX !== null) {
            const dx = colonist.targetX - colonist.x;
            const dy = colonist.targetY - colonist.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > CONFIG.colonistSpeed) {
                colonist.x += (dx / dist) * CONFIG.colonistSpeed;
                colonist.y += (dy / dist) * CONFIG.colonistSpeed;
            } else {
                colonist.x = colonist.targetX;
                colonist.y = colonist.targetY;
                
                // Arrived at destination
                if (colonist.task.type === 'gather') {
                    colonist.workProgress++;
                    if (colonist.workProgress >= CONFIG.gatherTime) {
                        completeGather(colonist);
                    }
                } else if (colonist.task.type === 'haul') {
                    completeHaul(colonist);
                } else if (colonist.task.type === 'build') {
                    colonist.workProgress++;
                    if (colonist.workProgress >= CONFIG.buildTime) {
                        completeBuild(colonist);
                    }
                }
            }
        }
    }
}

function completeGather(colonist) {
    const task = colonist.task;
    const tile = state.tiles[task.y][task.x];
    
    // Set carrying
    colonist.carrying = { type: task.resource, amount: 1 };
    
    // Change tile to stump/rubble
    state.tiles[task.y][task.x] = tile === TILE.TREE ? TILE.STUMP : TILE.RUBBLE;
    
    // Remove task
    const idx = state.tasks.indexOf(task);
    if (idx >= 0) state.tasks.splice(idx, 1);
    
    // Reset colonist
    colonist.task = null;
    colonist.workProgress = 0;
    colonist.targetX = null;
    colonist.targetY = null;
}

function completeHaul(colonist) {
    // Add to stockpile
    if (colonist.carrying) {
        state.resources[colonist.carrying.type] += colonist.carrying.amount;
        colonist.carrying = null;
    }
    
    colonist.task = null;
    colonist.workProgress = 0;
    colonist.targetX = null;
    colonist.targetY = null;
}

function completeBuild(colonist) {
    const task = colonist.task;
    
    // Place building
    if (task.buildType === 'wall') {
        state.tiles[task.y][task.x] = TILE.WALL;
    } else if (task.buildType === 'floor') {
        state.tiles[task.y][task.x] = TILE.FLOOR;
    } else if (task.buildType === 'stockpile') {
        state.tiles[task.y][task.x] = TILE.STOCKPILE;
        state.stockpiles.push({ x: task.x, y: task.y });
    }
    
    // Remove task
    const idx = state.tasks.indexOf(task);
    if (idx >= 0) state.tasks.splice(idx, 1);
    
    colonist.task = null;
    colonist.workProgress = 0;
    colonist.targetX = null;
    colonist.targetY = null;
}

// ============================================
// RENDERING
// ============================================

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw tiles
    for (let y = 0; y < CONFIG.mapHeight; y++) {
        for (let x = 0; x < CONFIG.mapWidth; x++) {
            const tile = state.tiles[y][x];
            const px = x * CONFIG.tileSize;
            const py = y * CONFIG.tileSize;
            
            // Base grass
            ctx.fillStyle = TILE_COLORS[TILE.GRASS];
            ctx.fillRect(px, py, CONFIG.tileSize, CONFIG.tileSize);
            
            // Tile-specific rendering
            if (tile === TILE.TREE) {
                ctx.fillStyle = '#1a3a1a';
                ctx.beginPath();
                ctx.arc(px + 16, py + 20, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#5a3a2a';
                ctx.fillRect(px + 13, py + 22, 6, 10);
            } else if (tile === TILE.ROCK) {
                ctx.fillStyle = '#6a6a7a';
                ctx.beginPath();
                ctx.moveTo(px + 8, py + 26);
                ctx.lineTo(px + 16, py + 6);
                ctx.lineTo(px + 26, py + 26);
                ctx.closePath();
                ctx.fill();
            } else if (tile === TILE.WALL) {
                ctx.fillStyle = TILE_COLORS[TILE.WALL];
                ctx.fillRect(px + 2, py + 2, CONFIG.tileSize - 4, CONFIG.tileSize - 4);
                ctx.strokeStyle = '#6a5a45';
                ctx.strokeRect(px + 2, py + 2, CONFIG.tileSize - 4, CONFIG.tileSize - 4);
            } else if (tile === TILE.FLOOR) {
                ctx.fillStyle = TILE_COLORS[TILE.FLOOR];
                ctx.fillRect(px, py, CONFIG.tileSize, CONFIG.tileSize);
                ctx.strokeStyle = '#8a7050';
                ctx.strokeRect(px + 1, py + 1, CONFIG.tileSize - 2, CONFIG.tileSize - 2);
            } else if (tile === TILE.STOCKPILE) {
                ctx.fillStyle = TILE_COLORS[TILE.STOCKPILE];
                ctx.fillRect(px, py, CONFIG.tileSize, CONFIG.tileSize);
                ctx.strokeStyle = '#6a6a5a';
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(px + 2, py + 2, CONFIG.tileSize - 4, CONFIG.tileSize - 4);
                ctx.setLineDash([]);
            } else if (tile === TILE.STUMP) {
                ctx.fillStyle = '#4a3a2a';
                ctx.fillRect(px + 10, py + 18, 12, 10);
            } else if (tile === TILE.RUBBLE) {
                ctx.fillStyle = '#5a5a6a';
                ctx.fillRect(px + 6, py + 20, 6, 6);
                ctx.fillRect(px + 16, py + 22, 8, 5);
            }
        }
    }
    
    // Draw task indicators
    for (const task of state.tasks) {
        const px = task.x * CONFIG.tileSize;
        const py = task.y * CONFIG.tileSize;
        
        ctx.strokeStyle = task.type === 'gather' ? '#ffaa00' : '#00aaff';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, CONFIG.tileSize - 2, CONFIG.tileSize - 2);
        ctx.lineWidth = 1;
    }
    
    // Draw colonists
    for (const colonist of state.colonists) {
        // Body
        ctx.fillStyle = '#e8c170';
        ctx.beginPath();
        ctx.arc(colonist.x, colonist.y, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Outline
        ctx.strokeStyle = '#8a6a40';
        ctx.stroke();
        
        // Carrying indicator
        if (colonist.carrying) {
            ctx.fillStyle = colonist.carrying.type === 'wood' ? '#8b5a2b' : '#7a7a8a';
            ctx.fillRect(colonist.x - 4, colonist.y - 16, 8, 8);
        }
        
        // Work progress bar
        if (colonist.workProgress > 0 && colonist.task) {
            const maxProgress = colonist.task.type === 'gather' ? CONFIG.gatherTime : CONFIG.buildTime;
            const progress = colonist.workProgress / maxProgress;
            ctx.fillStyle = '#333';
            ctx.fillRect(colonist.x - 12, colonist.y - 20, 24, 4);
            ctx.fillStyle = '#4a4';
            ctx.fillRect(colonist.x - 12, colonist.y - 20, 24 * progress, 4);
        }
    }
    
    // Build mode preview
    if (state.buildMode && state.hoverTile) {
        const px = state.hoverTile.x * CONFIG.tileSize;
        const py = state.hoverTile.y * CONFIG.tileSize;
        const canBuild = canBuildAt(state.hoverTile.x, state.hoverTile.y);
        
        ctx.fillStyle = canBuild ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(px, py, CONFIG.tileSize, CONFIG.tileSize);
    }
}

// ============================================
// UI UPDATES
// ============================================

function updateUI() {
    document.getElementById('wood-count').textContent = state.resources.wood;
    document.getElementById('stone-count').textContent = state.resources.stone;
    
    // Update build buttons
    for (const type of ['wall', 'floor', 'stockpile']) {
        const btn = document.getElementById(`btn-${type}`);
        const cost = BUILDING_COSTS[type];
        let canAfford = true;
        for (const [res, amount] of Object.entries(cost)) {
            if (state.resources[res] < amount) canAfford = false;
        }
        btn.disabled = !canAfford;
        btn.classList.toggle('active', state.buildMode === type);
    }
    
    // Colonist list
    const list = document.getElementById('colonist-list');
    list.innerHTML = state.colonists.map(c => {
        let status = 'Idle';
        if (c.carrying) status = `Hauling ${c.carrying.type}`;
        else if (c.task?.type === 'gather') status = `Gathering ${c.task.resource}`;
        else if (c.task?.type === 'build') status = `Building ${c.task.buildType}`;
        
        return `<div class="colonist-item">
            <span>${c.name}</span>
            <span class="colonist-status">${status}</span>
        </div>`;
    }).join('');
    
    // Status
    const taskCount = state.tasks.length;
    document.getElementById('status').textContent = 
        state.buildMode ? `Build Mode: ${state.buildMode}` :
        taskCount > 0 ? `${taskCount} task(s) queued` : 'Ready';
}

// ============================================
// INPUT HANDLING
// ============================================

function canBuildAt(x, y) {
    const tile = state.tiles[y]?.[x];
    return tile === TILE.GRASS || tile === TILE.STUMP || tile === TILE.RUBBLE;
}

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CONFIG.tileSize);
    const y = Math.floor((e.clientY - rect.top) / CONFIG.tileSize);
    state.hoverTile = { x, y };
});

canvas.addEventListener('mouseleave', () => {
    state.hoverTile = null;
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const tileX = Math.floor((e.clientX - rect.left) / CONFIG.tileSize);
    const tileY = Math.floor((e.clientY - rect.top) / CONFIG.tileSize);
    
    if (state.buildMode) {
        // Try to build
        const task = createBuildTask(tileX, tileY, state.buildMode);
        if (task) {
            state.tasks.push(task);
        }
    } else {
        // Try to queue gather
        const task = createGatherTask(tileX, tileY);
        if (task) {
            state.tasks.push(task);
        }
    }
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    state.buildMode = null;
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        state.buildMode = null;
    }
});

// Build buttons
document.querySelectorAll('.build-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        state.buildMode = state.buildMode === type ? null : type;
    });
});

// ============================================
// GAME LOOP
// ============================================

function gameLoop() {
    assignTasks();
    updateColonists();
    render();
    updateUI();
    requestAnimationFrame(gameLoop);
}

// ============================================
// START
// ============================================

initMap();
initColonists();
gameLoop();
