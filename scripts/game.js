// ======================
        // Game Integration
        // ======================
        
        // Variables for game state
        let gameState = 'idle'; // Nilai: 'idle' | 'countdown' | 'playing' | 'gameover'
        let gameMode = 'sprint'; // default
        
        // Show game screen
        function selectGameMode(mode, selectedCard) {
            // selectedCard bisa berupa elemen yang dipass dari handler pointer
            // fallback: jika dipanggil dari inline event tanpa argumen, gunakan event.currentTarget (tidak ideal)
            if (!selectedCard && typeof event !== 'undefined') {
                selectedCard = event.currentTarget;
            }
            if (selectedCard) selectedCard.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                if (selectedCard) selectedCard.style.transform = '';
                
                // Extract game type from mode string
                let gameType = mode.split('-')[0];

                // Map "time" (Time Attack) to "sprint"
                if (gameType === 'time') gameType = 'sprint';

                // Set game mode
                gameMode = gameType;
                
                // Show game screen
                document.getElementById('game-screen').style.display = 'block';
                document.getElementById('main-menu').style.display = 'none';
                
                // Initialize game
                initGame();
            }, 150);
        }
        
        // Back to menu
        function backToMenu() {
            // Stop game if running
            clearInterval(countdownInterval);
            speechSynthesis.cancel();
            
             // Hide any popups/overlay
            const overlay = document.getElementById('overlay');
            if (overlay) overlay.style.display = 'none';
            const popup = document.getElementById('popup');
            if (popup) popup.style.display = 'none';

            // Hide game screen
            document.getElementById('game-screen').style.display = 'none';
            
            // Show main menu
            document.getElementById('main-menu').style.display = 'block';
        }
        
        // ======================
        // DayGuesser Game Logic
        // ======================
        
        const daysOfWeek = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        let dates = [];
        let currentIndex = 0;
        let score = 0;
        let lives = 5;
        let consecutiveCorrect = 0;
        let correctAnswers = 0;
        let totalAnswered = 0; // new: total jawaban yang diberikan
        let multiplier = 1;
        let timeLeft = 60;
        let countdownInterval;
        let cachedVoice = null;

        function generateRandomDate() {
            const start = new Date(1000, 0, 1);
            const end = new Date(9999, 11, 31);
            return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
        }

        function formatDate(date) {
            return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        }

        function showCountdown(callback) {
            const countdownEl = document.getElementById('countdown');
            const overlay = document.getElementById('overlay');
            const sequence = ['3', '2', '1'];
            let index = 0;

            gameState = 'countdown';
            countdownEl.style.display = 'block';
            overlay.style.display = 'block';
            countdownEl.textContent = sequence[index];

            const interval = setInterval(() => {
                index++;
                if (index >= sequence.length) {
                    clearInterval(interval);
                    countdownEl.style.display = 'none';
                    overlay.style.display = 'none';
                    gameState = 'playing';
                    callback();
                } else {
                    countdownEl.textContent = sequence[index];
                }
            }, 400);
        }
        
        function startTimer() {
            countdownInterval = setInterval(() => {
                timeLeft--;
                document.getElementById("timer-display").textContent = `Sisa waktu: ${timeLeft} detik`;
                if (timeLeft <= 0) {
                    clearInterval(countdownInterval);
                    showGameOver();
                }
            }, 1000);
        }

        function initGame() {
            showCountdown(() => {
                dates = [];
                currentIndex = 2;
                score = 0;
                lives = 5;
                consecutiveCorrect = 0;
                correctAnswers = 0;
                totalAnswered = 0;
                timeLeft = 60;
                startTimer();

                for (let i = 0; i < 5; i++) {
                    let d = generateRandomDate();
                    d.guessedCorrectly = null;
                    dates.push(d);
                }
                renderDates();
                renderButtons();
                updateScoreLives();
                multiplier = 1;
                updateComboDisplay();
            });
        }

        function speakDate(dateObj) {
            window.lastSpokenDateObj = dateObj;
            const msg = new SpeechSynthesisUtterance();

            const day = dateObj.getDate();
            const month = dateObj.toLocaleString('id-ID', { month: 'long' });
            const year = dateObj.getFullYear();

            // Atur teks eksplisit TANPA embel-embel apapun
            msg.text = `${day} ${month} ${year}`;
            
            // Gunakan voice engine bahasa Inggris untuk hindari pelafalan sistemik "tanggal"
            msg.lang = 'en-US';
            msg.rate = 1.2;

            if (cachedVoice) msg.voice = cachedVoice;

            setTimeout(() => {
                speechSynthesis.cancel();
                speechSynthesis.speak(msg);
            }, 100);
        }

        function repeatSpeech() {
            if (window.lastSpokenDateObj) {
                speakDate(window.lastSpokenDateObj);
            }
        }

        function renderDates() {
            const wheel = document.getElementById('date-wheel');
            wheel.innerHTML = '';

            for (let i = 0; i < 5; i++) {
                const div = document.createElement('div');
                div.className = 'date-item';
                const dateObj = dates[i];
                const dateText = formatDate(dateObj);

                if (i < 2) {
                    // History tetap tampil
                    if (dateObj.guessedCorrectly === true || dateObj.guessedCorrectly === false) {
                        div.textContent = `${dateText} (${daysOfWeek[dateObj.getDay()]})`;
                        div.classList.add(dateObj.guessedCorrectly ? 'correct' : 'incorrect');
                    } else {
                        div.textContent = '';
                    }
                    wheel.appendChild(div);
                } else if (gameMode === 'sprint') {
                    // Sprint mode: tampilkan soal dan future dates
                    if (i === 2) {
                        div.textContent = dateText;
                        div.classList.add('current');
                    } else {
                        div.textContent = dateText;
                        div.classList.add('future');
                    }
                    wheel.appendChild(div);
                } else if (gameMode === 'blind') {
                    // Blind mode: tidak tampilkan baris ke-3,4,5
                    // Tapi baris ke-3 (soal aktif) dibacakan dengan TTS
                    if (i === 2) speakDate(dateObj);
                }
            }
        }
        
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
        
        function guessDay(guessedDay) {
           if (gameState !== 'playing') return; 

            const correctDay = daysOfWeek[dates[currentIndex].getDay()];
            const isCorrect = guessedDay === correctDay;
            // hitung jawaban yang sudah diberikan
            totalAnswered++;
            
            if (isCorrect) {
                correctAnswers++;
                consecutiveCorrect++;
                // Update multiplier
                if (consecutiveCorrect >= 10) {
                    multiplier = 2;
                } else if (consecutiveCorrect >= 5) {
                    multiplier = 1.5;
                } else {
                    multiplier = 1;
                }

                // Tambahkan skor dengan multiplier
                score += Math.floor(100 * multiplier);

                // Update visual combo
                updateComboDisplay();

            } else {
                consecutiveCorrect = 0;
                multiplier = 1; // Reset multiplier jika salah
                lives--;
                updateComboDisplay();

                if (lives === 0) {
                    showGameOver();
                    return;
                }
            }

            // Simpan hasil jawaban ke dates[2] sebelum digeser
            dates[2].guessedCorrectly = isCorrect;

            // Geser tanggal ke atas
            dates[0] = dates[1];
            dates[1] = dates[2];
            dates[2] = dates[3];
            dates[3] = dates[4];
            dates[4] = generateRandomDate();
            dates[4].guessedCorrectly = null;

            // Reset index ke soal baru (tetap di baris ke-3)
            currentIndex = 2;
            
            renderDates();
            updateScoreLives();
        }

        function updateScoreLives() {
            document.getElementById('score-lives').textContent = `Skor: ${score} | Nyawa: ${lives} | Benar: ${correctAnswers}`;
        }

        function showGameOver() {
            // pastikan timer dan speech dihentikan
            clearInterval(countdownInterval);
            speechSynthesis.cancel();

            // isi teks pada popup (pastikan elemen ada)
            const finalScoreEl = document.getElementById('final-score');
            if (finalScoreEl) finalScoreEl.textContent = String(score ?? 0);

            const finalCorrectCountEl = document.getElementById('final-correct-count');
            const finalWrongCountEl = document.getElementById('final-wrong-count');
            const wrongAnswers = Math.max(0, (totalAnswered ?? 0) - (correctAnswers ?? 0));
            if (finalCorrectCountEl) finalCorrectCountEl.textContent = String(correctAnswers ?? 0);
            if (finalWrongCountEl) finalWrongCountEl.textContent = String(wrongAnswers);

            // tampilkan overlay dan popup; gunakan flex supaya center dari CSS berlaku
            const overlay = document.getElementById('overlay');
            if (overlay) overlay.style.display = 'block';

            const popupEl = document.getElementById('popup');
            if (popupEl) {
                // remove any accidental inline positioning/display that breaks centering
                popupEl.style.display = 'flex';
                popupEl.style.position = 'fixed';
                popupEl.style.inset = '0'; // top/right/bottom/left = 0
                popupEl.style.alignItems = 'center';
                popupEl.style.justifyContent = 'center';
                popupEl.style.zIndex = '4000';
            }

            gameState = 'gameover';
        }

        function restartGame() {
            // Add check for countdown active
            if (gameState === 'countdown') return;
            
            clearInterval(countdownInterval);
            gameState = 'idle';
            document.getElementById('popup').style.display = 'none';
            initGame();
            multiplier = 1;
            updateComboDisplay();
        }

        function updateComboDisplay() {
            // Update multiplier text
            const multEl = document.getElementById("multiplier-value");
            if (multEl) multEl.textContent = `${multiplier}x`;

            // Update dots
            const dots = document.querySelectorAll(".combo-dot");
            
            dots.forEach((dot, index) => {
                dot.classList.remove("active");
                dot.style.backgroundColor = '#555'; // default unlit color

                if (consecutiveCorrect > index) {
                    dot.classList.add("active");
                    
                    // For 2x multiplier (10+ correct)
                    if (consecutiveCorrect >= 10 + index) {
                        dot.style.backgroundColor = '#e74c3c'; // red
                    }
                    // For 1.5x multiplier (5-9 correct)
                    else if (consecutiveCorrect >= 5 + index) {
                        dot.style.backgroundColor = '#3498db'; // blue
                    }
                    // For base multiplier (1-4 correct)
                    else {
                        dot.style.backgroundColor = '#f1c40f'; // yellow
                    }
                }
            });
        }

        // ======================
        // Event Listeners (robust init)
        // ======================

        // Kita tunggu dua kondisi:
        //  - DOMContentLoaded (dokumen ter-parse)
        //  - includesLoaded (partial sudah di-inject oleh include.js)
        // Kedua event harus terjadi sebelum kita pasang handler yang mengakses elemen partial.
        let domReady = (document.readyState === 'interactive' || document.readyState === 'complete');
        let includesReady = false;
        let bindingsInitialized = false;

        // Ensure timing of event bindings for settings and restart
        function initGameBindings() {
            if (bindingsInitialized) return;
            if (!domReady || !includesReady) return;
            bindingsInitialized = true;

            // Initialize all button handlers from gameButtons.js
            if (typeof initGameButtons === 'function') {
                initGameButtons();
            }

            // createParticles ada di main.js; cek dulu
            if (typeof createParticles === 'function') {
                try { createParticles(); } catch (err) { console.warn('createParticles error', err); }
            }
        }

        // event flag updates
        if (!domReady) {
            document.addEventListener('DOMContentLoaded', () => {
                domReady = true;
                initGameBindings();
            });
        } else {
            // already ready
        }

        window.addEventListener('includesLoaded', () => {
            includesReady = true;
            initGameBindings();
        });