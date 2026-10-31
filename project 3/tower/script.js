const board = document.getElementById('game-board');
const scoreEl = document.getElementById('score-display');
const modal = document.getElementById('game-over-modal');

let score = 0, speed = 4, direction = 1, currentWidth = 200, stackHeight = 0, previousLeft = 0, gameActive = true;
let activeBlock = createBlock(currentWidth, 0, 0);

function createBlock(width, x, bottom) {
    const div = document.createElement('div');
    div.className = 'block';
    div.style.width = width + 'px';
    div.style.left = x + 'px';
    div.style.bottom = bottom + 'px';
    board.appendChild(div);
    return div;
}

function showFeedback(text, x, y) {
    const f = document.createElement('div');
    f.className = 'feedback';
    f.innerText = text;
    f.style.left = x + 'px';
    f.style.bottom = (y + 40) + 'px';
    board.appendChild(f);
    setTimeout(() => f.remove(), 500);
}

function animate() {
    if (!gameActive) return;
    let x = parseInt(activeBlock.style.left);
    if (x > 400 - currentWidth || x < 0) direction *= -1;
    activeBlock.style.left = (x + (speed * direction)) + 'px';
    requestAnimationFrame(animate);
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameActive) {
        let currentLeft = parseInt(activeBlock.style.left);
        let diff = Math.abs(currentLeft - previousLeft);

        if (diff >= currentWidth) {
            gameActive = false;
            modal.classList.remove('hidden');
            return;
        }

        if (diff < 5) { showFeedback("PERFECT!", currentLeft, stackHeight); score += 2; activeBlock.style.left = previousLeft + 'px'; }
        else if (diff < 20) { showFeedback("GOOD!", currentLeft, stackHeight); score += 1; }
        else { showFeedback("OKAY", currentLeft, stackHeight); score += 1; currentWidth -= diff; activeBlock.style.width = currentWidth + 'px'; activeBlock.style.left = (currentLeft > previousLeft ? previousLeft : currentLeft) + 'px'; }

        previousLeft = parseInt(activeBlock.style.left);
        stackHeight += 30;
        speed += 0.2;
        scoreEl.innerText = "Score: " + score;
        activeBlock = createBlock(currentWidth, 0, stackHeight);
    }
});

function restartGame() {
    board.innerHTML = '';
    score = 0; stackHeight = 0; currentWidth = 200; speed = 4; previousLeft = 0; gameActive = true;
    scoreEl.innerText = "Score: 0";
    modal.classList.add('hidden');
    activeBlock = createBlock(currentWidth, 0, 0);
    animate();
}

animate();