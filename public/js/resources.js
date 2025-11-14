class ResourceManager {
    constructor(game) {
        this.game = game;
        this.resourceTypes = {
            gold: {
                name: 'Gold',
                icon: '🪙',
                color: '#FFD700',
                description: 'Primary currency for building and upgrading structures'
            },
            elixir: {
                name: 'Elixir',
                icon: '💜',
                color: '#DA70D6',
                description: 'Used for training troops and some upgrades'
            },
            darkElixir: {
                name: 'Dark Elixir',
                icon: '🖤',
                color: '#4B0082',
                description: 'Rare resource for powerful troops and upgrades'
            },
            gems: {
                name: 'Gems',
                icon: '💎',
                color: '#00CED1',
                description: 'Premium currency for instant upgrades and special items'
            }
        };
        
        this.passiveIncome = {
            gold: 0,
            elixir: 0,
            darkElixir: 0
        };
        
        this.clickMultipliers = {
            gold: 1,
            elixir: 1,
            darkElixir: 1
        };
        
        this.startPassiveGeneration();
    }
    
    startPassiveGeneration() {
        setInterval(() => {
            this.generatePassiveResources();
        }, 1000);
        
        // Separate timer for visual idle collection effects (every 3 seconds)
        setInterval(() => {
            this.showIdleCollectionEffects();
        }, 3000);
    }
    
    generatePassiveResources() {
        const buildings = this.game.gameState.buildings;
        let goldGeneration = 0;
        let elixirGeneration = 0;
        let darkElixirGeneration = 0;
        
        const idleBonus = this.calculateIdleBonus();
        
        for (const building of buildings) {
            if (building.production > 0) {
                const hourlyProduction = building.production;
                const perSecondProduction = hourlyProduction / 3600;
                const bonusProduction = perSecondProduction * idleBonus;
                
                // Calculate individual building's idle collection amount
                const baseIdleAmount = Math.max(0.1, Math.floor(building.production / 100));
                const clickMultiplier = this.getClickMultiplier(building.type);
                const idleAmount = baseIdleAmount * clickMultiplier * idleBonus;
                
                switch (building.type) {
                    case 'goldMine':
                        goldGeneration += bonusProduction;
                        break;
                    case 'elixirCollector':
                        elixirGeneration += bonusProduction;
                        break;
                    case 'darkElixirDrill':
                        darkElixirGeneration += bonusProduction;
                        break;
                }
            }
        }
        
        // Add resources with idle bonuses
        this.addResource('gold', goldGeneration);
        this.addResource('elixir', elixirGeneration);
        this.addResource('darkElixir', darkElixirGeneration);
        
        // Update passive income display
        this.passiveIncome.gold = goldGeneration * 3600; // per hour
        this.passiveIncome.elixir = elixirGeneration * 3600;
        this.passiveIncome.darkElixir = darkElixirGeneration * 3600;
    }
    
    showIdleCollectionEffects() {
        const buildings = this.game.gameState.buildings;
        const idleBonus = this.calculateIdleBonus();
        
        for (const building of buildings) {
            if (building.production > 0) {
                // Calculate visual idle collection amount (3x per second * 3 seconds)
                const baseIdleAmount = Math.max(0.3, Math.floor(building.production / 33));
                const clickMultiplier = this.getClickMultiplier(building.type);
                const idleAmount = baseIdleAmount * clickMultiplier * idleBonus;
                
                // Add the actual resources
                switch (building.type) {
                    case 'goldMine':
                        this.addResource('gold', idleAmount);
                        this.showIdleCollectionEffect(building, idleAmount);
                        break;
                    case 'elixirCollector':
                        this.addResource('elixir', idleAmount);
                        this.showIdleCollectionEffect(building, idleAmount);
                        break;
                    case 'darkElixirDrill':
                        this.addResource('darkElixir', idleAmount);
                        this.showIdleCollectionEffect(building, idleAmount);
                        break;
                }
            }
        }
    }
    
    calculateIdleBonus() {
        const now = Date.now();
        const lastUpdate = this.game.gameState.lastUpdate || now;
        const timeDiffHours = (now - lastUpdate) / (1000 * 60 * 60);
        
        // Bonus for being idle (up to 2x for 24 hours)
        if (timeDiffHours > 1) {
            return Math.min(1 + (timeDiffHours / 24), 2);
        }
        
        return 1;
    }
    
    addResource(type, amount) {
        if (amount <= 0) return;
        
        const maxStorage = this.getMaxStorage(type);
        const currentAmount = this.game.gameState.resources[type];
        
        if (currentAmount >= maxStorage) {
            return; // Storage full
        }
        
        const addAmount = Math.min(amount, maxStorage - currentAmount);
        this.game.gameState.resources[type] += addAmount;
        
        this.game.updateUI();
    }
    
    getMaxStorage(resourceType) {
        let maxStorage = 100000; // Base storage
        
        const buildings = this.game.gameState.buildings;
        for (const building of buildings) {
            if (building.type === 'townHall') {
                maxStorage += building.storage;
            } else if (building.type === 'goldStorage' && resourceType === 'gold') {
                maxStorage += building.storage;
            } else if (building.type === 'elixirStorage' && resourceType === 'elixir') {
                maxStorage += building.storage;
            }
        }
        
        return maxStorage;
    }
    
    clickResource(building) {
        if (!building.production || building.production <= 0) {
            return 0;
        }
        
        const baseClick = Math.max(1, Math.floor(building.production / 10));
        const multiplier = this.getClickMultiplier(building.type);
        const clickAmount = Math.floor(baseClick * multiplier);
        
        switch (building.type) {
            case 'goldMine':
                this.addResource('gold', clickAmount);
                break;
            case 'elixirCollector':
                this.addResource('elixir', clickAmount);
                break;
            case 'darkElixirDrill':
                this.addResource('darkElixir', clickAmount);
                break;
        }
        
        this.showClickEffect(building, clickAmount);
        return clickAmount;
    }
    
    getClickMultiplier(buildingType) {
        switch (buildingType) {
            case 'goldMine':
                return this.clickMultipliers.gold;
            case 'elixirCollector':
                return this.clickMultipliers.elixir;
            case 'darkElixirDrill':
                return this.clickMultipliers.darkElixir;
            default:
                return 1;
        }
    }
    
    showClickEffect(building, amount) {
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        
        const effect = document.createElement('div');
        effect.className = 'click-effect';
        effect.style.cssText = `
            position: fixed;
            left: ${rect.left + building.x + building.width/2}px;
            top: ${rect.top + building.y - 20}px;
            color: ${this.getResourceColor(building.type)};
            font-weight: bold;
            font-size: 18px;
            pointer-events: none;
            z-index: 1000;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            transform: translateX(-50%);
        `;
        
        const resourceIcon = this.getResourceIcon(building.type);
        effect.textContent = `+${Math.floor(amount)} ${resourceIcon}`;
        
        document.body.appendChild(effect);
        
        // Animate upward
        let y = 0;
        const animation = setInterval(() => {
            y -= 2;
            effect.style.transform = `translate(-50%, ${y}px)`;
            effect.style.opacity = Math.max(0, 1 + y / 50);
            
            if (y <= -50) {
                clearInterval(animation);
                if (document.body.contains(effect)) {
                    document.body.removeChild(effect);
                }
            }
        }, 20);
    }
    
    showIdleCollectionEffect(building, amount) {
        // Skip if amount is too small to show
        if (amount < 0.1) return;
        
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        
        const effect = document.createElement('div');
        effect.className = 'idle-effect';
        effect.style.cssText = `
            position: fixed;
            left: ${rect.left + building.x + building.width/2}px;
            top: ${rect.top + building.y - 10}px;
            color: ${this.getResourceColor(building.type)};
            font-weight: normal;
            font-size: 12px;
            pointer-events: none;
            z-index: 999;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            transform: translateX(-50%);
            opacity: 0.8;
        `;
        
        const resourceIcon = this.getResourceIcon(building.type);
        effect.textContent = `+${amount < 1 ? amount.toFixed(1) : Math.floor(amount)} ${resourceIcon}`;
        
        document.body.appendChild(effect);
        
        // Animate slowly upward with fade
        let y = 0;
        const animation = setInterval(() => {
            y -= 0.5;
            effect.style.transform = `translate(-50%, ${y}px)`;
            effect.style.opacity = Math.max(0, 0.8 + y / 30);
            
            if (y <= -30) {
                clearInterval(animation);
                if (document.body.contains(effect)) {
                    document.body.removeChild(effect);
                }
            }
        }, 50);
    }
    
    getResourceColor(buildingType) {
        switch (buildingType) {
            case 'goldMine':
                return '#FFD700';
            case 'elixirCollector':
                return '#DA70D6';
            case 'darkElixirDrill':
                return '#4B0082';
            default:
                return '#FFFFFF';
        }
    }
    
    getResourceIcon(buildingType) {
        switch (buildingType) {
            case 'goldMine':
                return '🪙';
            case 'elixirCollector':
                return '💜';
            case 'darkElixirDrill':
                return '🖤';
            default:
                return '';
        }
    }
    
    upgradeClickMultiplier(resourceType, cost) {
        if (this.game.gameState.resources.gems >= cost) {
            this.game.gameState.resources.gems -= cost;
            this.clickMultipliers[resourceType] *= 1.5;
            this.game.updateUI();
            return true;
        }
        return false;
    }
    
    purchaseGems(amount, realMoneyCost) {
        // In a real game, this would integrate with payment systems
        // For demo purposes, we'll just add gems
        this.game.gameState.resources.gems += amount;
        this.game.updateUI();
        
        this.showPurchaseConfirmation(amount);
    }
    
    showPurchaseConfirmation(amount) {
        const confirmation = document.createElement('div');
        confirmation.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #00CED1, #4682B4);
            color: white;
            padding: 20px;
            border-radius: 15px;
            font-weight: bold;
            font-size: 18px;
            z-index: 2000;
            box-shadow: 0 8px 16px rgba(0,0,0,0.3);
        `;
        confirmation.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 30px; margin-bottom: 10px;">💎</div>
                <div>+${amount} Gems Added!</div>
            </div>
        `;
        
        document.body.appendChild(confirmation);
        
        setTimeout(() => {
            if (document.body.contains(confirmation)) {
                document.body.removeChild(confirmation);
            }
        }, 3000);
    }
    
    getResourceProductionInfo() {
        const info = {
            gold: { current: 0, max: 0, buildings: [] },
            elixir: { current: 0, max: 0, buildings: [] },
            darkElixir: { current: 0, max: 0, buildings: [] }
        };
        
        for (const building of this.game.gameState.buildings) {
            if (building.production > 0) {
                const resourceType = this.getBuildingResourceType(building.type);
                if (resourceType && info[resourceType]) {
                    info[resourceType].current += building.production;
                    info[resourceType].buildings.push(building);
                }
            }
        }
        
        return info;
    }
    
    getBuildingResourceType(buildingType) {
        switch (buildingType) {
            case 'goldMine':
                return 'gold';
            case 'elixirCollector':
                return 'elixir';
            case 'darkElixirDrill':
                return 'darkElixir';
            default:
                return null;
        }
    }
    
    formatResourceAmount(amount) {
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + 'M';
        } else if (amount >= 1000) {
            return (amount / 1000).toFixed(1) + 'K';
        }
        return Math.floor(amount).toString();
    }
    
    canAfford(cost) {
        const resources = this.game.gameState.resources;
        return (resources.gold >= (cost.gold || 0) &&
                resources.elixir >= (cost.elixir || 0) &&
                resources.darkElixir >= (cost.darkElixir || 0) &&
                resources.gems >= (cost.gems || 0));
    }
    
    spendResources(cost) {
        if (!this.canAfford(cost)) {
            return false;
        }
        
        const resources = this.game.gameState.resources;
        resources.gold -= cost.gold || 0;
        resources.elixir -= cost.elixir || 0;
        resources.darkElixir -= cost.darkElixir || 0;
        resources.gems -= cost.gems || 0;
        
        this.game.updateUI();
        return true;
    }
    
    addBonusResources(multiplier = 2, duration = 300000) { // 5 minutes
        this.bonusMultiplier = multiplier;
        this.bonusEndTime = Date.now() + duration;
        
        this.showBonusNotification(multiplier, duration);
        
        // Clear any existing bonus timer
        if (this.bonusTimer) {
            clearTimeout(this.bonusTimer);
        }
        
        // Set timer to remove bonus
        this.bonusTimer = setTimeout(() => {
            this.bonusMultiplier = 1;
            this.bonusEndTime = null;
            this.showBonusEndNotification();
        }, duration);
    }
    
    showBonusNotification(multiplier, duration) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 120px;
            right: 20px;
            background: linear-gradient(135deg, #32CD32, #228B22);
            color: white;
            padding: 15px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 1000;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;
        notification.innerHTML = `
            <div style="font-size: 20px; margin-bottom: 5px;">🚀</div>
            <div>${multiplier}x Resource Boost!</div>
            <div style="font-size: 12px; opacity: 0.8;">${Math.floor(duration/60000)} minutes</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 5000);
    }
    
    showBonusEndNotification() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 120px;
            right: 20px;
            background: linear-gradient(135deg, #FF6347, #DC143C);
            color: white;
            padding: 15px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 1000;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;
        notification.innerHTML = `
            <div style="font-size: 20px; margin-bottom: 5px;">⏰</div>
            <div>Bonus Expired!</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }
    
    getCurrentBonusMultiplier() {
        if (this.bonusEndTime && Date.now() < this.bonusEndTime) {
            return this.bonusMultiplier || 1;
        }
        return 1;
    }
}