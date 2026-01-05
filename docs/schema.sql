-- ============================================================================
-- CARD GAME POC - DATABASE SCHEMA (Pseudo-code SQL)
-- ============================================================================
-- This schema covers multiplayer card games with support for:
--   - Multiple game types (blackjack, ride-the-bus, etc.)
--   - Room/lobby system with host management
--   - Player persistence across sessions
--   - Multi-device support
--   - Game state tracking (hands, bets, payouts)
-- ============================================================================

-- ============================================================================
-- ENUMS / LOOKUP TYPES
-- ============================================================================

CREATE TYPE game_category AS ENUM ('casino', 'drinking', 'party');

CREATE TYPE game_type AS ENUM ('blackjack', 'ride-the-bus');

CREATE TYPE player_status AS ENUM ('playing', 'stay', 'bust', 'blackjack');

CREATE TYPE blackjack_phase AS ENUM ('betting', 'dealing', 'player-turn', 'dealer-turn', 'round-over');

CREATE TYPE suit AS ENUM ('hearts', 'diamonds', 'clubs', 'spades');

CREATE TYPE rank AS ENUM ('2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A');


-- ============================================================================
-- PLAYERS - Core user/player identity (persists across sessions)
-- ============================================================================

CREATE TABLE players (
    id              VARCHAR(50) PRIMARY KEY,    -- e.g., 'pl_a1b2c3d4-...'
    name            VARCHAR(100) NOT NULL,
    
    -- Stats & Metadata
    is_guest        BOOLEAN DEFAULT TRUE,
    games_played    INTEGER DEFAULT 0,
    total_winnings  BIGINT DEFAULT 0,           -- Lifetime winnings tracking
    
    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Optional: for registered users
    email           VARCHAR(255) UNIQUE,
    password_hash   VARCHAR(255),
    
    CONSTRAINT valid_player_id CHECK (id LIKE 'pl_%')
);

CREATE INDEX idx_players_last_seen ON players(last_seen_at);
CREATE INDEX idx_players_name ON players(name);


-- ============================================================================
-- DEVICES - Track devices for multi-device support
-- ============================================================================

CREATE TABLE devices (
    id              VARCHAR(50) PRIMARY KEY,    -- e.g., 'dv_...'
    player_id       VARCHAR(50) REFERENCES players(id) ON DELETE SET NULL,
    
    -- Device info
    user_agent      TEXT,
    fingerprint     VARCHAR(255),               -- Browser/device fingerprint
    
    -- Timestamps
    first_seen_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_device_id CHECK (id LIKE 'dv_%')
);

CREATE INDEX idx_devices_player ON devices(player_id);


-- ============================================================================
-- SESSIONS - Active connections/sessions
-- ============================================================================

CREATE TABLE sessions (
    id              VARCHAR(50) PRIMARY KEY,    -- e.g., 'ss_...'
    player_id       VARCHAR(50) REFERENCES players(id) ON DELETE CASCADE,
    device_id       VARCHAR(50) REFERENCES devices(id) ON DELETE SET NULL,
    room_id         VARCHAR(6) REFERENCES rooms(id) ON DELETE SET NULL,
    
    -- Connection state
    is_connected    BOOLEAN DEFAULT TRUE,
    
    -- Connection metadata
    ip_address      INET,
    user_agent      TEXT,
    
    -- Timestamps
    started_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at        TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_session_id CHECK (id LIKE 'ss_%')
);

CREATE INDEX idx_sessions_player ON sessions(player_id);
CREATE INDEX idx_sessions_room ON sessions(room_id);
CREATE INDEX idx_sessions_connected ON sessions(is_connected) WHERE is_connected = TRUE;


-- ============================================================================
-- GAME TYPES - Available game definitions (metadata)
-- ============================================================================

CREATE TABLE game_types (
    type            game_type PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,      -- e.g., 'Blackjack'
    category        game_category NOT NULL,
    description     TEXT,
    
    -- Player limits
    min_players     INTEGER NOT NULL DEFAULT 1,
    max_players     INTEGER NOT NULL DEFAULT 6,
    
    -- Display
    icon            VARCHAR(10),                -- Emoji icon
    
    -- State
    is_enabled      BOOLEAN DEFAULT TRUE
);

-- Seed data
INSERT INTO game_types (type, name, category, description, min_players, max_players, icon) VALUES
    ('blackjack', 'Blackjack', 'casino', 'Beat the dealer by getting closer to 21 without going over', 1, 6, '🃏'),
    ('ride-the-bus', 'Ride the Bus', 'drinking', 'A classic drinking card game with multiple rounds', 2, 8, '🚌');


-- ============================================================================
-- ROOMS - Game rooms/tables (lobbies)
-- ============================================================================

CREATE TABLE rooms (
    id              VARCHAR(6) PRIMARY KEY,     -- Human-friendly code: 'A3B5KM'
    name            VARCHAR(100) NOT NULL,
    game_type       game_type NOT NULL REFERENCES game_types(type),
    host_player_id  VARCHAR(50) NOT NULL REFERENCES players(id),
    
    -- Capacity
    max_players     INTEGER NOT NULL DEFAULT 6,
    
    -- Room settings
    is_private      BOOLEAN DEFAULT FALSE,
    min_bet         INTEGER DEFAULT 10,
    max_bet         INTEGER DEFAULT 1000,
    deck_count      INTEGER DEFAULT 1,
    
    -- State
    is_playing      BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at      TIMESTAMP WITH TIME ZONE,   -- When game started
    ended_at        TIMESTAMP WITH TIME ZONE,   -- When room closed
    
    CONSTRAINT valid_room_id CHECK (id ~ '^[23456789ABCDEFGHKLMNPQRSTUVWXYZ]{6}$')
);

CREATE INDEX idx_rooms_host ON rooms(host_player_id);
CREATE INDEX idx_rooms_game_type ON rooms(game_type);
CREATE INDEX idx_rooms_public ON rooms(is_private, is_playing) WHERE is_private = FALSE;


-- ============================================================================
-- ROOM PLAYERS - Players currently in a room (junction table)
-- ============================================================================

CREATE TABLE room_players (
    room_id         VARCHAR(6) REFERENCES rooms(id) ON DELETE CASCADE,
    player_id       VARCHAR(50) REFERENCES players(id) ON DELETE CASCADE,
    
    -- Room state
    is_ready        BOOLEAN DEFAULT FALSE,
    is_host         BOOLEAN DEFAULT FALSE,
    chips           INTEGER NOT NULL DEFAULT 1000,
    
    -- Order
    seat_position   INTEGER,                    -- Optional seating order
    
    -- Timestamps
    joined_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at         TIMESTAMP WITH TIME ZONE,
    
    PRIMARY KEY (room_id, player_id)
);

CREATE INDEX idx_room_players_room ON room_players(room_id);
CREATE INDEX idx_room_players_player ON room_players(player_id);


-- ============================================================================
-- GAME ROUNDS - Individual rounds within a game session
-- ============================================================================

CREATE TABLE game_rounds (
    id              SERIAL PRIMARY KEY,
    room_id         VARCHAR(6) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    round_number    INTEGER NOT NULL,
    
    -- Phase tracking
    phase           blackjack_phase DEFAULT 'betting',
    
    -- Deck state (for resumability)
    deck_seed       BIGINT,                     -- Random seed for deck shuffle
    cards_dealt     INTEGER DEFAULT 0,
    
    -- Timestamps
    started_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at        TIMESTAMP WITH TIME ZONE,
    
    UNIQUE (room_id, round_number)
);

CREATE INDEX idx_game_rounds_room ON game_rounds(room_id);


-- ============================================================================
-- HANDS - Player hands in a round (supports split hands)
-- ============================================================================

CREATE TABLE hands (
    id                  VARCHAR(20) PRIMARY KEY,    -- e.g., 'hd_a1b2c3d4'
    round_id            INTEGER NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
    player_id           VARCHAR(50) NOT NULL REFERENCES players(id),
    
    -- Split hand support
    parent_hand_id      VARCHAR(20) REFERENCES hands(id) ON DELETE CASCADE,
    is_split            BOOLEAN DEFAULT FALSE,
    
    -- Hand state
    status              player_status DEFAULT 'playing',
    is_dealer           BOOLEAN DEFAULT FALSE,
    
    -- Current player tracking
    is_current_turn     BOOLEAN DEFAULT FALSE,
    turn_order          INTEGER,                    -- Order in which hands are played
    
    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_hand_id CHECK (id LIKE 'hd_%')
);

CREATE INDEX idx_hands_round ON hands(round_id);
CREATE INDEX idx_hands_player ON hands(player_id);
CREATE INDEX idx_hands_parent ON hands(parent_hand_id);


-- ============================================================================
-- CARDS - Cards in a hand
-- ============================================================================

CREATE TABLE hand_cards (
    id              SERIAL PRIMARY KEY,
    hand_id         VARCHAR(20) NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
    
    -- Card info
    suit            suit NOT NULL,
    rank            rank NOT NULL,
    value           INTEGER NOT NULL,           -- Game-specific value (e.g., blackjack: K=10, A=11)
    
    -- Visibility
    is_hidden       BOOLEAN DEFAULT FALSE,      -- For dealer's hole card
    
    -- Order dealt
    position        INTEGER NOT NULL,           -- Order in hand (1, 2, 3...)
    dealt_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_hand_cards_hand ON hand_cards(hand_id);
CREATE UNIQUE INDEX idx_hand_cards_position ON hand_cards(hand_id, position);


-- ============================================================================
-- BETS - Betting history for each hand
-- ============================================================================

CREATE TABLE bets (
    id              SERIAL PRIMARY KEY,
    hand_id         VARCHAR(20) NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
    player_id       VARCHAR(50) NOT NULL REFERENCES players(id),
    
    -- Bet info
    amount          INTEGER NOT NULL CHECK (amount > 0),
    bet_type        VARCHAR(20) DEFAULT 'initial', -- 'initial', 'double_down', 'split', 'insurance'
    
    -- Timestamps
    placed_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bets_hand ON bets(hand_id);
CREATE INDEX idx_bets_player ON bets(player_id);


-- ============================================================================
-- ROUND RESULTS - Payouts and results per hand per round
-- ============================================================================

CREATE TABLE round_results (
    id              SERIAL PRIMARY KEY,
    round_id        INTEGER NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
    hand_id         VARCHAR(20) NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
    player_id       VARCHAR(50) NOT NULL REFERENCES players(id),
    
    -- Final hand state
    final_value     INTEGER NOT NULL,           -- Hand value at end
    final_status    player_status NOT NULL,
    
    -- Financials
    total_bet       INTEGER NOT NULL,
    payout          INTEGER NOT NULL,           -- Amount returned (0 = lost, bet = push, bet*2 = win)
    net_result      INTEGER NOT NULL,           -- payout - total_bet (can be negative)
    
    -- Comparison
    dealer_value    INTEGER NOT NULL,
    dealer_busted   BOOLEAN DEFAULT FALSE,
    dealer_blackjack BOOLEAN DEFAULT FALSE,
    player_blackjack BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    resolved_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_round_results_round ON round_results(round_id);
CREATE INDEX idx_round_results_player ON round_results(player_id);
CREATE INDEX idx_round_results_hand ON round_results(hand_id);


-- ============================================================================
-- GAME ACTIONS - Audit log of all game actions (optional, for replay/analytics)
-- ============================================================================

CREATE TABLE game_actions (
    id              BIGSERIAL PRIMARY KEY,
    round_id        INTEGER NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
    hand_id         VARCHAR(20) REFERENCES hands(id) ON DELETE SET NULL,
    player_id       VARCHAR(50) REFERENCES players(id) ON DELETE SET NULL,
    
    -- Action info
    action_type     VARCHAR(30) NOT NULL,       -- 'hit', 'stand', 'double', 'split', 'bet', 'deal'
    action_data     JSONB,                      -- Additional action details
    
    -- Result
    resulting_value INTEGER,                    -- Hand value after action
    resulting_status player_status,
    
    -- Timestamps
    performed_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_game_actions_round ON game_actions(round_id);
CREATE INDEX idx_game_actions_player ON game_actions(player_id);
CREATE INDEX idx_game_actions_time ON game_actions(performed_at);


-- ============================================================================
-- PLAYER STATS - Aggregated statistics (materialized/cached)
-- ============================================================================

CREATE TABLE player_stats (
    player_id           VARCHAR(50) PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    
    -- Game counts
    games_played        INTEGER DEFAULT 0,
    rounds_played       INTEGER DEFAULT 0,
    
    -- Win/loss
    total_wins          INTEGER DEFAULT 0,
    total_losses        INTEGER DEFAULT 0,
    total_pushes        INTEGER DEFAULT 0,
    blackjacks          INTEGER DEFAULT 0,
    busts               INTEGER DEFAULT 0,
    
    -- Financials
    total_wagered       BIGINT DEFAULT 0,
    total_won           BIGINT DEFAULT 0,
    total_lost          BIGINT DEFAULT 0,
    biggest_win         INTEGER DEFAULT 0,
    biggest_loss        INTEGER DEFAULT 0,
    
    -- Streaks
    current_win_streak  INTEGER DEFAULT 0,
    best_win_streak     INTEGER DEFAULT 0,
    
    -- Last updated
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ============================================================================
-- CHAT MESSAGES - In-game chat (optional)
-- ============================================================================

CREATE TABLE chat_messages (
    id              BIGSERIAL PRIMARY KEY,
    room_id         VARCHAR(6) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    player_id       VARCHAR(50) REFERENCES players(id) ON DELETE SET NULL,
    
    -- Message
    message         TEXT NOT NULL,
    message_type    VARCHAR(20) DEFAULT 'chat', -- 'chat', 'system', 'action'
    
    -- Timestamps
    sent_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_room ON chat_messages(room_id, sent_at);


-- ============================================================================
-- VIEWS - Useful queries
-- ============================================================================

-- Active public rooms
CREATE VIEW active_public_rooms AS
SELECT 
    r.id,
    r.name,
    r.game_type,
    gt.name AS game_name,
    gt.icon,
    r.max_players,
    r.is_playing,
    COUNT(rp.player_id) AS player_count,
    r.created_at
FROM rooms r
JOIN game_types gt ON gt.type = r.game_type
LEFT JOIN room_players rp ON rp.room_id = r.id AND rp.left_at IS NULL
WHERE r.is_private = FALSE 
  AND r.ended_at IS NULL
GROUP BY r.id, gt.name, gt.icon;


-- Room with players
CREATE VIEW room_details AS
SELECT 
    r.*,
    COALESCE(json_agg(
        json_build_object(
            'playerId', p.id,
            'name', p.name,
            'isReady', rp.is_ready,
            'isHost', rp.is_host,
            'chips', rp.chips
        )
    ) FILTER (WHERE p.id IS NOT NULL), '[]') AS players
FROM rooms r
LEFT JOIN room_players rp ON rp.room_id = r.id AND rp.left_at IS NULL
LEFT JOIN players p ON p.id = rp.player_id
GROUP BY r.id;


-- Player leaderboard
CREATE VIEW leaderboard AS
SELECT 
    p.id,
    p.name,
    ps.games_played,
    ps.total_wins,
    ps.total_losses,
    ps.blackjacks,
    ps.total_won - ps.total_lost AS net_winnings,
    CASE 
        WHEN ps.total_wins + ps.total_losses > 0 
        THEN ROUND(100.0 * ps.total_wins / (ps.total_wins + ps.total_losses), 1)
        ELSE 0 
    END AS win_rate
FROM players p
JOIN player_stats ps ON ps.player_id = p.id
WHERE ps.games_played > 0
ORDER BY (ps.total_won - ps.total_lost) DESC;


-- ============================================================================
-- NOTES
-- ============================================================================
/*
Key Design Decisions:

1. ID Prefixes: All IDs use prefixes for easy identification:
   - pl_  = Player
   - ss_  = Session
   - dv_  = Device  
   - hd_  = Hand
   - Room IDs are 6-char human-friendly codes (no prefix)

2. Split Hands: The hands table supports split hands via parent_hand_id.
   A split hand references its parent, allowing recursive hand structures.

3. Chips vs Money: Players have chips per-room (room_players.chips), not
   globally. This allows different stake levels per room.

4. Game Actions: The game_actions table is optional but useful for:
   - Replay functionality
   - Analytics and statistics
   - Debugging game issues
   - Anti-cheat analysis

5. Sessions vs Players: Sessions are ephemeral (one per connection),
   while Players persist. One player can have multiple sessions
   (multiple devices/tabs).

6. Room Lifecycle:
   - Room created → players join → host starts game → rounds play → game ends
   - Rooms can be reused for multiple games (rounds)
   - Rooms are soft-deleted (ended_at set) for history

7. Extensibility: The schema supports multiple game types. Game-specific
   data can be stored in JSONB columns (e.g., game_actions.action_data)
   or in game-specific tables if needed.
*/

