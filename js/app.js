import {
    loadAppData,
    addCompletedFocusSession,
    saveSettings
} from "./storage.js";

import {
    calculateStatistics
} from "./statistics.js";

import {
    initializeCalendar,
    updateCalendar
} from "./calendar.js";


const CONFIG = {
    defaultFocusMinutes: 25,
    defaultBreakMinutes: 5,
    minimumMinutes: 1,
    maximumFocusMinutes: 180,
    maximumBreakMinutes: 60,
    dailyGoal: 5,
    transitionDelayMs: 1800
};


const elements = {
    body: document.body,

    // Timer
    timer: document.getElementById("timer"),
    modeLabel: document.getElementById("modeLabel"),
    modeTitle: document.getElementById("modeTitle"),
    modeDescription: document.getElementById("modeDescription"),

    focusGif: document.getElementById("focusGif"),
    playGif: document.getElementById("playGif"),

    timerStatus: document.getElementById("timerStatus"),

    startBtn: document.getElementById("startBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
    resetBtn: document.getElementById("resetBtn"),

    studyDuration: document.getElementById("studyDuration"),
    restDuration: document.getElementById("restDuration"),

    // Stage 4: Sound settings
    soundEnabled: document.getElementById("soundEnabled"),
    soundVolume: document.getElementById("soundVolume"),
    volumeValue: document.getElementById("volumeValue"),
    focusSound: document.getElementById("focusSound"),
    breakSound: document.getElementById("breakSound"),
    previewFocusSound: document.getElementById("previewFocusSound"),
    previewBreakSound: document.getElementById("previewBreakSound"),

    studyModeBtn: document.getElementById("studyModeBtn"),
    restModeBtn: document.getElementById("restModeBtn"),

    // Daily progress
    sessionCount: document.getElementById("sessionCount"),
    progressHearts: document.getElementById("progressHearts"),
    progressMessage: document.getElementById("progressMessage"),
    progressFill: document.getElementById("progressFill"),
    progressBar: document.getElementById("progressBar"),

    todayMinutes: document.getElementById("todayMinutes"),
    allTimeSessions: document.getElementById("allTimeSessions"),

    todayLabel: document.getElementById("todayLabel"),

    // Stage 2 statistics
    totalFocusTime: document.getElementById("totalFocusTime"),
    productiveDays: document.getElementById("productiveDays"),
    averageFocusTime: document.getElementById("averageFocusTime"),

    weeklySummary: document.getElementById("weeklySummary"),
    weeklyChart: document.getElementById("weeklyChart")
};


// Load persistent application data.
const appData = loadAppData();


const state = {
    mode: "study",

    remainingSeconds: CONFIG.defaultFocusMinutes * 60,

    isRunning: false,
    intervalId: null,
    deadline: null,

    startedAt: null,
    plannedDurationSeconds: CONFIG.defaultFocusMinutes * 60,

    transitionTimeoutId: null,
    completionHandled: false
};


let audioContext = null;


// ========================================
// DURATION HELPERS
// ========================================

function clampDuration(value, fallback, maximum) {
    const number = Number(value);

    if (!Number.isInteger(number)) {
        return fallback;
    }

    return Math.max(
        CONFIG.minimumMinutes,
        Math.min(maximum, number)
    );
}


function getDurationMinutes(mode) {
    const input = mode === "study"
        ? elements.studyDuration
        : elements.restDuration;

    const fallback = mode === "study"
        ? CONFIG.defaultFocusMinutes
        : CONFIG.defaultBreakMinutes;

    const maximum = mode === "study"
        ? CONFIG.maximumFocusMinutes
        : CONFIG.maximumBreakMinutes;

    const minutes = clampDuration(
        input.value,
        fallback,
        maximum
    );

    input.value = String(minutes);

    return minutes;
}


// ========================================
// TIMER DISPLAY
// ========================================

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return (
        `${String(minutes).padStart(2, "0")}:` +
        `${String(remainingSeconds).padStart(2, "0")}`
    );
}


function updateTimerDisplay() {
    const time = formatTime(state.remainingSeconds);

    elements.timer.textContent = time;
    document.title = `${time} | Little Focus ♡`;
}


function updateControls() {
    elements.startBtn.disabled = state.isRunning;
    elements.pauseBtn.disabled = !state.isRunning;
}


// ========================================
// MODE UI
// ========================================

function updateModeUI() {
    const isFocus = state.mode === "study";

    elements.body.classList.toggle("study-mode", isFocus);
    elements.body.classList.toggle("rest-mode", !isFocus);

    if (isFocus) {
        elements.modeLabel.textContent = "♡ FOCUS TIME ♡";

        elements.modeTitle.textContent =
            "Let's study together!";

        elements.modeDescription.textContent =
            "You can do it! One step at a time ♡";

        elements.focusGif.classList.add("active");
        elements.playGif.classList.remove("active");

        elements.studyModeBtn.classList.add("active");
        elements.restModeBtn.classList.remove("active");

        elements.studyModeBtn.setAttribute("aria-pressed", "true");
        elements.restModeBtn.setAttribute("aria-pressed", "false");

    } else {
        elements.modeLabel.textContent = "♡ PLAY TIME ♡";

        elements.modeTitle.textContent =
            "Time to relax!";

        elements.modeDescription.textContent =
            "You worked hard. Take a little break ♡";

        elements.playGif.classList.add("active");
        elements.focusGif.classList.remove("active");

        elements.restModeBtn.classList.add("active");
        elements.studyModeBtn.classList.remove("active");

        elements.restModeBtn.setAttribute("aria-pressed", "true");
        elements.studyModeBtn.setAttribute("aria-pressed", "false");
    }
}


// ========================================
// TIMER MANAGEMENT
// ========================================

function stopInterval() {
    if (state.intervalId !== null) {
        clearInterval(state.intervalId);
        state.intervalId = null;
    }
}


function cancelPendingTransition() {
    if (state.transitionTimeoutId !== null) {
        clearTimeout(state.transitionTimeoutId);
        state.transitionTimeoutId = null;
    }
}


function setMode(newMode, autoStart = false) {
    if (newMode !== "study" && newMode !== "rest") {
        return;
    }

    cancelPendingTransition();
    stopInterval();

    // Discard the previous incomplete session.
    state.mode = newMode;
    state.isRunning = false;
    state.deadline = null;
    state.startedAt = null;
    state.completionHandled = false;

    state.remainingSeconds =
        getDurationMinutes(newMode) * 60;

    state.plannedDurationSeconds = state.remainingSeconds;

    updateModeUI();
    updateTimerDisplay();
    updateControls();

    elements.timerStatus.textContent =
        "Ready when you are ♡";

    if (autoStart) {
        startTimer();
    }
}


function startTimer() {
    if (state.isRunning) {
        return;
    }

    cancelPendingTransition();

    if (state.remainingSeconds <= 0) {
        state.remainingSeconds =
            getDurationMinutes(state.mode) * 60;

        state.startedAt = null;
        state.completionHandled = false;
    }

    // Initialize session metadata only on the first start.
    // Resume must preserve the original start time and duration.
    if (state.startedAt === null) {
        state.startedAt = new Date().toISOString();

        state.plannedDurationSeconds =
            state.remainingSeconds;
    }

    state.isRunning = true;

    state.deadline =
        Date.now() + state.remainingSeconds * 1000;

    elements.timerStatus.textContent =
        state.mode === "study"
            ? "You're doing great! Keep going ♡"
            : "Relax and enjoy your break ☆";

    updateControls();
    updateCountdown();

    if (state.isRunning) {
        state.intervalId = setInterval(
            updateCountdown,
            250
        );
    }
}


function updateCountdown() {
    if (!state.isRunning || state.deadline === null) {
        return;
    }

    const millisecondsRemaining =
        state.deadline - Date.now();

    state.remainingSeconds = Math.max(
        0,
        Math.ceil(millisecondsRemaining / 1000)
    );

    updateTimerDisplay();

    if (millisecondsRemaining <= 0) {
        completeSession();
    }
}


function pauseTimer() {
    if (!state.isRunning) {
        return;
    }

    const millisecondsRemaining =
        state.deadline - Date.now();

    state.remainingSeconds = Math.max(
        0,
        Math.ceil(millisecondsRemaining / 1000)
    );

    stopInterval();

    state.isRunning = false;
    state.deadline = null;

    // Preserve startedAt.
    // Preserve plannedDurationSeconds.

    updateTimerDisplay();
    updateControls();

    elements.timerStatus.textContent =
        "Paused. Take your time ♡";
}


function resetTimer() {
    cancelPendingTransition();
    stopInterval();

    // Discard incomplete session metadata.
    state.isRunning = false;
    state.deadline = null;
    state.startedAt = null;
    state.completionHandled = false;

    state.remainingSeconds =
        getDurationMinutes(state.mode) * 60;

    state.plannedDurationSeconds =
        state.remainingSeconds;

    updateTimerDisplay();
    updateControls();

    elements.timerStatus.textContent =
        "Timer reset. Ready when you are ♡";
}


// ========================================
// SESSION STORAGE
// ========================================

function recordCompletedFocusSession() {
    const completedAt = new Date();

    const durationSeconds =
        state.plannedDurationSeconds;

    const startedAt = state.startedAt ||
        new Date(
            completedAt.getTime() - durationSeconds * 1000
        ).toISOString();

    const session = {
        id: globalThis.crypto?.randomUUID?.() ||
            `focus_${completedAt.getTime()}_${Math.random().toString(16).slice(2)}`,

        type: "focus",

        startedAt,

        completedAt: completedAt.toISOString(),

        durationMinutes: durationSeconds / 60,

        durationSeconds,

        status: "completed"
    };

    const result = addCompletedFocusSession(
        appData,
        session
    );

    Object.assign(appData, result.data);

    if (!result.saved) {
        console.error(
            "Could not save completed Focus session."
        );
    }

    // Refresh all statistics after attempting to save.
    updateProgress();

    return result.saved;
}


// ========================================
// SESSION COMPLETION
// ========================================

function completeSession() {
    if (state.completionHandled) {
        return;
    }

    state.completionHandled = true;

    stopInterval();

    state.isRunning = false;
    state.deadline = null;
    state.remainingSeconds = 0;

    updateTimerDisplay();
    updateControls();

    const finishedMode = state.mode;

    playNotificationSound(finishedMode);

    let sessionSaved = true;

    if (finishedMode === "study") {
        sessionSaved = recordCompletedFocusSession();

        elements.timerStatus.textContent = sessionSaved
            ? "Amazing! Focus session completed! ♡"
            : "Focus completed, but saving failed on this device.";
    } else {
        elements.timerStatus.textContent =
            "Break completed! Ready to focus again? ☆";
    }

    const nextMode =
        finishedMode === "study" ? "rest" : "study";

    state.transitionTimeoutId = setTimeout(() => {
        state.transitionTimeoutId = null;

        setMode(nextMode, true);

    }, CONFIG.transitionDelayMs);
}


// ========================================
// NOTIFICATION SOUND
// ========================================

const VALID_SOUND_NAMES = ["chime", "sparkle", "gentle"];


function isValidSoundName(soundName) {
    return VALID_SOUND_NAMES.includes(soundName);
}


function getSoundVolume() {
    const volume = appData.settings.volume;

    if (
        typeof volume !== "number" ||
        !Number.isFinite(volume) ||
        volume < 0 ||
        volume > 1
    ) {
        return 0.7;
    }

    return volume;
}


function playSoundPattern(soundName, volume = getSoundVolume()) {
    const patterns = {
        chime: {
            frequencies: [523.25, 659.25, 783.99],
            spacing: 0.25,
            duration: 0.65
        },

        sparkle: {
            frequencies: [783.99, 987.77, 1174.66, 1567.98],
            spacing: 0.13,
            duration: 0.35
        },

        gentle: {
            frequencies: [440, 523.25, 659.25],
            spacing: 0.32,
            duration: 0.85
        }
    };

    if (
        !isValidSoundName(soundName) ||
        typeof volume !== "number" ||
        !Number.isFinite(volume) ||
        volume <= 0 ||
        volume > 1
    ) {
        return;
    }

    try {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
            console.warn("Web Audio API is not supported.");
            return;
        }

        if (!audioContext || audioContext.state === "closed") {
            audioContext = new AudioContextClass();
        }

        const playMelody = () => {
            if (!audioContext || audioContext.state !== "running") {
                return;
            }

            const pattern = patterns[soundName];

            pattern.frequencies.forEach((frequency, index) => {
                const oscillator = audioContext.createOscillator();
                const gain = audioContext.createGain();

                oscillator.connect(gain);
                gain.connect(audioContext.destination);

                oscillator.type = "sine";
                oscillator.frequency.value = frequency;

                const startAt =
                    audioContext.currentTime + index * pattern.spacing;

                const peakVolume = 0.07 * volume;

                gain.gain.setValueAtTime(0.0001, startAt);

                gain.gain.exponentialRampToValueAtTime(
                    peakVolume,
                    startAt + 0.05
                );

                gain.gain.exponentialRampToValueAtTime(
                    0.0001,
                    startAt + pattern.duration
                );

                oscillator.start(startAt);
                oscillator.stop(startAt + pattern.duration + 0.05);

                oscillator.onended = () => {
                    oscillator.disconnect();
                    gain.disconnect();
                };
            });
        };

        if (audioContext.state === "suspended") {
            audioContext.resume()
                .then(playMelody)
                .catch(error => {
                    console.warn("Audio could not resume:", error);
                });

        } else if (audioContext.state === "running") {
            playMelody();
        }

    } catch (error) {
        console.warn("Audio playback unavailable:", error);
    }
}


function playNotificationSound(mode) {
    if (appData.settings.soundEnabled !== true) {
        return;
    }

    if (mode !== "study" && mode !== "rest") {
        return;
    }

    const soundName = mode === "study"
        ? appData.settings.focusSound
        : appData.settings.breakSound;

    const fallbackSound = mode === "study" ? "chime" : "gentle";

    playSoundPattern(
        isValidSoundName(soundName) ? soundName : fallbackSound
    );
}


// STATISTICS FORMATTING
// ========================================

function formatFocusMinutes(totalMinutes) {
    const minutes = Math.max(
        0,
        Math.round(totalMinutes)
    );

    if (minutes < 60) {
        return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
        return `${hours} hr`;
    }

    return `${hours} hr ${remainingMinutes} min`;
}


// ========================================
// WEEKLY CHART
// ========================================

function renderWeeklyChart(weekly) {
    const chart = elements.weeklyChart;

    chart.replaceChildren();

    const days = weekly.days;

    const maximumSessions = Math.max(
        1,
        ...days.map(day => day.sessionCount)
    );

    for (const day of days) {
        const dayElement = document.createElement("div");

        dayElement.className = "weekly-day";

        if (day.isToday) {
            dayElement.classList.add("today");
        }

        const label = document.createElement("span");
        label.className = "weekly-day-label";
        label.textContent = day.label;

        const barContainer = document.createElement("div");
        barContainer.className = "weekly-bar-container";

        const bar = document.createElement("div");
        bar.className = "weekly-bar";

        const heightPercent =
            day.sessionCount === 0
                ? 0
                : (day.sessionCount / maximumSessions) * 100;

        bar.style.height = `${heightPercent}%`;

        barContainer.appendChild(bar);

        const count = document.createElement("span");
        count.className = "weekly-day-count";
        count.textContent = String(day.sessionCount);

        dayElement.append(
            label,
            barContainer,
            count
        );

        dayElement.setAttribute(
            "aria-label",
            `${day.label}: ${day.sessionCount} sessions, ${day.focusMinutes} minutes`
        );

        chart.appendChild(dayElement);
    }

    elements.weeklySummary.textContent =
        `${weekly.totalSessions} sessions · ` +
        `${formatFocusMinutes(weekly.totalFocusMinutes)}`;
}


// ========================================
// DAILY PROGRESS AND PERSISTENT STATISTICS
// ========================================

function updateProgress() {
    const statistics = calculateStatistics(
        appData.sessions
    );

    // Today's progress.
    const completed = statistics.todaySessions;

    const goal = CONFIG.dailyGoal;

    elements.sessionCount.textContent =
        String(completed);

    elements.todayMinutes.textContent =
        `${statistics.todayFocusMinutes} min`;

    // Lifetime completed sessions.
    elements.allTimeSessions.textContent =
        String(statistics.totalSessions);

    // Daily goal progress bar.
    const progressPercent = Math.min(
        100,
        (completed / goal) * 100
    );

    elements.progressFill.style.width =
        `${progressPercent}%`;

    elements.progressBar.setAttribute(
        "aria-valuenow",
        String(Math.min(completed, goal))
    );

    // Daily progress hearts.
    const hearts =
        elements.progressHearts.querySelectorAll("span");

    hearts.forEach((heart, index) => {
        const isCompleted = index < Math.min(
            completed,
            goal
        );

        heart.textContent = isCompleted ? "♥" : "♡";

        heart.classList.toggle(
            "completed",
            isCompleted
        );
    });

    // Daily progress message.
    if (completed === 0) {
        elements.progressMessage.textContent =
            "Let's complete our first session!";

    } else if (completed < goal) {
        elements.progressMessage.textContent =
            "You're doing great! Keep going ♡";

    } else {
        elements.progressMessage.textContent =
            "Daily goal completed! So proud of you! ♡";
    }

    // ------------------------------------
    // STAGE 2: LIFETIME STATISTICS
    // ------------------------------------

    elements.totalFocusTime.textContent =
        formatFocusMinutes(statistics.totalFocusMinutes);

    elements.productiveDays.textContent =
        String(statistics.productiveDays);

    elements.averageFocusTime.textContent =
        formatFocusMinutes(statistics.averageFocusMinutes);

    // ------------------------------------
    // STAGE 2: WEEKLY STATISTICS
    // ------------------------------------

    renderWeeklyChart(statistics.weekly);

    // Stage 3: Refresh calendar and daily history.
    updateCalendar(appData.sessions);
}


// ========================================
// SETTINGS STORAGE
// ========================================

function persistDurationSettings() {
    const focusDuration =
        getDurationMinutes("study");

    const breakDuration =
        getDurationMinutes("rest");

    const result = saveSettings(appData, {
        focusDuration,
        breakDuration
    });

    Object.assign(appData, result.data);

    if (!result.saved) {
        elements.timerStatus.textContent =
            "Settings could not be saved on this device.";
    }
}


function handleDurationChange() {
    persistDurationSettings();

    if (state.isRunning) {
        elements.timerStatus.textContent =
            "Your current session is unchanged. New duration applies next time.";

        return;
    }

    state.remainingSeconds =
        getDurationMinutes(state.mode) * 60;

    state.plannedDurationSeconds =
        state.remainingSeconds;

    updateTimerDisplay();

    elements.timerStatus.textContent =
        "Duration updated and saved ♡";
}


// ========================================
// STAGE 4 — SOUND SETTINGS
// ========================================

function updateSoundControls() {
    const settings = appData.settings;
    const enabled = settings.soundEnabled !== false;

    elements.soundEnabled.checked = enabled;

    const volume = getSoundVolume();
    const percentage = Math.round(volume * 100);

    elements.soundVolume.value = String(percentage);
    elements.volumeValue.textContent = `${percentage}%`;

    const validSounds = ["chime", "sparkle", "gentle"];

    elements.focusSound.value =
        validSounds.includes(settings.focusSound)
            ? settings.focusSound
            : "chime";

    elements.breakSound.value =
        validSounds.includes(settings.breakSound)
            ? settings.breakSound
            : "gentle";

    elements.soundVolume.disabled = !enabled;
    elements.focusSound.disabled = !enabled;
    elements.breakSound.disabled = !enabled;
    elements.previewFocusSound.disabled = !enabled;
    elements.previewBreakSound.disabled = !enabled;
}


function persistSoundSettings(settings) {
    const result = saveSettings(appData, settings);

    Object.assign(appData, result.data);

    updateSoundControls();

    if (!result.saved) {
        elements.timerStatus.textContent =
            "Sound settings could not be saved on this device.";
    }
}


function handleSoundEnabledChange() {
    persistSoundSettings({
        soundEnabled: elements.soundEnabled.checked
    });
}


function handleSoundVolumeInput() {
    elements.volumeValue.textContent =
        `${elements.soundVolume.value}%`;
}


function handleSoundVolumeChange() {
    persistSoundSettings({
        volume: Number(elements.soundVolume.value) / 100
    });
}


function handleFocusSoundChange() {
    persistSoundSettings({
        focusSound: elements.focusSound.value
    });
}


function handleBreakSoundChange() {
    persistSoundSettings({
        breakSound: elements.breakSound.value
    });
}


function previewSelectedSound(soundName) {
    if (appData.settings.soundEnabled === false) {
        return;
    }

    playSoundPattern(soundName, getSoundVolume());
}


// ========================================
// APPLICATION INITIALIZATION
// ========================================

function initializeApp() {
    const settings = appData.settings;

    updateSoundControls();

    elements.studyDuration.value = String(
        clampDuration(
            settings.focusDuration,
            CONFIG.defaultFocusMinutes,
            CONFIG.maximumFocusMinutes
        )
    );

    elements.restDuration.value = String(
        clampDuration(
            settings.breakDuration,
            CONFIG.defaultBreakMinutes,
            CONFIG.maximumBreakMinutes
        )
    );

    state.mode = "study";

    state.remainingSeconds =
        getDurationMinutes("study") * 60;

    state.plannedDurationSeconds =
        state.remainingSeconds;

    // Display today's date.
    const today = new Date();

    elements.todayLabel.textContent =
        new Intl.DateTimeFormat(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric"
        }).format(today);

    // Initial UI rendering.
    updateModeUI();
    updateTimerDisplay();
    updateControls();

    // Calculate statistics from saved sessions.
    updateProgress();

    // Initialize Stage 3 calendar.
    initializeCalendar(appData.sessions);

    // Timer controls.
    elements.startBtn.addEventListener(
        "click",
        startTimer
    );

    elements.pauseBtn.addEventListener(
        "click",
        pauseTimer
    );

    elements.resetBtn.addEventListener(
        "click",
        resetTimer
    );

    // Mode switching.
    elements.studyModeBtn.addEventListener(
        "click",
        () => {
            if (state.mode !== "study") {
                setMode("study");
            }
        }
    );

    elements.restModeBtn.addEventListener(
        "click",
        () => {
            if (state.mode !== "rest") {
                setMode("rest");
            }
        }
    );

    // Duration settings.
    elements.studyDuration.addEventListener(
        "change",
        handleDurationChange
    );

    elements.restDuration.addEventListener(
        "change",
        handleDurationChange
    );

    // Stage 4: Sound settings.
    elements.soundEnabled.addEventListener(
        "change",
        handleSoundEnabledChange
    );

    elements.soundVolume.addEventListener(
        "input",
        handleSoundVolumeInput
    );

    elements.soundVolume.addEventListener(
        "change",
        handleSoundVolumeChange
    );

    elements.focusSound.addEventListener(
        "change",
        handleFocusSoundChange
    );

    elements.breakSound.addEventListener(
        "change",
        handleBreakSoundChange
    );

    elements.previewFocusSound.addEventListener(
        "click",
        () => previewSelectedSound(elements.focusSound.value)
    );

    elements.previewBreakSound.addEventListener(
        "click",
        () => previewSelectedSound(elements.breakSound.value)
    );

    console.info("♡ Little Focus 2.0 initialized.", {
        storedFocusSessions: appData.sessions.length,
        storageKey: "littleFocus.appData",
        schemaVersion: 1
    });
}


initializeApp();