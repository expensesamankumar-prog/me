-- Table for site statistics (visits, etc.)
CREATE TABLE IF NOT EXISTS site_stats (
    id INTEGER PRIMARY KEY,
    total_visits INTEGER DEFAULT 0,
    last_login TEXT,
    last_update TEXT
);

-- Table for global settings (theme, etc.)
CREATE TABLE IF NOT EXISTS global_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Table for visitors (Google Login users)
CREATE TABLE IF NOT EXISTS visitors (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for contact messages
CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for user preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    theme_color TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initialize default values
INSERT OR IGNORE INTO site_stats (id, total_visits, last_login, last_update) 
VALUES (1, 1284, '2026-03-15 15:45:00', '2026-03-15 15:45:00');

INSERT OR IGNORE INTO global_settings (key, value) 
VALUES ('theme', 'gold');
