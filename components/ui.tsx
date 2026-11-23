'use client';
import { AnimatePresence, m } from 'framer-motion';
import { X } from 'lucide-react';
import React, { useEffect } from 'react';

/** Free 3D emoji asset (Microsoft Fluent Emoji, MIT) served from /public/assets. */
export function Asset({ name, size = 32, alt = '', className = '', style, eager }: { name: string; size?: number; alt?: string; className?: string; style?: React.CSSProperties; eager?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/assets/${name}`} width={size} height={size} alt={alt} className={className} style={style} draggable={false} loading={eager ? 'eager' : 'lazy'} decoding="async" />;
}

/** Renders ^{sup} and _{sub} markup used in formulas. */
export function Rich({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /([\^_])\{([^}]*)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(m[1] === '^' ? <sup key={k++}>{m[2]}</sup> : <sub key={k++}>{m[2]}</sub>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** Question text: blank lines split paragraphs; ``` fences mark preformatted blocks (tables, cash flows). */
export function QText({ text }: { text: string }) {
  const parts = text.split(/```\n?/);
  return (
    <>
      {parts.flatMap((part, i) =>
        i % 2 === 1
          ? [<pre key={i} className="stem-pre">{part.replace(/\n$/, '')}</pre>]
          : part.split(/\n\s*\n/).map((para) => para.trim()).filter(Boolean).map((para, j) => <p key={`${i}-${j}`}><Rich text={para} /></p>),
      )}
    </>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { ref?: React.Ref<HTMLButtonElement>; variant?: 'primary' | 'secondary' | 'danger' | 'gold' | 'ghost' | 'theory' | 'blue'; block?: boolean };
export function Btn({ variant = 'primary', block, className = '', ...rest }: BtnProps) {
  return <button {...rest} className={`btn3d btn-${variant} ${block ? 'block' : ''} ${className}`} />;
}

export function Modal({ open, onClose, children, title, wide }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <m.div className="modal-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <m.div
            className={`modal ${wide ? 'wide' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 40, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              {title && <h2>{title}</h2>}
              <button className="icon-btn" onClick={onClose} aria-label="Close">
                <X size={22} />
              </button>
            </div>
            {children}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export function Bar({ value, color = 'var(--yellow)', height = 16 }: { value: number; color?: string; height?: number }) {
  return (
    <div className="bar" style={{ height }}>
      <m.div className="bar-fill" style={{ background: color }} initial={false} animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }}>
        <span className="bar-shine" />
      </m.div>
    </div>
  );
}
