import { useEffect, useState } from 'react';
import { X, Pencil, Check, Loader2, RotateCcw } from 'lucide-react';
import { figures as figuresApi } from '../../services/api';

/**
 * Full-size view of a document figure, with what the picture shows (its description). Escape or a click outside
 * closes it. With onSaved (the Assets page, for the document's owner) the caption and description can be
 * corrected (marked "Checked by you"), or, with canDescribe (a vision model is set), described again by the model.
 */
export default function FigureLightbox({ figure, onClose, onSaved, canDescribe = false }) {
  const [editing, setEditing] = useState(null); // 'caption' | 'description'
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false); // false, true, or 'describing' (the model is looking at it)
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (editing) setEditing(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, editing]);

  function edit(field) {
    setDraft(figure[field] || '');
    setEditing(field);
    setError(null);
  }

  async function save(changes) {
    setBusy(changes.redescribe ? 'describing' : true);
    setError(null);
    try {
      const { figure: updated } = await figuresApi.update(figure.id, changes);
      onSaved(updated);
      setEditing(null);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={onClose}
      role="dialog" aria-modal="true" aria-label={figure.caption || 'Figure'}>
      <figure className="m-0 bg-white rounded-lg p-4 max-w-[95vw] max-h-[92vh] flex flex-col gap-3 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          {editing === 'caption' ? (
            <Editor value={draft} onChange={setDraft} busy={busy} rows={2} label="Caption"
              onSave={() => save({ caption: draft })} onCancel={() => setEditing(null)} />
          ) : (
            <figcaption className="text-[14px] font-semibold text-navy">
              {figure.caption || 'Figure'}
              {figure.page != null && <span className="font-normal text-slate"> · p. {figure.page}</span>}
              {figure.document_name && <span className="font-normal text-slate"> · {figure.document_name}</span>}
              {figure.caption_edited && <span className="font-normal text-slate text-[12px]"> · caption checked by you</span>}
              {onSaved && (
                <button type="button" onClick={() => edit('caption')} className="icon-btn inline-flex align-middle ml-1"
                  aria-label="Edit caption" title="Edit caption"><Pencil size={13} /></button>
              )}
            </figcaption>
          )}
          <button type="button" onClick={onClose} className="icon-btn shrink-0" aria-label="Close"><X size={16} /></button>
        </div>
        <img src={figuresApi.imageUrl(figure.id)} alt={figure.description || figure.caption || 'Figure'}
          className="max-w-full max-h-[62vh] object-contain self-center" />

        {editing === 'description' ? (
          <Editor value={draft} onChange={setDraft} busy={busy} rows={4} label="What the picture shows"
            onSave={() => save({ description: draft })} onCancel={() => setEditing(null)} />
        ) : (figure.description || onSaved) && (
          <div className="flex flex-col gap-1.5 max-w-[760px] border-t border-border pt-3">
            <div className="flex items-center gap-2 flex-wrap text-[12px]">
              <span className="font-semibold text-navy">What the picture shows</span>
              {figure.description && (
                <span className={`px-1.5 py-0.5 rounded ${figure.description_edited ? 'bg-emerald-50 text-emerald-800' : 'bg-canvas text-slate'}`}>
                  {figure.description_edited ? 'Checked by you' : 'Described by the model'}
                </span>
              )}
              {onSaved && (
                <span className="ml-auto flex items-center gap-1">
                  {figure.description && !figure.description_edited && (
                    <button type="button" disabled={busy} onClick={() => save({ description: figure.description })}
                      className="btn-ghost text-[12px] px-2 py-1" title="Mark this description as correct">
                      <Check size={13} />Looks right
                    </button>
                  )}
                  <button type="button" disabled={busy} onClick={() => edit('description')} className="btn-ghost text-[12px] px-2 py-1">
                    <Pencil size={13} />{figure.description ? 'Edit' : 'Write one'}
                  </button>
                  {canDescribe && (
                    <button type="button" disabled={busy} onClick={() => save({ redescribe: true })}
                      className="btn-ghost text-[12px] px-2 py-1" title="Have the model look at the figure again">
                      {busy === 'describing' ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                      {busy === 'describing' ? 'Describing… about 20 s' : figure.description ? 'Describe again' : 'Describe'}
                    </button>
                  )}
                </span>
              )}
            </div>
            {figure.description ? <p className="m-0 text-[13px] leading-relaxed">{figure.description}</p>
              : <p className="m-0 text-[13px] text-slate">No description.</p>}
          </div>
        )}
        {error && <p className="text-red-700 text-[13px] m-0">{error}</p>}
      </figure>
    </div>
  );
}

function Editor({ value, onChange, busy, rows, label, onSave, onCancel }) {
  return (
    <div className="flex-1 flex flex-col gap-1.5 min-w-[min(520px,80vw)]">
      <label className="text-[12px] font-semibold text-navy">
        {label}
        <textarea className="field w-full mt-1 font-normal text-[13px]" rows={rows} value={value} autoFocus
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSave(); }} />
      </label>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} disabled={busy} className="btn-ghost text-[13px]">Cancel</button>
        <button type="button" onClick={onSave} disabled={busy} className="btn-primary text-[13px]">
          {busy && <Loader2 size={14} className="animate-spin" />}Save
        </button>
      </div>
    </div>
  );
}
