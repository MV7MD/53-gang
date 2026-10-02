const sponsorsData = [
    { name: "KHALED NASHY", role: "SPONSOR", img: "assets/khaled.jpg" },
    { name: "RAMZY", role: "SPONSOR", img: "assets/ramzy.jpg" },
    { name: "FAHD", role: "ORGANIZER", img: "assets/fahd.jpg" },
    { name: "JUSTIN", role: "ORGANIZER", img: "assets/justin.jpg" }
];

const defaultState = { teams: [], remainingTeams: [], totalRounds: 0, isGenerated: false, slots: {}, nextWingToggle: "L" };
let appState = JSON.parse(localStorage.getItem("53GangFinalV13")) || defaultState;
let currentlyDrawnTeam = "";
let currentTargetSlotId = "";
let isShuffling = false;
let panzoomInstance = null; 

document.addEventListener("DOMContentLoaded", () => {
    renderSponsors();
    document.getElementById('teamInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') addTeam(); });

    if (appState.isGenerated) {
        document.getElementById('setup-panel').classList.add('opacity-40', 'pointer-events-none');
        document.getElementById('bracket').classList.remove('hidden');
        document.getElementById('bracket').classList.add('flex');
        rebuildBracketHTML();
        applySavedSlots();
        renderInnerPapers();
        initPanZoom(); 

        if (sessionStorage.getItem('autoScrollToDraw')) {
            sessionStorage.removeItem('autoScrollToDraw');
            setTimeout(() => {
                document.getElementById('draw').scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
    }
    updateSetupUI();
    updateDrawUI();
});

function saveState() { localStorage.setItem("53GangFinalV13", JSON.stringify(appState)); }

function resetTournament() {
    if (confirm("RESET TOURNAMENT AND DELETE ALL DATA?")) {
        localStorage.removeItem("53GangFinalV13");
        location.reload();
    }
}

function renderSponsors() {
    const container = document.getElementById('sponsors-container');
    container.innerHTML = sponsorsData.map(p => `
        <div class="bg-[#121212] border border-white/10 rounded-2xl p-8 flex flex-col items-center w-64 hover:border-[#e50914]/50 transition-all group">
            <div class="relative w-28 h-28 flex items-center justify-center mb-6">
                <div class="absolute inset-0 rounded-full border-2 border-dashed border-[#e50914]/30 group-hover:rotate-180 transition-transform duration-1000 pointer-events-none"></div>
                <img src="${p.img}" class="w-24 h-24 rounded-full object-cover filter grayscale group-hover:grayscale-0 transition-all border border-[#e50914]/30" alt="${p.name}" onerror="this.src='https://ui-avatars.com/api/?name=${p.name.charAt(0)}&background=e50914&color=fff'">
            </div>
            <h3 class="text-xl font-bold uppercase text-[#f5f5f3]">${p.name}</h3>
            <span class="text-[10px] text-[#e50914] font-bold font-['Roboto_Mono'] tracking-widest mt-1">${p.role}</span>
        </div>
    `).join('');
}

function addTeam() {
    const input = document.getElementById('teamInput');
    const name = input.value.trim().toUpperCase();
    if (name && !appState.teams.includes(name)) {
        appState.teams.push(name);
        input.value = '';
        saveState();
        updateSetupUI();
        renderInnerPapers();
    }
}

function removeTeam(index) {
    appState.teams.splice(index, 1);
    saveState();
    updateSetupUI();
    renderInnerPapers();
}

function updateSetupUI() {
    const list = document.getElementById('teamList');
    document.getElementById('team-count').innerText = `${appState.teams.length} SLOTS OCCUPIED`;
    
    if (appState.teams.length === 0) {
        list.innerHTML = `<p class="text-zinc-600 text-xs text-center py-10 uppercase tracking-widest">No teams added yet.</p>`;
    } else {
        list.innerHTML = appState.teams.map((t, i) => `
            <div class="bg-black border border-white/5 flex h-12 items-center justify-between px-4 rounded-md shrink-0">
              <div class="flex gap-4 items-center">
                <span class="font-['Roboto_Mono'] text-zinc-600 text-xs">${i < 9 ? '0'+(i+1) : i+1}</span>
                <span class="font-bold text-white text-sm uppercase">${t}</span>
              </div>
              <button onclick="removeTeam(${i})" class="w-4 h-4 text-zinc-500 hover:text-red-500"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `).join('');
    }

    const btn = document.getElementById('generateBtn');
    if (appState.teams.length >= 2) {
        btn.classList.remove('opacity-40', 'pointer-events-none');
        btn.classList.add('hover:bg-white', 'hover:text-black');
    } else {
        btn.classList.add('opacity-40', 'pointer-events-none');
        btn.classList.remove('hover:bg-white', 'hover:text-black');
    }
}

function renderInnerPapers() {
    const container = document.getElementById('papers-container');
    if(!container) return;
    container.innerHTML = '';
    const listToRender = appState.isGenerated ? appState.remainingTeams : appState.teams;
    listToRender.forEach((team) => {
        const paper = document.createElement('div');
        paper.className = 'mini-paper';
        const randomX = (Math.random() - 0.5) * 160; 
        const randomY = Math.random() * 50; 
        const rotation = Math.random() * 360;
        paper.style.transform = `translate(calc(-50% + ${randomX}px), -${randomY}px) rotate(${rotation}deg)`;
        paper.innerText = appState.isGenerated ? "???" : team.substring(0, 5);
        container.appendChild(paper);
    });
}

function generateTournament() {
    if (appState.teams.length < 2) return;
    
    const nextPow2 = Math.max(4, Math.pow(2, Math.ceil(Math.log2(appState.teams.length))));
    appState.isGenerated = true;
    appState.remainingTeams = [...appState.teams];
    appState.totalRounds = Math.log2(nextPow2);
    appState.slots = {};
    appState.nextWingToggle = "L";
    saveState();

    sessionStorage.setItem('autoScrollToDraw', 'true');
    location.reload();
}

// ===================== نظام الزوم والشاشة الكاملة =====================
function initPanZoom() {
    setTimeout(() => {
        const container = document.getElementById('bracket-container');
        const wrapper = document.getElementById('bracket-wrapper');
        
        if (!container || !wrapper) return;

        if (panzoomInstance) {
            panzoomInstance.destroy();
            panzoomInstance = null;
        }

        container.style.transform = '';

        panzoomInstance = Panzoom(container, {
            maxScale: 3,
            minScale: 0.05, 
            contain: false, 
            cursor: 'grab'
        });

        resetZoomBracket();

        wrapper.removeEventListener('wheel', handleWheel);
        wrapper.addEventListener('wheel', handleWheel, { passive: false });
    }, 150); 
}

function handleWheel(e) {
    e.preventDefault();
    if (panzoomInstance) panzoomInstance.zoomWithWheel(e);
}

function zoomInBracket() { if (panzoomInstance) panzoomInstance.zoomIn(); }
function zoomOutBracket() { if (panzoomInstance) panzoomInstance.zoomOut(); }

function resetZoomBracket() {
    if (panzoomInstance) {
        const container = document.getElementById('bracket-container');
        const wrapper = document.getElementById('bracket-wrapper');
        
        if (container && wrapper) {
            const bracketWidth = container.offsetWidth;
            const bracketHeight = container.offsetHeight;
            const windowWidth = wrapper.offsetWidth;
            const windowHeight = wrapper.offsetHeight;
            
            panzoomInstance.reset();
            
            let initialScale = 1;
            if (bracketWidth > windowWidth - 100 || bracketHeight > windowHeight - 100) {
                const scaleX = (windowWidth - 100) / bracketWidth;
                const scaleY = (windowHeight - 100) / bracketHeight;
                initialScale = Math.min(scaleX, scaleY);
                panzoomInstance.zoom(initialScale, { animate: false });
            }
            
            setTimeout(() => {
                const panX = (windowWidth - bracketWidth) / 2;
                const panY = (windowHeight - bracketHeight) / 2;
                panzoomInstance.pan(panX, panY, { animate: true });
            }, 10);
        }
    }
}

// دالة الشاشة الكاملة (Fullscreen) عشان الستريمر
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// مراقب تغيير الشاشة الكاملة (عشان لما يدوس ESC يرجع كل حاجة زي ما كانت)
document.addEventListener('fullscreenchange', () => {
    const icon = document.getElementById('fs-icon');
    const wrapper = document.getElementById('bracket-wrapper');
    const bracketSection = document.getElementById('bracket');
    
    // السكاشن اللي هنخفيها
    const elementsToHide = [
        document.getElementById('main-nav'),
        document.getElementById('home'),
        document.getElementById('sponsors-section'),
        document.getElementById('dashboard'),
        document.getElementById('bracket-title'),
        document.getElementById('main-footer')
    ];

    if (document.fullscreenElement) {
        // جوه الـ Fullscreen
        icon.classList.replace('fa-expand', 'fa-compress');
        wrapper.classList.replace('h-[75vh]', 'h-screen');
        bracketSection.classList.remove('py-24', 'border-t');
        elementsToHide.forEach(el => { if (el) el.style.display = 'none'; });
    } else {
        // خروج من الـ Fullscreen
        icon.classList.replace('fa-compress', 'fa-expand');
        wrapper.classList.replace('h-screen', 'h-[75vh]');
        bracketSection.classList.add('py-24', 'border-t');
        elementsToHide.forEach(el => { if (el) el.style.display = ''; });
    }
    
    // تظبيط الزوم أوتوماتيك بعد تغيير حجم الشاشة
    setTimeout(resetZoomBracket, 100);
});
// =======================================================================

function updateDrawUI() {
    const statusText = document.getElementById('machine-status-text');
    const remainingText = document.getElementById('machine-remaining-text');
    const card = document.getElementById('draw-machine-card');

    if (appState.isGenerated) {
        if (appState.remainingTeams.length === 0) {
            statusText.innerText = "COMPLETE";
            statusText.classList.replace('text-white', 'text-green-500');
            remainingText.innerText = "ALL SLOTS FILLED";
            card.classList.add('opacity-50', 'pointer-events-none');
        } else {
            statusText.innerText = "CLICK TO DRAW";
            statusText.classList.replace('text-green-500', 'text-white');
            remainingText.innerText = `REMAINING: ${appState.remainingTeams.length} TEAMS`;
            card.classList.remove('opacity-50', 'pointer-events-none');
        }
    }
}

function drawTeam() {
    if (appState.remainingTeams.length === 0 || !appState.isGenerated || isShuffling) return;
    
    isShuffling = true;
    const bowl = document.getElementById('draw-machine-card');
    bowl.classList.add('shake');

    setTimeout(() => {
        bowl.classList.remove('shake');

        const randomIndex = Math.floor(Math.random() * appState.remainingTeams.length);
        currentlyDrawnTeam = appState.remainingTeams[randomIndex];
        appState.remainingTeams.splice(randomIndex, 1);
        
        saveState();
        updateDrawUI();
        renderInnerPapers(); 

        const matchesPerWing = Math.pow(2, appState.totalRounds) / 4;
        let targetId = "";
        let targetW = appState.nextWingToggle;

        for (let m = 0; m < matchesPerWing; m++) {
            for (let p = 0; p <= 1; p++) {
                const id = `slot-${targetW}-0-${m}-${p}`;
                if (!appState.slots[id]) { targetId = id; break; }
            }
            if (targetId) break;
        }

        if (!targetId) {
            targetW = targetW === "L" ? "R" : "L";
            for (let m = 0; m < matchesPerWing; m++) {
                for (let p = 0; p <= 1; p++) {
                    const id = `slot-${targetW}-0-${m}-${p}`;
                    if (!appState.slots[id]) { targetId = id; break; }
                }
                if (targetId) break;
            }
        }

        currentTargetSlotId = targetId;
        appState.nextWingToggle = targetW === "L" ? "R" : "L";
        saveState();

        const overlay = document.getElementById('drop-overlay');
        const legendaryCard = document.getElementById('legendary-card');
        const teamNameEl = document.getElementById('drawn-team-name');
        const boxRect = bowl.getBoundingClientRect();

        teamNameEl.innerText = currentlyDrawnTeam;
        teamNameEl.style.fontSize = "16px";

        legendaryCard.style.transition = 'none';
        legendaryCard.style.position = 'fixed';
        legendaryCard.style.left = `${boxRect.left + boxRect.width / 2}px`;
        legendaryCard.style.top = `${boxRect.top + boxRect.height / 2}px`;
        legendaryCard.style.width = '80px';
        legendaryCard.style.height = '40px';
        legendaryCard.style.transform = 'translate(-50%, -50%) scale(0.1)';
        legendaryCard.style.opacity = '0';
        legendaryCard.style.borderRadius = '30px'; 

        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                overlay.classList.remove('opacity-0');
                overlay.classList.add('opacity-100');

                legendaryCard.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                legendaryCard.style.left = '50%';
                legendaryCard.style.top = '50%';
                legendaryCard.style.width = '280px'; 
                legendaryCard.style.height = '90px'; 
                legendaryCard.style.transform = 'translate(-50%, -50%) scale(1)';
                legendaryCard.style.opacity = '1';
                teamNameEl.style.fontSize = '28px';

                setTimeout(() => { isShuffling = false; }, 600);
            });
        });

    }, 500);
}

function assignSlot() {
    if (!currentlyDrawnTeam || !currentTargetSlotId) return;

    const targetSlot = document.getElementById(currentTargetSlotId);
    if (!targetSlot) return;

    // مش بنعمل سكرول لو الستريمر في وضع الشاشة الكاملة
    if (!document.fullscreenElement) {
        document.getElementById('bracket').scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const overlay = document.getElementById('drop-overlay');
    const legendaryCard = document.getElementById('legendary-card');
    const teamNameEl = document.getElementById('drawn-team-name');

    document.getElementById('overlay-text-container').style.opacity = '0';
    overlay.style.backgroundColor = 'transparent';
    overlay.style.backdropFilter = 'none';

    setTimeout(() => {
        const rect = targetSlot.getBoundingClientRect();

        legendaryCard.style.transition = 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
        legendaryCard.style.left = `${rect.left + rect.width / 2}px`;
        legendaryCard.style.top = `${rect.top + rect.height / 2}px`;
        legendaryCard.style.width = `${rect.width}px`;
        legendaryCard.style.height = `${rect.height}px`;
        legendaryCard.style.borderRadius = '6px';
        legendaryCard.style.borderWidth = '0px';

        teamNameEl.style.transition = 'all 0.8s';
        teamNameEl.style.fontSize = '12px';

        setTimeout(() => {
            appState.slots[currentTargetSlotId] = { name: currentlyDrawnTeam, status: "filled" };
            saveState();
            applySavedSlots();

            overlay.classList.remove('flex');
            overlay.classList.add('hidden');
            overlay.classList.remove('opacity-100');
            overlay.classList.add('opacity-0');

            document.getElementById('overlay-text-container').style.opacity = '1';
            overlay.style.backgroundColor = '';
            overlay.style.backdropFilter = '';
            teamNameEl.style.fontSize = '';
            legendaryCard.style.borderWidth = '';
            legendaryCard.style.borderRadius = '';

            currentlyDrawnTeam = "";
            currentTargetSlotId = "";
        }, 800);
    }, 300);
}

function rebuildBracketHTML() {
    const container = document.getElementById('bracket-container');
    container.innerHTML = '';
    
    const tr = appState.totalRounds;
    const nextPow2 = Math.pow(2, tr);
    const maxMatches = nextPow2 / 4;
    const colHeight = Math.max(500, maxMatches * 100); 

    const createMatch = (wing, r, m) => `
        <div class="bg-[#151515] border border-[#7d050b] rounded-lg shadow-[0_0_20px_rgba(229,9,20,0.2)] w-[180px] relative shrink-0">
            ${r < tr - 1 ? `<div class="absolute top-1/2 ${wing === 'L' ? '-right-[40px]' : '-left-[40px]'} w-[40px] h-px bg-[#e50914]/40 z-[-1]"></div>` : ''}
            <div class="bg-[#050505] flex h-7 items-center justify-between px-3 rounded-t-lg border-b border-[#242428]">
                ${wing === 'R' ? '<i class="fa-solid fa-circle text-[5px] text-[#e50914]"></i>' : ''}
                <span class="font-['Roboto_Mono'] text-[#e50914] text-[9px] uppercase">${r === tr - 2 ? 'SEMI FINAL' : `MATCH 0${wing === 'L' ? m+1 : m + maxMatches + 1}`}</span>
                ${wing === 'L' ? '<i class="fa-solid fa-circle text-[5px] text-[#e50914]"></i>' : ''}
            </div>
            ${[0, 1].map(p => `
                <div id="slot-${wing}-${r}-${m}-${p}" onclick="advanceSlot('${wing}',${r}, ${m},${p})" class="slot flex ${wing==='R'?'flex-row-reverse':''} items-center justify-between h-[38px] px-3 border-b border-[#242428] cursor-pointer text-zinc-500 hover:bg-white/5 transition-all">
                    <div class="flex ${wing==='R'?'flex-row-reverse':''} items-center gap-2 truncate w-full">
                        <i class="fa-solid fa-shield text-[10px] shrink-0"></i>
                        <span class="font-bold text-[11px] uppercase truncate ${wing==='R'?'text-right':''} w-full">TBD</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    const leftWing = document.createElement('div');
    leftWing.className = 'flex gap-10 z-10';
    for (let r = 0; r < tr - 1; r++) {
        let matches = (nextPow2 / 4) / Math.pow(2, r);
        let col = document.createElement('div');
        col.className = 'flex flex-col justify-around z-10';
        col.style.height = `${colHeight}px`;
        for (let m = 0; m < matches; m++) { col.innerHTML += createMatch('L', r, m); }
        leftWing.appendChild(col);
    }

    const centerArea = document.createElement('div');
    centerArea.className = 'flex flex-col items-center justify-center gap-[20px] relative z-20 mx-4 shrink-0';
    centerArea.style.height = `${colHeight}px`;
    centerArea.innerHTML = `
        <div id="champion-slot" class="w-full flex items-center justify-center relative z-30 mb-[-20px] h-[60px]"></div>
        
        <div class="bg-[#e50914]/5 border border-[#7d050b] flex flex-col gap-[12px] h-[260px] items-center justify-center rounded-[28px] shadow-[0_0_40px_rgba(229,9,20,0.3)] w-[180px] relative overflow-hidden shrink-0 mt-4">
            <img src="assets/trophy.png" class="absolute w-[200px] h-[200px] object-cover opacity-80" alt="trophy" onerror="this.style.display='none'">
            <div class="relative z-10 flex flex-col items-center mt-32 text-center" id="champion-display">
                <span class="font-['Roboto_Mono'] text-[#e50914] text-[9px] mb-1">CHAMPIONSHIP</span>
                <span class="font-bold text-white text-[20px] leading-tight">FIGHT NIGHT<br>CUP</span>
            </div>
        </div>
        <div class="flex gap-[16px] items-center mt-4 shrink-0">
            <div id="slot-Final-L" onclick="advanceFinal('L')" class="bg-[#151515] border border-[#7d050b] rounded px-4 py-2 font-bold text-[12px] uppercase w-[130px] text-center truncate cursor-pointer text-[#73747b] hover:bg-white/5 transition-colors">TBD</div>
            <span class="font-black text-[#52525b] text-xl">VS</span>
            <div id="slot-Final-R" onclick="advanceFinal('R')" class="bg-[#151515] border border-[#7d050b] rounded px-4 py-2 font-bold text-[12px] uppercase w-[130px] text-center truncate cursor-pointer text-[#73747b] hover:bg-white/5 transition-colors">TBD</div>
        </div>
    `;

    const rightWing = document.createElement('div');
    rightWing.className = 'flex flex-row-reverse gap-10 z-10';
    for (let r = 0; r < tr - 1; r++) {
        let matches = (nextPow2 / 4) / Math.pow(2, r);
        let col = document.createElement('div');
        col.className = 'flex flex-col justify-around z-10';
        col.style.height = `${colHeight}px`;
        for (let m = 0; m < matches; m++) { col.innerHTML += createMatch('R', r, m); }
        rightWing.appendChild(col);
    }

    container.appendChild(leftWing);
    if(tr > 1) {
        const lineL = document.createElement('div'); lineL.className = "h-px w-[40px] bg-[#7d050b] shrink-0"; container.appendChild(lineL);
    }
    container.appendChild(centerArea);
    if(tr > 1) {
        const lineR = document.createElement('div'); lineR.className = "h-px w-[40px] bg-[#7d050b] shrink-0"; container.appendChild(lineR);
    }
    container.appendChild(rightWing);
}

function applySavedSlots() {
    for (const [id, data] of Object.entries(appState.slots)) {
        const el = document.getElementById(id);
        if (!el && id !== 'slot-Champion') continue;

        if (id === 'slot-Champion') {
            document.getElementById('champion-slot').innerHTML = `
                <div class="bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 p-[2px] rounded-xl shadow-[0_0_30px_rgba(234,179,8,0.6)] w-full">
                    <div class="bg-black/90 rounded-[10px] px-4 py-3 flex items-center justify-center h-full">
                        <span class="font-black text-yellow-400 text-[18px] text-center uppercase tracking-widest">${data.name}</span>
                    </div>
                </div>
            `;
            // لم نعد نمسح كلمة FIGHT NIGHT CUP
            continue;
        }

        if (id.includes('Final')) {
            el.innerText = data.name;
            if (data.status === 'filled') {
                el.className = `bg-[#e50914]/10 border border-[#e50914] rounded px-4 py-2 font-bold text-[12px] uppercase w-[130px] text-center truncate cursor-pointer text-white transition-colors`;
            } else if (data.status === 'eliminated') {
                el.className = `bg-[#151515] border border-[#7d050b] rounded px-4 py-2 font-bold text-[12px] uppercase w-[130px] text-center truncate cursor-pointer text-zinc-600 opacity-30 line-through transition-colors`;
            }
            continue;
        }

        const span = el.querySelector('span');
        if(!span) continue;
        span.innerText = data.name;
        
        if (data.status === 'filled') {
            span.classList.remove('text-[#73747b]', 'text-zinc-500');
            span.classList.add('text-white');
            el.classList.add('bg-[#e50914]/10');
            if (id.includes('-L-')) el.classList.add('border-l-4', 'border-l-[#e50914]');
            if (id.includes('-R-')) el.classList.add('border-r-4', 'border-r-[#e50914]');
            el.classList.remove('opacity-30', 'line-through');
        } else if (data.status === 'eliminated') {
            el.classList.add('opacity-30', 'line-through');
            span.classList.remove('text-white');
            span.classList.add('text-zinc-500');
            el.classList.remove('bg-[#e50914]/10', 'border-l-4', 'border-r-4', 'border-[#e50914]', 'border-l-[#e50914]', 'border-r-[#e50914]');
        }
    }
}

function advanceSlot(wing, r, m, p) {
    const currentId = `slot-${wing}-${r}-${m}-${p}`;
    const currentData = appState.slots[currentId];
    if (!currentData || currentData.status === "eliminated") return;

    const oppPos = p === 0 ? 1 : 0;
    const oppId = `slot-${wing}-${r}-${m}-${oppPos}`;
    const nextR = r + 1;
    let nextId = nextR === appState.totalRounds - 1 ? `slot-Final-${wing}` : `slot-${wing}-${nextR}-${Math.floor(m / 2)}-${m % 2}`;

    if (appState.slots[oppId] && appState.slots[oppId].status === "filled") {
        appState.slots[oppId].status = "eliminated";
    }
    appState.slots[nextId] = { name: currentData.name, status: "filled" };
    
    saveState();
    applySavedSlots();
}

function fireConfetti() {
    var duration = 3 * 1000;
    var end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 5, angle: 60, spread: 55, origin: { x: 0 },
            colors: ["#e50914", "#ffffff", "#eab308"], zIndex: 99999
        });
        confetti({
            particleCount: 5, angle: 120, spread: 55, origin: { x: 1 },
            colors: ["#e50914", "#ffffff", "#eab308"], zIndex: 99999
        });

        if (Date.now() < end) { requestAnimationFrame(frame); }
    }());
}

function advanceFinal(winningWing) {
    const currentId = `slot-Final-${winningWing}`;
    const currentData = appState.slots[currentId];
    if (!currentData || currentData.status === "eliminated") return;

    const losingWing = winningWing === "L" ? "R" : "L";
    const oppId = `slot-Final-${losingWing}`;

    const sourceEl = document.getElementById(currentId);
    const targetEl = document.getElementById('champion-slot');
    
    if (!sourceEl || !targetEl) return;

    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    sourceEl.style.opacity = '0';

    const flier = document.createElement('div');
    flier.className = "absolute z-[99999] bg-[#151515] border border-[#7d050b] rounded font-bold text-[12px] uppercase text-white flex items-center justify-center shadow-xl overflow-hidden";
    flier.innerText = currentData.name;
    
    // إرفاق الكارت بحاوية الزوم عشان يطير صح حتى لو إنت عامل زوم
    const wrapper = document.getElementById('bracket-wrapper');
    const wrapperRect = wrapper.getBoundingClientRect();
    
    flier.style.left = `${sourceRect.left - wrapperRect.left}px`;
    flier.style.top = `${sourceRect.top - wrapperRect.top}px`;
    flier.style.width = `${sourceRect.width}px`;
    flier.style.height = `${sourceRect.height}px`;
    flier.style.transition = 'all 1s cubic-bezier(0.25, 1, 0.5, 1)';
    wrapper.appendChild(flier);

    setTimeout(() => {
        flier.className = "absolute z-[99999] bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 p-[2px] rounded-xl shadow-[0_0_40px_rgba(234,179,8,0.8)] font-black text-[18px] uppercase text-yellow-400 flex items-center justify-center transition-all duration-1000";
        flier.innerHTML = `<div class="bg-black/90 rounded-[10px] w-full h-full flex items-center justify-center px-4 truncate">${currentData.name}</div>`;
        
        flier.style.left = `${targetRect.left - wrapperRect.left}px`;
        flier.style.top = `${targetRect.top - wrapperRect.top}px`;
        flier.style.width = `${targetRect.width}px`;
        flier.style.height = `${targetRect.height}px`;

        const oppEl = document.getElementById(oppId);
        if (oppEl) {
            oppEl.style.transition = 'all 1s';
            oppEl.style.opacity = '0.3';
            oppEl.style.textDecoration = 'line-through';
        }
    }, 50);

    setTimeout(() => {
        flier.remove();
        
        if (appState.slots[oppId] && appState.slots[oppId].status === "filled") {
            appState.slots[oppId].status = "eliminated";
        }
        appState.slots["slot-Champion"] = { name: currentData.name, status: "champion" };
        
        saveState();
        applySavedSlots();
        fireConfetti(); 
        
        sourceEl.style.opacity = '1'; 
    }, 1050);
}