import { useState } from 'react';
import documentsServices from '../services/documentsServices.js';

export default function FileUpload({ setUploadedDocuments }) {
  // TODO: allow upload more than 1 file at a time.
  const [selectedFile, setSelectedFile] = useState(null);

  async function handleUploadDocument(e) {
    e.preventDefault();
    // Send selectedFile to documentServices
    await documentsServices.uploadDocument(selectedFile);
    // Re get setUploadedDocuments
    setUploadedDocuments(await documentsServices.getAllDocumentsAsync());
    // Set selectedFile null
    setSelectedFile(null);
  }

  // Form that allows user to upload a file
  return (
    <form onSubmit={handleUploadDocument}>
      <input
        type='file'
        onChange={(e) => {
          // Set the selectedFile state
          setSelectedFile(e.target.files[0]);
        }}
      />
      <button type='submit' disabled={selectedFile === null}>
        Upload
      </button>
    </form>
  );
}
