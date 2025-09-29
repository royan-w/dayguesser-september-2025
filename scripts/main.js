// ======================
         // Menu Utama Functionality
        // ======================
        
        // Theme toggle functionality
        function toggleTheme() {
            const body = document.body;
            const themeToggle = document.querySelector('.theme-toggle');
            const currentTheme = body.getAttribute('data-theme');
            
            if (currentTheme === 'dark') {
                body.removeAttribute('data-theme');
                themeToggle.textContent = '🌙';
                themeToggle.style.transform = 'rotate(360deg)';
            } else {
                body.setAttribute('data-theme', 'dark');
                themeToggle.textContent = '☀️';
                themeToggle.style.transform = 'rotate(-360deg)';
            }
            
            setTimeout(() => {
                themeToggle.style.transform = 'none';
            }, 300);
        }

        // Tab switching functionality
        function switchTab(tabName, element) {
            // Hide all tab contents
            const allTabs = document.querySelectorAll('.tab-content');
            allTabs.forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Remove active class from all nav items
            const allNavItems = document.querySelectorAll('.nav-item');
            allNavItems.forEach(nav => {
                nav.classList.remove('active');
            });
            
            // Show selected tab and activate nav item
            document.getElementById(tabName).classList.add('active');
            element.classList.add('active');
            
            // Add bounce animation
            element.style.animation = 'bounce 0.5s ease';
            setTimeout(() => {
                element.style.animation = '';
            }, 500);
        }

        // Switch toggle functionality
        function toggleSwitch(switchElement) {
            switchElement.classList.toggle('active');
            
            // Add haptic feedback simulation
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }

        // Create floating particles
        function createParticles() {
            const particlesContainer = document.getElementById('particles');
            const particleCount = 15;
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 6 + 's';
                particle.style.animationDuration = (6 + Math.random() * 4) + 's';
                particlesContainer.appendChild(particle);
            }
        }

