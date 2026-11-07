import { getLocalDateKey } from "./storage.js";

/**
 * Returns true when a session is a valid completed Focus session.
 */
function isCompletedFocusSession(session) {
    return (
        session &&
        session.type === "focus" &&
        session.status === "completed" &&
        typeof session.completedAt === "string" &&
        Number.isFinite(Date.parse(session.completedAt))
    );
}

/**
 * Safely obtains a session duration in seconds.
 */
function getSessionDurationSeconds(session) {
    if (
        Number.isFinite(session.durationSeconds) &&
        session.durationSeconds > 0
    ) {
        return session.durationSeconds;
    }

    if (
        Number.isFinite(session.durationMinutes) &&
        session.durationMinutes > 0
    ) {
        return session.durationMinutes * 60;
    }

    return 0;
}

/**
 * Returns the Monday of the week containing the given date.
 */
function getWeekStart(date) {
    const result = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );

    const day = result.getDay();
    const daysSinceMonday = (day + 6) % 7;

    result.setDate(result.getDate() - daysSinceMonday);

    return result;
}

/**
 * Creates an empty daily statistics record.
 */
function createEmptyDay(date, todayKey) {
    return {
        dateKey: getLocalDateKey(date),
        label: new Intl.DateTimeFormat(undefined, {
            weekday: "short"
        }).format(date),

        dayNumber: date.getDate(),
        sessionCount: 0,
        focusSeconds: 0,
        focusMinutes: 0,
        isToday: getLocalDateKey(date) === todayKey
    };
}

/**
 * Calculates all persistent statistics from completed Focus sessions.
 *
 * Sessions are grouped by their completion date in the user's
 * local timezone.
 */
export function calculateStatistics(
    sessions = [],
    referenceDate = new Date()
) {
    const todayKey = getLocalDateKey(referenceDate);

    const validSessions = sessions.filter(
        isCompletedFocusSession
    );

    let totalFocusSeconds = 0;
    let todayFocusSeconds = 0;
    let todaySessions = 0;

    const productiveDateKeys = new Set();

    const weekStart = getWeekStart(referenceDate);

    const weeklyDays = Array.from(
        { length: 7 },
        (_, index) => {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + index);

            return createEmptyDay(date, todayKey);
        }
    );

    const weeklyDayMap = new Map(
        weeklyDays.map(day => [day.dateKey, day])
    );

    for (const session of validSessions) {
        const completedAt = new Date(session.completedAt);
        const dateKey = getLocalDateKey(completedAt);

        const durationSeconds =
            getSessionDurationSeconds(session);

        if (durationSeconds <= 0) continue;

        totalFocusSeconds += durationSeconds;

        productiveDateKeys.add(dateKey);

        if (dateKey === todayKey) {
            todaySessions += 1;
            todayFocusSeconds += durationSeconds;
        }

        const weeklyDay = weeklyDayMap.get(dateKey);

        if (weeklyDay) {
            weeklyDay.sessionCount += 1;
            weeklyDay.focusSeconds += durationSeconds;
        }
    }

    for (const day of weeklyDays) {
        day.focusMinutes = Math.round(
            day.focusSeconds / 60
        );
    }

    const weeklySessions = weeklyDays.reduce(
        (total, day) => total + day.sessionCount,
        0
    );

    const weeklyFocusSeconds = weeklyDays.reduce(
        (total, day) => total + day.focusSeconds,
        0
    );

    return {
        totalSessions: validSessions.length,

        totalFocusSeconds,

        totalFocusMinutes: Math.round(
            totalFocusSeconds / 60
        ),

        todaySessions,

        todayFocusSeconds,

        todayFocusMinutes: Math.round(
            todayFocusSeconds / 60
        ),

        productiveDays: productiveDateKeys.size,

        averageFocusMinutes: validSessions.length > 0
            ? Math.round(
                totalFocusSeconds / validSessions.length / 60
            )
            : 0,

        weekly: {
            startDate: getLocalDateKey(weekStart),

            endDate: weeklyDays[6].dateKey,

            totalSessions: weeklySessions,

            totalFocusSeconds: weeklyFocusSeconds,

            totalFocusMinutes: Math.round(
                weeklyFocusSeconds / 60
            ),

            productiveDays: weeklyDays.filter(
                day => day.sessionCount > 0
            ).length,

            days: weeklyDays
        }
    };
}
