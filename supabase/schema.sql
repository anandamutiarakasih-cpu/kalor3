-- ============================================================================
-- THERMO CHAMPIONS: HEAT EDITION — SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Compatible with Supabase SQL Editor & PostgreSQL 14+
-- Authoritative Multiplayer Architecture
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROOMS TABLE (Permainan / Sesi Ruangan Kelas)
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,
    title VARCHAR(255) DEFAULT 'Sesi Pembelajaran Kalor SMP',
    status VARCHAR(50) DEFAULT 'LOBBY',
    current_phase VARCHAR(50) DEFAULT 'LOBBY',
    phase_started_at TIMESTAMPTZ,
    phase_ends_at TIMESTAMPTZ,
    phase_duration INT DEFAULT 0,
    settings JSONB DEFAULT '{
        "game1MemorizeTime": 35,
        "game1PlayTime": 75,
        "game2WordTime": 20,
        "game3TotalTime": 120,
        "maxTeams": 8
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

-- Index for high-speed room code lookup
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- 2. TEAMS TABLE (8 Kelompok Siswa per Room)
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    team_number INT NOT NULL CHECK (team_number BETWEEN 1 AND 8),
    team_name VARCHAR(100) NOT NULL,
    session_token VARCHAR(100) NOT NULL,
    claimed BOOLEAN DEFAULT TRUE,
    ready BOOLEAN DEFAULT TRUE,
    is_online BOOLEAN DEFAULT TRUE,
    game1_score NUMERIC(5,2) DEFAULT 0,
    game2_score NUMERIC(5,2) DEFAULT 0,
    game3_score NUMERIC(5,2) DEFAULT 0,
    total_score NUMERIC(5,2) DEFAULT 0,
    predicate VARCHAR(100) DEFAULT 'Temperature Rookie',
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_room_team UNIQUE(room_id, team_number)
);

CREATE INDEX IF NOT EXISTS idx_teams_room_id ON teams(room_id);
CREATE INDEX IF NOT EXISTS idx_teams_session_token ON teams(session_token);

-- 3. PLAYERS TABLE (Roster Anggota Kelompok)
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    absen VARCHAR(20) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);

-- 4. QUESTIONS TABLE (Master Bank Soal Fisika Kalor)
CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(50) PRIMARY KEY,
    game_type VARCHAR(50) NOT NULL, -- 'GAME1_MEMORIZE', 'GAME1_PLAY', 'GAME2', 'GAME3'
    sequence_order INT NOT NULL,
    term VARCHAR(100),
    category VARCHAR(100),
    definition TEXT,
    question_text TEXT,
    correct_answer TEXT,
    tolerance NUMERIC(5,3) DEFAULT 0.01,
    points NUMERIC(5,2) DEFAULT 3.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_game_type ON questions(game_type, sequence_order);

-- 5. ANSWERS TABLE (Log & Rekap Jawaban Kelompok)
CREATE TABLE IF NOT EXISTS answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL,
    question_id VARCHAR(50) NOT NULL,
    raw_answer TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    score_awarded NUMERIC(5,2) DEFAULT 0,
    remaining_sec NUMERIC(6,2) DEFAULT 0,
    latency_ms INT DEFAULT 0,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_team_question UNIQUE(team_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_answers_room_team ON answers(room_id, team_id);

-- 6. GAME RESULTS TABLE (Rekapitulasi Akhir & Leaderboard Snapshot)
CREATE TABLE IF NOT EXISTS game_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    team_number INT NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    members_summary TEXT,
    game1_score NUMERIC(5,2) DEFAULT 0,
    game2_score NUMERIC(5,2) DEFAULT 0,
    game3_score NUMERIC(5,2) DEFAULT 0,
    total_score NUMERIC(5,2) DEFAULT 0,
    rank INT DEFAULT 0,
    predicate VARCHAR(100) DEFAULT 'Temperature Rookie',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_result_room_team UNIQUE(room_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_results_room ON game_results(room_id, rank);

-- 7. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- Allow read access for application queries
CREATE POLICY "Public Read Rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Public Insert Rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Rooms" ON rooms FOR UPDATE USING (true);

CREATE POLICY "Public Read Teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public Insert Teams" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Teams" ON teams FOR UPDATE USING (true);

CREATE POLICY "Public Read Players" ON players FOR SELECT USING (true);
CREATE POLICY "Public Insert Players" ON players FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Questions" ON questions FOR SELECT USING (true);

CREATE POLICY "Public Read Answers" ON answers FOR SELECT USING (true);
CREATE POLICY "Public Insert Answers" ON answers FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Game Results" ON game_results FOR SELECT USING (true);
CREATE POLICY "Public Insert Game Results" ON game_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Game Results" ON game_results FOR UPDATE USING (true);
