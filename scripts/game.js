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
        let multiplier = 1;
        let timeLeft = 60;
        let countdownInterval;
        let cachedVoice = null;
        
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
            const container = document.getElementById('buttons');
            container.innerHTML = '';
            daysOfWeek.forEach(day => {
                const button = document.createElement('button');
                button.textContent = day;
                button.onclick = () => guessDay(day);
                container.appendChild(button);
            });
        }

        function guessDay(guessedDay) {
           if (gameState !== 'playing') return; 

            const correctDay = daysOfWeek[dates[currentIndex].getDay()];
            const isCorrect = guessedDay === correctDay;
            
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
            // set big numeric score
            const finalScoreEl = document.getElementById('final-score');
            if (finalScoreEl) finalScoreEl.textContent = score;

            // set small "jawaban benar" line
            const finalCorrectEl = document.getElementById('final-correct');
            if (finalCorrectEl) finalCorrectEl.textContent = `(${correctAnswers} jawaban benar)`;

            // ensure overlay visible and popup on top
            const overlay = document.getElementById('overlay');
            if (overlay) overlay.style.display = 'block';
            document.getElementById('popup').style.display = 'block';
            speechSynthesis.cancel();
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
            document.getElementById("multiplier-value").textContent = `${multiplier}x`;

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
        // Event Listeners
        // ======================
        
        document.addEventListener('DOMContentLoaded', () => {
            createParticles();
            
            // Add touch / pointer feedback for mobile and prevent selecting when user scrolls/drags
            const gameCards = document.querySelectorAll('.game-card');
            gameCards.forEach(card => {
                let startX = 0;
                let startY = 0;
                let moved = false;
                const MOVE_THRESHOLD = 8; // px

                card.addEventListener('pointerdown', (e) => {
                    // ignore disabled cards
                    if (card.classList.contains('disabled')) return;
                    startX = e.clientX;
                    startY = e.clientY;
                    moved = false;
                    try { card.setPointerCapture(e.pointerId); } catch (err) {}
                    // visual feedback
                    card.style.transform = 'scale(0.98)';
                });

                card.addEventListener('pointermove', (e) => {
                    if (Math.hypot(e.clientX - startX, e.clientY - startY) > MOVE_THRESHOLD) {
                        moved = true;
                    }
                });

                card.addEventListener('pointerup', (e) => {
                    try { card.releasePointerCapture(e.pointerId); } catch (err) {}
                    // remove visual feedback
                    card.style.transform = '';
                    // if user moved (scroll/drag), do not select
                    if (moved) return;
                    if (card.classList.contains('disabled')) return;

                    // ignore clicks that originate from interactive controls inside the card
                    // Robust check: 1) composedPath, 2) elementFromPoint (handles pointer capture), 3) e.target.closest
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

                // fallback for touch-only devices: prevent click firing after drag
                card.addEventListener('click', (e) => {
                    if (moved) {
                        e.stopImmediatePropagation();
                        e.preventDefault();
                    }
                });

                // small touch feedback for older devices
                card.addEventListener('touchstart', () => {
                    if (!card.classList.contains('disabled')) card.style.transform = 'scale(0.98)';
                });
                card.addEventListener('touchend', () => {
                    card.style.transform = '';
                });
            });
            
            // Game mode change listener
            //document.getElementById("game-mode").addEventListener("change", function(e) {
               // gameMode = e.target.value;
                //restartGame();
            //});

            // Game restart button
            document.getElementById('restart-btn').addEventListener('click', function() {
                if (gameState === 'countdown') return;
                restartGame();
            });
            
            // Game restart button in header
            document.getElementById('restart-game-btn').addEventListener('click', function() {
                if (gameState === 'countdown') return;
                restartGame();
            });

            // Tambahkan event listener untuk shortcut keyboard
            document.addEventListener("keydown", function(event) {
                // Handle Enter key (works in all states except countdown)
                if (event.key === 'Enter' && gameState !== 'countdown') {
                    restartGame();
                    return;
                }

                // Block all other keys unless we're in playing state
                if (gameState !== 'playing') return;

                // Ignore if typing in an input field
                if (document.activeElement.tagName === "INPUT") return;

                // Handle day shortcuts
                const day = shortcutMapping[event.key];
                if (day) {
                    guessDay(day);
                }

                // Shortcut "ulang pengucapan" (key " ")
                if (event.key === ' ') {
                    repeatSpeech();
                    return;
                }
                
                if (event.key === Object.keys(shortcutMapping).find(k => shortcutMapping[k] === 'repeatSpeech')) {
                    repeatSpeech();
                    return;
                }
            });
            
            // Pengaturan modal shortcut
            document.getElementById("settings-btn").addEventListener("click", function() {
                document.getElementById("settings-popup").style.display = "block";
            });
            document.getElementById("cancel-settings").addEventListener("click", function() {
                document.getElementById("settings-popup").style.display = "none";
            });
            document.getElementById("shortcut-form").addEventListener("submit", function(e) {
                e.preventDefault();
                // Ambil nilai shortcut baru dari form
                const newMapping = {
                    'Senin': document.getElementById("shortcut-senin").value,
                    'Selasa': document.getElementById("shortcut-selasa").value,
                    'Rabu': document.getElementById("shortcut-rabu").value,
                    'Kamis': document.getElementById("shortcut-kamis").value,
                    'Jumat': document.getElementById("shortcut-jumat").value,
                    'Sabtu': document.getElementById("shortcut-sabtu").value,
                    'Minggu': document.getElementById("shortcut-minggu").value,
                    'Repeat': document.getElementById("shortcut-repeat").value
                };

                // Perbarui global shortcutMapping
                shortcutMapping = {};
                for (const day in newMapping) {
                    let keyShortcut = newMapping[day];
                    if (keyShortcut && keyShortcut.length === 1) {
                        shortcutMapping[keyShortcut] = day;
                    if (newMapping['Repeat']) {
                            shortcutMapping[newMapping['Repeat']] = 'repeatSpeech';
                        }

                    }

                }
                document.getElementById("settings-popup").style.display = "none";
            });
        });