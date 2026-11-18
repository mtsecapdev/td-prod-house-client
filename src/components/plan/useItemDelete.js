import { useEffect, useRef, useState } from 'react';

const UNDO_MS = 8000;

/**
 * The editors keep undo history per item position, so removing (delta -1) or restoring (+1) an item at `at`
 * moves the later items' history with them. Returns a new { position: value } map.
 */
export function shiftedHistory(map, at, delta) {
  const out = {};
  for (const [key, value] of Object.entries(map)) {
    const i = Number(key);
    if (delta < 0 && i === at) continue; // the deleted item's history goes with it
    out[i >= at + (delta < 0 ? 1 : 0) ? i + delta : i] = value;
  }
  return out;
}

/**
 * Deleting a slide/section in the editor, with a few seconds to undo. Disabled while items are still being
 * written (the writer places them by position) and for the last remaining item.
 */
export function useItemDelete({ gen, setGen, listKey, saveOutline, shiftHistory, active, setActive, blocked }) {
  const [removed, setRemoved] = useState(null); // { item, index }
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  function commit(items) {
    const next = { ...gen, outline: { ...gen.outline, [listKey]: items } };
    setGen(next);
    saveOutline(next);
  }

  const items = gen?.outline?.[listKey] || [];
  const canDelete = !blocked && items.length > 1;

  function remove(index) {
    if (!canDelete || !items[index]) return;
    shiftHistory(index, -1);
    commit(items.filter((_, i) => i !== index));
    if (active > index || active === items.length - 1) setActive(Math.max(0, active - 1));
    setRemoved({ item: items[index], index });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setRemoved(null), UNDO_MS);
  }

  function undo() {
    if (!removed) return;
    const restored = [...items];
    restored.splice(Math.min(removed.index, restored.length), 0, removed.item);
    shiftHistory(removed.index, 1);
    commit(restored);
    setActive(removed.index);
    setRemoved(null);
    clearTimeout(timer.current);
  }

  return { remove, undo, removed, dismiss: () => setRemoved(null), canDelete };
}
