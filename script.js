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

    // BALLOON COLORS
    const BALLOON_COLORS = ['#ff0000', '#cc0000', '#ff4d4d', '#ffffff', '#333333'];

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

        Array.from(document.getElementsByClassName('balloon')).forEach(b => b.remove());

        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        
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

        // --- DIFFICULTY TWEAKS HERE ---
        // 1. Smaller size range (45px to 95px) - Harder to tap
        const size = Math.random() * (95 - 45) + 45;
        
        // 2. Increased speed multiplier (from 2.5 to 3.5) - Moves faster
        // We also increased base speed factor from 180 to 200
        const speed = (200 / size) * (window.innerHeight / 1000) * 3.5; 
        
        // Points based on new sizes
        const points = Math.floor(150 - size);

        balloon.style.width = `${size}px`;
        balloon.style.height = `${size * 1.18}px`;
        
        const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
        balloon.style.backgroundColor = color;
        balloon.style.borderTopColor = color;
        
        const maxLeft = gameContainer.clientWidth - size;
        balloon.style.left = `${Math.max(0, Math.min(maxLeft, Math.random() * maxLeft))}px`;
        
        balloon.dataset.y = 0;
        balloon.dataset.speed = speed;
        balloon.dataset.points = points;

        gameContainer.appendChild(balloon);
        balloons.push(balloon);

        requestAnimationFrame(() => { balloon.style.opacity = 1; });

        balloon.addEventListener('touchstart', (e) => {
            e.preventDefault();
            popBalloon(e);
        }, { passive: false });
        balloon.addEventListener('mousedown', popBalloon);
    }

    function spawnBalloon() {
        if (!gameActive) return;
        createBalloon();
        
        // --- DIFFICULTY TWEAK HERE ---
        // 3. Faster spawn rate (between 150ms and 650ms)
        const randomTime = Math.random() * (650 - 150) + 150;
        setTimeout(spawnBalloon, randomTime);
    }

    function moveBalloons() {
        for (let i = balloons.length - 1; i >= 0; i--) {
            const balloon = balloons[i];
            let newY = parseFloat(balloon.dataset.y) + parseFloat(balloon.dataset.speed);
            balloon.dataset.y = newY;
            balloon.style.transform = `translateY(${-newY}px)`;

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

        const soundClone = popSound.cloneNode();
        soundClone.volume = 0.6;
        soundClone.play().catch(() => {});

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
    gameContainer.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    loadHighScores();
});
