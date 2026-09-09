import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import documentsServices from '../services/documentsServices.js';

export default function FileUpload({ setUploadedDocuments }) {
  // TODO: allow upload more than 1 file at a time.
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleUploadDocument(e) {
    e.preventDefault();
    setIsUploading(true);
    try {
      // Send selectedFile to documentServices
      await documentsServices.uploadDocument(selectedFile);
      // Re get setUploadedDocuments
      setUploadedDocuments(await documentsServices.getAllDocumentsAsync());
      // Set selectedFile null
      setSelectedFile(null);
      // Direct DOM manipulation cos we have a ref to the input to set the value back to null upon successful file upload.
      fileInputRef.current.value = '';
    } catch (error) {
      console.log(`Error in FileUpload: ${error}`);
    } finally {
      setIsUploading(false);
    }
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
        disabled={isUploading}
        className='hidden'
      />
      {/* Hide the <input> because it becomes unstyled; use below Button and useRef to proxy click it. */}
      <Button
        type='button'
        variant='outline'
        disabled={isUploading}
        onClick={() => fileInputRef.current.click()}
      >
        Choose File
      </Button>
      <span className='text-sm text-muted-foreground truncate max-w-48'>
        {selectedFile ? selectedFile.name : 'No file chosen'}
      </span>
      <Button type='submit' disabled={selectedFile === null || isUploading}>
        {isUploading ? 'Uploading...' : 'Upload File'}
      </Button>
    </form>
  );
}
