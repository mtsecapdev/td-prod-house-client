import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

// Answers use light markdown (**bold**, ### headings); pasted into an email or Word those symbols are noise.
function plainText(text) {
  return String(text || '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

async function copyText(text) {
  // The Clipboard API only works on secure pages (https or localhost); opened by IP over the network it is
  // missing, so fall back to a hidden textarea.
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try {
    if (!document.execCommand('copy')) throw new Error('Copy was blocked');
  } finally {
    document.body.removeChild(area);
  }
}

/** Copies an answer's text, like the copy button under a reply in Claude. */
export default function CopyButton({ text }) {
  const [state, setState] = useState('idle'); // idle | copied | failed

  useEffect(() => {
    if (state === 'idle') return undefined;
    const t = setTimeout(() => setState('idle'), 1500);
    return () => clearTimeout(t);
  }, [state]);

  async function onCopy() {
    try {
      await copyText(plainText(text));
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  const label = state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy';
  return (
    <button type="button" onClick={onCopy} title={label} aria-label={label}
      className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[12px] text-slate bg-transparent border-0 cursor-pointer hover:bg-[#EEF2F7] hover:text-ink">
      {state === 'copied' ? <Check size={14} className="text-[#047857]" /> : <Copy size={14} />}
      {state !== 'idle' && <span>{label}</span>}
    </button>
  );
}
