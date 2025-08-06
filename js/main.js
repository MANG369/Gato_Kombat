"use strict";

document.addEventListener('DOMContentLoaded', function() {
    try {
        // --- 1. CONFIGURACIÓN INICIAL ---
        const tg = window.Telegram.WebApp;
        const isTelegram = tg.platform !== 'unknown';

        if (isTelegram) {
            tg.ready();
            tg.expand();
        }

        const config = {
            repoName: 'Gato_Kombat',
            get manifestUrl() { return `https://mang369.github.io/${this.repoName}/tonconnect-manifest.json`; },
            baseImageUrl: 'images'
        };

        const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({ manifestUrl: config.manifestUrl, buttonRootId: 'ton-connect-button' });

        const boosts = {
            tap: { 
                name: 'Toque Potenciado', baseCost: 50, icon: 'boost-icon.png',
                description: function(level) { return `+1 al toque (Nivel ${level})`; },
                applyEffect: function(state) { state.tapsPerClick++; }
            },
            energy: { 
                name: 'Batería Ampliada', baseCost: 100, icon: 'boost-icon.png',
                description: function(level) { return `+500 a energía máxima (Nivel ${level})`; },
                applyEffect: function(state) { state.maxEnergy += 500; }
            }
        };

        let gameState = {
            balance: 0, level: 1, profitPerHour: 0, energy: 1000, maxEnergy: 1000,
            tapsPerClick: 1, energyRecoveryRate: 2, lastLogin: new Date().getTime(),
            boosts: { tap: 0, energy: 0 }
        };

        const DOMElements = {
            loader: document.getElementById('loader'),
            gameContainer: document.getElementById('game-container'),
            clickerBtn: document.getElementById('clicker-btn'),
            clickerImage: document.getElementById('clicker-image'),
            balanceDisplay: document.getElementById('balance-display'),
            profitDisplay: document.getElementById('profit-per-hour-display'),
            energyBar: document.getElementById('energy-bar'),
            energyLevelDisplay: document.getElementById('energy-level'),
            boostModal: document.getElementById('boost-modal'),
            closeBoostModalBtn: document.getElementById('close-boost-modal-btn'),
            openBoostModalBtn: document.getElementById('boost-btn'),
            boostList: document.getElementById('boost-list'),
            userInfoContainer: document.getElementById('user-info-container'),
            faqBtn: document.getElementById('faq-btn'),
            wpBtn: document.getElementById('wp-btn')
        };
        
        // --- 2. FUNCIONES PRINCIPALES (DEFINIDAS UNA SOLA VEZ) ---

        function showAlert(message) {
            if (isTelegram) {
                tg.showAlert(message);
            } else {
                alert(message);
            }
        }

        function preloadImages() {
            const images = ['logo.png', 'gato_k-coin.png', 'boost-icon.png'];
            images.forEach(function(src) {
                const img = new Image();
                img.src = `${config.baseImageUrl}/${src}`;
            });
        }

        function saveGameState() {
            localStorage.setItem('gatoKombatState', JSON.stringify(gameState));
        }
        
        function loadGameState() {
            const savedState = localStorage.getItem('gatoKombatState');
            if (savedState) {
                const loadedData = JSON.parse(savedState);
                gameState = { ...gameState, ...loadedData };
                if (!gameState.boosts) gameState.boosts = { tap: 0, energy: 0 };
                const now = new Date().getTime();
                const elapsedSeconds = Math.floor((now - (gameState.lastLogin || now)) / 1000);
                if (elapsedSeconds > 5) {
                    const offlineEarnings = Math.floor(elapsedSeconds * (gameState.profitPerHour / 3600));
                    if (offlineEarnings > 0) {
                        gameState.balance += offlineEarnings;
                        showAlert(`Ganaste ${formatNumber(offlineEarnings)} monedas mientras no estabas.`);
                    }
                }
            }
            gameState.lastLogin = new Date().getTime();
        }

        function formatNumber(num) {
            return new Intl.NumberFormat().format(Math.floor(num));
        }
        
        function updateAllDisplays() {
            DOMElements.balanceDisplay.innerText = formatNumber(gameState.balance);
            DOMElements.profitDisplay.innerText = `+${formatNumber(gameState.profitPerHour)}`;
            DOMElements.energyLevelDisplay.innerText = `${formatNumber(gameState.energy)} / ${formatNumber(gameState.maxEnergy)}`;
            DOMElements.energyBar.style.width = `${(gameState.energy / gameState.maxEnergy) * 100}%`;
        }
        
        function handleInteraction(event) {
            event.preventDefault();
            if (gameState.energy >= gameState.tapsPerClick) {
                if (isTelegram) {
                    tg.HapticFeedback.impactOccurred('light');
                }
                gameState.balance += gameState.tapsPerClick;
                gameState.energy -= gameState.tapsPerClick;
                DOMElements.clickerImage.style.transform = 'scale(0.95)';
                setTimeout(function() { DOMElements.clickerImage.style.transform = 'scale(1)'; }, 100);
                let x = event.touches ? event.touches[0].clientX : event.clientX;
                let y = event.touches ? event.touches[0].clientY : event.clientY;
                showFloatingText(x, y);
                updateAllDisplays();
            }
        }

        function showFloatingText(x, y) {
            const floatingText = document.createElement('div');
            floatingText.className = 'floating-text unselectable';
            floatingText.innerText = `+${gameState.tapsPerClick}`;
            floatingText.style.left = `${x}px`;
            floatingText.style.top = `${y}px`;
            document.body.appendChild(floatingText);
            floatingText.addEventListener('animationend', function() { floatingText.remove(); });
        }

        function calculateCost(boostId) {
            const boostLevel = gameState.boosts[boostId] || 0;
            const baseCost = boosts[boostId].baseCost;
            return Math.floor(baseCost * Math.pow(1.5, boostLevel));
        }
        
        function purchaseBoost(boostId) {
            const cost = calculateCost(boostId);
            if (gameState.balance >= cost) {
                gameState.balance -= cost;
                gameState.boosts[boostId]++;
                boosts[boostId].applyEffect(gameState);
                recalculateProfit();
                renderBoosts();
                updateAllDisplays();
                saveGameState();
            } else {
                showAlert('¡Monedas insuficientes!');
            }
        }
        
        function recalculateProfit() {
            gameState.profitPerHour = (gameState.boosts.tap * 10) + (gameState.boosts.energy * 20);
        }

        function renderBoosts() {
            DOMElements.boostList.innerHTML = '';
            for (const boostId in boosts) {
                const boostData = boosts[boostId];
                const level = gameState.boosts[boostId] || 0;
                const cost = calculateCost(boostId);
                const item = document.createElement('div');
                item.className = 'boost-item';
                item.onclick = function() { purchaseBoost(boostId); };
                item.innerHTML = `
                    <img src="${config.baseImageUrl}/${boostData.icon}" alt="${boostData.name}">
                    <div class="boost-info">
                        <h3>${boostData.name}</h3>
                        <p>${boostData.description(level)}</p>
                    </div>
                    <div class="boost-cost">
                        <span>${formatNumber(cost)}</span>
                        <img src="${config.baseImageUrl}/gato_k-coin.png" class="coin-icon" style="width:20px; height:20px;">
                    </div>`;
                DOMElements.boostList.appendChild(item);
            }
        }

        function showPage(pageName) {
            const fullUrl = `https://mang369.github.io/Gato_Kombat/${pageName}`;
            if (isTelegram) {
                tg.openLink(fullUrl);
            } else {
                window.location.href = fullUrl;
            }
        };
        
        // --- 3. INICIALIZACIÓN DEL JUEGO ---
        function init() {
            preloadImages();
            loadGameState();

            let userName = 'Player';
            let userAvatar = `${config.baseImageUrl}/logo.png`;
            if (isTelegram && tg.initDataUnsafe.user) {
                const user = tg.initDataUnsafe.user;
                userName = user.first_name || 'Player';
                if (user.photo_url) userAvatar = user.photo_url;
            }
            DOMElements.userInfoContainer.innerHTML = `<img src="${userAvatar}" alt="Avatar"><div><span>${userName}</span><p class="level">Nivel ${gameState.level}</p></div>`;
            
            setInterval(function() {
                if (gameState.energy < gameState.maxEnergy) {
                    gameState.energy = Math.min(gameState.maxEnergy, gameState.energy + gameState.energyRecoveryRate);
                }
                gameState.balance += gameState.profitPerHour / 3600;
                if (!DOMElements.gameContainer.classList.contains('hidden')) {
                    updateAllDisplays();
                }
            }, 1000);
            
            setInterval(saveGameState, 5000);

            DOMElements.clickerBtn.addEventListener('mousedown', handleInteraction);
            DOMElements.clickerBtn.addEventListener('touchstart', handleInteraction, { passive: false });
            DOMElements.openBoostModalBtn.addEventListener('click', function() { renderBoosts(); DOMElements.boostModal.classList.remove('hidden'); });
            DOMElements.closeBoostModalBtn.addEventListener('click', function() { DOMElements.boostModal.classList.add('hidden'); });
            DOMElements.faqBtn.addEventListener('click', function() { showPage('faq.html'); });
            DOMElements.wpBtn.addEventListener('click', function() { showPage('whitepaper.md'); });

            recalculateProfit();
            updateAllDisplays();
            DOMElements.loader.classList.add('hidden');
            DOMElements.gameContainer.classList.remove('hidden');
        }

        init();

    } catch (error) {
        console.error("Error fatal al inicializar el juego:", error);
        const loader = document.getElementById('loader');
        if(loader){
            loader.innerHTML = `<h1>Error al Cargar</h1><p style="color:red; padding: 20px; font-family: monospace;">${error.message}</p>`;
        } else {
            document.body.innerHTML = `<div style="color: white; padding: 20px; font-family: monospace;"><h1>Error al Cargar</h1><p>${error.message}</p><pre>${error.stack}</pre></div>`;
        }
    }
});
