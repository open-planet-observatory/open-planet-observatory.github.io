-- Owlmanac games: scores, Forecast Desk guesses, opt-in nicknames. No IP addresses, emails or device details are stored.
-- player = SHA-256 of a random token the player's browser makes and keeps (the token itself is never stored).
CREATE TABLE IF NOT EXISTS players (
  player TEXT PRIMARY KEY,
  name TEXT,                 -- NULL unless the player chose a nickname
  name_key TEXT UNIQUE,      -- lower-case name, for uniqueness
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS scores (
  game TEXT NOT NULL,        -- woe | sky | hunt | fd
  day TEXT NOT NULL,         -- YYYY-MM-DD (UTC; sky uses the player's own date) or the hunt id
  player TEXT NOT NULL,
  score INTEGER NOT NULL,
  max INTEGER NOT NULL,
  verified INTEGER NOT NULL, -- 1 = scored by the server from the published answers; 0 = self-reported
  detail TEXT,               -- small JSON (per-round points), never a location of the player
  at INTEGER NOT NULL,
  PRIMARY KEY (game, day, player)
);
CREATE INDEX IF NOT EXISTS scores_board ON scores (game, day, score DESC);
CREATE TABLE IF NOT EXISTS fd_guesses (
  day TEXT NOT NULL, qid TEXT NOT NULL, player TEXT NOT NULL,
  g REAL NOT NULL, lo REAL NOT NULL, hi REAL NOT NULL, at INTEGER NOT NULL,
  PRIMARY KEY (day, qid, player)
);
