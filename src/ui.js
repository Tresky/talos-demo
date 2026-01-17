// ============================================
// UI SYSTEM (DOM Updates)
// ============================================

import { BUILDINGS, ROOM_TYPES, FURNITURE } from './config.js';
import { canAfford, getResources } from './state.js';
import { getStatusText, clearTask } from './colonist.js';
import { getRoomInfo, setRoomType } from './rooms.js';
import { removeTask } from './tasks.js';

// Cache DOM elements
let elements = null;

/**
 * Initializes UI element cache.
 */
export function initUI() {
    elements = {
        woodCount: document.getElementById('wood-count'),
        stoneCount: document.getElementById('stone-count'),
        colonistList: document.getElementById('colonist-list'),
        status: document.getElementById('status'),
        roomInfo: document.getElementById('room-info'),
        buildButtons: {
            wall: document.getElementById('btn-wall'),
            floor: document.getElementById('btn-floor'),
            door: document.getElementById('btn-door'),
            stockpile: document.getElementById('btn-stockpile'),
            demolish: document.getElementById('btn-demolish'),
        },
    };
}

/**
 * Updates all UI elements to reflect current state.
 */
export function updateUI(state) {
    if (!elements) initUI();
    
    updateResourceDisplay(state);
    updateBuildButtons(state);
    updateColonistList(state);
    updateRoomInfo(state);
    updateStatusBar(state);
}

/**
 * Updates resource counters.
 */
function updateResourceDisplay(state) {
    const resources = getResources(state);
    elements.woodCount.textContent = resources.wood;
    elements.stoneCount.textContent = resources.stone;
}

/**
 * Updates build button states.
 */
function updateBuildButtons(state) {
    for (const [type, btn] of Object.entries(elements.buildButtons)) {
        const building = BUILDINGS[type];
        const affordable = building ? canAfford(state, building.cost) : true;
        
        btn.disabled = !affordable;
        btn.classList.toggle('active', state.buildMode === type);
    }
}

/**
 * Updates colonist list.
 */
function updateColonistList(state) {
    elements.colonistList.innerHTML = state.colonists.map(colonist => {
        const hasTask = colonist.task !== null;
        return `
            <div class="colonist-item">
                <span>${colonist.name}</span>
                <span class="colonist-status">${getStatusText(colonist)}</span>
                ${hasTask ? `<button class="cancel-btn" data-colonist-id="${colonist.id}">✕</button>` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Updates room info panel.
 */
function updateRoomInfo(state) {
    if (!elements.roomInfo) return;
    
    const room = state.ui.selectedRoom;
    const info = getRoomInfo(room);
    
    if (info) {
        const roomTypeData = ROOM_TYPES[info.type] || ROOM_TYPES.none;
        const resources = getResources(state);
        
        // Build room type selector
        let typeOptions = '';
        for (const [typeId, typeData] of Object.entries(ROOM_TYPES)) {
            const selected = typeId === info.type ? 'selected' : '';
            typeOptions += `<option value="${typeId}" ${selected}>${typeData.name}</option>`;
        }
        
        // Build furniture buttons based on room type
        let furnitureButtons = '';
        if (roomTypeData.furniture && roomTypeData.furniture.length > 0) {
            furnitureButtons = '<div class="furniture-section"><h3>🪑 Furniture</h3>';
            for (const furnitureId of roomTypeData.furniture) {
                const furniture = FURNITURE[furnitureId];
                if (furniture) {
                    const costStr = Object.entries(furniture.cost)
                        .map(([r, amt]) => `${amt} ${r === 'wood' ? '🪵' : '🪨'}`)
                        .join(' ') || 'Free';
                    const affordable = canAfford(state, furniture.cost);
                    furnitureButtons += `
                        <button class="build-btn furniture-btn" 
                                data-furniture="${furnitureId}"
                                ${affordable ? '' : 'disabled'}>
                            <span>${furniture.name}</span>
                            <span class="cost">${costStr}</span>
                        </button>
                    `;
                }
            }
            furnitureButtons += '</div>';
        }
        
        elements.roomInfo.innerHTML = `
            <h2>🏠 Room Selected</h2>
            <div class="room-stats">
                <div class="room-stat">
                    <span class="label">Type</span>
                    <select id="room-type-select" class="room-type-select">
                        ${typeOptions}
                    </select>
                </div>
                <div class="room-stat">
                    <span class="label">Size</span>
                    <span class="value">${info.size} tiles</span>
                </div>
                <div class="room-stat">
                    <span class="label">Dimensions</span>
                    <span class="value">${info.dimensions}</span>
                </div>
            </div>
            ${furnitureButtons}
            <p class="room-hint">Click elsewhere to deselect</p>
        `;
        elements.roomInfo.style.display = 'block';
    } else {
        elements.roomInfo.innerHTML = '';
        elements.roomInfo.style.display = 'none';
    }
}

/**
 * Updates status bar.
 */
function updateStatusBar(state) {
    if (state.buildMode) {
        elements.status.textContent = `Build Mode: ${state.buildMode}`;
    } else if (state.tasks.length > 0) {
        elements.status.textContent = `${state.tasks.length} task(s) queued`;
    } else {
        elements.status.textContent = 'Ready';
    }
}

/**
 * Sets up build button click handlers.
 */
export function setupBuildButtons(state, onBuildModeChange) {
    if (!elements) initUI();
    
    for (const [type, btn] of Object.entries(elements.buildButtons)) {
        btn.addEventListener('click', () => {
            onBuildModeChange(state.buildMode === type ? null : type);
        });
    }
}

/**
 * Sets up colonist cancel button handlers using event delegation.
 */
export function setupColonistControls(state) {
    if (!elements) initUI();
    
    elements.colonistList.addEventListener('click', (e) => {
        if (e.target.classList.contains('cancel-btn')) {
            const colonistId = parseInt(e.target.dataset.colonistId, 10);
            const colonist = state.colonists.find(c => c.id === colonistId);
            if (colonist && colonist.task) {
                const task = colonist.task;
                clearTask(colonist, false);  // Clear colonist's task reference
                removeTask(state, task);     // Remove task from queue entirely
            }
        }
    });
}

/**
 * Sets up room control handlers (room type, furniture).
 */
export function setupRoomControls(state, onFurnitureBuild) {
    if (!elements) initUI();
    
    elements.roomInfo.addEventListener('change', (e) => {
        if (e.target.id === 'room-type-select') {
            const room = state.ui.selectedRoom;
            if (room) {
                setRoomType(room, e.target.value);
            }
        }
    });
    
    elements.roomInfo.addEventListener('click', (e) => {
        const btn = e.target.closest('.furniture-btn');
        if (btn) {
            const furnitureId = btn.dataset.furniture;
            if (furnitureId && onFurnitureBuild) {
                onFurnitureBuild(furnitureId);
            }
        }
    });
}
