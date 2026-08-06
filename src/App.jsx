import { useState, useEffect } from 'react';

import documentsServices from './services/documentsServices';

function App() {
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [queryResult, setQueryResult] = useState(null);

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

  async function handleUploadDocument(e) {
    e.preventDefault();
    // Send selectedFile to documentServices
    await documentsServices.uploadDocument(selectedFile);
    // Re get setUploadedDocuments
    setUploadedDocuments(await documentsServices.getAllDocumentsAsync());
    // Set selectedFile null
    setSelectedFile(null);
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
      <form onSubmit={handleQuerySubmit}>
        <textarea name='query' id='query' cols='30' rows='10'></textarea>
        <ul>
          {uploadedDocuments.map((doc) => (
            // Something a little confusing:
            // Realise that I use the doc.name as the unique identifier i.e. value of the li key, input id, htmlFor etc.
            // while I then give the input's 'name' a value of the doc.id.
            // This is cos I want to send over the doc.id number which the backend will use to select the right documents.
            // Then because the name is more unique, I use that as the identifier.
            <li key={doc.name}>
              <label htmlFor={doc.name}>
                <input
                  type='checkbox'
                  name='document-checkbox'
                  id={doc.name}
                  value={doc.id}
                />
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
        {queryResult && (
          <div>
            <div>Model Answer: {queryResult.modelResponse}</div>
          </div>
        )}
        <button type='submit'>Submit</button>
      </form>

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
