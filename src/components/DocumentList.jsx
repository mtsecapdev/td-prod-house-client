import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import documentsServices from '../services/documentsServices';

/**
 * Render the document list as checkboxes.
 * Helps keep track of which documents were selected to be RAG-ed.
 * @param {Object} param0
 * @param {{id, name, uploaded_at}[]} param0.uploadedDocuments
 */
export default function DocumentList({
  uploadedDocuments,
  setUploadedDocuments,
  setSelectedDocumentIds,
}) {
  // Handle the state of selecting of checkbox
  function handleCheckboxClicked(checked, docId) {
    setSelectedDocumentIds((prev) =>
      checked ? [...prev, docId] : prev.filter((id) => id !== docId),
    );
  }

  // Handle deleting of documents
  async function handleDeleteDocument(idToDelete) {
    try {
      await documentsServices.deleteDocumentAsync(idToDelete);
      setUploadedDocuments(await documentsServices.getAllDocumentsAsync());
    } catch (error) {
      console.log('DocumentList delete error: ' + error);
    }
  }

  return (
    <FieldSet className='border-r border-gray-300 p-4'>
      <FieldLegend variant='label'>
        Please select a document to query about:
      </FieldLegend>
      <FieldGroup className='gap-3'>
        {uploadedDocuments.map((d) => (
          <Field orientation='horizontal' key={d.name}>
            <Checkbox
              id={d.name}
              name='document-checkbox'
              value={d.id}
              onCheckedChange={(checked) =>
                handleCheckboxClicked(checked, d.id)
              }
            />
            <FieldLabel htmlFor={d.name} className='font-normal'>
              {`${d.name}`}
            </FieldLabel>
            <Button onClick={(e) => handleDeleteDocument(d.id)}>Delete</Button>
          </Field>
        ))}
      </FieldGroup>
    </FieldSet>
  );
}
