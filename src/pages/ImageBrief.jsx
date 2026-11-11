import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, X, Image as ImageIcon } from 'lucide-react';
import { generations } from '../services/api';

const imgStyles = [
  { value: 'photorealistic', label: 'Photorealistic', desc: 'Realistic, photo-like' },
  { value: 'illustration', label: 'Illustration', desc: 'Digital art, clean lines' },
  { value: 'conceptual', label: 'Conceptual', desc: 'Abstract, symbolic' },
];

const sizes = [
  { value: 'square', label: 'Square', desc: '1024 x 1024' },
  { value: 'landscape', label: 'Landscape', desc: '1344 x 768' },
  { value: 'portrait', label: 'Portrait', desc: '768 x 1344' },
  { value: 'wide', label: 'Wide', desc: '1536 x 640' },
];

export default function ImageBrief() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('photorealistic');
  const [size, setSize] = useState('square');
  const [referenceFile, setReferenceFile] = useState(null);
  const [referencePreview, setReferencePreview] = useState(null);
  const [strength, setStrength] = useState(0.65);
  const [submitting, setSubmitting] = useState(false);

  function handleReferenceSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceFile(file);
    const url = URL.createObjectURL(file);
    setReferencePreview(url);
    if (fileRef.current) fileRef.current.value = '';
  }

  function clearReference() {
    setReferenceFile(null);
    if (referencePreview) URL.revokeObjectURL(referencePreview);
    setReferencePreview(null);
  }

  const canSubmit = topic.trim();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const brief = { topic, description: description || undefined, style, size };
      if (referenceFile) brief.strength = strength;

      const { generation } = await generations.create({ type: 'image', brief });

      if (referenceFile) {
        await generations.uploadReferenceImage(generation.id, referenceFile);
      }

      navigate(`/create/image/${generation.id}/prompt`);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-[960px] w-[90%] mx-auto py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/" className="btn-ghost"><ArrowLeft size={18} />Back</Link>
        <span className="hint"><strong className="text-ink">Step 1 of 3</strong> &middot; Brief</span>
      </div>

      <h1 className="font-heading text-[32px] leading-10 font-bold tracking-tight m-0">
        New image
      </h1>

      <form onSubmit={handleSubmit} className="card p-7 flex flex-col gap-7">
        <fieldset className="border-0 m-0 p-0">
          <legend className="label mb-3">Style</legend>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
            {imgStyles.map((s) => (
              <label key={s.value} className={`option ${style === s.value ? 'option-selected' : ''}`}>
                <input type="radio" name="style" value={s.value} checked={style === s.value}
                  onChange={() => setStyle(s.value)} className="mt-0.5 w-[18px] h-[18px] accent-navy" />
                <span>
                  <span className="block font-semibold text-[15px]">{s.label}</span>
                  <span className="hint">{s.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="topic" className="label">What do you want to generate?</label>
          <input id="topic" className="field" maxLength={200} value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Cross-section of a ship's engine room" />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="description" className="label">
            Additional details <span className="font-normal text-slate text-[13px]">(optional)</span>
          </label>
          <textarea id="description" className="field" rows={3} value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe specific elements, colors, perspective, or context you want in the image" />
        </div>

        <fieldset className="border-0 m-0 p-0 flex flex-col gap-3">
          <legend className="label mb-1">Reference image <span className="font-normal text-slate text-[13px]">(optional)</span></legend>
          <span className="hint -mt-1">Upload a reference photo to guide the style and composition of the generated image.</span>

          {!referenceFile ? (
            <>
              <input ref={fileRef} type="file" id="ref-upload" className="hidden"
                accept="image/png,image/jpeg,image/webp" onChange={handleReferenceSelect} />
              <button type="button"
                onClick={() => fileRef.current?.click()}
                className="btn-outline text-[14px] gap-1.5 self-start">
                <Upload size={16} />
                Upload reference image
              </button>
            </>
          ) : (
            <div className="flex gap-4 items-start">
              <div className="relative w-[160px] h-[160px] rounded-lg overflow-hidden border border-border shrink-0 bg-canvas">
                <img src={referencePreview} alt="Reference" className="w-full h-full object-cover" />
                <button type="button" onClick={clearReference}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-slate hover:text-red-600 shadow-sm">
                  <X size={14} />
                </button>
              </div>
              <div className="flex flex-col gap-3 flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <ImageIcon size={16} className="text-slate shrink-0" />
                  <span className="text-[14px] text-ink truncate">{referenceFile.name}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="strength" className="text-[13px] font-medium text-ink">Influence strength</label>
                    <span className="text-[13px] text-slate font-mono">{Math.round(strength * 100)}%</span>
                  </div>
                  <input id="strength" type="range" min={0.2} max={0.9} step={0.05}
                    value={strength} onChange={(e) => setStrength(parseFloat(e.target.value))}
                    className="w-full accent-navy" />
                  <div className="flex justify-between text-[11px] text-slate">
                    <span>More faithful</span>
                    <span>More creative</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </fieldset>

        <fieldset className="border-0 m-0 p-0">
          <legend className="label mb-3">Size</legend>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
            {sizes.map((s) => (
              <label key={s.value} className={`option ${size === s.value ? 'option-selected' : ''}`}>
                <input type="radio" name="size" value={s.value} checked={size === s.value}
                  onChange={() => setSize(s.value)} className="mt-0.5 w-[18px] h-[18px] accent-navy" />
                <span>
                  <span className="block font-semibold text-[15px]">{s.label}</span>
                  <span className="hint">{s.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex justify-end">
          <button type="submit" disabled={submitting || !canSubmit} className="btn-primary">
            {submitting ? 'Creating...' : 'Generate image'}
          </button>
        </div>
      </form>
    </main>
  );
}
