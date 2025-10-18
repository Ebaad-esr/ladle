// public/script.js
// This script runs in the browser. It connects to the Node.js server via WebSocket,
// receives real-time data, and updates the dashboard without needing to refresh the page.

document.addEventListener('DOMContentLoaded', () => {
    // --- PARTICLE EFFECT SETUP ---
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + Math.random() * 100;
            this.size = Math.random() * 2.5 + 0.5;
            this.speedY = Math.random() * 1.5 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.5 + 0.5;
        }
        update() {
            this.y -= this.speedY;
            this.x += this.speedX;
            if (this.y < 0) {
                this.y = canvas.height + 10;
                this.x = Math.random() * canvas.width;
            }
        }
        draw() {
            ctx.beginPath();
            ctx.fillStyle = `rgba(245, 158, 11, ${this.opacity})`;
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        const particleCount = window.innerWidth < 768 ? 100 : 200;
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animateParticles);
    }
    initParticles();
    animateParticles();

    // --- PAGE ELEMENTS & NAVIGATION ---
    const navDashboard = document.getElementById('nav-dashboard');
    const navProposal = document.getElementById('nav-proposal');
    const pageDashboard = document.getElementById('dashboard-page');
    const pageProposal = document.getElementById('proposal-page');
    const heroViewProposalBtn = document.getElementById('hero-view-proposal');
    const appFooter = document.getElementById('app-footer');

    const plantAreasContainer = document.getElementById('plant-areas');
    const eventLog = document.getElementById('event-log');
    const totalLadlesEl = document.getElementById('total-ladles');
    const inCirculationLadlesEl = document.getElementById('in-circulation-ladles');
    const maintenanceLadlesEl = document.getElementById('maintenance-ladles');
    const ladleSelectEl = document.getElementById('ladle-select');
    const journeyTimelineEl = document.getElementById('journey-timeline');

    let ladles = [];
    let plantAreas = [];

    function showPage(pageToShow, navToActivate) {
        pageDashboard.classList.add('hidden');
        pageProposal.classList.add('hidden');
        navDashboard.classList.remove('active');
        navProposal.classList.remove('active');

        pageToShow.classList.remove('hidden');
        navToActivate.classList.add('active');
        document.getElementById('app-content').scrollIntoView({ behavior: 'smooth' });
    }
    
    navDashboard.addEventListener('click', () => showPage(pageDashboard, navDashboard));
    navProposal.addEventListener('click', () => showPage(pageProposal, navProposal));
    heroViewProposalBtn.addEventListener('click', (e) => { e.preventDefault(); showPage(pageProposal, navProposal); });

    // --- WEBSOCKET CONNECTION ---
    const socketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${socketProtocol}//${window.location.host}`);

    socket.onopen = () => {
        console.log('WebSocket connection established.');
        logEvent('Connected to real-time server.', 'system');
    };

    socket.onmessage = (message) => {
        const data = JSON.parse(message.data);

        if (data.type === 'initial_state') {
            const payload = data.payload || data; 
            ladles = payload.ladles;
            plantAreas = payload.plantAreas;
            initializeDashboard();
        } else if (data.type === 'update') {
            handleUpdate(data.event, data.updatedLadle);
        }
    };

    socket.onclose = () => {
        console.log('WebSocket connection closed.');
        logEvent('Disconnected from server. Trying to reconnect...', 'error');
        setTimeout(() => {
            window.location.reload();
        }, 5000);
    };

    // --- UI UPDATE FUNCTIONS ---
    function initializeDashboard() {
        if (!plantAreas || !ladles) return;
        plantAreasContainer.innerHTML = plantAreas.map(area => `<div class="card p-4" id="area-${area.replace(/\s+/g, '-')}"><h3 class="font-semibold text-ui-text-primary">${area}</h3><p class="text-xs mt-1 text-ui-text-secondary">LADLES PRESENT:</p><div class="ladle-list text-ui-accent font-semibold mt-2 space-y-1 text-sm"></div></div>`).join('');
        ladleSelectEl.innerHTML = ladles.map(ladle => `<option value="${ladle.id}">${ladle.id}</option>`).join('');
        updateUI();
        displaySelectedLadleJourney();
    }
    
    function handleUpdate(event, updatedLadle) {
        const ladleIndex = ladles.findIndex(l => l.id === updatedLadle.id);
        if (ladleIndex !== -1) {
            ladles[ladleIndex] = updatedLadle;
        } else {
            ladles.push(updatedLadle);
            const option = document.createElement('option');
            option.value = updatedLadle.id;
            option.textContent = updatedLadle.id;
            ladleSelectEl.appendChild(option);
        }

        let logMessage;
        if (event.isMatch) {
            logMessage = `Ladle <span class="font-bold text-white">${event.ladleId}</span> moved: ${event.oldLocation} → <span class="font-bold text-white">${event.newLocation}</span>. 2FA Match.`;
        } else {
            logMessage = `MISMATCH on Ladle <span class="font-bold">${event.ladleId}</span> at ${event.newLocation}! RFID=${event.ladleId}, OCR=${event.ocrResult}.`;
        }
        logEvent(logMessage, event.type);

        updateUI();
        if (ladleSelectEl.value === updatedLadle.id) {
            displaySelectedLadleJourney();
        }
    }

    function displaySelectedLadleJourney() {
        const selectedLadleId = ladleSelectEl.value;
        const ladle = ladles.find(l => l.id === selectedLadleId);
        if (ladle && ladle.journey && ladle.journey.length > 0) {
            journeyTimelineEl.innerHTML = ladle.journey.slice().reverse().map(step => `<div class="border-l-2 pl-3" style="border-color: var(--ui-border);"><p class="font-semibold text-ui-text-primary">${step.location}</p><p class="text-xs text-ui-text-secondary">${step.timestamp}</p></div>`).join('');
        } else {
            journeyTimelineEl.innerHTML = `<p class="italic text-ui-text-secondary">No journey data available.</p>`;
        }
    }

    function updateUI() {
        if (!ladles) return;
        document.querySelectorAll('.ladle-list').forEach(list => list.innerHTML = '');
        ladles.forEach(ladle => {
            const areaCard = document.getElementById(`area-${ladle.location.replace(/\s+/g, '-')}`);
            if (areaCard) {
                const ladleEl = document.createElement('div');
                ladleEl.textContent = ladle.id;
                areaCard.querySelector('.ladle-list').appendChild(ladleEl);
            }
        });

        const inCirculation = ladles.filter(l => l.location !== 'Maintenance Yard').length;
        totalLadlesEl.textContent = ladles.length;
        inCirculationLadlesEl.textContent = inCirculation;
        maintenanceLadlesEl.textContent = ladles.length - inCirculation;
    }

    function logEvent(message, type = 'info') {
        if (eventLog.querySelector('p.italic')) eventLog.innerHTML = '';
        const logEntry = document.createElement('div');
        const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let icon = '';
        let colorClass = 'text-ui-text-secondary';
        if (type === 'success') { icon = '<span class="text-ui-success">✅ </span>'; colorClass = 'text-ui-text-primary'; }
        if (type === 'error') { icon = '<span class="text-ui-warning">⚠️ </span>'; colorClass = 'text-ui-warning'; }
        if (type === 'system') { icon = 'ℹ️ '; }

        logEntry.className = `p-1 ${colorClass}`;
        logEntry.innerHTML = `<span class="font-mono text-xs text-ui-text-secondary">[${timestamp}]</span> ${icon}${message}`;
        eventLog.prepend(logEntry);
        if (eventLog.children.length > 50) eventLog.lastChild.remove();
    }

    ladleSelectEl.addEventListener('change', displaySelectedLadleJourney);
    
    const footerHTML = `
        <footer class="mt-12 pt-8 border-t" style="border-color: var(--ui-border);">
            <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
                <div class="space-y-4">
                    <h2 class="text-2xl font-bold text-ui-accent tracking-wider">STEEL FLOW</h2>
                    <p class="text-ui-text-secondary">An automated system for tracking hot metal and steel by capturing ladle numbers to display real-time location.</p>
                    <div class="card p-4 flex items-center space-x-4 max-w-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 18" width="40"><path fill="#f93" d="M0 0h27v6H0z"/><path fill="#fff" d="M0 6h27v6H0z"/><path fill="#128807" d="M0 12h27v6H0z"/><path fill="#000080" d="M13.5 9a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5z"/><path fill="#fff" d="M13.5 7.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z"/></svg>
                        <div><p class="font-semibold">Ministry of Steel</p><p class="text-xs text-ui-text-secondary">Government of India</p></div>
                    </div>
                </div>
                <div class="space-y-4 md:mx-auto">
                    <h3 class="font-bold tracking-wider uppercase">Explore</h3>
                    <ul class="space-y-2 text-ui-text-secondary">
                        <li><a href="#" class="footer-nav-dashboard hover:text-ui-accent">Live Dashboard</a></li>
                        <li><a href="#" class="footer-nav-proposal hover:text-ui-accent">Project Proposal</a></li>
                    </ul>
                </div>
                <div class="card p-6">
                    <h3 class="font-bold tracking-wider uppercase">Contact Team Steel Flow</h3>
                    <div class="mt-4 space-y-2 text-ui-text-secondary">
                        <p><strong>PS ID:</strong> SIH25187</p>
                        <p>SSGMCE, Shegaon, Maharashtra, India</p>
                        <a href="mailto:tayadeatharva12@email.com" class="text-ui-accent hover:underline">tayadeatharva12@email.com</a>
                    </div>
                    <h3 class="font-bold tracking-wider uppercase mt-6">Stay Updated</h3>
                    <div class="mt-2 flex">
                        <input type="email" id="subscribe-email" placeholder="your.email@domain.com" class="w-full bg-gray-900 border-gray-600 rounded-l-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-ui-accent text-sm">
                        <button id="subscribe-button" class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-r-md transition-colors text-sm">Subscribe</button>
                    </div>
                </div>
            </div>
            <div class="mt-8 pt-4 border-t" style="border-color: var(--ui-border);"><div class="text-center text-xs text-ui-text-secondary"><p>© 2025 Steel Flow • Smart India Hackathon 2025</p><p class="mt-1">Developed by <span class="font-semibold">Team Steel Flow</span></p></div></div>
        </footer>`;
    appFooter.innerHTML = footerHTML;

    // --- NEW FOOTER INTERACTIVITY ---
    function setupFooterInteractivity() {
        // Dashboard/Proposal links in footer
        document.querySelectorAll('.footer-nav-dashboard').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); showPage(pageDashboard, navDashboard) }));
        document.querySelectorAll('.footer-nav-proposal').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); showPage(pageProposal, navProposal) }));

        // Subscription form logic
        const subscribeButton = document.getElementById('subscribe-button');
        const subscribeEmail = document.getElementById('subscribe-email');

        if (subscribeButton && subscribeEmail) {
            subscribeButton.addEventListener('click', () => {
                const email = subscribeEmail.value;
                // Simple email validation
                if (email && email.includes('@')) {
                    subscribeButton.textContent = 'Subscribed!';
                    subscribeButton.style.backgroundColor = 'var(--ui-success)';
                    subscribeButton.disabled = true;
                    subscribeEmail.value = '';
                } else {
                    // Optional: Add feedback for invalid email
                    subscribeEmail.style.outline = '1px solid var(--ui-warning)';
                    setTimeout(() => {
                        subscribeEmail.style.outline = 'none';
                    }, 2000);
                }
            });
        }
    }
    
    setupFooterInteractivity();
});


