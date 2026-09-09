import { useState, useEffect } from 'react';

import documentsServices from './services/documentsServices';

import FileUpload from './components/FileUpload.jsx';
import Chatbox from './components/Chatbox.jsx';
import DocumentList from './components/DocumentList.jsx';

function App() {
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);

  // To retrieve any uploaded documents within the database on first load.
  useEffect(() => {
    async function fetchDocumentsWrapperAsync() {
      try {
        setUploadedDocuments(await documentsServices.getAllDocumentsAsync());
      } catch (error) {
        console.log('Error fetching documents');
      }
    }

    fetchDocumentsWrapperAsync();

    return () => {
      setUploadedDocuments([]);
      console.log('Clean up completed');
    };
  }, []);

  return (
    <div>
      <Chatbox docIdsToReference={selectedDocumentIds} />
      <DocumentList
        uploadedDocuments={uploadedDocuments}
        setUploadedDocuments={setUploadedDocuments}
        setSelectedDocumentIds={setSelectedDocumentIds}
      />
      <FileUpload setUploadedDocuments={setUploadedDocuments} />
    </div>
  );
}

export default App;
