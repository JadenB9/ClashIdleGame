// Global game instance
let game;

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
});

function initializeGame() {
    try {
        // Create game instance
        game = new Game();
        
        // Initialize managers
        game.buildingManager = new BuildingManager(game);
        game.resourceManager = new ResourceManager(game);
        game.uiManager = new UIManager(game);
        
        // Override some game methods to integrate with managers
        const originalHandleClick = game.handleClick.bind(game);
        game.handleClick = function(e) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Check if in build mode
            if (this.buildMode && this.selectedBuildingType) {
                // Snap to grid
                const gridSize = 20;
                const snappedX = Math.floor(x / gridSize) * gridSize;
                const snappedY = Math.floor(y / gridSize) * gridSize;
                
                if (this.buildingManager.placeBuildingAt(this.selectedBuildingType, snappedX, snappedY)) {
                    this.buildingManager.cancelBuildMode();
                    this.uiManager.checkAchievements();
                }
                return;
            }
            
            // Call original click handler to get the clicked building
            const clickedBuilding = originalHandleClick(e);
            
            // If we clicked on a resource building, collect resources
            if (clickedBuilding && clickedBuilding.production > 0) {
                const collected = this.resourceManager.clickResource(clickedBuilding);
                if (collected > 0) {
                    this.uiManager.statistics.totalClicks++;
                    this.uiManager.checkAchievements();
                }
            }
        };
        
        // Enhanced upgrade building method
        game.upgradeBuilding = function(building) {
            const result = this.buildingManager.upgradeBuilding(building);
            if (result) {
                this.uiManager.statistics.upgradesPerformed++;
                this.uiManager.checkAchievements();
                // Close and reopen modal to refresh data
                const modal = document.getElementById('buildingModal');
                if (modal.style.display === 'block') {
                    this.showBuildingModal(building);
                }
            }
            return result;
        };
        
        // Add save/load methods
        game.exportSaveData = function() {
            const saveData = JSON.stringify(this.gameState, null, 2);
            const blob = new Blob([saveData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'clash-idle-save.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
        
        game.importSaveData = function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const saveData = JSON.parse(e.target.result);
                            this.gameState = saveData;
                            this.updateUI();
                            this.buildingManager.setupBuildingMenu();
                            this.uiManager.updateAchievementsList();
                            alert('Save data imported successfully!');
                        } catch (error) {
                            alert('Invalid save file!');
                        }
                    };
                    reader.readAsText(file);
                }
            };
            
            input.click();
        };
        
        game.resetGame = function() {
            localStorage.removeItem('clashIdleGameState');
            location.reload();
        };
        
        // Purchase booster method
        game.purchaseBooster = function(type, multiplier, gemCost) {
            if (this.gameState.resources.gems >= gemCost) {
                this.gameState.resources.gems -= gemCost;
                
                if (type === 'all') {
                    this.resourceManager.addBonusResources(multiplier, 1800000); // 30 minutes
                } else if (type === 'click') {
                    if (type === 'click') {
                        this.resourceManager.clickMultipliers.gold *= 2;
                        this.resourceManager.clickMultipliers.elixir *= 2;
                        this.resourceManager.clickMultipliers.darkElixir *= 2;
                    }
                } else {
                    // Single resource boost
                    this.resourceManager.addBonusResources(multiplier, 3600000); // 1 hour
                }
                
                this.updateUI();
                alert(`${type === 'all' ? 'All Resources' : type} booster activated!`);
            } else {
                alert('Not enough gems!');
            }
        };
        
        // Purchase decoration method
        game.purchaseDecoration = function(name, gemCost) {
            if (this.gameState.resources.gems >= gemCost) {
                this.gameState.resources.gems -= gemCost;
                this.updateUI();
                alert(`${name} decoration purchased! (Decorations coming soon)`);
            } else {
                alert('Not enough gems!');
            }
        };
        
        // Enhanced update UI method
        const originalUpdateUI = game.updateUI.bind(game);
        game.updateUI = function() {
            originalUpdateUI();
            this.uiManager.updateResourceDisplay();
            this.uiManager.updateStatistics();
        };
        
        // Add army system placeholder
        game.army = {
            barbarians: 0,
            archers: 0,
            giants: 0,
            capacity: 200
        };
        
        // Update army display
        game.updateArmyDisplay = function() {
            document.getElementById('barbarianCount').textContent = this.army.barbarians;
            document.getElementById('archerCount').textContent = this.army.archers;
            document.getElementById('giantCount').textContent = this.army.giants;
        };
        
        // Research system placeholder
        game.research = {
            barbarianLevel: 1,
            archerLevel: 1,
            giantLevel: 1
        };
        
        // Update research display
        game.updateResearchDisplay = function() {
            const researchMenu = document.getElementById('researchMenu');
            researchMenu.innerHTML = `
                <div style="color: white; font-size: 12px;">
                    <div>Barbarian: Level ${this.research.barbarianLevel}</div>
                    <div>Archer: Level ${this.research.archerLevel}</div>
                    <div>Giant: Level ${this.research.giantLevel}</div>
                    <div style="margin-top: 10px; opacity: 0.7;">Research upgrades coming soon!</div>
                </div>
            `;
        };
        
        // Initialize displays
        game.updateArmyDisplay();
        game.updateResearchDisplay();
        
        // Start periodic updates
        setInterval(() => {
            game.uiManager.checkAchievements();
        }, 5000);
        
        // Auto-save every 30 seconds
        setInterval(() => {
            game.saveGameState();
        }, 30000);
        
        // Welcome message
        setTimeout(() => {
            showWelcomeMessage();
        }, 1000);
        
        console.log('🏰 Clash Idle Game initialized successfully!');
        
    } catch (error) {
        console.error('Failed to initialize game:', error);
        showErrorMessage('Failed to initialize game. Please refresh the page.');
    }
}

function showWelcomeMessage() {
    const welcome = document.createElement('div');
    welcome.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #8B4513, #A0522D);
        color: white;
        padding: 30px;
        border: 3px solid #FFD700;
        border-radius: 20px;
        text-align: center;
        z-index: 2000;
        box-shadow: 0 10px 20px rgba(0,0,0,0.5);
        max-width: 400px;
    `;
    welcome.innerHTML = `
        <div style="font-size: 50px; margin-bottom: 15px;">🏰</div>
        <h2 style="margin: 0 0 15px 0; color: #FFD700;">Welcome to Clash Idle!</h2>
        <p style="margin: 0 0 20px 0; line-height: 1.4;">
            Build your village, collect resources, and become the ultimate Chief!
        </p>
        <div style="font-size: 14px; margin-bottom: 20px; opacity: 0.9;">
            • Click on resource buildings to collect<br>
            • Build and upgrade structures<br>
            • Complete achievements for rewards<br>
            • Expand your village to greatness!
        </div>
        <button onclick="document.body.removeChild(this.parentElement)" 
                style="background: linear-gradient(135deg, #32CD32, #228B22); 
                       border: 2px solid #FFD700; color: white; padding: 12px 24px; 
                       border-radius: 20px; cursor: pointer; font-weight: bold; font-size: 16px;">
            Start Playing! 🚀
        </button>
    `;
    
    document.body.appendChild(welcome);
}

function showErrorMessage(message) {
    const error = document.createElement('div');
    error.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #FF6347;
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        font-weight: bold;
        z-index: 2000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    `;
    error.textContent = message;
    
    document.body.appendChild(error);
    
    setTimeout(() => {
        if (document.body.contains(error)) {
            document.body.removeChild(error);
        }
    }, 5000);
}

// Add some CSS for shop styling
const shopStyles = document.createElement('style');
shopStyles.textContent = `
    .shop-container {
        padding: 0;
    }
    
    .shop-tabs {
        display: flex;
        margin-bottom: 20px;
        border-bottom: 2px solid #FFD700;
    }
    
    .shop-tab {
        flex: 1;
        padding: 10px;
        background: rgba(0,0,0,0.3);
        border: none;
        color: white;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.3s ease;
    }
    
    .shop-tab.active {
        background: #FFD700;
        color: #8B4513;
    }
    
    .shop-tab:hover {
        background: rgba(255,215,0,0.5);
    }
    
    .shop-content {
        max-height: 400px;
        overflow-y: auto;
    }
    
    .shop-item {
        display: flex;
        align-items: center;
        background: rgba(0,0,0,0.2);
        margin: 10px 0;
        padding: 15px;
        border-radius: 10px;
        border: 1px solid rgba(255,215,0,0.3);
    }
    
    .shop-item-icon {
        font-size: 30px;
        margin-right: 15px;
    }
    
    .shop-item-info {
        flex: 1;
        color: white;
    }
    
    .shop-item-name {
        font-weight: bold;
        font-size: 16px;
        margin-bottom: 5px;
    }
    
    .shop-item-description {
        font-size: 12px;
        opacity: 0.8;
        margin-bottom: 5px;
    }
    
    .shop-item-price {
        font-size: 14px;
        color: #FFD700;
        font-weight: bold;
    }
    
    .shop-buy-btn {
        background: linear-gradient(135deg, #32CD32, #228B22);
        border: 2px solid #FFD700;
        color: white;
        padding: 8px 16px;
        border-radius: 15px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
        transition: all 0.3s ease;
    }
    
    .shop-buy-btn:hover {
        transform: scale(1.05);
    }
    
    .achievement {
        display: flex;
        align-items: center;
        background: rgba(0,0,0,0.2);
        margin: 8px 0;
        padding: 10px;
        border-radius: 8px;
        border: 1px solid rgba(255,215,0,0.3);
    }
    
    .achievement.completed {
        background: rgba(50,205,50,0.2);
        border-color: #32CD32;
    }
    
    .achievement-icon {
        font-size: 20px;
        margin-right: 10px;
    }
    
    .achievement-info {
        flex: 1;
        color: white;
    }
    
    .achievement-name {
        font-weight: bold;
        font-size: 12px;
        margin-bottom: 2px;
    }
    
    .achievement-description {
        font-size: 10px;
        opacity: 0.8;
        margin-bottom: 2px;
    }
    
    .achievement-reward {
        font-size: 10px;
        color: #00CED1;
    }
    
    .stat-row {
        display: flex;
        justify-content: space-between;
        margin: 8px 0;
        padding: 5px 0;
        border-bottom: 1px solid rgba(255,215,0,0.2);
    }
    
    .upgrade-cost {
        margin-top: 15px;
        padding: 10px;
        background: rgba(0,0,0,0.3);
        border-radius: 8px;
        text-align: center;
    }
`;
document.head.appendChild(shopStyles);