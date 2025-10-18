// public/script.js
// This script runs in the browser and now includes a self-contained simulation
// for demonstration purposes on platforms like Vercel.

document.addEventListener('DOMContentLoaded', () => {
    // --- PAGE ELEMENTS & NAVIGATION ---
    const navDashboard = document.getElementById('nav-dashboard');
    const navProposal = document.getElementById('nav-proposal');
    const pageDashboard = document.getElementById('dashboard-page');
    const pageProposal = document.getElementById('proposal-page');
    const appFooter = document.getElementById('app-footer');

    const plantAreasContainer = document.getElementById('plant-areas');
    const eventLog = document.getElementById('event-log');
    const totalLadlesEl = document.getElementById('total-ladles');
    const inCirculationLadlesEl = document.getElementById('in-circulation-ladles');
    const maintenanceLadlesEl = document.getElementById('maintenance-ladles');
    const ladleSelectEl = document.getElementById('ladle-select');
    const journeyTimelineEl = document.getElementById('journey-timeline');

    // --- SIMULATION DATA (MOVED FROM SERVER TO CLIENT) ---
    const plantAreas = ['TLC Pit', 'Converter', 'Ladle Prep Bay', 'LF-1', 'RH Unit', 'Caster Machine', 'Slag Dumping', 'Maintenance Yard'];
    const mainSequence = ['Ladle Prep Bay', 'TLC Pit', 'Converter', 'RH Unit', 'LF-1', 'Caster Machine'];
    let ladles = [];
    for (let i = 1; i <= 20; i++) {
        const ladleNumber = 100 + i;
        ladles.push({
            id: `L-${ladleNumber}`,
            number: ladleNumber,
            location: plantAreas[Math.floor(Math.random() * plantAreas.length)],
            journey: []
        });
    }
    ladles.forEach(ladle => {
        ladle.journey.push({
            location: ladle.location,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit'})
        });
    });


    function showPage(pageToShow, navToActivate) {
        pageDashboard.classList.add('hidden');
        pageProposal.classList.add('hidden');
        navDashboard.classList.remove('active');
        navProposal.classList.remove('active');
        pageToShow.classList.remove('hidden');
        navToActivate.classList.add('active');
    }
    
    navDashboard.addEventListener('click', () => showPage(pageDashboard, navDashboard));
    navProposal.addEventListener('click', () => showPage(pageProposal, navProposal));

    // --- UI UPDATE FUNCTIONS ---
    function initializeDashboard() {
        if (!plantAreas || !ladles) return;
        plantAreasContainer.innerHTML = plantAreas.map(area => `<div class="card p-4" id="area-${area.replace(/\s+/g, '-')}"><h3 class="font-semibold text-ui-text-primary">${area}</h3><p class="text-xs mt-1 text-ui-text-secondary">LADLES PRESENT:</p><div class="ladle-list text-ui-text-primary font-semibold mt-2 space-y-1 text-sm"></div></div>`).join('');
        ladleSelectEl.innerHTML = ladles.map(ladle => `<option value="${ladle.id}">${ladle.id}</option>`).join('');
        updateUI();
        displaySelectedLadleJourney();
        logEvent('Running in local simulation mode.', 'system');
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

    // --- CLIENT-SIDE SIMULATION LOGIC ---
    function simulateLadleMovement() {
        if (ladles.length === 0) return;
        const ladleToMove = ladles[Math.floor(Math.random() * ladles.length)];
        const oldLocation = ladleToMove.location;
        let newLocation;
        const currentIndex = mainSequence.indexOf(oldLocation);

        if (oldLocation === 'Maintenance Yard') {
            newLocation = 'Ladle Prep Bay';
        } else if (oldLocation === 'Converter' && Math.random() < 0.25) {
            newLocation = 'Slag Dumping';
        } else if (oldLocation === 'Slag Dumping') {
            newLocation = 'Ladle Prep Bay';
        } else if (currentIndex === mainSequence.length - 1) {
            newLocation = 'Maintenance Yard';
        } else if (currentIndex !== -1) {
            newLocation = mainSequence[currentIndex + 1];
        } else {
            newLocation = 'Ladle Prep Bay';
        }
        
        ladleToMove.location = newLocation;
        ladleToMove.journey.push({ 
            location: newLocation, 
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
        });
        
        const isMatch = Math.random() > 0.1;
        const ocrResult = isMatch ? ladleToMove.number : Math.floor(Math.random() * 900) + 100;
        
        let logMessage;
        if (isMatch) {
            logMessage = `Ladle <span class="font-bold">${ladleToMove.id}</span> moved: ${oldLocation} → <span class="font-bold">${newLocation}</span>. 2FA Match.`;
        } else {
            logMessage = `MISMATCH on Ladle <span class="font-bold">${ladleToMove.id}</span> at ${newLocation}! RFID=${ladleToMove.id}, OCR=${ocrResult}.`;
        }
        logEvent(logMessage, isMatch ? 'success' : 'error');
        
        updateUI();
        if (ladleSelectEl.value === ladleToMove.id) {
            displaySelectedLadleJourney();
        }
    }

    ladleSelectEl.addEventListener('change', displaySelectedLadleJourney);
    
    const footerHTML = `
        <footer class="mt-12 pt-8 border-t" style="border-color: var(--ui-border);">
            <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
                <div class="space-y-4">
                    <h2 class="text-2xl font-bold text-ui-accent tracking-wider">STEEL FLOW</h2>
                    <p class="text-ui-text-secondary">An automated system for tracking hot metal and steel by capturing ladle numbers to display real-time location.</p>
                    <div class="card p-4 flex items-center space-x-4 max-w-xs !bg-white">
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
                <div class="card p-6 !bg-white">
                    <h3 class="font-bold tracking-wider uppercase">Contact Team Steel Flow</h3>
                    <div class="mt-4 space-y-2 text-ui-text-secondary">
                        <p><strong>PS ID:</strong> SIH25187</p>
                        <p>Pune, Maharashtra, India</p>
                        <a href="mailto:sih2025.steelflow@email.com" class="text-ui-accent hover:underline">sih2025.steelflow@email.com</a>
                    </div>
                    <h3 class="font-bold tracking-wider uppercase mt-6">Stay Updated</h3>
                    <div class="mt-2 flex">
                        <input type="email" id="subscribe-email" placeholder="your.email@domain.com" class="w-full bg-gray-100 border-gray-300 rounded-l-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-ui-accent text-sm">
                        <button id="subscribe-button" class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-r-md transition-colors text-sm">Subscribe</button>
                    </div>
                </div>
            </div>
            <div class="mt-8 pt-4 border-t" style="border-color: var(--ui-border);"><div class="text-center text-xs text-ui-text-secondary"><p>© 2025 Steel Flow • Smart India Hackathon 2025</p><p class="mt-1">Developed by <span class="font-semibold">Team Steel Flow</span></p></div></div>
        </footer>`;
    appFooter.innerHTML = footerHTML;

    function setupFooterInteractivity() {
        document.querySelectorAll('.footer-nav-dashboard').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); showPage(pageDashboard, navDashboard) }));
        document.querySelectorAll('.footer-nav-proposal').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); showPage(pageProposal, navProposal) }));

        const subscribeButton = document.getElementById('subscribe-button');
        const subscribeEmail = document.getElementById('subscribe-email');

        if (subscribeButton && subscribeEmail) {
            subscribeButton.addEventListener('click', () => {
                const email = subscribeEmail.value;
                if (email && email.includes('@')) {
                    subscribeButton.textContent = 'Subscribed!';
                    subscribeButton.style.backgroundColor = 'var(--ui-success)';
                    subscribeButton.disabled = true;
                    subscribeEmail.value = '';
                } else {
                    subscribeEmail.style.outline = '1px solid var(--ui-warning)';
                    setTimeout(() => {
                        subscribeEmail.style.outline = 'none';
                    }, 2000);
                }
            });
        }
    }
    
    setupFooterInteractivity();

    // --- START THE SIMULATION ---
    initializeDashboard();
    setInterval(simulateLadleMovement, 3000);
});

