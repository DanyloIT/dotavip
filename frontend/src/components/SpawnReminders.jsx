/**
 * Lotus & Wisdom-rune spawn reminders.
 *
 * Lotus pools release a lotus at 3:00 / 6:00 / 9:00 / 12:00.
 * Wisdom runes spawn every 7 min (7:00, 14:00, 21:00 …) the whole game.
 * Nothing at 0:00.
 *
 * We warn the player 15s BEFORE each spawn with a short chime and an icon that
 * appears on the far right, vertically centred. Driven by GSI game_time.
 * Enable/volume live in localStorage (shared with the settings window).
 */

import { useEffect, useRef, useState } from 'react';
import { useOverlayStore } from '../store/overlayStore';
import { useT } from '../i18n';

const LOTUS_TIMES  = [180, 360, 540, 720];                       // 3,6,9,12 min
const WISDOM_TIMES = Array.from({ length: 12 }, (_, i) => (i + 1) * 420); // 7..84 min
const LEAD = 15;                                                 // warn 15s before

function remEnabled() { try { return localStorage.getItem('rem_enabled') !== '0'; } catch { return true; } }
function remVolume()  { try { const v = parseFloat(localStorage.getItem('rem_volume')); return isNaN(v) ? 0.5 : v; } catch { return 0.5; } }

// ── short chime via Web Audio (no asset file needed) ─────────────────────────
let _ctx = null;
function playChime(vol) {
  if (vol <= 0) return;
  try {
    _ctx = _ctx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _ctx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = now + i * 0.16;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.25 * vol, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0); osc.stop(t0 + 0.24);
    });
  } catch { /* audio unavailable — stay silent */ }
}

function LotusIcon({ size = 50 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <g stroke="#be185d" strokeWidth="1.5">
        <path d="M32 54c-14 0-24-7-24-7s4-12 24-12 24 12 24 12-10 7-24 7Z" fill="#f472b6" />
        <path d="M32 50C22 50 16 40 16 30c8 2 12 10 16 20 4-10 8-18 16-20 0 10-6 20-16 20Z" fill="#ec4899" />
        <path d="M32 50c-6 0-9-12-9-22 5 3 7 12 9 22 2-10 4-19 9-22 0 10-3 22-9 22Z" fill="#f9a8d4" />
        <path d="M32 49c0-12 0-22 0-30 0 8 0 18 0 30Z" fill="#fce7f3" />
      </g>
    </svg>
  );
}

function WisdomIcon({ size = 50 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="22" fill="#1e3a8a" stroke="#38bdf8" strokeWidth="2" />
      <circle cx="32" cy="32" r="22" fill="url(#wg)" opacity="0.5" />
      <defs>
        <radialGradient id="wg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M32 16l4 10 10 2-8 7 2 11-10-6-10 6 2-11-8-7 10-2z"
        fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />
    </svg>
  );
}

export default function SpawnReminders() {
  const t = useT();
  const gameTime = useOverlayStore(s => s.gameTime);
  const inGame   = useOverlayStore(s => s.inGame);
  const firedRef = useRef(new Set());
  const lastGtRef = useRef(0);
  const [active, setActive] = useState(null);   // { type, untilMs }
  const [, tick] = useState(0);

  // New game (game_time jumped back) → forget what we already announced.
  useEffect(() => {
    if (gameTime < lastGtRef.current - 5) firedRef.current = new Set();
    lastGtRef.current = gameTime;
  }, [gameTime]);

  // Fire when game_time crosses (spawn − 15s).
  useEffect(() => {
    if (!inGame || !remEnabled()) return;
    const check = (T, type) => {
      const key = `${type}:${T}`;
      if (firedRef.current.has(key)) return;
      if (gameTime >= T - LEAD && gameTime < T) {
        firedRef.current.add(key);
        const remaining = Math.max(1, T - gameTime);
        setActive({ type, untilMs: Date.now() + remaining * 1000 });
        playChime(remVolume());
      }
    };
    LOTUS_TIMES.forEach(T => check(T, 'lotus'));
    WISDOM_TIMES.forEach(T => check(T, 'wisdom'));
  }, [gameTime, inGame]);

  // Count down then auto-hide.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      if (Date.now() >= active.untilMs) setActive(null);
      else tick(n => n + 1);
    }, 250);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;
  const secs = Math.max(0, Math.ceil((active.untilMs - Date.now()) / 1000));
  const isLotus = active.type === 'lotus';
  const accent = isLotus ? '#ec4899' : '#38bdf8';

  return (
    <div style={{
      position: 'fixed', right: 26, top: '50%', transform: 'translateY(-50%)',
      zIndex: 120, pointerEvents: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      background: 'rgba(2,6,23,.74)', border: `1px solid ${accent}`,
      borderRadius: 14, padding: '12px 14px', boxShadow: `0 8px 32px rgba(0,0,0,.7), 0 0 16px ${accent}55`,
    }}>
      {isLotus ? <LotusIcon /> : <WisdomIcon />}
      <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700, textAlign: 'center', maxWidth: 90 }}>
        {isLotus ? t('rem_lotus') : t('rem_wisdom')}
      </div>
      <div style={{ color: accent, fontSize: 17, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
        {secs}s
      </div>
    </div>
  );
}
