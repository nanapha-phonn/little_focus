// ========================================
// LITTLE FOCUS — STAGE 3
// DAILY CALENDAR AND SESSION HISTORY
// ========================================

const state = {
    currentMonth: new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
    ),

    selectedDate: getDateKey(new Date()),
    sessions: []
};


// ========================================
// DATE HELPERS
// ========================================

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);

    return new Date(year, month - 1, day);
}


function formatDate(date, options = {}) {
    return new Intl.DateTimeFormat(undefined, options).format(date);
}


function getSessionsForDate(dateKey) {
    return state.sessions.filter(session => {
        if (
            session.type !== "focus" ||
            session.status !== "completed" ||
            typeof session.completedAt !== "string"
        ) {
            return false;
        }

        const completedAt = new Date(session.completedAt);

        if (Number.isNaN(completedAt.getTime())) {
            return false;
        }

        return getDateKey(completedAt) === dateKey;
    });
}


// ========================================
// CALENDAR GENERATION
// ========================================

function getCalendarDays() {
    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday-first calendar.
    const startingOffset = (firstDay.getDay() + 6) % 7;

    const totalDays = lastDay.getDate();

    const days = [];

    // Previous month's dates.
    for (let i = 0; i < startingOffset; i++) {
        days.push({
            date: new Date(year, month, i - startingOffset + 1),
            currentMonth: false
        });
    }

    // Current month's dates.
    for (let day = 1; day <= totalDays; day++) {
        days.push({
            date: new Date(year, month, day),
            currentMonth: true
        });
    }

    // Complete the final week.
    while (days.length % 7 !== 0) {
        const nextDay = days.length - startingOffset - totalDays + 1;

        days.push({
            date: new Date(year, month + 1, nextDay),
            currentMonth: false
        });
    }

    return days;
}


// ========================================
// MONTH NAVIGATION
// ========================================

function changeMonth(amount) {
    state.currentMonth = new Date(
        state.currentMonth.getFullYear(),
        state.currentMonth.getMonth() + amount,
        1
    );

    renderCalendar();
}


// ========================================
// CALENDAR RENDERING
// ========================================

function renderCalendar() {
    const calendarGrid = document.getElementById("calendarGrid");
    const monthLabel = document.getElementById("calendarMonth");

    if (!calendarGrid || !monthLabel) {
        return;
    }

    calendarGrid.replaceChildren();

    monthLabel.textContent = formatDate(state.currentMonth, {
        month: "long",
        year: "numeric"
    });

    const todayKey = getDateKey(new Date());

    for (const item of getCalendarDays()) {
        const date = item.date;
        const dateKey = getDateKey(date);

        const sessions = getSessionsForDate(dateKey);

        const button = document.createElement("button");

        button.type = "button";
        button.className = "calendar-day";
        button.textContent = String(date.getDate());

        if (!item.currentMonth) {
            button.classList.add("other-month");
        }

        if (dateKey === todayKey) {
            button.classList.add("today");
        }

        if (dateKey === state.selectedDate) {
            button.classList.add("selected");
        }

        if (sessions.length > 0) {
            button.classList.add("has-sessions");

            const indicator = document.createElement("span");
            indicator.className = "calendar-indicator";
            indicator.setAttribute("aria-hidden", "true");

            button.appendChild(indicator);
        }

        button.setAttribute(
            "aria-label",
            `${formatDate(date, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
            })}, ${sessions.length} completed Focus sessions`
        );

        button.setAttribute(
            "aria-pressed",
            String(dateKey === state.selectedDate)
        );

        button.addEventListener("click", () => {
            state.selectedDate = dateKey;

            // If an adjacent-month date is selected,
            // move the calendar to that month.
            if (!item.currentMonth) {
                state.currentMonth = new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    1
                );
            }

            renderCalendar();
            renderDailyHistory();
        });

        calendarGrid.appendChild(button);
    }
}


// ========================================
// DAILY HISTORY
// ========================================

function renderDailyHistory() {
    const historyDate = document.getElementById("historyDate");
    const historySummary = document.getElementById("historySummary");
    const historyList = document.getElementById("historyList");

    if (!historyDate || !historySummary || !historyList) {
        return;
    }

    historyList.replaceChildren();

    const selectedDate = parseDateKey(state.selectedDate);

    const sessions = getSessionsForDate(state.selectedDate);

    const totalSeconds = sessions.reduce((total, session) => {
        return total + (
            Number(session.durationSeconds) ||
            Number(session.durationMinutes) * 60 ||
            0
        );
    }, 0);

    historyDate.textContent = formatDate(selectedDate, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
    });

    historySummary.textContent =
        `${sessions.length} completed sessions · ${formatDuration(totalSeconds)}`;

    if (sessions.length === 0) {
        const empty = document.createElement("div");
        empty.className = "history-empty";

        const icon = document.createElement("span");
        icon.className = "history-empty-icon";
        icon.textContent = "♡";

        const title = document.createElement("strong");
        title.textContent = "No completed sessions yet";

        const description = document.createElement("p");
        description.textContent = "Your little wins will appear here.";

        empty.append(icon, title, description);
        historyList.appendChild(empty);

        return;
    }

    const sortedSessions = [...sessions].sort((a, b) => {
        return new Date(a.completedAt) - new Date(b.completedAt);
    });

    sortedSessions.forEach((session, index) => {
        const completedAt = new Date(session.completedAt);

        const durationSeconds =
            Number(session.durationSeconds) ||
            Number(session.durationMinutes) * 60 ||
            0;

        const item = document.createElement("article");
        item.className = "history-session";

        const number = document.createElement("span");
        number.className = "history-session-number";
        number.textContent = String(index + 1);

        const details = document.createElement("div");
        details.className = "history-session-details";

        const title = document.createElement("strong");
        title.textContent = "Focus session";

        const time = document.createElement("span");
        time.textContent = formatDate(completedAt, {
            hour: "2-digit",
            minute: "2-digit"
        });

        details.append(title, time);

        const duration = document.createElement("span");
        duration.className = "history-session-duration";
        duration.textContent = formatDuration(durationSeconds);

        item.append(number, details, duration);

        historyList.appendChild(item);
    });
}


// ========================================
// DURATION FORMATTING
// ========================================

function formatDuration(seconds) {
    const minutes = Math.round(seconds / 60);

    if (minutes < 60) {
        return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return remainingMinutes === 0
        ? `${hours} hr`
        : `${hours} hr ${remainingMinutes} min`;
}


// ========================================
// INITIALIZATION
// ========================================

export function initializeCalendar(sessions = []) {
    state.sessions = Array.isArray(sessions) ? sessions : [];

    const previousButton = document.getElementById("previousMonthBtn");
    const nextButton = document.getElementById("nextMonthBtn");

    if (!previousButton || !nextButton) {
        console.error("Calendar navigation elements are missing.");
        return;
    }

    previousButton.addEventListener("click", () => {
        changeMonth(-1);
    });

    nextButton.addEventListener("click", () => {
        changeMonth(1);
    });

    renderCalendar();
    renderDailyHistory();
}


// ========================================
// REFRESH AFTER COMPLETED SESSION
// ========================================

export function updateCalendar(sessions = []) {
    state.sessions = Array.isArray(sessions) ? sessions : [];

    renderCalendar();
    renderDailyHistory();
}
