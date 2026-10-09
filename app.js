"use strict";

(() => {
  const DEFAULT_ROUND_SECONDS = 40;
  const ROUND_OPTIONS = [20, 40, 60];
  const RANK_TITLES = [
    { minimum: 350, name: "文型師範", key: "shihan" },
    { minimum: 250, name: "文型師匠", key: "shisho" },
    { minimum: 150, name: "文型弟子", key: "deshi" },
    { minimum: 0, name: "文型見習い", key: "minarai" },
  ];
  const CARD_POINTS = 10;
  const COMPLETE_POINTS = 30;
  const MISPLAY_POINTS = 15;
  const MISPLAY_LOCK_MS = 700;
  const COMPLETION_HOLD_MS = 650;
  const MATCH_INTRO_MS = 2100;
  const END_CURTAIN_MS = 1550;
  const BOARD_COUNTDOWN_STEP_MS = 500;
  const BOARD_COUNTDOWN_MS = BOARD_COUNTDOWN_STEP_MS * 3;
  const SLOT_ORDER = ["S", "V", "O1", "X"];
  const SLOT_META = {
    S: { code: "S", name: "主語" },
    V: { code: "V", name: "動詞" },
    O1: { code: "O/C", name: "目的語・補語" },
    X: { code: "O₂/C", name: "目的語2・補語" },
  };
  const PATTERNS = {
    SV: { slots: ["S", "V"], roles: { S: "S", V: "V" }, label: "第1文型" },
    SVC: { slots: ["S", "V", "O1"], roles: { S: "S", V: "V", O1: "C" }, label: "第2文型" },
    SVO: { slots: ["S", "V", "O1"], roles: { S: "S", V: "V", O1: "O" }, label: "第3文型" },
    SVOO: { slots: ["S", "V", "O1", "X"], roles: { S: "S", V: "V", O1: "O", X: "O₂" }, label: "第4文型" },
    SVOC: { slots: ["S", "V", "O1", "X"], roles: { S: "S", V: "V", O1: "O", X: "C" }, label: "第5文型" },
  };
  const PATTERN_ORDER = ["SV", "SVC", "SVO", "SVOO", "SVOC"];
  const CPU_SPEED = {
    easy: [1650, 2250],
    normal: [950, 1450],
    hard: [450, 750],
  };
  const KEY_MAP = [
    { cards: ["KeyA", "KeyS", "KeyD", "KeyF"], slots: ["KeyQ", "KeyW", "KeyE", "KeyR"], labels: ["Q", "W", "E", "R"] },
    { cards: ["KeyH", "KeyJ", "KeyK", "KeyL"], slots: ["KeyY", "KeyU", "KeyI", "KeyO"], labels: ["Y", "U", "I", "O"] },
  ];

  const NOUNS = [
    { label: "the train", gloss: "その列車", entity: "train", reflexive: "itself" },
    { label: "the station", gloss: "その駅", entity: "station", reflexive: "itself" },
    { label: "the camera", gloss: "そのカメラ", entity: "camera", reflexive: "itself" },
    { label: "the book", gloss: "その本", entity: "book", reflexive: "itself" },
    { label: "the cat", gloss: "その猫", entity: "cat", reflexive: "itself" },
    { label: "the dog", gloss: "その犬", entity: "dog", reflexive: "itself" },
    { label: "the door", gloss: "そのドア", entity: "door", reflexive: "itself" },
    { label: "the teacher", gloss: "その先生", entity: "teacher", reflexive: "themself" },
    { label: "Tom", gloss: "トム", entity: "tom", reflexive: "himself" },
    { label: "Emily", gloss: "エミリー", entity: "emily", reflexive: "herself" },
    { label: "my friend", gloss: "私の友人", entity: "friend", reflexive: "themself" },
    { label: "the students", gloss: "その生徒たち", entity: "students", number: "plural", reflexive: "themselves" },
    { label: "I", gloss: "私", entity: "speaker", person: 1, pronoun: true, forms: { subject: "I", object: "me", reflexive: "myself" } },
    { label: "you", gloss: "あなた", entity: "listener", person: 2, pronoun: true, forms: { subject: "you", object: "you", reflexive: "yourself" } },
    { label: "we", gloss: "私たち", entity: "speaker-group", person: 1, number: "plural", pronoun: true, forms: { subject: "we", object: "us", reflexive: "ourselves" } },
    { label: "they", gloss: "彼ら・彼女ら", entity: "other-group", number: "plural", pronoun: true, forms: { subject: "they", object: "them", reflexive: "themselves" } },
  ];
  const ADJECTIVES = [
    ["safe", "安全な"], ["ready", "準備ができた"], ["happy", "幸せな"], ["clean", "清潔な"],
    ["busy", "忙しい"], ["quiet", "静かな"], ["famous", "有名な"], ["strong", "強い"],
    ["empty", "空の"], ["open", "開いた"], ["warm", "暖かい"], ["tired", "疲れた"],
  ];
  const VERBS = [
    ["run", "runs", "走る", "SV"], ["sleep", "sleeps", "眠る", "SV"],
    ["laugh", "laughs", "笑う", "SV"], ["arrive", "arrives", "到着する", "SV"],
    ["be", "is", "〜である", "SVC", ["adjective", "noun"]],
    ["become", "becomes", "〜になる", "SVC", ["adjective", "noun"]],
    ["seem", "seems", "〜のように見える", "SVC", ["adjective"]],
    ["look", "looks", "〜に見える", "SVC", ["adjective"]],
    ["love", "loves", "〜を愛する", "SVO"], ["watch", "watches", "〜を見る", "SVO"],
    ["use", "uses", "〜を使う", "SVO"], ["visit", "visits", "〜を訪れる", "SVO"],
    ["give", "gives", "〜に…を与える", "SVOO"],
    ["show", "shows", "〜に…を見せる", "SVOO"],
    ["teach", "teaches", "〜に…を教える", "SVOO"],
    ["make", "makes", "〜を…にする", "SVOC", ["adjective", "noun"]],
    ["keep", "keeps", "〜を…のままにする", "SVOC", ["adjective", "noun"]],
    ["call", "calls", "〜を…と呼ぶ", "SVOC", ["noun"]],
    ["find", "finds", "〜が…だと分かる", "SVOC", ["adjective", "noun"]],
  ];

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    setup: $("#setupScreen"), game: $("#gameScreen"), result: $("#resultModal"),
    boards: $("#boards"), topHand: $("#handTop"), bottomHand: $("#handBottom"),
    topTargets: $("#targetsTop"), bottomTargets: $("#targetsBottom"),
    time: $("#timeLeft"), topScore: $("#scoreTop"), bottomScore: $("#scoreBottom"),
    phaseMessage: $("#phaseMessage"), lastSentence: $("#lastSentence"),
    hintTop: $("#hintTop"), hintBottom: $("#hintBottom"), lockTop: $("#lockTop"), lockBottom: $("#lockBottom"),
    toast: $("#toastRegion"), intro: $("#matchIntro"), endCurtain: $("#endCurtain"),
    boardCountdown: $("#boardCountdown"), countdownNumber: $("#boardCountdownNumber"),
    shihanPetals: $("#shihanPetals"),
  };
  const state = {
    settings: { mode: "human", roundSeconds: DEFAULT_ROUND_SECONDS, level: "normal" },
    phase: "setup", pausedPhase: null, players: [], fields: [],
    remainingMs: DEFAULT_ROUND_SECONDS * 1000, playStartedAt: 0, history: [], lastSentence: null,
    resultRankKey: null, rankMusicReady: false,
    epoch: 0, serial: 0, timers: [], cpuTimer: null, tickTimer: null,
  };

  function emptyField() { return { S: null, V: null, O1: null, X: null, locked: false }; }
  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function buildStock() {
    const pool = [];
    for (const item of NOUNS) for (let copy = 0; copy < 2; copy += 1) {
      pool.push({ type: "noun", person: 3, number: "singular", pronoun: false, ...item, id: ++state.serial });
    }
    for (const [label, gloss] of ADJECTIVES) pool.push({ type: "adjective", label, gloss, id: ++state.serial });
    for (const [label, third, gloss, pattern, complements] of VERBS) {
      pool.push({ type: "verb", label, third, gloss, patterns: [pattern], complements: complements || [], id: ++state.serial });
    }
    return shuffle(pool);
  }
  function newPlayer(name) {
    const player = { name, hand: [], stock: buildStock(), score: 0, misses: 0, selected: null, lockUntil: 0 };
    refill(player);
    return player;
  }
  function refill(player) {
    while (player.hand.length < 4) {
      if (!player.stock.length) player.stock = buildStock();
      player.hand.push(player.stock.pop());
    }
  }
  function candidatePatterns(field) {
    const occupied = SLOT_ORDER.filter((slot) => field[slot]);
    const verb = field.V?.card || null;
    return PATTERN_ORDER.filter((pattern) => {
      const definition = PATTERNS[pattern];
      if (!occupied.every((slot) => definition.slots.includes(slot))) return false;
      if (verb && !verb.patterns.includes(pattern)) return false;
      for (const slot of ["O1", "X"]) {
        const card = field[slot]?.card;
        if (!card) continue;
        const role = definition.roles[slot];
        if (card.type === "adjective" && role !== "C") return false;
        if (role === "C" && card.type === "noun" && card.pronoun) return false;
        if (role === "C" && verb && !verb.complements.includes(card.type)) return false;
      }
      return true;
    });
  }
  function completedPattern(field) {
    return candidatePatterns(field).find((pattern) => PATTERNS[pattern].slots.every((slot) => field[slot])) || null;
  }
  function nounCanOccupy(card, slot, field) {
    const same = SLOT_ORDER.filter((other) => field[other]?.card.type === "noun" && field[other].card.entity === card.entity);
    if (!same.length) return true;
    if (same.length > 1) return false;
    return slot === "S" ? ["O1", "X"].includes(same[0]) : same[0] === "S";
  }
  function possibleSlots(card) {
    if (card.type === "verb") return ["V"];
    if (card.type === "adjective") return ["O1", "X"];
    return ["S", "O1", "X"];
  }
  function placementStatus(card, field, slot) {
    if (field.locked) return "locked";
    if (field[slot]) return "occupied";
    if (!possibleSlots(card).includes(slot)) return "invalid";
    if (card.type === "noun" && !nounCanOccupy(card, slot, field)) return "invalid";
    const next = { ...field, [slot]: { card, owner: -1 } };
    return candidatePatterns(next).length ? "ok" : "invalid";
  }
  function legalActions(playerIndex) {
    const actions = [];
    state.players[playerIndex].hand.forEach((card, cardIndex) => {
      state.fields.forEach((field, lane) => {
        for (const slot of possibleSlots(card)) {
          if (placementStatus(card, field, slot) === "ok") actions.push({ cardIndex, lane, slot });
        }
      });
    });
    return actions;
  }
  function nounSurface(card, role, field) {
    if ((role === "O" || role === "O₂") && field.S?.card.entity === card.entity) return card.forms?.reflexive || card.reflexive;
    if (card.pronoun) return role === "S" ? card.forms.subject : card.forms.object;
    return card.label;
  }
  function verbSurface(card, field) {
    const subject = field.S?.card;
    if (!subject) return card.label;
    if (card.label === "be") {
      if (subject.person === 1 && subject.number === "singular") return "am";
      return subject.person === 2 || subject.number === "plural" ? "are" : "is";
    }
    return subject.person === 3 && subject.number === "singular" ? card.third : card.label;
  }
  function cardSurface(field, slot, pattern = null) {
    const card = field[slot]?.card;
    if (!card) return "";
    if (card.type === "verb") return verbSurface(card, field);
    if (card.type === "adjective") return card.label;
    const role = pattern ? PATTERNS[pattern].roles[slot] : (slot === "S" ? "S" : "O");
    return nounSurface(card, role, field);
  }
  function sentenceText(field, pattern) {
    const words = PATTERNS[pattern].slots.map((slot) => cardSurface(field, slot, pattern));
    const text = words.join(" ");
    return text[0].toUpperCase() + text.slice(1) + ".";
  }
  function previewText(field) {
    if (!SLOT_ORDER.some((slot) => field[slot])) return "カードを置くと、ここに英文が現れます。";
    const pattern = completedPattern(field) || candidatePatterns(field)[0] || "SVOC";
    const text = PATTERNS[pattern].slots.map((slot) => cardSurface(field, slot, pattern) || "____").join(" ");
    return text[0].toUpperCase() + text.slice(1);
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function clearSessionTimers() {
    state.epoch += 1;
    state.timers.forEach(clearTimeout);
    state.timers = [];
    clearTimeout(state.cpuTimer);
    state.cpuTimer = null;
    clearInterval(state.tickTimer);
    state.tickTimer = null;
  }
  function later(callback, delay) {
    const epoch = state.epoch;
    const timer = setTimeout(() => { if (epoch === state.epoch) callback(); }, delay);
    state.timers.push(timer);
    return timer;
  }
  function remainingMs() {
    return state.phase === "playing"
      ? Math.max(0, state.remainingMs - (performance.now() - state.playStartedAt))
      : state.remainingMs;
  }
  function freezeClock() {
    if (state.phase === "playing") state.remainingMs = remainingMs();
  }
  function resumeClock() { state.playStartedAt = performance.now(); }
  function updateClock() {
    const ms = remainingMs();
    elements.time.textContent = (ms / 1000).toFixed(1);
    elements.time.parentElement.classList.toggle("is-urgent", ms <= 10_000);
    if (state.phase === "playing" && ms <= 0) endMatch();
    if (state.phase === "playing") renderLocks();
  }
  function announce(message, tone = "good", duration = 1700) {
    const toast = document.createElement("div");
    toast.className = `toast ${tone === "bad" ? "bad" : tone === "gold" ? "gold" : ""}`;
    toast.textContent = message;
    elements.toast.replaceChildren(toast);
    later(() => { if (toast.isConnected) toast.remove(); }, duration);
  }
  function showMatchIntro() {
    elements.intro.classList.remove("is-hidden");
    elements.intro.setAttribute("aria-hidden", "false");
    void elements.intro.offsetWidth;
    elements.intro.classList.add("is-active");
    setSoundPhase("intro");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    later(() => playEffect("introPrelude"), reduced ? 0 : 120);
    later(() => playEffect("introCharge"), reduced ? 45 : 1100);
  }
  function hideMatchIntro() {
    elements.intro.classList.remove("is-active");
    elements.intro.classList.add("is-hidden");
    elements.intro.setAttribute("aria-hidden", "true");
  }
  function showEndCurtain() {
    elements.endCurtain.classList.remove("is-hidden");
    elements.endCurtain.setAttribute("aria-hidden", "false");
    void elements.endCurtain.offsetWidth;
    elements.endCurtain.classList.add("is-active");
  }
  function hideEndCurtain() {
    elements.endCurtain.classList.remove("is-active");
    elements.endCurtain.classList.add("is-hidden");
    elements.endCurtain.setAttribute("aria-hidden", "true");
  }
  function setBoardCountdown(number) {
    elements.countdownNumber.textContent = String(number);
    elements.countdownNumber.style.animation = "none";
    void elements.countdownNumber.offsetWidth;
    elements.countdownNumber.style.animation = "";
  }
  function hideBoardCountdown() {
    elements.boardCountdown.classList.add("is-hidden");
    elements.boardCountdown.setAttribute("aria-hidden", "true");
  }
  function startMatch() {
    clearSessionTimers();
    stopEffects();
    hideMatchIntro();
    hideEndCurtain();
    hideBoardCountdown();
    state.players = [newPlayer("プレイヤー1"), newPlayer(state.settings.mode === "cpu" ? "CPU" : "プレイヤー2")];
    state.fields = [emptyField()];
    state.remainingMs = state.settings.roundSeconds * 1000;
    state.history = [];
    state.lastSentence = null;
    state.resultRankKey = null;
    state.rankMusicReady = false;
    showShihanPetals(false);
    state.phase = "opening";
    state.pausedPhase = null;
    elements.setup.classList.add("is-hidden");
    elements.result.classList.add("is-hidden");
    elements.game.classList.remove("is-hidden");
    elements.game.classList.toggle("is-face-to-face", state.settings.mode === "human");
    $("#homeButton").classList.remove("is-hidden");
    $("#nameTop").textContent = state.players[1].name;
    showMatchIntro();
    render();
    state.tickTimer = setInterval(updateClock, 100);
    later(() => {
      hideMatchIntro();
      state.phase = "playing";
      setSoundPhase("battle");
      resumeClock();
      render();
      checkStall();
      scheduleCpu();
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : MATCH_INTRO_MS);
  }
  function returnHome() {
    clearSessionTimers();
    stopEffects();
    state.phase = "setup";
    state.players = [];
    state.fields = [];
    state.resultRankKey = null;
    state.rankMusicReady = false;
    showShihanPetals(false);
    elements.setup.classList.remove("is-hidden");
    elements.game.classList.add("is-hidden");
    elements.result.classList.add("is-hidden");
    $("#rulesModal").classList.add("is-hidden");
    $("#homeButton").classList.add("is-hidden");
    hideMatchIntro();
    hideEndCurtain();
    hideBoardCountdown();
    setSoundPhase("setup");
    $("#rulesButton").disabled = false;
    elements.toast.replaceChildren();
  }
  function endMatch() {
    if (state.phase === "ended") return;
    freezeClock();
    state.remainingMs = 0;
    state.phase = "ended";
    state.rankMusicReady = false;
    clearTimeout(state.cpuTimer);
    state.cpuTimer = null;
    clearInterval(state.tickTimer);
    state.tickTimer = null;
    hideBoardCountdown();
    setSoundPhase("ending");
    render();
    renderResult();
    showEndCurtain();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    later(() => playEffect("end"), reduced ? 0 : 650);
    later(() => {
      hideEndCurtain();
      elements.result.classList.remove("is-hidden");
      setSoundPhase("result");
      playEffect(`rank-${state.resultRankKey}`);
      if (state.resultRankKey === "shihan") later(() => {
        if (state.phase !== "ended") return;
        state.rankMusicReady = true;
        if (sound.phase === "result") playBgm("resultShihan", { restart: true });
      }, 1000);
    }, reduced ? 120 : END_CURTAIN_MS);
  }
  function penalize(index, message = "お手つき！ 15点減点") {
    const player = state.players[index];
    player.score -= MISPLAY_POINTS;
    player.misses += 1;
    player.selected = null;
    player.lockUntil = performance.now() + MISPLAY_LOCK_MS;
    announce(`${player.name}：${message}`, "bad");
    playCue("misplay");
  }
  function commitPlacement(index, action) {
    const player = state.players[index];
    const [card] = player.hand.splice(action.cardIndex, 1);
    state.fields[action.lane][action.slot] = { card, owner: index };
    state.fields[action.lane].lastOwner = index;
    player.score += CARD_POINTS;
    player.selected = null;
    refill(player);
    if (index === 1 && state.settings.mode === "cpu") playCue("place");
  }
  function settleCompletions() {
    state.fields.forEach((field, lane) => {
      if (field.locked) return;
      const pattern = completedPattern(field);
      if (!pattern) return;
      field.locked = true;
      const winner = field.lastOwner;
      state.players[winner].score += COMPLETE_POINTS;
      const english = sentenceText(field, pattern);
      const record = { english, pattern, owner: winner, lane, time: Math.ceil(remainingMs() / 1000) };
      state.history.unshift(record);
      state.lastSentence = record;
      announce(`${state.players[winner].name}が英文完成！ ${english}`, "gold", 2100);
      playCue("complete");
      later(() => {
        if (state.phase === "ended" || state.phase === "setup") return;
        state.fields[lane] = emptyField();
        render();
        checkStall();
        scheduleCpu();
      }, COMPLETION_HOLD_MS);
    });
  }
  function attemptMove(index, action) {
    if (state.phase !== "playing") return;
    const player = state.players[index];
    if (performance.now() < player.lockUntil) return;
    const card = player.hand[action.cardIndex];
    const field = state.fields[action.lane];
    if (!card || !field) return;
    const status = placementStatus(card, field, action.slot);
    if (status === "locked" || status === "occupied") {
      announce("その枠は使用中。カードは手札に戻ります。", "good", 1050);
      return;
    }
    if (status === "invalid") {
      penalize(index);
      render();
      return;
    }
    commitPlacement(index, action);
    settleCompletions();
    render();
    checkStall();
  }
  function checkStall() {
    if (state.phase !== "playing") return;
    if (state.fields.some((field) => field.locked)) return;
    if (legalActions(0).length || legalActions(1).length) return;
    beginBoardCountdown();
  }
  function beginBoardCountdown() {
    freezeClock();
    clearTimeout(state.cpuTimer);
    state.cpuTimer = null;
    state.phase = "countdown";
    state.fields = [emptyField()];
    state.players.forEach((player) => { player.selected = null; });
    playCue("flush");
    elements.boardCountdown.classList.remove("is-hidden");
    elements.boardCountdown.setAttribute("aria-hidden", "false");
    setBoardCountdown(3);
    render();
    later(() => { if (state.phase === "countdown") setBoardCountdown(2); }, BOARD_COUNTDOWN_STEP_MS);
    later(() => { if (state.phase === "countdown") setBoardCountdown(1); }, BOARD_COUNTDOWN_STEP_MS * 2);
    later(() => {
      if (state.phase !== "countdown") return;
      hideBoardCountdown();
      state.phase = "playing";
      resumeClock();
      render();
      checkStall();
      scheduleCpu();
    }, BOARD_COUNTDOWN_MS);
  }
  function chooseCard(index, cardIndex) {
    if (state.phase !== "playing") return;
    if (state.settings.mode === "cpu" && index === 1) return;
    const player = state.players[index];
    if (!player.hand[cardIndex] || performance.now() < player.lockUntil) return;
    player.selected = cardIndex;
    render();
  }
  function chooseTarget(index, slot) {
    if (state.phase !== "playing") return;
    if (state.settings.mode === "cpu" && index === 1) return;
    const player = state.players[index];
    if (performance.now() < player.lockUntil) return;
    if (player.selected === null) {
      announce("先に手札のカードを1枚選んでください", "good", 1150);
      return;
    }
    const action = { cardIndex: player.selected, lane: 0, slot };
    attemptMove(index, action);
  }
  function chooseCpuAction(actions) {
    const ranked = actions.map((action) => {
      const card = state.players[1].hand[action.cardIndex];
      const next = { ...state.fields[action.lane], [action.slot]: { card, owner: 1 } };
      const completed = Boolean(completedPattern(next));
      const occupancy = SLOT_ORDER.filter((slot) => next[slot]).length;
      return { action, value: (completed ? 100 : 0) + occupancy * 8 + (action.slot === "V" ? 4 : 0) + Math.random() * 6 };
    });
    ranked.sort((a, b) => b.value - a.value);
    return ranked[0].action;
  }
  function scheduleCpu() {
    if (state.settings.mode !== "cpu" || state.phase !== "playing" || state.cpuTimer) return;
    const [min, max] = CPU_SPEED[state.settings.level];
    const delay = min + Math.random() * (max - min);
    state.cpuTimer = later(() => {
      state.cpuTimer = null;
      if (state.phase !== "playing") return;
      const actions = legalActions(1);
      if (actions.length) attemptMove(1, chooseCpuAction(actions));
      else checkStall();
      scheduleCpu();
    }, delay);
  }

  function cardMarkup(card, owner = null, compact = false) {
    const typeLabel = { noun: "名詞", verb: "V・動詞", adjective: "形容詞" }[card.type];
    const role = card.type === "verb" ? card.patterns.join("・") : card.type === "noun" ? "S・O・Cになれる" : "Cになれる";
    return `<span class="card-type">${typeLabel}</span><span class="card-word">${escapeHtml(card.label)}</span><span class="card-gloss">${escapeHtml(card.gloss)}</span><span class="card-roles">${role}</span>${compact && owner !== null ? `<span class="owner-tag">${owner === 0 ? "P1" : "P2"}</span>` : ""}`;
  }
  function renderHands(index) {
    const player = state.players[index];
    const container = index === 0 ? elements.bottomHand : elements.topHand;
    const disabled = state.settings.mode === "cpu" && index === 1;
    const canAct = state.phase === "playing" && !disabled;
    const signature = player.hand.map((card) => card.id).join(",");
    if (container.dataset.cards !== signature) {
      container.innerHTML = player.hand.map((card, cardIndex) => `<button type="button" class="hand-card ${card.type}" data-card-index="${cardIndex}" aria-label="${escapeHtml(card.label)}、${{ noun: "名詞", verb: "動詞", adjective: "形容詞" }[card.type]}、手札${cardIndex + 1}番">${cardMarkup(card)}</button>`).join("");
      container.dataset.cards = signature;
    }
    [...container.querySelectorAll(".hand-card")].forEach((button, cardIndex) => {
      const selected = player.selected === cardIndex;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.disabled = !canAct;
    });
  }
  function renderControls(index) {
    const targetContainer = index === 0 ? elements.bottomTargets : elements.topTargets;
    const isCpu = state.settings.mode === "cpu" && index === 1;
    const canAct = state.phase === "playing";
    const signature = isCpu ? "cpu" : "player";
    if (targetContainer.dataset.signature !== signature) {
      targetContainer.innerHTML = isCpu ? "<span class=\"cpu-wait\">CPUが判断中…</span>" : SLOT_ORDER.map((slot, slotIndex) => `<button type="button" class="target-button" data-slot="${slot}"><span>${SLOT_META[slot].code}</span><kbd>${KEY_MAP[index].labels[slotIndex]}</kbd></button>`).join("");
      targetContainer.dataset.signature = signature;
    }
    if (isCpu) return;
    [...targetContainer.querySelectorAll("button")].forEach((button) => {
      button.disabled = !canAct;
    });
  }
  function renderBoards() {
    elements.boards.innerHTML = state.fields.map((field) => {
      const slots = SLOT_ORDER.map((slot) => {
        const placement = field[slot];
        const surface = placement ? cardSurface(field, slot, completedPattern(field)) : null;
        const faceContent = placement
          ? `<div class="field-card ${placement.card.type}">${cardMarkup({ ...placement.card, label: surface }, placement.owner, true)}</div>`
          : `<span class="slot-watermark" aria-hidden="true">${SLOT_META[slot].code}</span>`;
        const code = escapeHtml(SLOT_META[slot].code);
        return `<div class="sentence-slot" aria-label="${SLOT_META[slot].name}${surface ? `、${escapeHtml(surface)}` : "、空欄"}"><div class="slot-heading"><span class="slot-code">${code}</span><span class="slot-name">${SLOT_META[slot].name}</span></div><div class="slot-face" data-code="${code}">${faceContent}</div></div>`;
      }).join("");
      return `<div class="board-lane${field.locked ? " is-complete" : ""}"><div class="lane-heading"><span>${escapeHtml(previewText(field))}</span></div><div class="sentence-board sentence-board-top" aria-hidden="true">${slots}</div><div class="sentence-board sentence-board-bottom">${slots}</div></div>`;
    }).join("");
  }
  function renderScores() {
    [elements.bottomScore, elements.topScore].forEach((element, index) => {
      const player = state.players[index];
      element.querySelector(".score-name").textContent = player.name;
      element.querySelector("strong").textContent = player.score;
      element.querySelector("small").textContent = `お手つき ${player.misses}`;
    });
  }
  function renderLocks() {
    if (!state.players.length) return;
    [elements.lockBottom, elements.lockTop].forEach((element, index) => {
      const left = Math.max(0, state.players[index].lockUntil - performance.now());
      element.textContent = left > 0 ? `待機 ${(left / 1000).toFixed(1)}秒` : "";
    });
  }
  function render() {
    if (!state.players.length) return;
    renderHands(0);
    renderHands(1);
    renderControls(0);
    renderControls(1);
    renderBoards();
    renderScores();
    renderLocks();
    updateClock();
    elements.game.classList.toggle("is-countdown", state.phase === "countdown");
    const messages = {
      opening: "準備中…",
      playing: "カードを選び、置き先を押そう",
      countdown: "場流し中… 3、2、1で再開",
      paused: "一時停止中",
      ended: "勝負あり！",
    };
    elements.phaseMessage.textContent = messages[state.phase] || "";
    [elements.hintBottom, elements.hintTop].forEach((element) => {
      element.textContent = state.phase === "countdown" ? "3、2、1のあとに再開" : "手札を選んで、置き先を押す";
    });
    $("#rulesButton").disabled = state.phase === "countdown";
    if (state.lastSentence) {
      const record = state.lastSentence;
      elements.lastSentence.innerHTML = `<strong>${escapeHtml(record.english)}</strong> <span>${record.pattern}・${PATTERNS[record.pattern].label} ／ ${escapeHtml(state.players[record.owner].name)}が完成</span>`;
    } else {
      elements.lastSentence.innerHTML = "<span>完成した英文がここに表示されます。</span>";
    }
  }
  function rankForScore(score, roundSeconds) {
    const points = Math.max(0, Math.round(score * 60 / roundSeconds));
    const title = RANK_TITLES.find((rank) => points >= rank.minimum);
    return { ...title, points };
  }
  function showShihanPetals(enabled) {
    elements.shihanPetals.classList.toggle("is-hidden", !enabled);
    if (!enabled) {
      elements.shihanPetals.replaceChildren();
      return;
    }
    elements.shihanPetals.innerHTML = Array.from({ length: 24 }, (_, index) => {
      const duration = 9 + Math.random() * 6;
      const left = ((index + Math.random() * .7) / 24) * 100;
      const size = 9 + Math.random() * 9;
      const delay = -Math.random() * duration;
      const sway = (Math.random() - .5) * 110;
      const drift = (Math.random() - .5) * 160;
      const spin = (Math.random() < .5 ? -1 : 1) * (300 + Math.random() * 280);
      return `<span class="shihan-petal" style="--petal-left:${left}%;--petal-size:${size}px;--petal-duration:${duration}s;--petal-delay:${delay}s;--petal-sway:${sway}px;--petal-drift:${drift}px;--petal-spin:${spin}deg"></span>`;
    }).join("");
  }
  function renderResult() {
    const [first, second] = state.players;
    const leadingIndex = first.score === second.score
      ? first.misses === second.misses ? null : first.misses < second.misses ? 0 : 1
      : first.score > second.score ? 0 : 1;
    const ranks = state.players.map((player) => rankForScore(player.score, state.settings.roundSeconds));
    state.resultRankKey = ranks[leadingIndex ?? 0].key;
    showShihanPetals(ranks.some((rank) => rank.key === "shihan"));
    $("#resultWinner").textContent = leadingIndex === null ? "引き分けですわ！" : `${state.players[leadingIndex].name}の勝ち！`;
    $("#resultRankNote").textContent = `${state.settings.roundSeconds}秒戦・称号は60秒換算の得点で判定`;
    $("#resultScores").innerHTML = state.players.map((player, index) => `<div class="result-score" data-rank="${ranks[index].key}"><span class="result-score-name">${escapeHtml(player.name)}</span><span class="result-rank">${ranks[index].name}</span><span class="result-score-points"><strong>${player.score}</strong>点</span><small>お手つき ${player.misses}回<br />60秒換算 ${ranks[index].points}点</small></div>`).join("");
    $("#resultHistory").innerHTML = state.history.length
      ? state.history.slice(0, 12).map((entry) => `<li><strong>${escapeHtml(entry.english)}</strong>　${entry.pattern}・${PATTERNS[entry.pattern].label}　<span>［${escapeHtml(state.players[entry.owner].name)}］</span></li>`).join("")
      : "<li>今回は完成した英文がありませんでした。</li>";
  }

  const BGM_TRACKS = {
    setup: { src: "bgm-setup.mp3", volume: .3 },
    battle: { src: "bgm-battle.mp3", volume: .25 },
    resultShihan: { src: "bgm-result-shihan.mp3", volume: .25 },
  };
  const SOUND_EFFECTS = {
    click: { src: "se-click.mp3", volume: .42 },
    introPrelude: { src: "se-intro-prelude.mp3", volume: .6 },
    introCharge: { src: "se-intro-charge.mp3", volume: .58 },
    misplay: { src: "se-misplay.mp3", volume: .78 },
    complete: { src: "se-completion.mp3", volume: .62 },
    end: { src: "se-end.mp3", volume: .62 },
    "rank-shihan": { src: "se-rank-shihan.mp3", volume: .65 },
    "rank-shisho": { src: "se-rank-shisho.mp3", volume: .58 },
    "rank-deshi": { src: "se-rank-deshi.mp3", volume: .58 },
    "rank-minarai": { src: "se-rank-minarai.mp3", volume: .58 },
  };
  function createAudioOutput() {
    if (window.location.protocol === "file:") return { context: null, bgmGain: null };
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return { context: null, bgmGain: null };
    try {
      const context = new AudioContextClass();
      const bgmGain = context.createGain();
      context.createMediaElementSource($("#bgmAudio")).connect(bgmGain);
      bgmGain.connect(context.destination);
      bgmGain.gain.value = 0;
      return { context, bgmGain };
    } catch (error) {
      console.warn("音声出力を初期化できませんでした", error);
      return { context: null, bgmGain: null };
    }
  }
  const audioOutput = createAudioOutput();
  const sound = {
    enabled: false, phase: "setup", bgmName: null,
    context: audioOutput.context, bgmGain: audioOutput.bgmGain,
    effectBuffers: new Map(), activeEffects: new Set(), effectGeneration: 0,
    fallbackEffects: new Map(Object.entries(SOUND_EFFECTS).map(([name, config]) => {
      const audio = new Audio(config.src);
      audio.preload = "none";
      audio.muted = true;
      audio.volume = config.volume;
      return [name, audio];
    })),
  };
  if (sound.context) {
    for (const [name, config] of Object.entries(SOUND_EFFECTS)) {
      sound.effectBuffers.set(name, fetch(config.src)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.arrayBuffer();
        })
        .then((data) => sound.context.decodeAudioData(data))
        .catch((error) => {
          console.warn(`効果音を読み込めませんでした: ${name}`, error);
          return null;
        }));
    }
  }
  function playBgm(name, { silent = false, restart = false } = {}) {
    if (!sound.enabled) return;
    const track = BGM_TRACKS[name];
    const bgm = $("#bgmAudio");
    if (sound.bgmName !== name) {
      bgm.pause();
      bgm.src = track.src;
      sound.bgmName = name;
      restart = true;
    }
    if (restart) bgm.currentTime = 0;
    if (sound.bgmGain) {
      bgm.volume = 1;
      bgm.muted = false;
      sound.bgmGain.gain.value = silent ? 0 : track.volume;
    } else {
      bgm.volume = silent ? 0 : track.volume;
      bgm.muted = silent;
    }
    void bgm.play().catch((error) => {
      if (error.name !== "AbortError") console.warn("BGMを再生できませんでした", error);
    });
  }
  function playEffect(name) {
    if (!sound.enabled) return;
    const fallback = () => {
      const audio = sound.fallbackEffects.get(name);
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      void audio.play().catch((error) => {
        if (error.name !== "AbortError") console.warn(`効果音を再生できませんでした: ${name}`, error);
      });
    };
    const bufferPromise = sound.effectBuffers.get(name);
    if (!bufferPromise) return fallback();
    const generation = sound.effectGeneration;
    void bufferPromise.then((buffer) => {
      if (!sound.enabled || generation !== sound.effectGeneration) return;
      if (!buffer) return fallback();
      const source = sound.context.createBufferSource();
      const gain = sound.context.createGain();
      source.buffer = buffer;
      gain.gain.value = SOUND_EFFECTS[name].volume;
      source.connect(gain).connect(sound.context.destination);
      source.addEventListener("ended", () => sound.activeEffects.delete(source), { once: true });
      sound.activeEffects.add(source);
      source.start();
    }).catch((error) => console.warn(`効果音を再生できませんでした: ${name}`, error));
  }
  function stopEffects() {
    sound.effectGeneration += 1;
    for (const source of sound.activeEffects) {
      try { source.stop(); } catch { /* 再生終了済み */ }
    }
    sound.activeEffects.clear();
    for (const audio of sound.fallbackEffects.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
  }
  function setSoundPhase(phase) {
    sound.phase = phase;
    if (!sound.enabled) return;
    if (phase === "setup") playBgm("setup", { restart: true });
    else if (phase === "intro") playBgm("battle", { silent: true, restart: true });
    else if (phase === "battle") playBgm("battle", { restart: true });
    else $("#bgmAudio").pause();
  }
  function playCue(type) {
    const effect = { place: "click", misplay: "misplay", complete: "complete", flush: "click" }[type];
    if (effect) playEffect(effect);
  }
  function toggleSound() {
    sound.enabled = !sound.enabled;
    const bgm = $("#bgmAudio");
    bgm.muted = !sound.enabled;
    for (const audio of sound.fallbackEffects.values()) audio.muted = !sound.enabled;
    if (sound.enabled) {
      if (sound.context) void sound.context.resume().catch((error) => console.warn("音声出力を開始できませんでした", error));
      if (sound.phase === "setup") playBgm("setup");
      else if (sound.phase === "intro") playBgm("battle", { silent: true });
      else if (sound.phase === "battle") playBgm("battle");
      else if (sound.phase === "result" && state.resultRankKey === "shihan" && state.rankMusicReady) playBgm("resultShihan");
    } else {
      bgm.pause();
      if (sound.bgmGain) sound.bgmGain.gain.value = 0;
      stopEffects();
    }
    const button = $("#soundButton");
    button.setAttribute("aria-pressed", String(sound.enabled));
    button.setAttribute("aria-label", sound.enabled ? "音をオフにする" : "音をオンにする");
    button.querySelector("span").textContent = sound.enabled ? "音 ON" : "音 OFF";
  }
  function toggleTheme() {
    const root = document.documentElement;
    const dark = root.dataset.theme !== "dark";
    root.dataset.theme = dark ? "dark" : "light";
    $("#themeButton").setAttribute("aria-pressed", String(dark));
    $("#themeButton").setAttribute("aria-label", dark ? "ライトモードに切り替える" : "ダークモードに切り替える");
    $("#themeButton span").textContent = dark ? "ライト" : "ダーク";
  }
  function openRules() {
    if (state.phase === "playing") {
      freezeClock();
      state.pausedPhase = "playing";
      state.phase = "paused";
      clearTimeout(state.cpuTimer);
      state.cpuTimer = null;
    }
    $("#rulesModal").classList.remove("is-hidden");
    if (state.players.length) render();
  }
  function closeRules() {
    $("#rulesModal").classList.add("is-hidden");
    if (state.phase === "paused") {
      state.phase = state.pausedPhase;
      state.pausedPhase = null;
      if (state.phase === "playing") { resumeClock(); scheduleCpu(); }
      render();
    }
  }
  function selectSetup(key, value) {
    if (key === "roundSeconds" && !ROUND_OPTIONS.includes(value)) return;
    state.settings[key] = value;
    const attribute = { mode: "data-mode", roundSeconds: "data-round-seconds", level: "data-level" }[key];
    document.querySelectorAll(`[${attribute}]`).forEach((button) => {
      const selected = button.getAttribute(attribute) === String(value);
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-checked", String(selected));
    });
    if (key === "roundSeconds") elements.time.textContent = value.toFixed(1);
    $("#cpuLevelGroup").hidden = state.settings.mode !== "cpu";
  }
  function bindControls() {
    elements.setup.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.mode) selectSetup("mode", button.dataset.mode);
      if (button.dataset.roundSeconds) selectSetup("roundSeconds", Number(button.dataset.roundSeconds));
      if (button.dataset.level) selectSetup("level", button.dataset.level);
    });
    [elements.bottomHand, elements.topHand].forEach((container, index) => {
      container.addEventListener("click", (event) => {
        const button = event.target.closest("[data-card-index]");
        if (button) chooseCard(index, Number(button.dataset.cardIndex));
      });
    });
    [elements.bottomTargets, elements.topTargets].forEach((container, index) => {
      container.addEventListener("click", (event) => {
        const button = event.target.closest("[data-slot]");
        if (button) chooseTarget(index, button.dataset.slot);
      });
    });
    document.addEventListener("keydown", (event) => {
      if (event.code === "Escape" && !$("#rulesModal").classList.contains("is-hidden")) { closeRules(); return; }
      if (event.repeat || state.phase !== "playing" || !$("#rulesModal").classList.contains("is-hidden")) return;
      for (let index = 0; index < 2; index += 1) {
        if (index === 1 && state.settings.mode === "cpu") continue;
        const mapping = KEY_MAP[index];
        const cardIndex = mapping.cards.indexOf(event.code);
        const slotIndex = mapping.slots.indexOf(event.code);
        if (cardIndex >= 0) { event.preventDefault(); chooseCard(index, cardIndex); return; }
        if (slotIndex >= 0) { event.preventDefault(); chooseTarget(index, SLOT_ORDER[slotIndex]); return; }
      }
    });
    $("#startButton").addEventListener("click", startMatch);
    $("#againButton").addEventListener("click", startMatch);
    $("#homeButton").addEventListener("click", returnHome);
    $("#resultHomeButton").addEventListener("click", returnHome);
    $("#soundButton").addEventListener("click", toggleSound);
    $("#themeButton").addEventListener("click", toggleTheme);
    $("#rulesButton").addEventListener("click", openRules);
    $("#closeRulesButton").addEventListener("click", closeRules);
    $("#rulesModal").addEventListener("click", (event) => { if (event.target.id === "rulesModal") closeRules(); });
    document.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("button") : null;
      if (button && !button.disabled) playEffect("click");
    });
  }
  bindControls();
})();
