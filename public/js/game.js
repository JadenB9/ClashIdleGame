class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.socket = io();
        
        // Game state
        this.gameState = {
            resources: {
                gold: 1000,
                elixir: 500,
                darkElixir: 50,
                gems: 100
            },
            buildings: [],
            level: 1,
            experience: 0,
            lastUpdate: Date.now()
        };
        
        // Game settings
        this.selectedBuilding = null;
        this.camera = { x: 0, y: 0 };
        this.mouse = { x: 0, y: 0, isDown: false };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadGameState();
        this.gameLoop();
        
        // Auto-save every 30 seconds
        setInterval(() => this.saveGameState(), 30000);
        
        // Resource generation every second
        setInterval(() => this.generateResources(), 1000);
    }
    
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleRightClick(e));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Socket events
        this.socket.on('gameStateUpdate', (data) => {
            console.log('Received game state update:', data);
        });
    }
    
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        this.mouse.isDown = true;
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
    }
    
    handleMouseUp(e) {
        this.mouse.isDown = false;
    }
    
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check if clicking on a building
        const clickedBuilding = this.getBuildingAt(x, y);
        if (clickedBuilding) {
            // Left click on resource buildings collects resources
            if (clickedBuilding.production > 0) {
                // This will be handled by the main.js override
                return clickedBuilding;
            }
        }
        
        // Clear selection if clicking empty space
        this.selectedBuilding = null;
        return null;
    }
    
    handleRightClick(e) {
        e.preventDefault(); // Prevent context menu
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check if right-clicking on a building
        const clickedBuilding = this.getBuildingAt(x, y);
        if (clickedBuilding) {
            this.selectBuilding(clickedBuilding);
            this.showBuildingModal(clickedBuilding);
        }
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = touch.clientX - rect.left;
        this.mouse.y = touch.clientY - rect.top;
        this.mouse.isDown = true;
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = touch.clientX - rect.left;
        this.mouse.y = touch.clientY - rect.top;
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.mouse.isDown = false;
    }
    
    handleKeyDown(e) {
        switch(e.key) {
            case 'ArrowUp':
                this.camera.y -= 20;
                break;
            case 'ArrowDown':
                this.camera.y += 20;
                break;
            case 'ArrowLeft':
                this.camera.x -= 20;
                break;
            case 'ArrowRight':
                this.camera.x += 20;
                break;
        }
    }
    
    getBuildingAt(x, y) {
        for (let building of this.gameState.buildings) {
            if (x >= building.x && x <= building.x + building.width &&
                y >= building.y && y <= building.y + building.height) {
                return building;
            }
        }
        return null;
    }
    
    selectBuilding(building) {
        this.selectedBuilding = building;
    }
    
    showBuildingModal(building) {
        const modal = document.getElementById('buildingModal');
        const title = document.getElementById('buildingTitle');
        const stats = document.getElementById('buildingStats');
        const upgradeBtn = document.getElementById('upgradeBtn');
        
        title.textContent = `${building.name} (Level ${building.level})`;
        
        stats.innerHTML = `
            <div><strong>Production:</strong> ${building.production}/hour</div>
            <div><strong>Storage:</strong> ${building.storage}</div>
            <div><strong>Health:</strong> ${building.health}/${building.maxHealth}</div>
            <div><strong>Next Level Cost:</strong> ${building.upgradeCost} Gold</div>
        `;
        
        upgradeBtn.onclick = () => this.upgradeBuilding(building);
        upgradeBtn.disabled = this.gameState.resources.gold < building.upgradeCost;
        
        modal.style.display = 'block';
    }
    
    upgradeBuilding(building) {
        if (this.gameState.resources.gold >= building.upgradeCost) {
            this.gameState.resources.gold -= building.upgradeCost;
            building.level++;
            building.production = Math.floor(building.production * 1.5);
            building.storage = Math.floor(building.storage * 1.3);
            building.maxHealth = Math.floor(building.maxHealth * 1.2);
            building.health = building.maxHealth;
            building.upgradeCost = Math.floor(building.upgradeCost * 2);
            
            this.updateUI();
            this.showBuildingModal(building); // Refresh modal
            
            // Add experience
            this.gameState.experience += 10;
            this.checkLevelUp();
        }
    }
    
    generateResources() {
        const now = Date.now();
        const timeDiff = (now - this.gameState.lastUpdate) / 1000; // seconds
        
        for (let building of this.gameState.buildings) {
            if (building.type === 'goldMine') {
                this.gameState.resources.gold += Math.floor(building.production * timeDiff / 3600);
            } else if (building.type === 'elixirCollector') {
                this.gameState.resources.elixir += Math.floor(building.production * timeDiff / 3600);
            } else if (building.type === 'darkElixirDrill') {
                this.gameState.resources.darkElixir += Math.floor(building.production * timeDiff / 3600);
            }
        }
        
        this.gameState.lastUpdate = now;
        this.updateUI();
    }
    
    checkLevelUp() {
        const expNeeded = this.gameState.level * 100;
        if (this.gameState.experience >= expNeeded) {
            this.gameState.level++;
            this.gameState.experience -= expNeeded;
            this.showLevelUpNotification();
        }
    }
    
    showLevelUpNotification() {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.textContent = `Level Up! You are now level ${this.gameState.level}`;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #8B4513;
            padding: 20px;
            border-radius: 10px;
            font-weight: bold;
            font-size: 18px;
            z-index: 2000;
            box-shadow: 0 8px 16px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }
    
    addBuilding(type, x, y) {
        const building = this.createBuilding(type, x, y);
        if (building && this.canAfford(building.cost)) {
            this.gameState.resources.gold -= building.cost.gold || 0;
            this.gameState.resources.elixir -= building.cost.elixir || 0;
            this.gameState.buildings.push(building);
            this.updateUI();
            return true;
        }
        return false;
    }
    
    canAfford(cost) {
        return (this.gameState.resources.gold >= (cost.gold || 0) &&
                this.gameState.resources.elixir >= (cost.elixir || 0) &&
                this.gameState.resources.darkElixir >= (cost.darkElixir || 0) &&
                this.gameState.resources.gems >= (cost.gems || 0));
    }
    
    createBuilding(type, x, y) {
        const buildings = {
            townHall: {
                name: 'Town Hall',
                type: 'townHall',
                x, y,
                width: 80,
                height: 80,
                level: 1,
                health: 1000,
                maxHealth: 1000,
                production: 0,
                storage: 10000,
                cost: { gold: 0 },
                upgradeCost: 1000,
                color: '#8B4513'
            },
            goldMine: {
                name: 'Gold Mine',
                type: 'goldMine',
                x, y,
                width: 60,
                height: 60,
                level: 1,
                health: 400,
                maxHealth: 400,
                production: 100,
                storage: 2000,
                cost: { gold: 500 },
                upgradeCost: 1000,
                color: '#FFD700'
            },
            elixirCollector: {
                name: 'Elixir Collector',
                type: 'elixirCollector',
                x, y,
                width: 60,
                height: 60,
                level: 1,
                health: 400,
                maxHealth: 400,
                production: 50,
                storage: 2000,
                cost: { gold: 750 },
                upgradeCost: 1500,
                color: '#DA70D6'
            },
            barracks: {
                name: 'Barracks',
                type: 'barracks',
                x, y,
                width: 70,
                height: 50,
                level: 1,
                health: 500,
                maxHealth: 500,
                production: 0,
                storage: 0,
                cost: { gold: 1000 },
                upgradeCost: 2000,
                color: '#8B0000'
            },
            cannon: {
                name: 'Cannon',
                type: 'cannon',
                x, y,
                width: 40,
                height: 40,
                level: 1,
                health: 300,
                maxHealth: 300,
                production: 0,
                storage: 0,
                cost: { gold: 800 },
                upgradeCost: 1600,
                color: '#696969'
            }
        };
        
        return buildings[type] || null;
    }
    
    updateUI() {
        document.getElementById('goldCount').textContent = this.gameState.resources.gold.toLocaleString();
        document.getElementById('elixirCount').textContent = this.gameState.resources.elixir.toLocaleString();
        document.getElementById('darkElixirCount').textContent = this.gameState.resources.darkElixir.toLocaleString();
        document.getElementById('gemCount').textContent = this.gameState.resources.gems.toLocaleString();
        document.getElementById('playerLevel').textContent = `Level ${this.gameState.level}`;
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.drawBackground();
        
        // Draw buildings
        this.drawBuildings();
        
        // Draw UI overlays
        this.drawUIOverlays();
    }
    
    drawBackground() {
        // Draw grass texture
        this.ctx.fillStyle = '#90EE90';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x < this.canvas.width; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    drawBuildings() {
        for (let building of this.gameState.buildings) {
            this.drawBuilding(building);
        }
    }
    
    drawBuilding(building) {
        const ctx = this.ctx;
        
        // Draw building shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(building.x + 5, building.y + 5, building.width, building.height);
        
        // Draw building base
        ctx.fillStyle = building.color;
        ctx.fillRect(building.x, building.y, building.width, building.height);
        
        // Draw 3D effect
        ctx.fillStyle = this.lightenColor(building.color, 20);
        ctx.fillRect(building.x, building.y, building.width, 10);
        ctx.fillRect(building.x, building.y, 10, building.height);
        
        ctx.fillStyle = this.darkenColor(building.color, 20);
        ctx.fillRect(building.x + building.width - 10, building.y, 10, building.height);
        ctx.fillRect(building.x, building.y + building.height - 10, building.width, 10);
        
        // Draw building details based on type
        this.drawBuildingDetails(building);
        
        // Draw selection highlight
        if (this.selectedBuilding === building) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.strokeRect(building.x - 2, building.y - 2, building.width + 4, building.height + 4);
        }
        
        // Draw health bar
        this.drawHealthBar(building);
        
        // Draw level indicator
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(building.level, building.x + building.width/2, building.y - 5);
    }
    
    drawBuildingDetails(building) {
        const ctx = this.ctx;
        const centerX = building.x + building.width / 2;
        const centerY = building.y + building.height / 2;
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        
        switch (building.type) {
            case 'townHall':
                // Draw flag
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(centerX - 2, building.y + 10, 4, 20);
                ctx.fillRect(centerX + 2, building.y + 10, 15, 8);
                break;
                
            case 'goldMine':
                // Draw pickaxe
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(centerX - 10, centerY - 10);
                ctx.lineTo(centerX + 10, centerY + 10);
                ctx.stroke();
                break;
                
            case 'elixirCollector':
                // Draw elixir drop
                ctx.fillStyle = '#DA70D6';
                ctx.beginPath();
                ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'barracks':
                // Draw sword
                ctx.fillStyle = '#C0C0C0';
                ctx.fillRect(centerX - 2, centerY - 15, 4, 20);
                ctx.fillRect(centerX - 8, centerY - 20, 16, 4);
                break;
                
            case 'cannon':
                // Draw cannon barrel
                ctx.fillStyle = '#2F4F4F';
                ctx.fillRect(centerX - 15, centerY - 3, 30, 6);
                ctx.beginPath();
                ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    }
    
    drawHealthBar(building) {
        const ctx = this.ctx;
        const barWidth = building.width;
        const barHeight = 4;
        const healthPercent = building.health / building.maxHealth;
        
        // Background
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(building.x, building.y - 8, barWidth, barHeight);
        
        // Health
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(building.x, building.y - 8, barWidth * healthPercent, barHeight);
    }
    
    drawUIOverlays() {
        // Draw resource generation indicators
        for (let building of this.gameState.buildings) {
            if (building.production > 0) {
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
                this.ctx.font = 'bold 10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`+${building.production}/h`, 
                    building.x + building.width/2, 
                    building.y + building.height + 15);
            }
        }
    }
    
    lightenColor(color, amount) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * amount);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    
    darkenColor(color, amount) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * amount);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
            (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
            (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
    }
    
    saveGameState() {
        localStorage.setItem('clashIdleGameState', JSON.stringify(this.gameState));
    }
    
    loadGameState() {
        const saved = localStorage.getItem('clashIdleGameState');
        if (saved) {
            this.gameState = JSON.parse(saved);
        } else {
            // Initialize with starter buildings
            this.gameState.buildings = [
                this.createBuilding('goldMine', 200, 150),
                this.createBuilding('elixirCollector', 300, 150)
            ];
        }
        this.updateUI();
    }
    
    gameLoop() {
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}