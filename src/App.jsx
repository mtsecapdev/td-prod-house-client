import { useState, useEffect } from 'react';

import documentsServices from './services/documentsServices';

function App() {
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    async function fetchDocumentsWrapperAsync() {
      try {
        setUploadedDocuments(await documentsServices.getAllDocumentsAsync());
      } catch (error) {
        setError(error);
      }
    }

    fetchDocumentsWrapperAsync();

    return () => {
      setUploadedDocuments([]);
      setError(null);
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

  async function handleUploadDocument(e) {
    e.preventDefault();
    // Send selectedFile to documentServices
    await documentsServices.uploadDocument(selectedFile);
    // Re get setUploadedDocuments
    setUploadedDocuments(await documentsServices.getAllDocumentsAsync());
    // Set selectedFile null
    setSelectedFile(null);
  }

  return (
    <div>
      {error ? (
        <div>
          Error: {error.status} {error.message}
        </div>
      ) : (
        <ul>
          {uploadedDocuments.map((doc) => (
            // Something a little confusing:
            // Realise that I use the doc.name as the unique identifier i.e. value of the li key, input id, htmlFor etc.
            // while I then give the input's 'name' a value of the doc.id.
            // This is cos I want to send over the doc.id number which the backend will use to select the right documents.
            // Then because the name is more unique, I use that as the identifier.
            <li key={doc.name}>
              <label htmlFor={doc.name}>
                <input type='checkbox' name={doc.id} id={doc.name} />
                {doc.name}; Uploaded at {doc['uploaded_at']}
              </label>
              <button
                type='button'
                onClick={handleDeleteDocument}
                name={doc.id}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* File uploading component */}
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
    </div>
  );
}

export default App;
