// Deck vs document differences for the planning screens.

export const LAYOUT_OPTIONS = [
  { key: 'title',            label: 'Title',            description: 'Opening slide' },
  { key: 'bullets',          label: 'Bullets',          description: 'Parallel points' },
  { key: 'two_column',       label: 'Two Column',       description: 'Side-by-side comparison' },
  { key: 'stat_focus',       label: 'Key Stat',         description: 'One number that matters' },
  { key: 'key_stats',        label: 'Key Stats',        description: '2-6 figures side by side' },
  { key: 'quote_highlight',  label: 'Quote',            description: 'Quote or principle from the source' },
  { key: 'checklist',        label: 'Checklist',        description: 'Steps to carry out' },
  { key: 'section_divider',  label: 'Section Divider',  description: 'Opens a new part' },
  { key: 'big_idea',         label: 'Big Idea',         description: 'One statement to remember' },
  { key: 'timeline',         label: 'Timeline',         description: 'Dated events in order' },
  { key: 'process_flow',     label: 'Process Flow',     description: 'Linear workflow' },
  { key: 'icon_grid',        label: 'Icon Grid',        description: 'Parallel concepts' },
  { key: 'comparison_table', label: 'Comparison Table', description: 'Items on shared attributes' },
  { key: 'diagram',          label: 'Diagram',          description: 'Flowchart, sequence or mind map' },
  { key: 'closing',          label: 'Closing',          description: 'Takeaways and next step' },
];

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
    options: LAYOUT_OPTIONS,
    defaultType: 'bullets',
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
    options: SECTION_TYPE_OPTIONS,
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

export function typeLabel(kind, key) {
  return kind.options.find((o) => o.key === key)?.label || key;
}

/** Where a deck or document should open, given how far it has got. */
export function resumePath(g) {
  const base = `/create/${g.type}/${g.id}`;
  return ['writing', 'generating', 'done'].includes(g.status) ? `${base}/review` : `${base}/outline`;
}
