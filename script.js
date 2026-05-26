
const WIN_INDEX = 52;
const STRIP_LENGTH = 60;
const SPIN_DURATION = 8500;

    // weight = относительный шанс выпадения (чем больше число, тем чаще)
const PRIZES = [
    { name: "30 минут",       hours: 0.5, weight: 48, rarity: "common",    icon: "⏳" },
    { name: "1 час",          hours: 1,   weight: 32, rarity: "common",    icon: "🕐" },
    { name: "2 часа",         hours: 2,   weight: 10, rarity: "rare",      icon: "⏰" },
    { name: "3 часа",         hours: 3,   weight: 5,  rarity: "epic",      icon: "⭐" },
    { name: "5 часов",        hours: 5,   weight: 3,  rarity: "legendary", icon: "💎" },
    { name: "10 часов VIP",   hours: 10,  weight: 1,  rarity: "mythical",  icon: "🏆" },
    { name: "24 часа",        hours: 24,  weight: 1,  rarity: "godlike",   icon: "👑" }
];

const rouletteTrack = document.getElementById("rouletteTrack");
const rouletteViewport = document.getElementById("rouletteViewport");
const rouletteWrapper = document.querySelector(".roulette-wrapper");
const openBtn = document.getElementById("openCaseBtn");
const caseIcon = document.getElementById("caseIcon");
const historyList = document.getElementById("historyList");
const resultTitle = document.getElementById("resultTitle");
const resultPrize = document.getElementById("resultPrize");
const prizesLegend = document.getElementById("prizesLegend");

let isSpinning = false;
let activeAnimation = null;

function getItemWidth() {
    const first = rouletteTrack.querySelector(".roulette-item");
    if (!first) return 162;
    const style = getComputedStyle(first);
    return first.offsetWidth + parseFloat(style.marginLeft) + parseFloat(style.marginRight);
}

function setTrackX(x) {
    rouletteTrack.style.transform = `translate3d(${x}px, 0, 0)`;
}

    // Фаза 1: мягкий разгон → фаза 2: равномерная прокрутка → фаза 3: плавное торможение
function spinProgress(t) {
    if (t >= 1) return 1;
    if (t <= 0) return 0;

    const accelEnd = 0.07;
    const cruiseEnd = 0.58;
    const afterAccel = 0.04;
    const afterCruise = 0.78;

    if (t < accelEnd) {
        const u = t / accelEnd;
        return afterAccel * u * u * (3 - 2 * u);
    }

    if (t < cruiseEnd) {
        const u = (t - accelEnd) / (cruiseEnd - accelEnd);
        return afterAccel + (afterCruise - afterAccel) * u;
    }

    const u = (t - cruiseEnd) / (1 - cruiseEnd);
    const decel = 1 - Math.pow(1 - u, 3);
    return afterCruise + (1 - afterCruise) * decel;
}

function animateStrip(startX, endX, duration, onComplete) {
    if (activeAnimation) {
        cancelAnimationFrame(activeAnimation);
        activeAnimation = null;
    }

    const startTime = performance.now();
    rouletteWrapper.classList.add("is-spinning");
    setTrackX(startX);

    function frame(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = spinProgress(progress);
        const x = startX + (endX - startX) * eased;
        setTrackX(x);

        if (progress < 1) {
            activeAnimation = requestAnimationFrame(frame);
        } else {
            activeAnimation = null;
            setTrackX(endX);
            rouletteWrapper.classList.remove("is-spinning");
            onComplete?.();
        }
    }

    activeAnimation = requestAnimationFrame(frame);
}

function getRandomPrize() {
    const totalWeight = PRIZES.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    for (const prize of PRIZES) {
        random -= prize.weight;
        if (random <= 0) return { ...prize };
    }
    return { ...PRIZES[0] };
}

function getHoursLabel(hours) {
    if (hours === 0.5) return "30 мин";
    if (hours === 1) return "1 час";
    if (hours >= 2 && hours <= 4) return `${hours} часа`;
    return `${hours} часов`;
}

function createItemElement(prize) {
    const el = document.createElement("div");
    el.className = `roulette-item rarity-${prize.rarity}`;
    el.innerHTML = `
            <div class="item-icon">${prize.icon}</div>
            <div class="item-name">${prize.name}</div>
            <div class="item-sub">${getHoursLabel(prize.hours)}</div>
    `;
    return el;
}

function buildStrip(winner) {
    rouletteTrack.innerHTML = "";

    for (let i = 0; i < STRIP_LENGTH; i++) {
        const prize = i === WIN_INDEX ? winner : getRandomPrize();
        rouletteTrack.appendChild(createItemElement(prize));
    }
}

function getTargetOffset() {
    const itemWidth = getItemWidth();
    const viewportCenter = rouletteViewport.offsetWidth / 2;
    const itemCenter = WIN_INDEX * itemWidth + itemWidth / 2;
    const jitter = (Math.random() - 0.5) * (itemWidth * 0.06);
    return viewportCenter - itemCenter + jitter;
}

function buildLegend() {
    prizesLegend.innerHTML = PRIZES.map(p =>
`<span class="legend-item rarity-${p.rarity}" style="--rarity-color: var(--rarity-color)">${p.icon} ${p.name}</span>`
).join("");
}

function addToHistory(prize) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const li = document.createElement("li");
    li.className = `rarity-${prize.rarity}`;
    li.innerHTML = `<span>Выигрыш:</span> ${prize.icon} ${prize.name} (${getHoursLabel(prize.hours)}) — ${timeStr}`;
    historyList.prepend(li);
    while (historyList.children.length > 10) {
        historyList.removeChild(historyList.lastChild);
    }
}

function showIdleStrip() {
    rouletteTrack.innerHTML = "";
    setTrackX(0);

    const idlePrizes = [...PRIZES, ...PRIZES];
    idlePrizes.forEach(prize => {
        rouletteTrack.appendChild(createItemElement(prize));
    });
}

function highlightWinner() {
    rouletteTrack.querySelectorAll(".roulette-item").forEach(el => el.classList.remove("winner"));
    const winnerEl = rouletteTrack.children[WIN_INDEX];
    if (winnerEl) winnerEl.classList.add("winner");
}

function finishSpin(winner) {
    isSpinning = false;
    openBtn.disabled = false;
    highlightWinner();

    resultTitle.textContent = "🎉 Ваш приз:";
    resultPrize.textContent = `${winner.icon} ${winner.name} — ${getHoursLabel(winner.hours)} бесплатно`;
    resultPrize.classList.add("win-glow");
    setTimeout(() => resultPrize.classList.remove("win-glow"), 2000);

    addToHistory(winner);
    caseIcon.classList.add("shake");
    setTimeout(() => caseIcon.classList.remove("shake"), 500);

    if (winner.rarity === "mythical" || winner.rarity === "godlike") {
        resultTitle.textContent = "🔥 ЭПИЧЕСКИЙ ВЫИГРЫШ! 🔥";
    }
}

function openCase() {
    if (isSpinning) return;

    isSpinning = true;
    openBtn.disabled = true;
    resultTitle.textContent = "Крутим...";
    resultPrize.textContent = "";

    const winner = getRandomPrize();
    buildStrip(winner);

    caseIcon.classList.add("shake");
    setTimeout(() => caseIcon.classList.remove("shake"), 400);

    const startX = 0;
    const targetX = getTargetOffset();

    setTrackX(startX);

    requestAnimationFrame(() => {
        animateStrip(startX, targetX, SPIN_DURATION, () => finishSpin(winner));
    });
}

openBtn.addEventListener("click", openCase);
caseIcon.addEventListener("click", () => { if (!isSpinning) openCase(); });

buildLegend();
showIdleStrip();