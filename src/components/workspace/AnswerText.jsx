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
      const ordered = NUMBERED.test(line);
      const re = ordered ? NUMBERED : BULLET;
      const items = [];
      while (i < lines.length && re.test(lines[i])) {
        // A list item continues on following indented lines.
        let item = lines[i].replace(re, '');
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !BULLET.test(lines[i]) && !NUMBERED.test(lines[i])) {
          item += ` ${lines[i].trim()}`;
          i++;
        }
        items.push(item);
      }
      const Tag = ordered ? 'ol' : 'ul';
      blocks.push(
        <Tag key={blocks.length} className={`m-0 pl-5 flex flex-col gap-1 ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {items.map((it, j) => <li key={j}>{inline(it, `${blocks.length}-${j}`)}</li>)}
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
