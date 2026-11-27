-- Dajeongrok / Cloudflare D1 (SQLite) baseline: DESIGN-ONLY migration, NOT applied to any live DB.
-- All access MUST pass through a server-side authenticated Worker. D1 does not implement PostgreSQL RLS.
-- IDs are unguessable UUIDs generated on the SERVER; all individual record reads/writes must include user_id.
-- Text columns below contain AES-256-GCM encrypted bytes, never plaintext diary content.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT NOT NULL PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'deleting', 'suspended')),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- Store only HMAC-SHA256(TOSS_ANON_ID_PEPPER, verified anonKey), never a client-supplied hash or raw key.
CREATE TABLE IF NOT EXISTS user_identities (
  provider TEXT NOT NULL CHECK (provider IN ('toss_anonymous', 'toss_login')),
  subject_hmac TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (provider, subject_hmac),
  UNIQUE (provider, user_id)
);
CREATE INDEX IF NOT EXISTS idx_identities_user ON user_identities(user_id);

-- Opaque random session token; ONLY SHA-256(token) is stored, bearer token exists in client memory.
-- Session lookup includes both active status and expiry; deleting a user CASCADE-revokes every session.
CREATE TABLE IF NOT EXISTS app_sessions (
  token_sha256 TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  last_seen_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON app_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON app_sessions(expires_at);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT NOT NULL PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  boundary_hour INTEGER NOT NULL DEFAULT 0 CHECK (boundary_hour BETWEEN 0 AND 4),
  reduce_motion INTEGER NOT NULL DEFAULT 0 CHECK (reduce_motion IN (0,1)),
  onboarding_seen_at TEXT,
  rediscover_unlocked_at TEXT, -- preserve unlock even if diary entries are later deleted
  post_goal_copy_counter INTEGER NOT NULL DEFAULT 0 CHECK (post_goal_copy_counter >= 0),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- A full journal body, optional title and selected question are encrypted independently.
-- AES-GCM: fresh random 12-byte nonce per encrypted FIELD, authenticated AAD must bind user_id, row id and field.
-- key_version supports master-key rotation; NEVER reuse a nonce with the same encryption key.
CREATE TABLE IF NOT EXISTS diary_entries (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  entry_date TEXT NOT NULL CHECK (length(entry_date) = 10 AND entry_date GLOB '????-??-??'),
  title_ciphertext BLOB,
  title_iv BLOB,
  body_ciphertext BLOB NOT NULL,
  body_iv BLOB NOT NULL,
  prompt_ciphertext BLOB,
  prompt_iv BLOB,
  key_version INTEGER NOT NULL DEFAULT 1 CHECK (key_version >= 1),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((title_ciphertext IS NULL AND title_iv IS NULL) OR
         (title_ciphertext IS NOT NULL AND length(title_iv) = 12)),
  CHECK ((prompt_ciphertext IS NULL AND prompt_iv IS NULL) OR
         (prompt_ciphertext IS NOT NULL AND length(prompt_iv) = 12)),
  CHECK (length(body_iv) = 12),
  UNIQUE (id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_diary_user_date ON diary_entries(user_id, entry_date DESC, created_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_diary_user_created ON diary_entries(user_id, created_at DESC, id);

CREATE TABLE IF NOT EXISTS diary_reflections (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL,
  reflection_date TEXT NOT NULL CHECK (length(reflection_date) = 10 AND reflection_date GLOB '????-??-??'),
  body_ciphertext BLOB NOT NULL,
  body_iv BLOB NOT NULL CHECK (length(body_iv) = 12),
  key_version INTEGER NOT NULL DEFAULT 1 CHECK (key_version >= 1),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  -- Enforce ownership of the referenced diary at the DB layer too.
  FOREIGN KEY (entry_id, user_id) REFERENCES diary_entries(id, user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reflection_owner_parent ON diary_reflections(user_id, entry_id, created_at);

-- This information is authored by the user too: encrypt the graphic suggestion.
CREATE TABLE IF NOT EXISTS graphic_ideas (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  artwork_month TEXT NOT NULL CHECK (length(artwork_month) = 7 AND artwork_month GLOB '????-??'),
  text_ciphertext BLOB NOT NULL,
  text_iv BLOB NOT NULL CHECK (length(text_iv) = 12),
  key_version INTEGER NOT NULL DEFAULT 1 CHECK (key_version >= 1),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_idea_owner_month ON graphic_ideas(user_id, artwork_month);

-- Onboarding history is per verified user and versioned artwork. Only mark when REAL preview was delivered.
CREATE TABLE IF NOT EXISTS monthly_artwork_seen (
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  artwork_month TEXT NOT NULL CHECK (length(artwork_month) = 7 AND artwork_month GLOB '????-??'),
  artwork_key TEXT NOT NULL,
  seen_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (user_id, artwork_month, artwork_key)
);

-- Not a user diary store: release metadata only. Every key must still resolve to reviewed, compiled app code.
-- No remote executable scripts and no remote arbitrary asset URLs.
CREATE TABLE IF NOT EXISTS artwork_releases (
  artwork_key TEXT NOT NULL PRIMARY KEY,
  artwork_month TEXT NOT NULL,
  public_title TEXT NOT NULL,
  release_state TEXT NOT NULL CHECK (release_state IN ('planned', 'ready', 'retired')),
  target_days INTEGER CHECK (target_days IS NULL OR target_days > 0),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE (artwork_month, artwork_key)
);
