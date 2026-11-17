import { useCallback, useEffect, useRef, useState } from 'react';
import { generations } from '../../services/api';

const POLL_MS = 2500;

export function jobRunning(gen, kind) {
  return gen?.job?.state === 'running' && (!kind || gen.job.kind === kind);
}

export function jobFailed(gen, kind) {
  return gen?.job?.state === 'failed' && (!kind || gen.job.kind === kind) ? gen.job.error : null;
}

/**
 * Loads a generation and keeps it fresh while a model job (questions, storyline, outline) runs on it.
 * onLoad(gen) runs on every load; onJobDone(gen) runs once when a job this hook saw running finishes.
 */
export function usePlanGeneration(id, { onJobDone, onLoad } = {}) {
  const [gen, setGen] = useState(null);
  const [error, setError] = useState(null);
  const sawRunning = useRef(false);
  const callbacks = useRef({});
  useEffect(() => { callbacks.current = { onJobDone, onLoad }; });

  const apply = useCallback((generation) => {
    setGen(generation);
    setError(null);
    callbacks.current.onLoad?.(generation);
    if (jobRunning(generation)) sawRunning.current = true;
    else if (sawRunning.current) {
      sawRunning.current = false;
      callbacks.current.onJobDone?.(generation);
    }
    return generation;
  }, []);

  const refresh = useCallback(
    () => generations.get(id)
      .then(({ generation }) => apply(generation))
      .catch((err) => { setError(err.message); return null; }),
    [id, apply],
  );

  useEffect(() => {
    generations.get(id).then(({ generation }) => apply(generation)).catch((err) => setError(err.message));
  }, [id, apply]);

  const running = jobRunning(gen);
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [running, refresh]);

  // Call after starting a job so polling begins straight away.
  const expectJob = useCallback(() => { sawRunning.current = true; return refresh(); }, [refresh]);

  return { gen, setGen, error, refresh, expectJob };
}
