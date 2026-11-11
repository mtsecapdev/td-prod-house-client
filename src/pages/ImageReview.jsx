import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, BookmarkPlus, Check, RefreshCw } from 'lucide-react';
import { generations, assets } from '../services/api';

export default function ImageReview() {
  const { id } = useParams();
  const [gen, setGen] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    generations.get(id).then(({ generation }) => setGen(generation));
  }, [id]);

  if (!gen) return <main className="flex items-center justify-center h-[60vh]"><p className="hint">Loading...</p></main>;

  const imageData = gen.outline || {};
  const topic = gen.brief?.topic || 'Image';
  const imageUrl = generations.imageUrl(id);

  async function handleSave() {
    setSaving(true);
    try {
      await assets.save(gen.id, topic);
      setSaved(true);
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const currentPrompt = imageData.prompt || '';
      const currentNeg = imageData.negative_prompt || '';
      await generations.updatePrompt(id, currentPrompt, currentNeg);
      window.location.href = `/create/image/${id}/prompt`;
    } catch (err) {
      console.error(err);
      setRegenerating(false);
    }
  }

  return (
    <main className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-border bg-white px-4 py-2 flex items-center gap-3">
        <Link to="/" className="btn-ghost text-[14px]"><ArrowLeft size={16} />Home</Link>
        <div className="flex-1" />
        <span className="text-[14px] font-medium text-ink truncate max-w-[300px]">{topic}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button onClick={handleRegenerate} disabled={regenerating}
            className="btn-outline text-[14px] gap-1.5">
            <RefreshCw size={16} />
            <span className="hidden sm:inline">Regenerate</span>
          </button>
          <button onClick={handleSave} disabled={saving || saved}
            className="btn-outline text-[14px] gap-1.5">
            {saved ? <Check size={16} /> : <BookmarkPlus size={16} />}
            <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
          </button>
          <a href={imageUrl} download className="btn-primary text-[14px] gap-1.5 no-underline">
            <Download size={16} />
            <span className="hidden sm:inline">PNG</span>
          </a>
        </div>
      </div>

      {/* Image preview + details */}
      <div className="flex-1 flex min-h-0 overflow-auto bg-[#E8ECF0]">
        <div className="flex-1 flex items-center justify-center p-6">
          <img
            src={imageUrl}
            alt={topic}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
          />
        </div>

        {/* Details sidebar */}
        <div className="w-[280px] shrink-0 border-l border-border bg-white overflow-y-auto p-5 flex flex-col gap-5">
          <div>
            <h3 className="text-[13px] font-semibold text-slate mb-1">Topic</h3>
            <p className="text-[14px]">{gen.brief?.topic}</p>
          </div>

          {gen.brief?.description && (
            <div>
              <h3 className="text-[13px] font-semibold text-slate mb-1">Description</h3>
              <p className="text-[14px]">{gen.brief.description}</p>
            </div>
          )}

          <div>
            <h3 className="text-[13px] font-semibold text-slate mb-1">Style</h3>
            <p className="text-[14px] capitalize">{gen.brief?.style}</p>
          </div>

          <div>
            <h3 className="text-[13px] font-semibold text-slate mb-1">Size</h3>
            <p className="text-[14px]">{imageData.width} x {imageData.height} ({gen.brief?.size})</p>
          </div>

          {imageData.prompt && (
            <div>
              <h3 className="text-[13px] font-semibold text-slate mb-1">Generated prompt</h3>
              <p className="text-[14px] leading-relaxed text-slate">{imageData.prompt}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
