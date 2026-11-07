const STORAGE_KEY = "littleFocus.appData";
const CURRENT_VERSION = 1;

const DEFAULT_SETTINGS = {
    focusDuration: 25,
    breakDuration: 5,
    soundEnabled: true,
    volume: 0.7,
    focusSound: "chime",
    breakSound: "gentle"
};

const VALID_SOUND_NAMES = ["chime", "sparkle", "gentle"];

function normalizeSettings(settings) {
    return {
        focusDuration:
            Number.isInteger(settings.focusDuration) &&
            settings.focusDuration >= 1 &&
            settings.focusDuration <= 180
                ? settings.focusDuration
                : DEFAULT_SETTINGS.focusDuration,

        breakDuration:
            Number.isInteger(settings.breakDuration) &&
            settings.breakDuration >= 1 &&
            settings.breakDuration <= 60
                ? settings.breakDuration
                : DEFAULT_SETTINGS.breakDuration,

        soundEnabled:
            typeof settings.soundEnabled === "boolean"
                ? settings.soundEnabled
                : DEFAULT_SETTINGS.soundEnabled,

        volume:
            typeof settings.volume === "number" &&
            Number.isFinite(settings.volume) &&
            settings.volume >= 0 &&
            settings.volume <= 1
                ? settings.volume
                : DEFAULT_SETTINGS.volume,

        focusSound:
            VALID_SOUND_NAMES.includes(settings.focusSound)
                ? settings.focusSound
                : DEFAULT_SETTINGS.focusSound,

        breakSound:
            VALID_SOUND_NAMES.includes(settings.breakSound)
                ? settings.breakSound
                : DEFAULT_SETTINGS.breakSound
    };
}

// Prevent accidental overwriting if existing data cannot be read
// or belongs to an unsupported schema version.
let storageWritable = true;

function createDefaultData() {
    return {
        version: CURRENT_VERSION,
        sessions: [],
        settings: { ...DEFAULT_SETTINGS }
    };
}

function isValidDate(value) {
    return (
        typeof value === "string" &&
        Number.isFinite(Date.parse(value))
    );
}

function isValidSession(session) {
    if (!session || typeof session !== "object") {
        return false;
    }

    return (
        typeof session.id === "string" &&
        session.id.trim().length > 0 &&

        session.type === "focus" &&

        isValidDate(session.startedAt) &&
        isValidDate(session.completedAt) &&

        Number.isInteger(session.durationSeconds) &&
        session.durationSeconds > 0 &&

        Number.isFinite(session.durationMinutes) &&
        session.durationMinutes > 0 &&

        session.durationMinutes === session.durationSeconds / 60 &&

        session.status === "completed"
    );
}

function isValidDataObject(data) {
    return (
        data &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        Array.isArray(data.sessions)
    );
}

export function loadAppData() {
    storageWritable = true;

    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return createDefaultData();
        }

        const parsed = JSON.parse(raw);

        if (!parsed || typeof parsed !== "object") {
            throw new Error("Stored data has an invalid structure.");
        }

        // Never overwrite data from another schema version.
        if (parsed.version !== CURRENT_VERSION) {
            storageWritable = false;

            console.error(
                "Unsupported Little Focus data version:",
                parsed.version
            );

            return createDefaultData();
        }

        // Invalid top-level structure may indicate corrupted data.
        if (!isValidDataObject(parsed)) {
            throw new Error("Stored session data is invalid.");
        }

        const validSessions = [];
        const knownIds = new Set();

        for (const session of parsed.sessions) {
            if (!isValidSession(session)) {
                console.warn("Ignoring invalid session:", session);
                continue;
            }

            if (knownIds.has(session.id)) {
                console.warn(
                    "Ignoring duplicate session ID:",
                    session.id
                );
                continue;
            }

            knownIds.add(session.id);
            validSessions.push(session);
        }

        const storedSettings =
            parsed.settings &&
            typeof parsed.settings === "object" &&
            !Array.isArray(parsed.settings)
                ? parsed.settings
                : {};

        const settings = normalizeSettings({
            ...DEFAULT_SETTINGS,
            ...storedSettings
        });

        return {
            version: CURRENT_VERSION,
            sessions: validSessions,
            settings
        };

    } catch (error) {
        storageWritable = false;

        console.error(
            "Could not read Little Focus data:",
            error
        );

        return createDefaultData();
    }
}

export function saveAppData(data) {
    if (!storageWritable) {
        console.error(
            "Saving disabled to protect existing Little Focus data."
        );

        return false;
    }

    if (
        !data ||
        data.version !== CURRENT_VERSION ||
        !Array.isArray(data.sessions) ||
        !data.settings ||
        typeof data.settings !== "object"
    ) {
        console.error("Invalid Little Focus data. Save cancelled.");
        return false;
    }

    try {
        const normalizedData = {
            ...data,
            settings: normalizeSettings(data.settings)
        };

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(normalizedData)
        );

        return true;

    } catch (error) {
        console.error(
            "Could not save Little Focus data:",
            error
        );

        return false;
    }
}

export function addCompletedFocusSession(data, session) {
    if (!isValidSession(session)) {
        console.error(
            "Invalid completed Focus session. Session rejected:",
            session
        );

        return {
            data,
            saved: false,
            duplicate: false
        };
    }

    // Prevent duplicate session IDs.
    const alreadyExists = data.sessions.some(
        existingSession => existingSession.id === session.id
    );

    if (alreadyExists) {
        console.warn(
            "Duplicate Focus session rejected:",
            session.id
        );

        return {
            data,
            saved: true,
            duplicate: true
        };
    }

    const nextData = {
        ...data,
        sessions: [
            ...data.sessions,
            session
        ]
    };

    const saved = saveAppData(nextData);

    return {
        data: saved ? nextData : data,
        saved,
        duplicate: false
    };
}

export function saveSettings(data, settings) {
    const nextData = {
        ...data,
        settings: normalizeSettings({
            ...data.settings,
            ...settings
        })
    };

    const saved = saveAppData(nextData);

    return {
        data: saved ? nextData : data,
        saved
    };
}

export function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}