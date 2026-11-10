/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Supabase Database Connector & Repository (Resilient Non-Blocking Checkpoints)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    console.log('✅ Supabase PostgreSQL client connected:', supabaseUrl);
  } catch (err) {
    console.warn('⚠️ Supabase initialization warning:', err.message);
  }
}

/**
 * Persist or update Room in Supabase (Non-blocking background checkpoint)
 */
export async function dbUpsertRoom(room) {
  if (!supabase || !room) return null;
  try {
    const { data, error } = await supabase
      .from('rooms')
      .upsert({
        code: room.code,
        title: room.title || 'Sesi Pembelajaran Kalor SMP',
        status: room.status,
        current_phase: room.currentPhase,
        phase_started_at: room.phaseStartedAt ? new Date(room.phaseStartedAt).toISOString() : null,
        phase_ends_at: room.phaseEndsAt ? new Date(room.phaseEndsAt).toISOString() : null,
        phase_duration: room.phaseDuration || 0,
        settings: room.settings || {},
        updated_at: new Date().toISOString()
      }, { onConflict: 'code' })
      .select('id')
      .single();

    if (error) {
      // Non-blocking checkpoint failure (e.g. table not migrated yet)
      return null;
    }
    return data?.id || null;
  } catch (err) {
    return null;
  }
}

/**
 * Persist or update Team in Supabase (Non-blocking background checkpoint)
 */
export async function dbUpsertTeam(roomId, team) {
  if (!supabase || !roomId || !team) return null;
  try {
    const { data, error } = await supabase
      .from('teams')
      .upsert({
        room_id: roomId,
        team_number: team.number,
        team_name: team.name,
        session_token: team.sessionToken,
        claimed: team.claimed,
        ready: team.ready,
        is_online: team.isOnline,
        game1_score: team.scores?.game1 || 0,
        game2_score: team.scores?.game2 || 0,
        game3_score: team.scores?.game3 || 0,
        total_score: team.scores?.total || 0,
        predicate: team.predicate || 'Temperature Rookie',
        last_seen: new Date(team.lastSeen || Date.now()).toISOString(),
        joined_at: new Date(team.joinedAt || Date.now()).toISOString()
      }, { onConflict: 'room_id,team_number' })
      .select('id')
      .single();

    if (error) {
      return null;
    }

    const teamId = data?.id;

    // Also persist members if provided
    if (teamId && Array.isArray(team.members) && team.members.length > 0) {
      await supabase.from('players').delete().eq('team_id', teamId);
      const playersData = team.members.map((m) => ({
        team_id: teamId,
        name: m.name,
        absen: String(m.absen || '')
      }));
      await supabase.from('players').insert(playersData);
    }

    return teamId;
  } catch (err) {
    return null;
  }
}

/**
 * Persist Answer log in Supabase (Non-blocking background checkpoint)
 */
export async function dbRecordAnswer(roomId, teamId, answerRecord) {
  if (!supabase || !roomId || !teamId || !answerRecord) return;
  try {
    await supabase
      .from('answers')
      .upsert({
        room_id: roomId,
        team_id: teamId,
        game_type: answerRecord.gameType,
        question_id: answerRecord.questionId,
        raw_answer: typeof answerRecord.answer === 'string' ? answerRecord.answer : JSON.stringify(answerRecord.answer),
        is_correct: !!answerRecord.isCorrect,
        score_awarded: answerRecord.scoreAwarded || 0,
        remaining_sec: answerRecord.remainingSec || 0,
        latency_ms: answerRecord.latencyMs || 0,
        submitted_at: new Date().toISOString()
      }, { onConflict: 'team_id,question_id' });
  } catch (err) {
    // Suppress non-blocking checkpoint error
  }
}

/**
 * Commit complete final Game Results to Supabase (Non-blocking background checkpoint)
 */
export async function dbSaveGameResults(roomId, rankedTeams) {
  if (!supabase || !roomId || !Array.isArray(rankedTeams)) return;
  try {
    await supabase
      .from('rooms')
      .update({
        status: 'FINISHED',
        current_phase: 'FINISHED',
        finished_at: new Date().toISOString()
      })
      .eq('id', roomId);

    const results = rankedTeams.map((t) => ({
      room_id: roomId,
      team_id: t.dbId,
      team_number: t.number,
      team_name: t.name,
      members_summary: (t.members || []).map((m) => `${m.name} (${m.absen})`).join(', '),
      game1_score: t.scores?.game1 || 0,
      game2_score: t.scores?.game2 || 0,
      game3_score: t.scores?.game3 || 0,
      total_score: t.scores?.total || 0,
      rank: t.rank || 1,
      predicate: t.predicate || 'Temperature Rookie'
    }));

    await supabase.from('game_results').upsert(results, { onConflict: 'room_id,team_id' });
  } catch (err) {
    // Suppress non-blocking checkpoint error
  }
}

export { supabase };
