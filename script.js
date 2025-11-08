document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const gameContainer = document.getElementById('game-container');
    const scoreDisplay = document.getElementById('score-display');
    const timerDisplay = document.getElementById('timer-display');
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const finalScoreDisplay = document.getElementById('final-score');
    const highScoreList = document.getElementById('high-score-list');
    const soundToggle = document.getElementById('sound-toggle');

    // --- Audio ---
    const popSound = new Audio('pop.mp3');
    const music = new Audio('music.mp3');
    music.loop = true;
    music.volume = 0.4;
    popSound.volume = 0.6;

    // --- Game State ---
    let score = 0;
    let timer = 60;
    let gameActive = false;
    let timerInterval = null;
    let animationFrameId = null;
    let balloons = [];
    let highScores = [];

    // UPDATED COLORS: Night/Red Theme
    const BALLOON_COLORS = [
        '#ff0000', // Pure Red
        '#cc0000', // Darker Red
        '#ff4d4d', // Light Neon Red
        '#ffffff', // White (for contrast)
        '#333333'  // Dark Grey (stealth balloons)
    ];

    // =================================================================
    // --- Game Logic Functions ---
    // =================================================================

    function startGame() {
        score = 0;
        timer = 60;
        gameActive = true;
        balloons = [];
        updateScoreDisplay();
        updateTimerDisplay();

        // Clear any leftover balloons safely
        Array.from(document.getElementsByClassName('balloon')).forEach(b => b.remove());

        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        
        // Try to play music (might be blocked by browser until user interaction)
        playMusic();

        startGameTimer();
        spawnBalloon();
        gameLoop();
    }

    function endGame() {
        gameActive = false;
        clearInterval(timerInterval);
        cancelAnimationFrame(animationFrameId);

        finalScoreDisplay.textContent = `FINAL SCORE: ${score}`;
        gameOverScreen.style.display = 'flex';

        balloons.forEach(balloon => balloon.remove());
        balloons = [];

        saveHighScore(score);
        loadHighScores();
    }

    function gameLoop() {
        if (!gameActive) return;
        moveBalloons();
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function startGameTimer() {
        timerInterval = setInterval(() => {
            timer--;
            updateTimerDisplay();
            if (timer <= 0) {
                endGame();
            }
        }, 1000);
    }

    function createBalloon() {
        const balloon = document.createElement('div');
        balloon.classList.add('balloon');

        // Sizing for mobile: slightly larger minimum size for easier tapping
        const size = Math.random() * (110 - 60) + 60; // 60px to 110px
        // Speed calculation adjusted for new sizes
        const speed = (180 / size) * (window.innerHeight / 1000) * 2.5; 
        const points = Math.floor(170 - size);

        balloon.style.width = `${size}px`;
        balloon.style.height = `${size * 1.18}px`;
        
        const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
        balloon.style.backgroundColor = color;
        balloon.style.borderTopColor = color; // For the tie inheritance
        
        // Ensure balloon stays within screen width bounds
        const maxLeft = gameContainer.clientWidth - size;
        balloon.style.left = `${Math.max(0, Math.min(maxLeft, Math.random() * maxLeft))}px`;
        
        // --- CRITICAL FIX APPLIED HERE ---
        balloon.dataset.y = 0; // Start at 0 translation (CSS places it at bottom: -150px)
        balloon.dataset.speed = speed;
        balloon.dataset.points = points;

        gameContainer.appendChild(balloon);
        balloons.push(balloon);

        // Use slight delay to allow browser to render before fading in
        requestAnimationFrame(() => {
             balloon.style.opacity = 1;
        });

        // Touchstart is faster than click on mobile
        balloon.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevents double-firing with click on some devices
            popBalloon(e);
        }, { passive: false });
        balloon.addEventListener('mousedown', popBalloon);
    }

    function spawnBalloon() {
        if (!gameActive) return;
        createBalloon();
        // Spawn rate slightly faster for more intensity
        const randomTime = Math.random() * (800 - 200) + 200;
        setTimeout(spawnBalloon, randomTime);
    }

    function moveBalloons() {
        for (let i = balloons.length - 1; i >= 0; i--) {
            const balloon = balloons[i];
            let newY = parseFloat(balloon.dataset.y) + parseFloat(balloon.dataset.speed);
            balloon.dataset.y = newY;
            balloon.style.transform = `translateY(${-newY}px)`;

            // Remove if it goes off the top of the screen
            // Adding extra buffer (200px) to ensure it's fully off-screen
            if (newY > window.innerHeight + 200) {
                balloon.remove();
                balloons.splice(i, 1);
            }
        }
    }

    function popBalloon(event) {
        if (!gameActive) return;
        const balloon = event.currentTarget;
        if (balloon.classList.contains('popped')) return;

        score += parseInt(balloon.dataset.points);
        updateScoreDisplay();

        // Clone audio node for overlapping sounds on rapid pops
        const soundClone = popSound.cloneNode();
        soundClone.volume = 0.6;
        soundClone.play().catch(() => {}); // Ignore errors if user hasn't interacted yet

        balloon.classList.add('popped');
        balloons = balloons.filter(b => b !== balloon);
        setTimeout(() => balloon.remove(), 200);
    }

    // =================================================================
    // --- UI & Helpers ---
    // =================================================================

    function updateScoreDisplay() {
        scoreDisplay.textContent = `SCORE: ${score}`;
    }

    function updateTimerDisplay() {
        timerDisplay.textContent = `TIME: ${timer}`;
    }

    function playMusic() {
        music.play().then(() => {
            soundToggle.textContent = '🔊';
        }).catch((e) => {
            console.log("Autoplay prevented pending user interaction");
            soundToggle.textContent = '🔇';
        });
    }

    function toggleMusic() {
        if (music.paused) {
            playMusic();
        } else {
            music.pause();
            soundToggle.textContent = '🔇';
        }
    }

    function loadHighScores() {
        const scores = JSON.parse(localStorage.getItem('popNightScores')) || [];
        highScores = scores.sort((a, b) => b - a).slice(0, 5);
        
        highScoreList.innerHTML = '';
        if (highScores.length === 0) {
            highScoreList.innerHTML = '<li>---</li><li>---</li><li>---</li>';
        } else {
            highScores.forEach(s => {
                const li = document.createElement('li');
                li.textContent = `${s} PTS`;
                highScoreList.appendChild(li);
            });
        }
    }

    function saveHighScore(newScore) {
        if (newScore <= 0) return;
        let scores = JSON.parse(localStorage.getItem('popNightScores')) || [];
        scores.push(newScore);
        scores.sort((a, b) => b - a);
        localStorage.setItem('popNightScores', JSON.stringify(scores.slice(0, 5)));
    }

    // --- Initial Setup ---
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    soundToggle.addEventListener('click', toggleMusic);
    
    // Prevent default touch behaviors (like scrolling/zooming) on the game container
    gameContainer.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    loadHighScores();
});