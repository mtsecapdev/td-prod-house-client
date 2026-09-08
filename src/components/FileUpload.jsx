import { useState, useRef } from 'react';
import documentsServices from '../services/documentsServices.js';

export default function FileUpload({ setUploadedDocuments }) {
  // TODO: allow upload more than 1 file at a time.
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  async function handleUploadDocument(e) {
    e.preventDefault();
    // Send selectedFile to documentServices
    await documentsServices.uploadDocument(selectedFile);
    // Re get setUploadedDocuments
    setUploadedDocuments(await documentsServices.getAllDocumentsAsync());
    // Set selectedFile null
    setSelectedFile(null);
    // Direct DOM manipulation cos we have a ref to the input to set the value back to null upon successful file upload.
    fileInputRef.current.value = '';
  }

  // Form that allows user to upload a file
  return (
    <form onSubmit={handleUploadDocument}>
      <input
        ref={fileInputRef}
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
