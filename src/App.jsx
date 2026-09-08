import { useState, useEffect } from 'react';

import documentsServices from './services/documentsServices';

import FileUpload from './components/FileUpload.jsx';

function App() {
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
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
      <form onSubmit={handleQuerySubmit}>
        <textarea name='query' id='query' cols='30' rows='10'></textarea>
        <ul>
          {console.log(uploadedDocuments)}
          {/* Shape of a doc: {id (unique identifier), name (pdf name), uploaded_at} */}
          {uploadedDocuments.map((doc) => (
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

      <FileUpload setUploadedDocuments={setUploadedDocuments} />
    </div>
  );
}

export default App;
