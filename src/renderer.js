// ============================================
// RENDERING SYSTEM
// ============================================

import { CONFIG, ROOM_TYPES } from './config.js';
import { TILE, TILE_DATA, isBuildable } from './tiles.js';
import { getWorkTime } from './systems.js';
import { findStockpileStackAt, getGroundStacks } from './items.js';
import { getRoomAtTile } from './rooms.js';

/**
 * Main render function - draws the entire game.
 */
export function render(state, ctx) {
    const { tileSize } = CONFIG;
    
    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Render layers in order
    renderTiles(state, ctx, tileSize);
    renderItemStacks(state, ctx, tileSize);
    renderRooms(state, ctx, tileSize);
    renderTaskIndicators(state, ctx, tileSize);
    renderColonists(state, ctx, tileSize);
    renderBuildPreview(state, ctx, tileSize);
}

/**
 * Renders all map tiles.
 */
function renderTiles(state, ctx, tileSize) {
    for (let y = 0; y < state.tiles.length; y++) {
        for (let x = 0; x < state.tiles[y].length; x++) {
            const tile = state.tiles[y][x];
            const px = x * tileSize;
            const py = y * tileSize;
            
            renderTile(ctx, tile, px, py, tileSize, state, x, y);
        }
    }
}

/**
 * Renders a single tile.
 */
function renderTile(ctx, tile, px, py, tileSize, state, tileX, tileY) {
    // Always draw grass base
    ctx.fillStyle = TILE_DATA[TILE.GRASS].color;
    ctx.fillRect(px, py, tileSize, tileSize);
    
    // Draw tile-specific graphics
    switch (tile) {
        case TILE.TREE:
            renderTree(ctx, px, py);
            break;
        case TILE.ROCK:
            renderRock(ctx, px, py);
            break;
        case TILE.WALL:
            renderWall(ctx, px, py, tileSize);
            break;
        case TILE.FLOOR:
            renderFloor(ctx, px, py, tileSize);
            break;
        case TILE.STOCKPILE:
            renderStockpile(ctx, px, py, tileSize, state, tileX, tileY);
            break;
        case TILE.STUMP:
            renderStump(ctx, px, py);
            break;
        case TILE.RUBBLE:
            renderRubble(ctx, px, py);
            break;
        case TILE.DOOR:
            renderDoor(ctx, px, py, tileSize);
            break;
        case TILE.FOUNDATION:
            renderFoundation(ctx, px, py, tileSize);
            break;
        case TILE.BED:
            renderBed(ctx, px, py, tileSize);
            break;
        case TILE.WORKBENCH:
            renderWorkbench(ctx, px, py, tileSize);
            break;
        case TILE.CRATE:
            renderCrate(ctx, px, py, tileSize, state, tileX, tileY);
            break;
    }
}

function renderTree(ctx, px, py) {
    // Foliage
    ctx.fillStyle = '#1a3a1a';
    ctx.beginPath();
    ctx.arc(px + 16, py + 20, 12, 0, Math.PI * 2);
    ctx.fill();
    // Trunk
    ctx.fillStyle = '#5a3a2a';
    ctx.fillRect(px + 13, py + 22, 6, 10);
}

function renderRock(ctx, px, py) {
    ctx.fillStyle = '#6a6a7a';
    ctx.beginPath();
    ctx.moveTo(px + 8, py + 26);
    ctx.lineTo(px + 16, py + 6);
    ctx.lineTo(px + 26, py + 26);
    ctx.closePath();
    ctx.fill();
}

function renderWall(ctx, px, py, tileSize) {
    ctx.fillStyle = TILE_DATA[TILE.WALL].color;
    ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
    ctx.strokeStyle = '#6a5a45';
    ctx.strokeRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
}

function renderFloor(ctx, px, py, tileSize) {
    ctx.fillStyle = TILE_DATA[TILE.FLOOR].color;
    ctx.fillRect(px, py, tileSize, tileSize);
    ctx.strokeStyle = '#8a7050';
    ctx.strokeRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
}

function renderStockpile(ctx, px, py, tileSize, state, tileX, tileY) {
    ctx.fillStyle = TILE_DATA[TILE.STOCKPILE].color;
    ctx.fillRect(px, py, tileSize, tileSize);
    ctx.strokeStyle = '#6a6a5a';
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
    ctx.setLineDash([]);
    
    // Render contents if this stockpile has items
    if (state) {
        const stack = findStockpileStackAt(state, tileX, tileY);
        if (stack) {
            renderStackContents(ctx, px, py, tileSize, stack.type, stack.amount);
        }
    }
}

function renderStump(ctx, px, py) {
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(px + 10, py + 18, 12, 10);
}

function renderRubble(ctx, px, py) {
    ctx.fillStyle = '#5a5a6a';
    ctx.fillRect(px + 6, py + 20, 6, 6);
    ctx.fillRect(px + 16, py + 22, 8, 5);
}

function renderDoor(ctx, px, py, tileSize) {
    // Door frame
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
    // Door panel
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(px + 6, py + 4, tileSize - 12, tileSize - 8);
    // Handle
    ctx.fillStyle = '#aa8a5a';
    ctx.fillRect(px + tileSize - 12, py + 14, 3, 6);
}

function renderFoundation(ctx, px, py, tileSize) {
    // Construction site marker
    ctx.fillStyle = '#5a5a4a';
    ctx.fillRect(px, py, tileSize, tileSize);
    
    // Clip to tile bounds for diagonal stripes
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, tileSize, tileSize);
    ctx.clip();
    
    // Diagonal stripes to indicate construction
    ctx.strokeStyle = '#7a7a5a';
    ctx.lineWidth = 2;
    for (let i = -tileSize; i < tileSize * 2; i += 8) {
        ctx.beginPath();
        ctx.moveTo(px + i, py);
        ctx.lineTo(px + i + tileSize, py + tileSize);
        ctx.stroke();
    }
    
    ctx.restore();
}

function renderBed(ctx, px, py, tileSize) {
    // Bed frame
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(px + 4, py + 6, tileSize - 8, tileSize - 10);
    // Mattress
    ctx.fillStyle = '#deb887';
    ctx.fillRect(px + 6, py + 8, tileSize - 12, tileSize - 14);
    // Pillow
    ctx.fillStyle = '#f5f5dc';
    ctx.fillRect(px + 8, py + 10, 8, 6);
}

function renderWorkbench(ctx, px, py, tileSize) {
    // Table top
    ctx.fillStyle = '#deb887';
    ctx.fillRect(px + 2, py + 8, tileSize - 4, tileSize - 14);
    // Legs
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(px + 4, py + tileSize - 8, 4, 6);
    ctx.fillRect(px + tileSize - 8, py + tileSize - 8, 4, 6);
    // Tools on top
    ctx.fillStyle = '#696969';
    ctx.fillRect(px + 10, py + 10, 6, 3);
    ctx.fillRect(px + 18, py + 11, 4, 4);
}

function renderCrate(ctx, px, py, tileSize, state, tileX, tileY) {
    // Crate body
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(px + 4, py + 6, tileSize - 8, tileSize - 10);
    // Slats
    ctx.strokeStyle = '#6b5344';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 4, py + 12);
    ctx.lineTo(px + tileSize - 4, py + 12);
    ctx.moveTo(px + 4, py + 18);
    ctx.lineTo(px + tileSize - 4, py + 18);
    ctx.stroke();
    
    // Render contents if this is a storage crate
    if (state) {
        const stack = findStockpileStackAt(state, tileX, tileY);
        if (stack) {
            renderStackContents(ctx, px, py, tileSize, stack.type, stack.amount);
        }
    }
}

/**
 * Renders the contents of a stockpile or ground stack.
 */
function renderStackContents(ctx, px, py, tileSize, resourceType, amount) {
    const centerX = px + tileSize / 2;
    const centerY = py + tileSize / 2;
    
    // Draw resource icon
    if (resourceType === 'wood') {
        // Wood log icon
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(centerX - 8, centerY - 4, 16, 8);
        ctx.fillStyle = '#6b4a1b';
        ctx.beginPath();
        ctx.arc(centerX - 8, centerY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX + 8, centerY, 4, 0, Math.PI * 2);
        ctx.fill();
    } else if (resourceType === 'stone') {
        // Stone icon
        ctx.fillStyle = '#7a7a8a';
        ctx.beginPath();
        ctx.moveTo(centerX - 6, centerY + 4);
        ctx.lineTo(centerX, centerY - 6);
        ctx.lineTo(centerX + 6, centerY + 4);
        ctx.closePath();
        ctx.fill();
    }
    
    // Draw count badge
    if (amount > 0) {
        const badgeX = px + tileSize - 8;
        const badgeY = py + tileSize - 8;
        
        // Badge background
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, 7, 0, Math.PI * 2);
        ctx.fill();
        
        // Badge text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(amount.toString(), badgeX, badgeY);
    }
}

/**
 * Renders item stacks on the ground.
 */
function renderItemStacks(state, ctx, tileSize) {
    const groundStacks = getGroundStacks(state);
    
    for (const stack of groundStacks) {
        const px = stack.x * tileSize;
        const py = stack.y * tileSize;
        
        // Draw a subtle highlight under ground stacks
        ctx.fillStyle = 'rgba(255, 200, 100, 0.2)';
        ctx.fillRect(px + 4, py + 4, tileSize - 8, tileSize - 8);
        
        renderStackContents(ctx, px, py, tileSize, stack.type, stack.amount);
    }
}

/**
 * Renders room overlays.
 */
function renderRooms(state, ctx, tileSize) {
    // Highlight all rooms with a subtle tint
    for (const room of state.rooms) {
        const isSelected = state.ui.selectedRoom?.id === room.id;
        const roomType = ROOM_TYPES[room.type] || ROOM_TYPES.none;
        
        for (const tile of room.tiles) {
            const px = tile.x * tileSize;
            const py = tile.y * tileSize;
            
            if (isSelected) {
                // Selected room - brighter highlight
                ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
            } else {
                // Use room type color
                ctx.fillStyle = roomType.color;
            }
            ctx.fillRect(px, py, tileSize, tileSize);
        }
        
        // Draw room border for selected room
        if (isSelected) {
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
            ctx.lineWidth = 2;
            for (const tile of room.tiles) {
                const px = tile.x * tileSize;
                const py = tile.y * tileSize;
                
                // Check each edge - only draw if neighbor is not in room
                const inRoom = (x, y) => room.tiles.some(t => t.x === x && t.y === y);
                
                if (!inRoom(tile.x, tile.y - 1)) {
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(px + tileSize, py);
                    ctx.stroke();
                }
                if (!inRoom(tile.x, tile.y + 1)) {
                    ctx.beginPath();
                    ctx.moveTo(px, py + tileSize);
                    ctx.lineTo(px + tileSize, py + tileSize);
                    ctx.stroke();
                }
                if (!inRoom(tile.x - 1, tile.y)) {
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(px, py + tileSize);
                    ctx.stroke();
                }
                if (!inRoom(tile.x + 1, tile.y)) {
                    ctx.beginPath();
                    ctx.moveTo(px + tileSize, py);
                    ctx.lineTo(px + tileSize, py + tileSize);
                    ctx.stroke();
                }
            }
            ctx.lineWidth = 1;
        }
    }
}

/**
 * Renders task indicator boxes.
 */
function renderTaskIndicators(state, ctx, tileSize) {
    for (const task of state.tasks) {
        const px = task.x * tileSize;
        const py = task.y * tileSize;
        
        // Different colors for different task types
        switch (task.type) {
            case 'gather':
                ctx.strokeStyle = '#ffaa00';  // Orange
                break;
            case 'pickup':
                ctx.strokeStyle = '#ffdd00';  // Yellow
                break;
            case 'build':
                ctx.strokeStyle = '#00aaff';  // Blue
                break;
            case 'furniture':
                ctx.strokeStyle = '#aa55ff';  // Purple
                break;
            case 'demolish':
                ctx.strokeStyle = '#ff5555';  // Red
                break;
            default:
                ctx.strokeStyle = '#ffffff';
        }
        
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
        ctx.lineWidth = 1;
    }
}

/**
 * Renders all colonists.
 */
function renderColonists(state, ctx, tileSize) {
    for (const colonist of state.colonists) {
        renderColonist(ctx, colonist, tileSize);
    }
}

/**
 * Renders a single colonist.
 */
function renderColonist(ctx, colonist, tileSize) {
    const { x, y } = colonist;
    
    // Body circle
    ctx.fillStyle = '#e8c170';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6a40';
    ctx.stroke();
    
    // Carrying indicator
    if (colonist.carrying) {
        ctx.fillStyle = colonist.carrying.type === 'wood' ? '#8b5a2b' : '#7a7a8a';
        ctx.fillRect(x - 4, y - 16, 8, 8);
    }
    
    // Work progress bar
    if (colonist.workProgress > 0 && colonist.task) {
        const maxProgress = getWorkTime(colonist.task.type);
        if (maxProgress > 0) {
            const progress = colonist.workProgress / maxProgress;
            ctx.fillStyle = '#333';
            ctx.fillRect(x - 12, y - 20, 24, 4);
            ctx.fillStyle = '#4a4';
            ctx.fillRect(x - 12, y - 20, 24 * progress, 4);
        }
    }
}

/**
 * Renders build mode preview overlay.
 */
function renderBuildPreview(state, ctx, tileSize) {
    if (!state.buildMode || !state.ui.hoverTile) return;
    
    const { x, y } = state.ui.hoverTile;
    const px = x * tileSize;
    const py = y * tileSize;
    
    const tile = state.tiles[y]?.[x];
    
    let canBuild = false;
    
    if (state.buildMode === 'demolish') {
        // Demolish mode - can demolish walls and doors
        canBuild = tile === TILE.WALL || tile === TILE.DOOR;
    } else if (state.buildMode === 'door' && tile === TILE.WALL) {
        // Special case: doors can be placed over walls
        canBuild = true;
    } else {
        // Normal build - tile must be buildable
        canBuild = tile !== undefined && isBuildable(tile);
    }
    
    ctx.fillStyle = canBuild ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(px, py, tileSize, tileSize);
}
