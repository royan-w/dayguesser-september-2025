// Flip card functionality
        function flipCard(card, event) {
            // Prevent event bubbling to avoid triggering game start
            if (event) {
                try { event.stopPropagation(); } catch (e) {}
                try { event.preventDefault(); } catch (e) {}
            }
            
            card.classList.toggle('is-flipped');
            
            // Add haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate(30);
            }

            // Prevent the immediate next user activation from starting the game.
            // Install short-lived capture listeners for several event types so late pointerup/click/touch events
            // that occur after the info-btn interaction are intercepted before any game-start handlers.
            try {
                if (card) {
                    card.dataset.justFlipped = '1';
                    const FLIP_BLOCK_MS = 750; // slightly longer than CSS transition (0.6s)

                    const eventsToBlock = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'touchend'];
                    const handlers = [];

                    const makeHandler = (evtName) => {
                        const h = function(ev) {
                            // only block events that originate inside this card
                            if (!card.contains(ev.target)) return;
                            // stop everything for events inside the card
                            try { ev.stopPropagation(); } catch (e) {}
                            try { ev.preventDefault(); } catch (e) {}
                        };
                        return h;
                    };

                    // add capture listeners
                    eventsToBlock.forEach(name => {
                        const h = makeHandler(name);
                        handlers.push({ name, h });
                        try {
                            document.addEventListener(name, h, { capture: true, passive: false });
                        } catch (err) {
                            // older browsers may not accept options object
                            document.addEventListener(name, h, true);
                        }
                    });

                    // cleanup after timeout
                    setTimeout(() => {
                        handlers.forEach(({ name, h }) => {
                            try {
                                document.removeEventListener(name, h, { capture: true });
                            } catch (err) {
                                document.removeEventListener(name, h, true);
                            }
                        });
                        delete card.dataset.justFlipped;
                    }, FLIP_BLOCK_MS);
                }
            } catch (err) {
                // fail-safe: don't break main flow
                console.error(err);
            }
        }

        function enableCardDragging() {
            const containers = document.querySelectorAll('.card-container');
            containers.forEach(container => {
                let isDown = false;
                let startX;
                let scrollLeft;

                container.addEventListener('mousedown', (e) => {
                    isDown = true;
                    container.classList.add('dragging');
                    startX = e.pageX - container.offsetLeft;
                    scrollLeft = container.scrollLeft;
                    e.preventDefault();
                });

                container.addEventListener('mouseleave', () => {
                    isDown = false;
                    container.classList.remove('dragging');
                });

                container.addEventListener('mouseup', () => {
                    isDown = false;
                    container.classList.remove('dragging');
                });

                container.addEventListener('mousemove', (e) => {
                    if (!isDown) return;
                    const x = e.pageX - container.offsetLeft;
                    const walk = (x - startX) * 1.5; // scroll speed multiplier
                    container.scrollLeft = scrollLeft - walk;
                });
        // Improve touch responsiveness (optional)
                container.addEventListener('touchstart', (e) => {
                    startX = e.touches[0].pageX - container.offsetLeft;
                    scrollLeft = container.scrollLeft;
                });
                container.addEventListener('touchmove', (e) => {
                    const x = e.touches[0].pageX - container.offsetLeft;
                    const walk = (x - startX) * 1.5;
                    container.scrollLeft = scrollLeft - walk;
                }, { passive: true });
            });
        }

        // Tambahkan event listener setelah DOM siap
                document.addEventListener('DOMContentLoaded', function() {
    // delegated handler: lebih robust untuk elemen dinamis dan menghindari timing issues
    document.addEventListener('pointerdown', function(e) {
        const btn = e.target.closest && e.target.closest('.info-btn');
        if (!btn) return;

        // langsung tangani flip — hentikan propagasi ke handler kartu
        e.stopPropagation();
        e.preventDefault();

        const card = btn.closest('.flip-card');
        if (!card) return;

        // jika parent memegang pointer capture, lepaskan agar event tidak "ditelan"
        try { if (e.pointerId != null && card.releasePointerCapture) card.releasePointerCapture(e.pointerId); } catch (err) {}

        // panggil flip segera
        flipCard(card, e);
    }, { passive: false });

    // fallback untuk touchstart pada beberapa perangkat/timings
    document.addEventListener('touchstart', function(e) {
        const btn = e.target.closest && e.target.closest('.info-btn');
        if (!btn) return;
        e.stopPropagation();
        e.preventDefault();
        const card = btn.closest('.flip-card');
        if (!card) return;
        flipCard(card, e);
    }, { passive: false });

    // enable horizontal dragging after DOM ready
    if (typeof enableCardDragging === 'function') enableCardDragging();
 });