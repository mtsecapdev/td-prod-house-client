import { slideKindOptions } from '../slides/engine';

// Deck vs document differences for the planning screens. A deck's slide kinds come from the slide design spec
// (loaded from the server, see slides/engine.js); a document's section types are listed here.

export const SECTION_TYPE_OPTIONS = [
  { key: 'heading',         label: 'Heading',    description: 'Title page and summary' },
  { key: 'body',            label: 'Body',       description: 'Paragraphs with subheadings' },
  { key: 'procedure',       label: 'Procedure',  description: 'Step-by-step instructions' },
  { key: 'key_points',      label: 'Key Points', description: 'Rules or facts to remember' },
  { key: 'reference_table', label: 'Table',      description: 'Data to look up' },
  { key: 'diagram',         label: 'Diagram',    description: 'Figure: flowchart, sequence or mind map' },
  { key: 'summary',         label: 'Summary',    description: 'Recap and next steps' },
];

export const KIND = {
  deck: {
    type: 'deck',
    noun: 'slide',
    nounPlural: 'slides',
    product: 'slide deck',
    listKey: 'slides',
    typeKey: 'layout',
    defaultType: 'points',
    // The opening and closing items: a length counts the items between them.
    bookends: ['title', 'closing'],
    audienceWord: 'audience',
    countRange: [3, 25],
    defaultCount: 8,
    formats: [
      { value: 'presented', label: 'Presented', desc: 'A speaker talks over the slides' },
      { value: 'read', label: 'Read alone', desc: 'Slides explain themselves' },
      { value: 'both', label: 'Both', desc: 'Presented, then shared' },
    ],
  },
  doc: {
    type: 'doc',
    noun: 'section',
    nounPlural: 'sections',
    product: 'training document',
    listKey: 'sections',
    typeKey: 'section_type',
    bookends: ['heading', 'summary'],
    defaultType: 'body',
    audienceWord: 'reader',
    countRange: [3, 20],
    defaultCount: 8,
    formats: [
      { value: 'learning', label: 'Learning guide', desc: 'Read through once' },
      { value: 'reference', label: 'Reference', desc: 'Looked up when needed' },
      { value: 'procedure', label: 'Procedure manual', desc: 'Followed at work' },
    ],
  },
};

export const TEXT_AMOUNTS = [
  { value: 'minimal', label: 'Minimal', desc: 'Headlines, detail in notes' },
  { value: 'concise', label: 'Concise', desc: 'Short points' },
  { value: 'detailed', label: 'Detailed', desc: 'Full sentences' },
];

/** The kinds an item can be (engine: the slide engine, for decks; see useSlideEngine). */
export function kindOptions(kind, engine) {
  return kind.type === 'deck' ? slideKindOptions(engine) : SECTION_TYPE_OPTIONS;
}

export function typeLabel(kind, key, engine) {
  // Figure items come from document figures (planner, pickers), not the kind menus.
  if (key === 'figure') return 'Figure';
  return kindOptions(kind, engine).find((o) => o.key === key)?.label || key;
}
