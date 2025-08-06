document.addEventListener('DOMContentLoaded', async () => {
    const tg = window.Telegram.WebApp;
    tg.expand();
    
    // --- RUTA CORREGIDA ---
    const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: 'https://mang369.github.io/Gato_Kombat/tonconnect-manifest.json',
        buttonRootId: 'ton-connect-button'
    });
    
    // El resto del código JS que ya teníamos...
    // (Pego el código completo con las correcciones integradas para que solo copies y pegues)

    const boosts = {
        tap: { id: 'tap', name: 'Toque Potenciado', baseCost: 50, level: 0, baseProfit: 1 },
        energy: { id: 'energy', name: 'Batería Ampliada', baseCost: 100, level: 0, baseProfit: 500 }
    };

    let gameState = {
        balance: 0,
        level: 1,
        profitPerHour: 0,
        energy: 1000,
        maxEnergy: 1000,
        tapsPerClick: 1,
        energyRecoveryRate: 2,
        lastLogin: new Date().getTime(),
        boosts: { tap: 0, energy: 0 }
    };

    const loader = document.getElementById('loader');
    const gameContainer = document.getElementById('game-container');
    const balanceDisplay = document.getElementById('balance-display');
    const profitDisplay = document.getElementById('profit-per-hour-display');
    const clickerBtn = document.getElementById('clicker-btn');
    const clickerImage = document.getElementById('clicker-image');
    const energyBar = document.getElementById('energy-bar');
    const energyLevelDisplay = document.getElementById('energy-level');
    const boostModal = document.getElementById('boost-modal');
    const closeBoostModalBtn = document.getElementById('close-boost-modal-btn');
    const openBoostModalBtn = document.getElementById('boost-btn');
    const boostList = document.getElementById('boost-list');
    const userInfoContainer = document.getElementById('user-info-container');

    function saveGameState() { localStorage.setItem('gatoKombatState', JSON.stringify(gameState)); }

    function loadGameState() {
        const savedState = localStorage.getItem('gatoKombatState');
        if (savedState) {
            const loadedData = JSON.parse(savedState);
            gameState = { ...gameState, ...loadedData };
            const now = new Date().getTime();
            const elapsedSeconds = Math.floor((now - (gameState.lastLogin || now)) / 1000);
            const offlineEarnings = Math.floor(elapsedSeconds * (gameState.profitPerHour / 3600));
            if (offlineEarnings > 0) {
                gameState.balance += offlineEarnings;
                tg.showAlert(`¡Bienvenido de vuelta! Has ganado ${formatNumber(offlineEarnings)} monedas mientras no estabas.`);
            }
        }
        gameState.lastLogin = new Date().getTime();
    }

    function formatNumber(num) { return new Intl.NumberFormat().format(Math.floor(num)); }

    function updateAllDisplays() {
        balanceDisplay.innerText = formatNumber(gameState.balance);
        profitDisplay.innerText = `+${formatNumber(gameState.profitPerHour)}`;
        energyLevelDisplay.innerText = `${formatNumber(gameState.energy)} / ${formatNumber(gameState.maxEnergy)}`;
        const energyPercentage = (gameState.energy / gameState.maxEnergy) * 100;
        energyBar.style.width = `${energyPercentage}%`;
    }
    
    function handleInteraction(event) {
        event.preventDefault();
        if (gameState.energy >= gameState.tapsPerClick) {
            gameState.balance += gameState.tapsPerClick;
            gameState.energy -= gameState.tapsPerClick;
            clickerImage.style.transform = 'scale(0.95)';
            setTimeout(() => { clickerImage.style.transform = 'scale(1)'; }, 100);
            let x, y;
            if (event.touches) { x = event.touches[0].clientX; y = event.touches[0].clientY; } 
            else { x = event.clientX; y = event.clientY; }
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
        floatingText.addEventListener('animationend', () => floatingText.remove());
    }

    function calculateCost(boost) { return Math.floor(boost.baseCost * Math.pow(1.5, gameState.boosts[boost.id])); }

    function purchaseBoost(boostId) {
        const boost = boosts[boostId];
        const cost = calculateCost(boost);
        if (gameState.balance >= cost) {
            gameState.balance -= cost;
            gameState.boosts[boostId]++;
            if (boostId === 'tap') gameState.tapsPerClick++;
            else if (boostId === 'energy') gameState.maxEnergy += boost.baseProfit;
            recalculateProfit();
            renderBoosts();
            updateAllDisplays();
            saveGameState();
        } else {
            tg.showAlert('¡Monedas insuficientes!');
        }
    }

    function recalculateProfit() {
        gameState.profitPerHour = (gameState.boosts.tap * 10) + (gameState.boosts.energy * 20);
    }

    function renderBoosts() {
        boostList.innerHTML = '';
        for (const boostId in boosts) {
            const boost = boosts[boostId];
            const cost = calculateCost(boost);
            const item = document.createElement('div');
            item.className = 'boost-item';
            item.onclick = () => purchaseBoost(boostId);
            // --- RUTAS CORREGIDAS AQUÍ ---
            item.innerHTML = `<img src="/Gato_Kombat/images/boost-icon.png" alt="${boost.name}"><div class="boost-info"><h3>${boost.name}</h3><p>Nivel ${gameState.boosts[boostId]}</p><p>+${formatNumber(boost.baseProfit)} al atributo</p></div><div class="boost-cost"><span>${formatNumber(cost)}</span><img src="/Gato_Kombat/images/gato_k-coin.png" class="coin-icon" style="width:20px; height:20px;"></div>`;
            boostList.appendChild(item);
        }
    }
    
    function init() {
        loadGameState();
        if (tg.initDataUnsafe.user) {
            const user = tg.initDataUnsafe.user;
            // --- RUTA CORREGIDA AQUÍ ---
            const avatarUrl = user.photo_url || '/Gato_Kombat/images/logo.png';
            userInfoContainer.innerHTML = `<img src="${avatarUrl}" alt="Avatar"><div><span>${user.first_name} ${user.last_name || ''}</span><p class="level">Nivel ${gameState.level}</p></div>`;
        }
        
        setInterval(() => {
            if (gameState.energy < gameState.maxEnergy) {
                gameState.energy = Math.min(gameState.maxEnergy, gameState.energy + gameState.energyRecoveryRate);
            }
            gameState.balance += gameState.profitPerHour / 3600;
            updateAllDisplays();
        }, 1000);
        
        setInterval(saveGameState, 5000);

        clickerBtn.addEventListener('mousedown', handleInteraction);
        clickerBtn.addEventListener('touchstart', handleInteraction, { passive: false });

        openBoostModalBtn.addEventListener('click', () => { renderBoosts(); boostModal.classList.remove('hidden'); });
        closeBoostModalBtn.addEventListener('click', () => boostModal.classList.add('hidden'));

        recalculateProfit();
        updateAllDisplays();
        loader.classList.add('hidden');
        gameContainer.classList.remove('hidden');
    }

    // --- FUNCIÓN MEJORADA ---
    window.showPage = (pageName) => {
        const fullUrl = `https://mang369.github.io/Gato_Kombat/${pageName}`;
        tg.openLink(fullUrl);
    };

    init();
});