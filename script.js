const allMaps = [
    "Ascent", "Breeze", "Lotus", "Split", "Pearl",
    "Haven", "Fracture", "Bind", "Abyss", "Corrode", "Sunset"
];

const defaultPool = [
    "Ascent", "Breeze", "Lotus", "Split", "Pearl", "Haven", "Fracture"
];

const agentsByClass = {
    Duelists:    ["jett", "raze", "reyna", "phoenix", "neon", "iso", "yoru", "waylay"],
    Controllers: ["astra", "brimstone", "clove", "harbor", "omen", "viper"],
    Initiators:  ["breach", "fade", "gekko", "kayo", "skye", "sova", "tejo"],
    Sentinels:   ["chamber", "cypher", "deadlock", "killjoy", "sage", "vyse", "miks", "veto"]
};

let mapPool   = JSON.parse(localStorage.getItem("mapPool")) || defaultPool;
let comps     = migrateComps(JSON.parse(localStorage.getItem("comps")) || {});
let bannedMap = localStorage.getItem("bannedMap") || "";
let currentMap  = null;
let activePlayer = 1;

function migrateComps(raw) {
    const out = {};
    for (const [map, comp] of Object.entries(raw)) {
        if (Array.isArray(comp)) {
            const obj = {};
            comp.forEach((agent, i) => { if (agent) obj[i + 1] = agent; });
            out[map] = obj;
        } else {
            out[map] = comp || {};
        }
    }
    return out;
}

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function saveComps() {
    localStorage.setItem("comps", JSON.stringify(comps));
}

function nextEmptySlot(comp) {
    for (let i = 1; i <= 5; i++) {
        if (!comp[i]) return i;
    }
    return 1;
}

// ── Page init ────────────────────────────────────────────────
if (document.getElementById("map-list"))              renderBuilder();
if (document.getElementById("saved-comps-container")) renderSavedComps();
if (document.getElementById("settings-maps"))         renderSettings();

// ── Builder ──────────────────────────────────────────────────
function renderBuilder() {
    const mapList       = document.getElementById("map-list");
    const banSelect     = document.getElementById("ban-select");
    const agentSections = document.getElementById("agent-sections");
    const saveBtn       = document.getElementById("save-btn");

    // Map buttons
    mapList.innerHTML = "";
    mapPool.forEach(map => {
        const btn = document.createElement("button");
        btn.classList.add("map-btn");
        btn.innerText = map;
        btn.addEventListener("click", () => {
            currentMap = map;
            document.querySelectorAll(".map-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById("current-map").innerText = map;
            activePlayer = nextEmptySlot(comps[currentMap] || {});
            if (saveBtn) saveBtn.disabled = false;
            renderPlayerSlots();
            updateBorders();
        });
        mapList.appendChild(btn);
    });

    // Ban dropdown
    banSelect.innerHTML = `<option value="">None</option>`;
    mapPool.forEach(map => {
        const opt = document.createElement("option");
        opt.value = map;
        opt.innerText = map;
        if (map === bannedMap) opt.selected = true;
        banSelect.appendChild(opt);
    });
    banSelect.addEventListener("change", () => {
        bannedMap = banSelect.value;
        localStorage.setItem("bannedMap", bannedMap);
    });

    // Save & clear button
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            if (!currentMap) return;
            saveBtn.textContent = "Saved ✓";
            saveBtn.classList.add("saved");
            setTimeout(() => {
                currentMap = null;
                activePlayer = 1;
                document.querySelectorAll(".map-btn").forEach(b => b.classList.remove("active"));
                document.getElementById("current-map").textContent = "Select a Map";
                saveBtn.textContent = "Save Comp";
                saveBtn.classList.remove("saved");
                saveBtn.disabled = true;
                renderPlayerSlots();
                updateBorders();
            }, 700);
        });
    }

    // Agent grid
    agentSections.innerHTML = "";
    Object.entries(agentsByClass).forEach(([role, agents]) => {
        const section = document.createElement("div");
        section.classList.add("agent-section");
        section.innerHTML = `<h2>${role}</h2><div class="agent-grid"></div>`;
        const grid = section.querySelector(".agent-grid");

        agents.forEach(agent => {
            const card = document.createElement("div");
            card.classList.add("agent-card");
            card.dataset.agent = agent;
            card.innerHTML = `
                <img src="agents/${agent}.png" alt="${capitalize(agent)}">
                <div class="agent-name">${capitalize(agent)}</div>
            `;
            card.addEventListener("click", () => handleAgentClick(agent));
            grid.appendChild(card);
        });

        agentSections.appendChild(section);
    });

    renderPlayerSlots();
}

function handleAgentClick(agent) {
    if (!currentMap) {
        alert("Select a map first");
        return;
    }

    const comp = comps[currentMap] || {};

    if (comp[activePlayer] === agent) {
        delete comp[activePlayer];
    } else {
        for (const p in comp) {
            if (comp[p] === agent) delete comp[p];
        }
        comp[activePlayer] = agent;
        activePlayer = nextEmptySlot(comp);
    }

    comps[currentMap] = comp;
    saveComps();
    renderPlayerSlots();
    updateBorders();
}

function renderPlayerSlots() {
    const container = document.getElementById("player-slots");
    if (!container) return;

    container.innerHTML = "";
    const comp = currentMap ? (comps[currentMap] || {}) : {};

    for (let i = 1; i <= 5; i++) {
        const slot = document.createElement("div");
        slot.classList.add("player-slot");
        if (i === activePlayer) slot.classList.add("active");

        const agent = comp[i];
        slot.innerHTML = `
            <div class="player-num">P${i}</div>
            ${agent
                ? `<img src="agents/${agent}.png" alt="${capitalize(agent)}">
                   <div class="player-agent-name">${capitalize(agent)}</div>`
                : `<div class="player-empty">—</div>`
            }
        `;

        slot.addEventListener("click", () => {
            activePlayer = i;
            document.querySelectorAll(".player-slot").forEach(s => s.classList.remove("active"));
            slot.classList.add("active");
        });

        container.appendChild(slot);
    }
}

function updateBorders() {
    const comp = currentMap ? (comps[currentMap] || {}) : {};
    const assigned = new Set(Object.values(comp));
    document.querySelectorAll(".agent-card").forEach(card => {
        card.classList.toggle("selected", assigned.has(card.dataset.agent));
    });
}

// ── Saved Comps ──────────────────────────────────────────────
function renderSavedComps() {
    const container = document.getElementById("saved-comps-container");

    const dlBtn = document.getElementById("download-all-btn");
    if (dlBtn) dlBtn.addEventListener("click", downloadAllComps);

    mapPool.forEach(map => {
        const comp = comps[map] || {};
        const card = document.createElement("div");
        card.classList.add("saved-comp");

        let agentsHtml = "";
        for (let i = 1; i <= 5; i++) {
            const agent = comp[i];
            agentsHtml += `
                <div class="saved-player">
                    <div class="saved-player-num">P${i}</div>
                    ${agent
                        ? `<img src="agents/${agent}.png" alt="${capitalize(agent)}">
                           <div class="saved-agent-name">${capitalize(agent)}</div>`
                        : `<div class="saved-empty">—</div>`
                    }
                </div>
            `;
        }

        card.innerHTML = `
            <h2>${map}${map === bannedMap ? ' <span class="banned-label">(BANNED)</span>' : ''}</h2>
            <div class="saved-agents">${agentsHtml}</div>
        `;

        container.appendChild(card);
    });
}

// ── Download full screenshot (all maps) ──────────────────────
async function downloadAllComps() {
    const btn = document.getElementById("download-all-btn");
    if (btn) { btn.textContent = "Generating…"; btn.disabled = true; }

    const W       = 1200;
    const marginX = 44;
    const cardH   = 160;
    const cardGap = 10;
    const headerH = 96;
    const footerH = 52;
    const maps    = mapPool;

    // Left column (map name area) and right column (player slots)
    const leftColW    = 196;
    const dividerX    = marginX + leftColW;
    const rightStartX = dividerX + 20;
    const rightW      = W - marginX - rightStartX;
    const slotGap     = 10;
    const slotW       = (rightW - 4 * slotGap) / 5;  // ≈ 170px
    const imgSize     = 100;

    const H = headerH + maps.length * (cardH + cardGap) - cardGap + footerH + 16;

    // ── Load all agent images ─────────────────────────────────
    const imgs = {};   // key: `${map}|${slot}`
    await Promise.all(maps.flatMap(map =>
        Array.from({ length: 5 }, (_, k) => {
            const agent = (comps[map] || {})[k + 1];
            if (!agent) return Promise.resolve();
            const key = `${map}|${k + 1}`;
            return new Promise(resolve => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload  = () => { imgs[key] = img; resolve(); };
                img.onerror = () => resolve();
                img.src = `agents/${agent}.png`;
            });
        })
    ));
    await document.fonts.ready;

    const canvas = document.createElement("canvas");
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // ── Background ───────────────────────────────────────────
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, W, H);

    // ── Header ───────────────────────────────────────────────
    // VAC wordmark
    ctx.fillStyle = "#ffffff";
    ctx.font = '900 34px "Archivo Black", Arial';
    ctx.textAlign = "left";
    ctx.fillText("VAC", marginX, 54);
    // Blue bar under VAC
    ctx.fillStyle = "#2f5cff";
    canvasFillRounded(ctx, marginX, 62, 50, 4, 2);
    // Right label
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "500 12px Arial";
    ctx.textAlign = "right";
    ctx.fillText("SAVED COMPS", W - marginX, 54);
    // Separator line
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(marginX, 78, W - marginX * 2, 1);

    // ── Map cards ────────────────────────────────────────────
    maps.forEach((map, idx) => {
        const comp   = comps[map] || {};
        const cardY  = headerH + 8 + idx * (cardH + cardGap);
        const cardX  = marginX;
        const cardW  = W - marginX * 2;
        const isBanned = map === bannedMap;

        // Card background
        ctx.fillStyle = "#141414";
        canvasFillRounded(ctx, cardX, cardY, cardW, cardH, 10);

        // Left accent bar (red if banned, blue otherwise)
        ctx.fillStyle = isBanned ? "#ff4655" : "#2f5cff";
        canvasFillRounded(ctx, cardX, cardY, 4, cardH, 2);

        // Map name (vertically centered in left col)
        const midY = cardY + cardH / 2;
        ctx.fillStyle = isBanned ? "#ff6370" : "#ffffff";
        ctx.font = '900 20px "Archivo Black", Arial';
        ctx.textAlign = "left";
        ctx.fillText(map.toUpperCase(), cardX + 16, midY + (isBanned ? -6 : 6));

        if (isBanned) {
            ctx.fillStyle = "#ff4655";
            ctx.font = "600 11px Arial";
            ctx.fillText("BANNED", cardX + 16, midY + 11);
        }

        // Vertical divider
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(dividerX, cardY + 14, 1, cardH - 28);

        // ── Player slots ─────────────────────────────────────
        for (let i = 1; i <= 5; i++) {
            const agent   = comp[i];
            const slotX   = rightStartX + (i - 1) * (slotW + slotGap);
            const centerX = slotX + slotW / 2;
            const imgX    = centerX - imgSize / 2;
            const imgY    = cardY + (cardH - imgSize) / 2 - 8;

            // P# label
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            ctx.font = "500 10px Arial";
            ctx.textAlign = "center";
            ctx.fillText(`P${i}`, centerX, cardY + 16);

            const imgKey = `${map}|${i}`;
            if (imgs[imgKey]) {
                // Rounded agent portrait
                ctx.save();
                ctx.beginPath();
                canvasRoundedPath(ctx, imgX, imgY, imgSize, imgSize, 8);
                ctx.clip();
                ctx.drawImage(imgs[imgKey], imgX, imgY, imgSize, imgSize);
                ctx.restore();

                // Agent name
                ctx.fillStyle = "rgba(255,255,255,0.75)";
                ctx.font = "500 11px Arial";
                ctx.textAlign = "center";
                ctx.fillText(capitalize(agent), centerX, imgY + imgSize + 13);
            } else {
                // Empty slot placeholder
                ctx.strokeStyle = "rgba(255,255,255,0.08)";
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 4]);
                ctx.beginPath();
                canvasRoundedPath(ctx, imgX, imgY, imgSize, imgSize, 8);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    });

    // ── Footer ───────────────────────────────────────────────
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(marginX, H - footerH + 8, W - marginX * 2, 1);

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = '900 15px "Archivo Black", Arial';
    ctx.textAlign = "center";
    ctx.fillText("VAC", W / 2, H - 22);

    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.font = "500 10px Arial";
    ctx.fillText("VALORANT · AGENT · COMPS", W / 2, H - 8);

    // ── Trigger download ─────────────────────────────────────
    const link = document.createElement("a");
    link.download = "VAC-comps.png";
    link.href = canvas.toDataURL("image/png");
    link.click();

    if (btn) { btn.textContent = "Download Screenshot"; btn.disabled = false; }
}

function canvasFillRounded(ctx, x, y, w, h, r) {
    ctx.beginPath();
    canvasRoundedPath(ctx, x, y, w, h, r);
    ctx.fill();
}

function canvasRoundedPath(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ── Settings ─────────────────────────────────────────────────
function renderSettings() {
    const container = document.getElementById("settings-maps");

    allMaps.forEach(map => {
        const div = document.createElement("div");
        div.classList.add("setting-map");
        const checked = mapPool.includes(map) ? "checked" : "";
        div.innerHTML = `
            <input type="checkbox" ${checked} id="${map}">
            <label for="${map}">${map}</label>
        `;
        const checkbox = div.querySelector("input");
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                mapPool.push(map);
            } else {
                mapPool = mapPool.filter(m => m !== map);
            }
            localStorage.setItem("mapPool", JSON.stringify(mapPool));
        });
        container.appendChild(div);
    });
}
