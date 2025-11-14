class BuildingManager {
    constructor(game) {
        this.game = game;
        this.buildingTypes = this.initializeBuildingTypes();
        this.setupBuildingMenu();
    }
    
    initializeBuildingTypes() {
        return {
            townHall: {
                name: 'Town Hall',
                icon: '🏰',
                description: 'The heart of your village. Stores resources and determines your maximum building levels.',
                baseCost: { gold: 5000 },
                baseStats: {
                    health: 1000,
                    storage: 10000,
                    production: 0
                },
                maxLevel: 14,
                unlockLevel: 1,
                category: 'core'
            },
            goldMine: {
                name: 'Gold Mine',
                icon: '⛏️',
                description: 'Produces gold over time. Click to collect!',
                baseCost: { gold: 500 },
                baseStats: {
                    health: 400,
                    storage: 2000,
                    production: 100
                },
                maxLevel: 14,
                unlockLevel: 1,
                category: 'resource'
            },
            elixirCollector: {
                name: 'Elixir Collector',
                icon: '💜',
                description: 'Produces elixir over time. Essential for training troops!',
                baseCost: { gold: 750 },
                baseStats: {
                    health: 400,
                    storage: 2000,
                    production: 50
                },
                maxLevel: 14,
                unlockLevel: 2,
                category: 'resource'
            },
            darkElixirDrill: {
                name: 'Dark Elixir Drill',
                icon: '🖤',
                description: 'Produces dark elixir, the rarest resource for powerful troops!',
                baseCost: { gold: 2000, elixir: 1000 },
                baseStats: {
                    health: 500,
                    storage: 500,
                    production: 5
                },
                maxLevel: 8,
                unlockLevel: 7,
                category: 'resource'
            },
            goldStorage: {
                name: 'Gold Storage',
                icon: '🏛️',
                description: 'Stores large amounts of gold to keep it safe.',
                baseCost: { gold: 1000 },
                baseStats: {
                    health: 600,
                    storage: 50000,
                    production: 0
                },
                maxLevel: 14,
                unlockLevel: 2,
                category: 'storage'
            },
            elixirStorage: {
                name: 'Elixir Storage',
                icon: '🏺',
                description: 'Stores large amounts of elixir safely.',
                baseCost: { gold: 1000 },
                baseStats: {
                    health: 600,
                    storage: 50000,
                    production: 0
                },
                maxLevel: 14,
                unlockLevel: 2,
                category: 'storage'
            },
            barracks: {
                name: 'Barracks',
                icon: '🏺',
                description: 'Train ground troops to defend your village or attack enemies!',
                baseCost: { gold: 1000 },
                baseStats: {
                    health: 500,
                    storage: 0,
                    production: 0
                },
                maxLevel: 14,
                unlockLevel: 3,
                category: 'army'
            },
            archerTower: {
                name: 'Archer Tower',
                icon: '🏹',
                description: 'Defensive building that shoots arrows at enemies.',
                baseCost: { gold: 1000 },
                baseStats: {
                    health: 400,
                    storage: 0,
                    production: 0,
                    damage: 45,
                    range: 10
                },
                maxLevel: 18,
                unlockLevel: 2,
                category: 'defense'
            },
            cannon: {
                name: 'Cannon',
                icon: '💣',
                description: 'Ground-targeting defensive building with high damage.',
                baseCost: { gold: 800 },
                baseStats: {
                    health: 300,
                    storage: 0,
                    production: 0,
                    damage: 60,
                    range: 9
                },
                maxLevel: 18,
                unlockLevel: 1,
                category: 'defense'
            },
            wizard: {
                name: 'Wizard Tower',
                icon: '🔮',
                description: 'Splash damage defense that can hit multiple enemies.',
                baseCost: { gold: 2500, elixir: 500 },
                baseStats: {
                    health: 500,
                    storage: 0,
                    production: 0,
                    damage: 80,
                    range: 7
                },
                maxLevel: 14,
                unlockLevel: 5,
                category: 'defense'
            },
            mortar: {
                name: 'Mortar',
                icon: '🎯',
                description: 'Long range splash damage defense, but cannot hit close targets.',
                baseCost: { gold: 5000 },
                baseStats: {
                    health: 400,
                    storage: 0,
                    production: 0,
                    damage: 120,
                    range: 11,
                    minRange: 4
                },
                maxLevel: 13,
                unlockLevel: 6,
                category: 'defense'
            },
            airDefense: {
                name: 'Air Defense',
                icon: '🚀',
                description: 'High damage defense that only targets air units.',
                baseCost: { gold: 7500 },
                baseStats: {
                    health: 800,
                    storage: 0,
                    production: 0,
                    damage: 300,
                    range: 10
                },
                maxLevel: 11,
                unlockLevel: 4,
                category: 'defense'
            },
            laboratory: {
                name: 'Laboratory',
                icon: '🧪',
                description: 'Research and upgrade your troops and spells.',
                baseCost: { gold: 2500, elixir: 2500 },
                baseStats: {
                    health: 500,
                    storage: 0,
                    production: 0
                },
                maxLevel: 11,
                unlockLevel: 5,
                category: 'research'
            },
            spellFactory: {
                name: 'Spell Factory',
                icon: '✨',
                description: 'Create powerful spells to aid your attacks.',
                baseCost: { gold: 3500, elixir: 1000 },
                baseStats: {
                    health: 400,
                    storage: 0,
                    production: 0
                },
                maxLevel: 7,
                unlockLevel: 5,
                category: 'army'
            },
            clanCastle: {
                name: 'Clan Castle',
                icon: '🏴',
                description: 'Request troops from clan members and store clan war loot.',
                baseCost: { gold: 10000 },
                baseStats: {
                    health: 1000,
                    storage: 0,
                    production: 0
                },
                maxLevel: 9,
                unlockLevel: 3,
                category: 'social'
            },
            wall: {
                name: 'Wall',
                icon: '🧱',
                description: 'Protect your buildings by slowing down enemy troops.',
                baseCost: { gold: 50 },
                baseStats: {
                    health: 200,
                    storage: 0,
                    production: 0
                },
                maxLevel: 14,
                unlockLevel: 2,
                category: 'defense'
            }
        };
    }
    
    setupBuildingMenu() {
        const menu = document.getElementById('buildingMenu');
        menu.innerHTML = '';
        
        for (const [type, building] of Object.entries(this.buildingTypes)) {
            if (this.game.gameState.level >= building.unlockLevel) {
                const option = document.createElement('div');
                option.className = 'building-option';
                option.innerHTML = `
                    <div style="font-size: 20px;">${building.icon}</div>
                    <div style="font-size: 10px; margin-top: 2px;">${building.name}</div>
                    <div style="font-size: 9px; color: #FFD700;">
                        ${building.baseCost.gold ? building.baseCost.gold + '🪙' : ''}
                        ${building.baseCost.elixir ? building.baseCost.elixir + '💜' : ''}
                    </div>
                `;
                
                option.onclick = () => this.selectBuildingToBuild(type);
                
                // Check if player can afford
                if (!this.canAffordBuilding(building)) {
                    option.classList.add('disabled');
                }
                
                menu.appendChild(option);
            }
        }
    }
    
    canAffordBuilding(building) {
        const cost = building.baseCost;
        return (this.game.gameState.resources.gold >= (cost.gold || 0) &&
                this.game.gameState.resources.elixir >= (cost.elixir || 0) &&
                this.game.gameState.resources.darkElixir >= (cost.darkElixir || 0));
    }
    
    selectBuildingToBuild(type) {
        this.game.selectedBuildingType = type;
        this.game.buildMode = true;
        
        // Show building placement cursor
        this.game.canvas.style.cursor = 'crosshair';
        
        // Show placement instructions
        this.showPlacementInstructions(type);
    }
    
    showPlacementInstructions(type) {
        const building = this.buildingTypes[type];
        const instruction = document.createElement('div');
        instruction.id = 'placementInstruction';
        instruction.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: bold;
            z-index: 1000;
        `;
        instruction.textContent = `Click to place ${building.name} - Press ESC to cancel`;
        
        document.body.appendChild(instruction);
        
        // Add escape key listener
        this.game.escapeListener = (e) => {
            if (e.key === 'Escape') {
                this.cancelBuildMode();
            }
        };
        document.addEventListener('keydown', this.game.escapeListener);
    }
    
    cancelBuildMode() {
        this.game.buildMode = false;
        this.game.selectedBuildingType = null;
        this.game.canvas.style.cursor = 'default';
        
        const instruction = document.getElementById('placementInstruction');
        if (instruction) {
            document.body.removeChild(instruction);
        }
        
        if (this.game.escapeListener) {
            document.removeEventListener('keydown', this.game.escapeListener);
            this.game.escapeListener = null;
        }
    }
    
    placeBuildingAt(type, x, y) {
        const buildingType = this.buildingTypes[type];
        if (!buildingType || !this.canAffordBuilding(buildingType)) {
            return false;
        }
        
        // Check if location is valid
        if (!this.isValidPlacement(x, y, 60, 60)) {
            this.showMessage('Cannot place building here!', 'error');
            return false;
        }
        
        // Create building
        const building = this.createBuildingInstance(type, x, y);
        
        // Deduct cost
        const cost = buildingType.baseCost;
        this.game.gameState.resources.gold -= cost.gold || 0;
        this.game.gameState.resources.elixir -= cost.elixir || 0;
        this.game.gameState.resources.darkElixir -= cost.darkElixir || 0;
        
        // Add to game state
        this.game.gameState.buildings.push(building);
        
        // Update UI
        this.game.updateUI();
        this.setupBuildingMenu();
        
        // Add experience
        this.game.gameState.experience += 5;
        this.game.checkLevelUp();
        
        this.showMessage(`${buildingType.name} built!`, 'success');
        
        return true;
    }
    
    isValidPlacement(x, y, width, height) {
        // Check bounds
        if (x < 0 || y < 0 || x + width > this.game.canvas.width || y + height > this.game.canvas.height) {
            return false;
        }
        
        // Check overlap with existing buildings
        for (const building of this.game.gameState.buildings) {
            if (this.rectanglesOverlap(x, y, width, height, 
                                     building.x, building.y, building.width, building.height)) {
                return false;
            }
        }
        
        return true;
    }
    
    rectanglesOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
        return !(x1 + w1 < x2 || x2 + w2 < x1 || y1 + h1 < y2 || y2 + h2 < y1);
    }
    
    createBuildingInstance(type, x, y) {
        const buildingType = this.buildingTypes[type];
        const stats = buildingType.baseStats;
        
        return {
            id: Date.now() + Math.random(),
            name: buildingType.name,
            type: type,
            icon: buildingType.icon,
            x: x,
            y: y,
            width: this.getBuildingWidth(type),
            height: this.getBuildingHeight(type),
            level: 1,
            health: stats.health,
            maxHealth: stats.health,
            production: stats.production || 0,
            storage: stats.storage || 0,
            damage: stats.damage || 0,
            range: stats.range || 0,
            minRange: stats.minRange || 0,
            cost: { ...buildingType.baseCost },
            upgradeCost: this.calculateUpgradeCost(buildingType.baseCost, 1),
            color: this.getBuildingColor(type),
            lastCollected: Date.now()
        };
    }
    
    getBuildingWidth(type) {
        const sizes = {
            townHall: 100,
            goldMine: 60,
            elixirCollector: 60,
            darkElixirDrill: 60,
            goldStorage: 70,
            elixirStorage: 70,
            barracks: 80,
            archerTower: 50,
            cannon: 50,
            wizard: 60,
            mortar: 60,
            airDefense: 60,
            laboratory: 70,
            spellFactory: 70,
            clanCastle: 90,
            wall: 20
        };
        return sizes[type] || 60;
    }
    
    getBuildingHeight(type) {
        const sizes = {
            townHall: 100,
            goldMine: 60,
            elixirCollector: 60,
            darkElixirDrill: 60,
            goldStorage: 70,
            elixirStorage: 70,
            barracks: 60,
            archerTower: 50,
            cannon: 50,
            wizard: 60,
            mortar: 60,
            airDefense: 60,
            laboratory: 70,
            spellFactory: 70,
            clanCastle: 90,
            wall: 20
        };
        return sizes[type] || 60;
    }
    
    getBuildingColor(type) {
        const colors = {
            townHall: '#8B4513',
            goldMine: '#FFD700',
            elixirCollector: '#DA70D6',
            darkElixirDrill: '#4B0082',
            goldStorage: '#B8860B',
            elixirStorage: '#9932CC',
            barracks: '#8B0000',
            archerTower: '#228B22',
            cannon: '#696969',
            wizard: '#9400D3',
            mortar: '#556B2F',
            airDefense: '#4682B4',
            laboratory: '#FF6347',
            spellFactory: '#FF69B4',
            clanCastle: '#DC143C',
            wall: '#A0522D'
        };
        return colors[type] || '#8B4513';
    }
    
    calculateUpgradeCost(baseCost, level) {
        const multiplier = Math.pow(1.8, level);
        const cost = {};
        
        if (baseCost.gold) cost.gold = Math.floor(baseCost.gold * multiplier);
        if (baseCost.elixir) cost.elixir = Math.floor(baseCost.elixir * multiplier);
        if (baseCost.darkElixir) cost.darkElixir = Math.floor(baseCost.darkElixir * multiplier);
        
        return cost;
    }
    
    upgradeBuilding(building) {
        const buildingType = this.buildingTypes[building.type];
        if (building.level >= buildingType.maxLevel) {
            this.showMessage('Building is already at maximum level!', 'error');
            return false;
        }
        
        const upgradeCost = building.upgradeCost;
        if (!this.game.resourceManager.canAfford(upgradeCost)) {
            this.showMessage('Not enough resources!', 'error');
            return false;
        }
        
        // Deduct resources
        this.game.gameState.resources.gold -= upgradeCost.gold || 0;
        this.game.gameState.resources.elixir -= upgradeCost.elixir || 0;
        this.game.gameState.resources.darkElixir -= upgradeCost.darkElixir || 0;
        
        // Upgrade building
        building.level++;
        building.maxHealth = Math.floor(building.maxHealth * 1.2);
        building.health = building.maxHealth;
        building.production = Math.floor(building.production * 1.4);
        building.storage = Math.floor(building.storage * 1.3);
        building.damage = Math.floor(building.damage * 1.15);
        building.upgradeCost = this.calculateUpgradeCost(buildingType.baseCost, building.level);
        
        // Add experience
        this.game.gameState.experience += 15;
        this.game.checkLevelUp();
        
        this.game.updateUI();
        this.showMessage(`${building.name} upgraded to level ${building.level}!`, 'success');
        
        return true;
    }
    
    collectFromBuilding(building) {
        if (!building.production || building.production <= 0) {
            return 0;
        }
        
        const now = Date.now();
        const timeDiff = (now - building.lastCollected) / 1000 / 3600; // hours
        const produced = Math.floor(building.production * timeDiff);
        
        if (produced <= 0) {
            return 0;
        }
        
        building.lastCollected = now;
        
        // Add resources based on building type
        switch (building.type) {
            case 'goldMine':
                this.game.gameState.resources.gold += produced;
                break;
            case 'elixirCollector':
                this.game.gameState.resources.elixir += produced;
                break;
            case 'darkElixirDrill':
                this.game.gameState.resources.darkElixir += produced;
                break;
        }
        
        this.game.updateUI();
        this.showCollectionAnimation(building, produced);
        
        return produced;
    }
    
    showCollectionAnimation(building, amount) {
        const animation = document.createElement('div');
        animation.style.cssText = `
            position: fixed;
            left: ${building.x + building.width/2}px;
            top: ${building.y}px;
            color: #FFD700;
            font-weight: bold;
            font-size: 16px;
            pointer-events: none;
            z-index: 1000;
        `;
        animation.textContent = `+${amount}`;
        
        document.body.appendChild(animation);
        
        setTimeout(() => {
            if (document.body.contains(animation)) {
                document.body.removeChild(animation);
            }
        }, 1000);
    }
    
    showMessage(text, type = 'info') {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: bold;
            z-index: 1000;
            ${type === 'success' ? 'background: #32CD32; color: white;' : ''}
            ${type === 'error' ? 'background: #FF6347; color: white;' : ''}
            ${type === 'info' ? 'background: #4682B4; color: white;' : ''}
        `;
        message.textContent = text;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (document.body.contains(message)) {
                document.body.removeChild(message);
            }
        }, 3000);
    }
}