class UIManager {
    constructor(game) {
        this.game = game;
        this.setupUI();
        this.setupModals();
        this.setupControls();
    }
    
    setupUI() {
        // Setup resource display updates
        this.updateResourceDisplay();
        
        // Setup building modal
        this.setupBuildingModal();
        
        // Setup shop system
        this.setupShop();
        
        // Setup achievements
        this.setupAchievements();
        
        // Setup statistics
        this.setupStatistics();
    }
    
    setupModals() {
        // Building modal close button
        const closeBtn = document.querySelector('#buildingModal .close');
        const modal = document.getElementById('buildingModal');
        
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
        
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
    }
    
    setupControls() {
        // Shop button
        document.getElementById('shopBtn').onclick = () => {
            this.showShop();
        };
        
        // Attack button
        document.getElementById('attackBtn').onclick = () => {
            this.showAttackMenu();
        };
        
        // Clan button
        document.getElementById('clanBtn').onclick = () => {
            this.showClanMenu();
        };
        
        // Settings button
        document.getElementById('settingsBtn').onclick = () => {
            this.showSettings();
        };
    }
    
    setupBuildingModal() {
        const upgradeBtn = document.getElementById('upgradeBtn');
        upgradeBtn.onclick = () => {
            if (this.game.selectedBuilding) {
                const success = this.game.buildingManager.upgradeBuilding(this.game.selectedBuilding);
                if (success) {
                    this.updateBuildingModal(this.game.selectedBuilding);
                }
            }
        };
    }
    
    updateBuildingModal(building) {
        const title = document.getElementById('buildingTitle');
        const stats = document.getElementById('buildingStats');
        const upgradeBtn = document.getElementById('upgradeBtn');
        
        title.textContent = `${building.name} (Level ${building.level})`;
        
        const buildingType = this.game.buildingManager.buildingTypes[building.type];
        const isMaxLevel = building.level >= buildingType.maxLevel;
        
        stats.innerHTML = `
            <div class="stat-row">
                <span>Health:</span>
                <span>${building.health}/${building.maxHealth}</span>
            </div>
            ${building.production > 0 ? `
                <div class="stat-row">
                    <span>Production:</span>
                    <span>${building.production}/hour</span>
                </div>
            ` : ''}
            ${building.storage > 0 ? `
                <div class="stat-row">
                    <span>Storage:</span>
                    <span>${building.storage.toLocaleString()}</span>
                </div>
            ` : ''}
            ${building.damage > 0 ? `
                <div class="stat-row">
                    <span>Damage:</span>
                    <span>${building.damage}</span>
                </div>
                <div class="stat-row">
                    <span>Range:</span>
                    <span>${building.range}</span>
                </div>
            ` : ''}
            ${!isMaxLevel ? `
                <div class="upgrade-cost">
                    <strong>Upgrade Cost:</strong><br>
                    ${building.upgradeCost.gold ? `${building.upgradeCost.gold.toLocaleString()} 🪙` : ''}
                    ${building.upgradeCost.elixir ? `${building.upgradeCost.elixir.toLocaleString()} 💜` : ''}
                    ${building.upgradeCost.darkElixir ? `${building.upgradeCost.darkElixir.toLocaleString()} 🖤` : ''}
                </div>
            ` : ''}
        `;
        
        if (isMaxLevel) {
            upgradeBtn.textContent = 'MAX LEVEL';
            upgradeBtn.disabled = true;
        } else {
            upgradeBtn.textContent = 'Upgrade';
            upgradeBtn.disabled = !this.game.resourceManager.canAfford(building.upgradeCost);
        }
    }
    
    updateResourceDisplay() {
        const resources = this.game.gameState.resources;
        
        document.getElementById('goldCount').textContent = this.formatNumber(resources.gold);
        document.getElementById('elixirCount').textContent = this.formatNumber(resources.elixir);
        document.getElementById('darkElixirCount').textContent = this.formatNumber(resources.darkElixir);
        document.getElementById('gemCount').textContent = this.formatNumber(resources.gems);
        
        // Update player info
        document.getElementById('playerLevel').textContent = `Level ${this.game.gameState.level}`;
        
        // Update progress bar for next level
        this.updateLevelProgress();
    }
    
    updateLevelProgress() {
        const level = this.game.gameState.level;
        const experience = this.game.gameState.experience;
        const expNeeded = level * 100;
        const progress = (experience / expNeeded) * 100;
        
        // Create or update progress bar in header
        let progressBar = document.getElementById('levelProgress');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.id = 'levelProgress';
            progressBar.style.cssText = `
                position: absolute;
                bottom: 5px;
                left: 50%;
                transform: translateX(-50%);
                width: 200px;
                height: 8px;
                background: rgba(0,0,0,0.3);
                border-radius: 4px;
                overflow: hidden;
            `;
            
            const fill = document.createElement('div');
            fill.id = 'levelProgressFill';
            fill.style.cssText = `
                height: 100%;
                background: linear-gradient(90deg, #32CD32, #228B22);
                transition: width 0.3s ease;
                width: 0%;
            `;
            
            progressBar.appendChild(fill);
            document.getElementById('header').style.position = 'relative';
            document.getElementById('header').appendChild(progressBar);
        }
        
        const fill = document.getElementById('levelProgressFill');
        fill.style.width = `${Math.min(progress, 100)}%`;
        
        // Add tooltip
        progressBar.title = `${experience}/${expNeeded} XP to level ${level + 1}`;
    }
    
    formatNumber(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1) + 'B';
        } else if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return Math.floor(num).toLocaleString();
    }
    
    setupShop() {
        this.shopItems = {
            gems: [
                { amount: 100, cost: '$0.99', realCost: 0.99 },
                { amount: 500, cost: '$4.99', realCost: 4.99 },
                { amount: 1200, cost: '$9.99', realCost: 9.99 },
                { amount: 2500, cost: '$19.99', realCost: 19.99 },
                { amount: 6500, cost: '$49.99', realCost: 49.99 },
                { amount: 14000, cost: '$99.99', realCost: 99.99 }
            ],
            boosters: [
                { name: '2x Gold Boost', duration: '1 hour', gemCost: 25, multiplier: 2, type: 'gold' },
                { name: '2x Elixir Boost', duration: '1 hour', gemCost: 25, multiplier: 2, type: 'elixir' },
                { name: '3x All Resources', duration: '30 minutes', gemCost: 50, multiplier: 3, type: 'all' },
                { name: 'Click Multiplier x2', duration: 'Permanent', gemCost: 100, type: 'click' }
            ],
            decorations: [
                { name: 'Flags', gemCost: 5, description: 'Decorative flags for your village' },
                { name: 'Statues', gemCost: 25, description: 'Stone statues to show your might' },
                { name: 'Trees', gemCost: 10, description: 'Beautiful trees for landscaping' },
                { name: 'Rocks', gemCost: 5, description: 'Natural rock formations' }
            ]
        };
    }
    
    showShop() {
        const modal = this.createModal('Shop', this.generateShopContent());
        document.body.appendChild(modal);
    }
    
    generateShopContent() {
        return `
            <div class="shop-container">
                <div class="shop-tabs">
                    <button class="shop-tab active" onclick="game.uiManager.switchShopTab(this, 'gems')">💎 Gems</button>
                    <button class="shop-tab" onclick="game.uiManager.switchShopTab(this, 'boosters')">🚀 Boosters</button>
                    <button class="shop-tab" onclick="game.uiManager.switchShopTab(this, 'decorations')">🌸 Decorations</button>
                </div>
                <div class="shop-content">
                    ${this.generateGemShop()}
                </div>
            </div>
            
            <!-- Hidden templates -->
            <div class="gem-shop" style="display: none;">${this.generateGemShop()}</div>
            <div class="booster-shop" style="display: none;">${this.generateBoosterShop()}</div>
            <div class="decoration-shop" style="display: none;">${this.generateDecorationShop()}</div>
        `;
    }
    
    generateGemShop() {
        return this.shopItems.gems.map(item => `
            <div class="shop-item">
                <div class="shop-item-icon">💎</div>
                <div class="shop-item-info">
                    <div class="shop-item-name">${item.amount} Gems</div>
                    <div class="shop-item-price">${item.cost}</div>
                </div>
                <button class="shop-buy-btn" onclick="game.resourceManager.purchaseGems(${item.amount}, ${item.realCost})">Buy</button>
            </div>
        `).join('');
    }
    
    generateBoosterShop() {
        return this.shopItems.boosters.map(item => `
            <div class="shop-item">
                <div class="shop-item-icon">🚀</div>
                <div class="shop-item-info">
                    <div class="shop-item-name">${item.name}</div>
                    <div class="shop-item-description">${item.duration}</div>
                    <div class="shop-item-price">${item.gemCost} 💎</div>
                </div>
                <button class="shop-buy-btn" onclick="game.purchaseBooster('${item.type}', ${item.multiplier}, ${item.gemCost})">Buy</button>
            </div>
        `).join('');
    }
    
    generateDecorationShop() {
        return this.shopItems.decorations.map(item => `
            <div class="shop-item">
                <div class="shop-item-icon">🌸</div>
                <div class="shop-item-info">
                    <div class="shop-item-name">${item.name}</div>
                    <div class="shop-item-description">${item.description}</div>
                    <div class="shop-item-price">${item.gemCost} 💎</div>
                </div>
                <button class="shop-buy-btn" onclick="game.purchaseDecoration('${item.name}', ${item.gemCost})">Buy</button>
            </div>
        `).join('');
    }
    
    setupAchievements() {
        this.achievements = [
            { id: 'firstBuilding', name: 'Master Builder', description: 'Build your first building', reward: 50, completed: false },
            { id: 'goldCollector', name: 'Gold Rush', description: 'Collect 10,000 gold', reward: 100, completed: false },
            { id: 'levelUp', name: 'Rising Chief', description: 'Reach level 5', reward: 200, completed: false },
            { id: 'tenBuildings', name: 'Village Founder', description: 'Build 10 buildings', reward: 300, completed: false },
            { id: 'upgradeExpert', name: 'Upgrade Master', description: 'Upgrade 5 buildings', reward: 250, completed: false },
            { id: 'millionaire', name: 'Millionaire', description: 'Accumulate 1,000,000 gold', reward: 500, completed: false }
        ];
        
        this.updateAchievementsList();
    }
    
    updateAchievementsList() {
        const list = document.getElementById('achievementsList');
        list.innerHTML = this.achievements.map(achievement => `
            <div class="achievement ${achievement.completed ? 'completed' : ''}">
                <div class="achievement-icon">${achievement.completed ? '🏆' : '🔒'}</div>
                <div class="achievement-info">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                    <div class="achievement-reward">Reward: ${achievement.reward} 💎</div>
                </div>
            </div>
        `).join('');
    }
    
    checkAchievements() {
        let newAchievements = false;
        
        for (const achievement of this.achievements) {
            if (!achievement.completed && this.checkAchievementCondition(achievement)) {
                achievement.completed = true;
                this.game.gameState.resources.gems += achievement.reward;
                this.showAchievementUnlocked(achievement);
                newAchievements = true;
            }
        }
        
        if (newAchievements) {
            this.updateAchievementsList();
            this.updateResourceDisplay();
        }
    }
    
    checkAchievementCondition(achievement) {
        const gameState = this.game.gameState;
        
        switch (achievement.id) {
            case 'firstBuilding':
                return gameState.buildings.length > 3; // Starting buildings don't count
            case 'goldCollector':
                return gameState.resources.gold >= 10000;
            case 'levelUp':
                return gameState.level >= 5;
            case 'tenBuildings':
                return gameState.buildings.length >= 10;
            case 'upgradeExpert':
                return gameState.buildings.filter(b => b.level > 1).length >= 5;
            case 'millionaire':
                return gameState.resources.gold >= 1000000;
            default:
                return false;
        }
    }
    
    showAchievementUnlocked(achievement) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #8B4513;
            padding: 25px;
            border-radius: 15px;
            font-weight: bold;
            z-index: 2000;
            box-shadow: 0 8px 16px rgba(0,0,0,0.3);
            text-align: center;
            min-width: 300px;
        `;
        notification.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 10px;">🏆</div>
            <div style="font-size: 20px; margin-bottom: 5px;">Achievement Unlocked!</div>
            <div style="font-size: 16px; margin-bottom: 10px;">${achievement.name}</div>
            <div style="font-size: 14px; opacity: 0.8; margin-bottom: 15px;">${achievement.description}</div>
            <div style="font-size: 16px; color: #00CED1;">+${achievement.reward} 💎</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 5000);
    }
    
    setupStatistics() {
        this.statistics = {
            totalClicks: 0,
            totalGoldEarned: 0,
            totalElixirEarned: 0,
            totalDarkElixirEarned: 0,
            buildingsBuilt: 0,
            upgradesPerformed: 0,
            timePlayed: 0,
            startTime: Date.now()
        };
    }
    
    updateStatistics() {
        this.statistics.timePlayed = Date.now() - this.statistics.startTime;
    }
    
    createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <span class="close" onclick="document.body.removeChild(this.parentElement.parentElement)">&times;</span>
                <h2>${title}</h2>
                <div>${content}</div>
            </div>
        `;
        
        return modal;
    }
    
    showAttackMenu() {
        const content = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 60px; margin-bottom: 20px;">⚔️</div>
                <h3>Attack System</h3>
                <p>Coming Soon! Train troops and attack other villages to earn resources and trophies.</p>
                <div style="margin: 20px 0;">
                    <div>🏹 Train different types of troops</div>
                    <div>🛡️ Plan your attack strategies</div>
                    <div>🏆 Climb the leaderboards</div>
                    <div>💰 Earn massive loot</div>
                </div>
            </div>
        `;
        
        const modal = this.createModal('Attack', content);
        document.body.appendChild(modal);
    }
    
    showClanMenu() {
        const content = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 60px; margin-bottom: 20px;">🏴</div>
                <h3>Clan System</h3>
                <p>Join a clan and play with friends!</p>
                <div style="margin: 20px 0;">
                    <div>👥 Join or create clans</div>
                    <div>🎁 Request and donate troops</div>
                    <div>⚔️ Participate in clan wars</div>
                    <div>🏆 Compete in clan games</div>
                </div>
            </div>
        `;
        
        const modal = this.createModal('Clan', content);
        document.body.appendChild(modal);
    }
    
    switchShopTab(clickedTab, tabType) {
        // Remove active class from all tabs
        const tabs = clickedTab.parentElement.querySelectorAll('.shop-tab');
        tabs.forEach(tab => tab.classList.remove('active'));
        
        // Add active class to clicked tab
        clickedTab.classList.add('active');
        
        // Update content
        const content = clickedTab.parentElement.parentElement.querySelector('.shop-content');
        switch (tabType) {
            case 'gems':
                content.innerHTML = this.generateGemShop();
                break;
            case 'boosters':
                content.innerHTML = this.generateBoosterShop();
                break;
            case 'decorations':
                content.innerHTML = this.generateDecorationShop();
                break;
        }
    }
    
    showSettings() {
        const content = `
            <div style="padding: 20px;">
                <h3>Settings</h3>
                <div style="margin: 20px 0;">
                    <label style="display: block; margin: 10px 0;">
                        <input type="checkbox" id="soundEnabled" ${this.game.settings?.sound ? 'checked' : ''}> 
                        Enable Sound Effects
                    </label>
                    <label style="display: block; margin: 10px 0;">
                        <input type="checkbox" id="musicEnabled" ${this.game.settings?.music ? 'checked' : ''}> 
                        Enable Background Music
                    </label>
                    <label style="display: block; margin: 10px 0;">
                        <input type="checkbox" id="notificationsEnabled" ${this.game.settings?.notifications !== false ? 'checked' : ''}> 
                        Enable Notifications
                    </label>
                </div>
                <div style="margin: 20px 0;">
                    <button onclick="game.exportSaveData()" class="control-btn">Export Save Data</button>
                    <button onclick="game.importSaveData()" class="control-btn">Import Save Data</button>
                </div>
                <div style="margin: 20px 0; text-align: center;">
                    <button onclick="if(confirm('Are you sure? This will delete all progress!')) game.resetGame()" 
                            style="background: #DC143C; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                        Reset Game
                    </button>
                </div>
            </div>
        `;
        
        const modal = this.createModal('Settings', content);
        document.body.appendChild(modal);
        
        // Add event listeners for settings
        modal.querySelector('#soundEnabled').onchange = (e) => {
            this.game.settings = this.game.settings || {};
            this.game.settings.sound = e.target.checked;
            this.game.saveGameState();
        };
        
        modal.querySelector('#musicEnabled').onchange = (e) => {
            this.game.settings = this.game.settings || {};
            this.game.settings.music = e.target.checked;
            this.game.saveGameState();
        };
        
        modal.querySelector('#notificationsEnabled').onchange = (e) => {
            this.game.settings = this.game.settings || {};
            this.game.settings.notifications = e.target.checked;
            this.game.saveGameState();
        };
    }
}