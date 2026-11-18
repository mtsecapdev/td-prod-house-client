import { useEffect, useState } from 'react';
import { documents } from '../../services/api';
import DeleteWithUsageDialog from './DeleteWithUsageDialog';

/** Deleting a document: checks whether decks/documents use its figures first, then confirms accordingly. */
export default function ConfirmDocumentDelete({ doc, onDeleted, onCancel }) {
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    documents.usage(doc.id).then((d) => setUsage(d.usage || [])).catch(() => setUsage([]));
  }, [doc.id]);

  if (!usage) return null;
  return (
    <DeleteWithUsageDialog
      title="Delete document"
      what={`"${doc.name}"`}
      usage={usage}
      consequence="Those slides and sections keep their text, but its figures will show as “Figure removed”."
      onDelete={async () => {
        await documents.delete(doc.id, { force: usage.length > 0 });
        onDeleted(doc.id);
      }}
      onCancel={onCancel}
    />
  );
}
