'use client';
// Move an account between devices: a signed-in device shows a one-time code + QR (valid 10 minutes);
// the other device scans the QR (opens /?link=CODE) or types the code. Works in either direction.
import { Copy, RefreshCw, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { sfx } from '@/lib/sound';
import type { Game } from '@/lib/store';
import { Btn } from './ui';

export const formatCode = (c: string) => (c.length === 6 ? `${c.slice(0, 3)}-${c.slice(3)}` : c);
export const cleanCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

/** QR code as crisp SVG. The encoder loads only when a QR is shown. */
export function QrCode({ text, size = 200 }: { text: string; size?: number }) {
  const [path, setPath] = useState<{ d: string; n: number } | null>(null);
  useEffect(() => {
    let alive = true;
    import('qrcode-generator').then(({ default: qrcode }) => {
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      const n = qr.getModuleCount();
      let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
      if (alive) setPath({ d, n });
    });
    return () => { alive = false; };
  }, [text]);
  return (
    <div className="qr" style={{ width: size, height: size }}>
      {path ? (
        <svg viewBox={`-4 -4 ${path.n + 8} ${path.n + 8}`} width={size} height={size} role="img" aria-label="QR code to open this account on another device" shapeRendering="crispEdges">
          <rect x={-4} y={-4} width={path.n + 8} height={path.n + 8} fill="#fff" />
          <path d={path.d} fill="#0b1220" />
        </svg>
      ) : <span className="spinner" aria-label="Making QR code" />}
    </div>
  );
}

function useSecondsLeft(until: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);
  return until ? Math.max(0, Math.round((until - now) / 1000)) : 0;
}

/** Profile panel section: make a code + QR for another device. */
export function LinkDevice({ g }: { g: Game }) {
  const [link, setLink] = useState<{ code: string; expiresAt: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const left = useSecondsLeft(link?.expiresAt ?? null);
  const expired = !!link && left === 0;

  const make = async () => {
    setBusy(true);
    setErr(null);
    const r = await g.createLink();
    setBusy(false);
    if ('error' in r) { setErr(r.error); return; }
    sfx.unlock();
    setLink(r);
  };
  const url = link && typeof window !== 'undefined' ? `${window.location.origin}/?link=${link.code}` : '';
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };

  return (
    <div className="link-box">
      <h3 className="badges-title"><Smartphone size={20} /> Play on another device</h3>
      {!link ? (
        <>
          <p className="muted small">Continue on your phone, tablet or another computer with the same name and progress. You get a one-time code that works for 10 minutes.</p>
          <Btn variant="blue" onClick={make} disabled={busy}>{busy ? 'Making a code…' : 'Show my link code'}</Btn>
        </>
      ) : (
        <div className="link-show">
          <div className={expired ? 'link-qr expired' : 'link-qr'}>
            <QrCode text={url} size={176} />
          </div>
          <div className="link-info">
            <p className="small"><b>Scan</b> with the other device’s camera, <b>or</b> open the site there, choose <i>“I have a code”</i> and type:</p>
            <div className="link-code" aria-label={`Code ${link.code.split('').join(' ')}`}>{formatCode(link.code)}</div>
            <p className={`small ${expired ? 'bad-text' : 'muted'}`}>{expired ? 'This code expired.' : `Expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} · works once`}</p>
            <div className="link-actions">
              <Btn variant="ghost" onClick={make} disabled={busy}><RefreshCw size={16} /> New code</Btn>
              {!expired && <Btn variant="ghost" onClick={copy}><Copy size={16} /> {copied ? 'Copied!' : 'Copy link'}</Btn>}
            </div>
          </div>
        </div>
      )}
      {err && <p className="small bad-text">{err}</p>}
      <p className="muted small">Anyone with the code can use your account, so only share it with yourself. Both devices stay signed in and share progress.</p>
    </div>
  );
}

/** Code input used when signing in from another device. */
export function CodeField({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <input
      className="name-input code-input"
      value={formatCode(value)}
      onChange={(e) => onChange(cleanCode(e.target.value))}
      placeholder="ABC-123"
      autoComplete="one-time-code"
      autoCapitalize="characters"
      spellCheck={false}
      inputMode="text"
      aria-label="Link code"
      maxLength={7}
      autoFocus={autoFocus}
    />
  );
}
