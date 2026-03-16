DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS transactions;

CREATE TABLE rooms (
  code TEXT PRIMARY KEY,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE players (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL,
  name TEXT NOT NULL,
  cash INTEGER DEFAULT 1500,
  income INTEGER DEFAULT 200,
  land INTEGER DEFAULT 0,
  homes INTEGER DEFAULT 0,
  is_banker BOOLEAN DEFAULT FALSE,
  turns INTEGER DEFAULT 0,
  FOREIGN KEY (room_code) REFERENCES rooms(code)
);

CREATE TABLE loans (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'emergency', 'normal', 'dev'
  amount INTEGER NOT NULL,
  terms INTEGER NOT NULL,
  remaining INTEGER NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'paid', 'defaulted'
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL,
  from_id TEXT, -- NULL for Bank
  to_id TEXT,   -- NULL for Bank
  amount INTEGER NOT NULL,
  description TEXT,
  timestamp INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (room_code) REFERENCES rooms(code)
);
