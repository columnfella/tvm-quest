'use client';
import { m } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { formatLeft, seasonEnd } from '@/lib/season';
import { Asset, Modal } from './ui';

type Player = { name: string; avatar: string; xp: number; level: number; streak: number };
type Board = { season: string; endsAt: number; total: number; players: Player[] };

export function useCountdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      // the label only shows seconds in the final hour, so re-render rarely before that
      id = setTimeout(tick, seasonEnd(t) - t < 3_600_000 ? 1000 : 30_000);
    };
    tick();
    return () => clearTimeout(id);
  }, []);
  return now === null ? '' : formatLeft(seasonEnd(now) - now);
}

/** Card: "Season ends in 3d 4h". */
export function SeasonTimer() {
  const left = useCountdown();
  return (
    <div className="card season-card">
      <div className="timer">
        <Asset name="hourglass_done_3d.png" size={40} />
        <div>
          <small>Season ends in</small>
          <b>{left || '…'}</b>
          <small>Everything resets Monday 00:00 UTC</small>
        </div>
      </div>
    </div>
  );
}

export function useBoard(open = true) {
  const [board, setBoard] = useState<Board | null>(null);
  const [err, setErr] = useState(false);
  const load = useCallback(() => {
    fetch('/api/leaderboard', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b: Board) => { setBoard(b); setErr(false); })
      .catch(() => setErr(true));
  }, []);
  useEffect(() => {
    if (!open) return;
    load();
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, [open, load]);
  return { board, err, reload: load };
}

function Row({ p, i, me }: { p: Player; i: number; me?: string }) {
  return (
    <m.li
      className={`lb-row r${i + 1} ${p.name.toLowerCase() === me?.toLowerCase() ? 'me' : ''}`}
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22, delay: Math.min(i, 12) * 0.04 }}
    >
      <span className="lb-rank">{i + 1}</span>
      <span className="lb-av"><Asset name={p.avatar} size={30} /></span>
      <span className="lb-name"><b>{p.name}</b><small>Level {p.level}{p.streak ? ` · ${p.streak}🔥` : ''}</small></span>
      <span className="lb-xp"><Asset name="high_voltage_3d.png" size={18} />{p.xp}</span>
    </m.li>
  );
}

/** Compact top-5 card for the home sidebar. */
export function MiniBoard({ me, onOpen }: { me?: string; onOpen: () => void }) {
  const { board } = useBoard();
  const left = useCountdown();
  const rank = board?.players.findIndex((p) => p.name.toLowerCase() === me?.toLowerCase()) ?? -1;
  return (
    <div className="card">
      <div className="card-head">
        <h3>Season Ranking</h3>
        <span className="season-pill" style={{ fontSize: 13 }}>⏳ {left}</span>
      </div>
      {!board ? (
        <p className="lb-empty">Loading…</p>
      ) : board.players.length === 0 ? (
        <p className="lb-empty">No one yet. Be first!</p>
      ) : (
        <ul className="lb-list">
          {board.players.slice(0, 5).map((p, i) => <Row key={p.name} p={p} i={i} me={me} />)}
          {rank >= 5 && <Row p={board.players[rank]} i={rank} me={me} />}
        </ul>
      )}
      <button className="btn3d btn-blue block" onClick={onOpen} style={{ minHeight: 44, fontSize: 17 }}>
        <Asset name="trophy_3d.png" size={22} /> Full leaderboard
      </button>
    </div>
  );
}

export function LeaderboardPanel({ open, onClose, me }: { open: boolean; onClose: () => void; me?: string }) {
  const { board, err, reload } = useBoard(open);
  const left = useCountdown();
  const top = board?.players ?? [];
  const order = [1, 0, 2]; // podium: 2nd, 1st, 3rd
  return (
    <Modal open={open} onClose={onClose} title="Leaderboard" wide>
      <div className="season-card" style={{ marginBottom: 12 }}>
        <div className="timer">
          <Asset name="hourglass_done_3d.png" size={36} />
          <div style={{ flex: 1 }}>
            <small>Season {board?.season ?? ''} ends in</small>
            <b>{left}</b>
          </div>
          <button className="icon-btn" onClick={reload} aria-label="Refresh"><RefreshCw size={18} /></button>
        </div>
      </div>
      {err && <p className="lb-empty">Could not load the leaderboard.</p>}
      {top.length >= 3 && (
        <div className="podium">
          {order.map((idx) => {
            const p = top[idx];
            return (
              <m.div key={p.name} className={`pod p${idx + 1}`} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 15, delay: idx === 0 ? 0.35 : idx === 1 ? 0.2 : 0.05 }}>
                {idx === 0 && <span className="loop-sway"><Asset name="crown_3d.png" size={34} /></span>}
                <span className="lb-av"><Asset name={p.avatar} size={idx === 0 ? 56 : 44} /></span>
                <b>{p.name}</b>
                <small className="muted">{p.xp} XP</small>
                <div className="pod-block">{idx + 1}</div>
              </m.div>
            );
          })}
        </div>
      )}
      {board && top.length === 0 && <p className="lb-empty">Nobody has played this season yet.</p>}
      <ul className="lb-list">
        {top.slice(top.length >= 3 ? 3 : 0).map((p, i) => <Row key={p.name} p={p} i={i + (top.length >= 3 ? 3 : 0)} me={me} />)}
      </ul>
      {board && <p className="small muted" style={{ marginTop: 10, textAlign: 'center' }}>{board.total} player{board.total === 1 ? '' : 's'} this season</p>}
    </Modal>
  );
}
