// ======================
// Game Buttons Logic
// ======================

// Mapping default: tombol -> hari. Misal, tekan "1" untuk "Senin", "2" untuk "Selasa", dst.
let shortcutMapping = {
    '1': 'Senin',
    '2': 'Selasa',
    '3': 'Rabu',
    '4': 'Kamis',
    '5': 'Jumat',
    '6': 'Sabtu',
    '0': 'Minggu'
};

function renderButtons() {
    // Tombol biasa digantikan oleh SVG wheel jika available.
    // Jika SVG tidak ada, fallback: buat tombol teks sederhana.
    const container = document.getElementById('buttons');
    if (!container) return;
    const hitsGroup = document.querySelector('#hits');
    if (hitsGroup && hitsGroup.childElementCount > 0) {
        // sudah ada SVG — tidak perlu membuat tombol teks
        return;
    }
    container.innerHTML = '';
    daysOfWeek.forEach(day => {
        const button = document.createElement('button');
        button.textContent = day;
        button.onclick = () => guessDay(day);
        container.appendChild(button);
    });
}

// Build the day wheel segments (porting minimal logic dari file referensi)
function buildDayWheel() {
    // only build once
    if (document.querySelector('#segments').childElementCount > 0) return;

    const days = [
        {name: 'Senin', angle: 180},
        {name: 'Selasa', angle: 240},
        {name: 'Rabu', angle: -60},
        {name: 'Kamis', angle: 120},
        {name: 'Jumat', angle: 60},
        {name: 'Sabtu', angle: 0}
    ];

    const segmentsG = document.getElementById('segments');
    const glowG = document.getElementById('glowLayer');
    const labelsG = document.getElementById('labels');
    const hitsG = document.getElementById('hits');
    const sepsG = document.getElementById('separators');
    const defs = document.getElementById('textDefs2');

    if (!segmentsG || !hitsG) return;

    const cx = 200, cy = 200;
    const outerR = 184;
    const strokeW = 12;
    const innerR = 110;
    const gapDeg = 2;

    function degToRad(d){ return (d * Math.PI) / 180; }
    function polarX(angleDeg, r){ return cx + r * Math.cos(degToRad(angleDeg)); }
    function polarY(angleDeg, r){ return cy + r * Math.sin(degToRad(angleDeg)); }

    days.forEach((d, i) => {
        const start = d.angle + gapDeg/2;
        const end = d.angle + 60 - gapDeg/2;
        const pathId = 'segPath' + i;
        const largeArc = 0;
        const sx = polarX(start, outerR - strokeW/2);
        const sy = polarY(start, outerR - strokeW/2);
        const ex = polarX(end, outerR - strokeW/2);
        const ey = polarY(end, outerR - strokeW/2);
        const segD = `M ${sx} ${sy} A ${outerR - strokeW/2} ${outerR - strokeW/2} 0 ${largeArc} 1 ${ex} ${ey}`;

        const segPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        segPath.setAttribute('d', segD);
        segPath.setAttribute('id', pathId);
        segPath.setAttribute('class','segment');
        segmentsG.appendChild(segPath);

        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        glow.setAttribute('d', segD);
        glow.setAttribute('class','segment-glow');
        glow.setAttribute('stroke-width', 2);
        glowG.appendChild(glow);

        const textR = innerR + ((outerR - innerR) * 0.5);
        const tsx = polarX(start, textR);
        const tsy = polarY(start, textR);
        const tex = polarX(end, textR);
        const tey = polarY(end, textR);
        const textD = `M ${tsx} ${tsy} A ${textR} ${textR} 0 ${largeArc} 1 ${tex} ${tey}`;
        const textPathId = 'textPath' + i;
        const defPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        defPath.setAttribute('d', textD);
        defPath.setAttribute('id', textPathId);
        defs.appendChild(defPath);

        const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textEl.setAttribute('class','label');
        textEl.setAttribute('text-anchor','middle');
        // make label clickable by dataset + pointer-events and handler
        textEl.dataset.day = d.name;
        // ensure the element can receive pointer events even if parent svg has pointer-events: none
        textEl.style.pointerEvents = 'auto';
        textEl.style.cursor = 'pointer';
        textEl.addEventListener('click', (evt) => {
            evt.stopPropagation();
            guessDay(d.name);
        }, {passive:true});
        const tp = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
        tp.setAttribute('href', '#' + textPathId);
        tp.setAttribute('startOffset', '50%');
        tp.setAttribute('class','labelPath');
        tp.textContent = d.name.toUpperCase();
        textEl.appendChild(tp);
        labelsG.appendChild(textEl);

        const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hit.setAttribute('d', segD);
        hit.setAttribute('class','hit');
        hit.dataset.day = d.name;
        hitsG.appendChild(hit);

        const sLineX = polarX(start - gapDeg/2, innerR + 5);
        const sLineY = polarY(start - gapDeg/2, innerR + 5);
        const sLineX2 = polarX(start - gapDeg/2, outerR - 5);
        const sLineY2 = polarY(start - gapDeg/2, outerR - 5);
        const sep = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        sep.setAttribute('x1', sLineX);
        sep.setAttribute('y1', sLineY);
        sep.setAttribute('x2', sLineX2);
        sep.setAttribute('y2', sLineY2);
        sep.setAttribute('class','sep');
        sepsG.appendChild(sep);
    });
}

// Attach click handlers to SVG hits (dipanggil saat binding init)
function bindWheelHandlers() {
    // build wheel if not present
    buildDayWheel();
    const hits = document.querySelectorAll('#hits .hit');
    hits.forEach(h => {
        h.addEventListener('click', (e) => {
            const day = h.dataset.day;
            if (day) guessDay(day);
        }, {passive:true});
    });
    
    // Ensure center button is visible and properly bound
    const center = document.getElementById('centerBtn');
    if (center) {
        // Make sure button is visible
        center.style.display = 'flex';
        center.style.visibility = 'visible';
        center.addEventListener('click', () => guessDay('Minggu'), {passive:true});
    }
}

// Setup game card interactions
function setupGameCardInteractions() {
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(card => {
        let startX = 0;
        let startY = 0;
        let moved = false;
        const MOVE_THRESHOLD = 8; // px

        card.addEventListener('pointerdown', (e) => {
            if (card.classList.contains('disabled')) return;
            startX = e.clientX;
            startY = e.clientY;
            moved = false;
            try { card.setPointerCapture(e.pointerId); } catch (err) {}
            card.style.transform = 'scale(0.98)';
        });

        card.addEventListener('pointermove', (e) => {
            if (Math.hypot(e.clientX - startX, e.clientY - startY) > MOVE_THRESHOLD) {
                moved = true;
            }
        });

        card.addEventListener('pointerup', (e) => {
            try { card.releasePointerCapture(e.pointerId); } catch (err) {}
            card.style.transform = '';
            if (moved) return;
            if (card.classList.contains('disabled')) return;

            // cek klik pada tombol info dll
            let clickedInteractive = false;
            const path = (e.composedPath && e.composedPath()) || (e.path) || [];
            if (path && path.length) {
                clickedInteractive = path.some(el => el && el.classList && (el.classList.contains('info-btn') || el.classList.contains('back-info-btn') || el.classList.contains('close-back')));
            }
            if (!clickedInteractive && typeof document.elementFromPoint === 'function') {
                const el = document.elementFromPoint(e.clientX, e.clientY);
                if (el && el.closest && el.closest('.info-btn, .back-info-btn, .close-back')) clickedInteractive = true;
            }
            if (!clickedInteractive && e.target && e.target.closest && e.target.closest('.info-btn, .back-info-btn, .close-back')) clickedInteractive = true;
            if (clickedInteractive) return;

            const mode = card.dataset.mode;
            if (mode) {
                selectGameMode(mode, card);
            }
        });

        card.addEventListener('click', (e) => {
            if (moved) {
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        });

        card.addEventListener('touchstart', () => {
            if (!card.classList.contains('disabled')) card.style.transform = 'scale(0.98)';
        });
        card.addEventListener('touchend', () => {
            card.style.transform = '';
        });
    });
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener("keydown", function(event) {
        if (event.key === 'Enter' && gameState !== 'countdown') {
            restartGame();
            return;
        }
        if (gameState !== 'playing') return;
        if (document.activeElement && document.activeElement.tagName === "INPUT") return;
        const day = shortcutMapping[event.key];
        if (day === 'repeatSpeech') {
            repeatSpeech();
            return;
        }
        if (day) {
            guessDay(day);
        }
        if (event.key === ' ') {
            repeatSpeech();
            return;
        }
    });
}

// Setup settings buttons
function setupSettingsButtons() {
    const settingsBtn = document.getElementById("settings-btn");
    if (settingsBtn) {
        settingsBtn.addEventListener("click", function() {
            const sp = document.getElementById("settings-popup");
            if (sp) sp.style.display = "block";
        });
    }

    const cancelSettings = document.getElementById("cancel-settings");
    if (cancelSettings) cancelSettings.addEventListener("click", function() {
        const sp = document.getElementById("settings-popup");
        if (sp) sp.style.display = "none";
    });

    const shortcutForm = document.getElementById("shortcut-form");
    if (shortcutForm) {
        shortcutForm.addEventListener("submit", function(e) {
            e.preventDefault();
            const newMapping = {
                'Senin': document.getElementById("shortcut-senin") ? document.getElementById("shortcut-senin").value : '',
                'Selasa': document.getElementById("shortcut-selasa") ? document.getElementById("shortcut-selasa").value : '',
                'Rabu': document.getElementById("shortcut-rabu") ? document.getElementById("shortcut-rabu").value : '',
                'Kamis': document.getElementById("shortcut-kamis") ? document.getElementById("shortcut-kamis").value : '',
                'Jumat': document.getElementById("shortcut-jumat") ? document.getElementById("shortcut-jumat").value : '',
                'Sabtu': document.getElementById("shortcut-sabtu") ? document.getElementById("shortcut-sabtu").value : '',
                'Minggu': document.getElementById("shortcut-minggu") ? document.getElementById("shortcut-minggu").value : '',
                'Repeat': document.getElementById("shortcut-repeat") ? document.getElementById("shortcut-repeat").value : ''
            };

            shortcutMapping = {};
            for (const day in newMapping) {
                let keyShortcut = newMapping[day];
                if (keyShortcut && keyShortcut.length === 1) {
                    shortcutMapping[keyShortcut] = day;
                }
            }
            if (newMapping['Repeat'] && newMapping['Repeat'].length === 1) {
                shortcutMapping[newMapping['Repeat']] = 'repeatSpeech';
            }

            const sp = document.getElementById("settings-popup");
            if (sp) sp.style.display = "none";
        });
    }
}

// Setup control buttons (back, restart, etc.)
function setupControlButtons() {
    const restartBtn = document.getElementById("restart-btn");
    if (restartBtn) {
        restartBtn.addEventListener("click", function() {
            if (gameState === 'countdown') return;
            restartGame();
        });
    }

    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            if (gameState === 'countdown') return;
            backToMenu();
        });
    }

    const restartGameBtn = document.getElementById('restart-game-btn');
    if (restartGameBtn) {
        restartGameBtn.addEventListener('click', function() {
            if (gameState === 'countdown') return;
            restartGame();
        });
    }
}

// Initialize all button handlers
function initGameButtons() {
    bindWheelHandlers();
    setupGameCardInteractions();
    setupKeyboardShortcuts();
    setupSettingsButtons();
    setupControlButtons();
}