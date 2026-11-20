// Renders the model's answers: paragraphs, bullet and numbered lists, **bold**, `code`, and ### headings.
// Text is never parsed as HTML, so nothing in an answer can inject markup.

function inline(text, keyBase) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(part)) return <code key={key} className="px-1 rounded bg-[#E8EDF3] text-[0.92em]">{part.slice(1, -1)}</code>;
    return part;
  });
}

const BULLET = /^\s*[-*•]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;
const HEADING = /^#{1,4}\s+/;

export default function AnswerText({ text }) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (BULLET.test(line) || NUMBERED.test(line)) {
      // One list until a line that isn't part of it. Blank lines between items don't end it, and bullets under
      // a numbered item nest inside that item, so "1. Phase / - point / 2. Phase" keeps counting 1, 2, 3.
      const ordered = NUMBERED.test(line);
      const start = ordered ? parseInt(line, 10) || 1 : 1;
      const items = [];
      while (i < lines.length) {
        if (!lines[i].trim()) {
          const next = lines.slice(i).findIndex((l) => l.trim());
          if (next < 0 || !(BULLET.test(lines[i + next]) || NUMBERED.test(lines[i + next]))) break;
          i += next;
          continue;
        }
        const numbered = NUMBERED.test(lines[i]);
        const bullet = BULLET.test(lines[i]);
        if (!numbered && !bullet) break;
        if (!ordered && numbered) break; // a numbered list after bullets starts a new list
        let text = lines[i].replace(numbered ? NUMBERED : BULLET, '');
        i++;
        // A list item continues on following indented lines.
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !BULLET.test(lines[i]) && !NUMBERED.test(lines[i])) {
          text += ` ${lines[i].trim()}`;
          i++;
        }
        if (ordered && bullet && items.length) items[items.length - 1].sub.push(text);
        else items.push({ text, sub: [] });
      }
      const Tag = ordered ? 'ol' : 'ul';
      const key = blocks.length;
      blocks.push(
        <Tag key={key} start={ordered && start !== 1 ? start : undefined}
          className={`m-0 pl-5 flex flex-col gap-1 ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {items.map((it, j) => (
            <li key={j}>
              {inline(it.text, `${key}-${j}`)}
              {it.sub.length > 0 && (
                <ul className="mt-1 mb-0 pl-5 flex flex-col gap-1 list-disc">
                  {it.sub.map((t, k) => <li key={k}>{inline(t, `${key}-${j}-${k}`)}</li>)}
                </ul>
              )}
            </li>
          ))}
        </Tag>,
      );
      continue;
    }
    if (HEADING.test(line)) {
      blocks.push(<p key={blocks.length} className="m-0 font-semibold text-navy">{inline(line.replace(HEADING, ''), blocks.length)}</p>);
      i++;
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !BULLET.test(lines[i]) && !NUMBERED.test(lines[i]) && !HEADING.test(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push(<p key={blocks.length} className="m-0">{inline(para.join(' '), blocks.length)}</p>);
  }
  return <div className="flex flex-col gap-2.5">{blocks}</div>;
}
