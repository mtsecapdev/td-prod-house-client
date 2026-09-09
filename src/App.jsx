import { useState, useEffect } from 'react';

import documentsServices from './services/documentsServices';

import FileUpload from './components/FileUpload.jsx';
import Chatbox from './components/Chatbox.jsx';
import DocumentList from './components/DocumentList.jsx';

function App() {
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [queryResult, setQueryResult] = useState(null);

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

  // TODO: try/catch in the awaits to render errors
  // TODO: give loading feedback for upload and query

  async function handleDeleteDocument(e) {
    const idToDelete = e.currentTarget.name;
    await documentsServices.deleteDocumentAsync(idToDelete);
    setUploadedDocuments(await documentsServices.getAllDocumentsAsync());
  }

  // Dont allow sending if no documents selected
  async function handleQuerySubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    // Get the query value
    const query = formData.get('query');
    // Get the ids of what was ticked into an array
    const docIdsToReference = formData.getAll('document-checkbox').map(Number);
    setQueryResult(await documentsServices.sendQuery(query, docIdsToReference));
  }

  return (
    <div>
      <Chatbox />
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
