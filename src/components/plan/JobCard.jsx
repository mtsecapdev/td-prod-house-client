import { Loader2, AlertTriangle, RotateCcw } from 'lucide-react';

/** A full-width card shown while a planning job runs, or after it failed. */
export default function JobCard({ running, error, runningText, detail, onRetry }) {
  if (running) {
    return (
      <div className="card p-10 flex flex-col items-center gap-3 text-center">
        <Loader2 size={32} className="text-cobalt animate-spin" />
        <p className="font-medium text-[16px] m-0">{runningText}</p>
        {detail && <p className="hint text-[13px] m-0 max-w-md">{detail}</p>}
      </div>
    );
  }
  if (error) {
    return (
      <div className="card p-8 flex flex-col items-center gap-3 text-center">
        <AlertTriangle size={28} className="text-red-600" />
        <p className="text-red-700 m-0 max-w-lg">{error}</p>
        {onRetry && <button type="button" onClick={onRetry} className="btn-primary"><RotateCcw size={15} />Try again</button>}
      </div>
    );
  }
  return null;
}
