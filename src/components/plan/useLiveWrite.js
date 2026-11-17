import { useEffect, useRef, useState } from 'react';
import { generations } from '../../services/api';

/**
 * Writes the slides/sections that have no content yet and drops each into `gen` as it finishes, so the editor
 * fills in live (Gamma-style). Runs whenever the loaded generation has unwritten items. If a write is already
 * running (reload, second tab), the server streams that one instead of starting another.
 * @returns {{ phase: 'idle'|'writing'|'done'|'error', current?: number, total?: number, message?: string, retry: () => void }}
 */
export function useLiveWrite(id, gen, setGen, listKey) {
  const [state, setState] = useState({ phase: 'idle' });
  const [attempt, setAttempt] = useState(0);
  const running = useRef(false);
  const controller = useRef(null);

  const needsWrite = Boolean(gen) && (gen.outline?.[listKey] || []).some((it) => !it.content);

  // Leaving the page stops listening; the server keeps writing and a later visit picks it up. (Not tied to
  // needsWrite: the last item arriving flips it, and the stream must stay open for the final 'done'.)
  useEffect(() => () => { controller.current?.abort(); running.current = false; }, []);

  useEffect(() => {
    if (!needsWrite || running.current) return;
    running.current = true;
    const ctrl = new AbortController();
    controller.current = ctrl;

    generations.write(id, (msg) => {
      switch (msg.phase) {
        case 'start':
          setState({ phase: 'writing', total: msg.total });
          break;
        case 'slide':
        case 'section':
          setState({ phase: 'writing', current: msg.slide ?? msg.section, total: msg.total });
          break;
        case 'item_done':
          setGen((g) => {
            const items = [...(g.outline?.[listKey] || [])];
            items[msg.index] = msg.item;
            return { ...g, outline: { ...g.outline, [listKey]: items } };
          });
          break;
        case 'done':
          setState({ phase: 'done' });
          generations.get(id).then(({ generation }) => setGen(generation)).catch(() => {});
          break;
        case 'error':
          setState({ phase: 'error', message: msg.message });
          break;
        default:
      }
    }, ctrl.signal)
      .catch((err) => { if (err.name !== 'AbortError') setState({ phase: 'error', message: err.message }); })
      .finally(() => { if (controller.current === ctrl) running.current = false; });
  }, [id, needsWrite, setGen, listKey, attempt]);

  return { ...state, retry: () => { setState({ phase: 'idle' }); setAttempt((a) => a + 1); } };
}
