import { useState } from 'react';
import { Code2, Download, Loader2 } from 'lucide-react';
import { generations } from '../services/api';

/* Code editor for a diagram, shown outside the scaled slide or inline in a document. */
export default function DiagramCodePanel({ genId, content, onApply, downloadName, templateId }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(content.mermaid_code || '');
  const [error, setError] = useState(null);
  const [rendering, setRendering] = useState(false);

  async function handleRender() {
    setRendering(true);
    setError(null);
    try {
      const { diagram_file } = await generations.renderDiagram(genId, draft);
      onApply(draft, diagram_file);
    } catch (err) {
      setError(err.message);
    }
    setRendering(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => { setOpen(!open); setDraft(content.mermaid_code || ''); setError(null); }}
          className="btn-outline text-[12px] gap-1 py-1 px-2">
          <Code2 size={13} />{open ? 'Hide code' : 'Edit code'}
        </button>
        {content.diagram_file && (
          <a href={generations.diagramDownloadUrl(genId, content.diagram_file, downloadName, templateId)}
            className="btn-outline text-[12px] gap-1 py-1 px-2 no-underline">
            <Download size={13} />PNG
          </a>
        )}
        <span className="text-[12px] text-slate">Mermaid {content.diagram_type || 'diagram'}</span>
      </div>
      {open && (
        <>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false}
            className="field font-mono text-[12px] leading-relaxed min-h-[140px]" />
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleRender}
              disabled={rendering || !draft.trim() || draft === content.mermaid_code}
              className="btn-primary text-[12px] gap-1 py-1 px-2.5">
              {rendering ? <Loader2 size={13} className="animate-spin" /> : null}Render
            </button>
            <a href="https://mermaid.js.org/syntax/flowchart.html" target="_blank" rel="noreferrer"
              className="text-[12px] text-slate">Mermaid syntax</a>
          </div>
          {error && <pre className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-md p-2 m-0 whitespace-pre-wrap">{error}</pre>}
        </>
      )}
    </div>
  );
}
