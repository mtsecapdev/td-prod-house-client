import { useState, useEffect } from 'react';

import documentsServices from './services/documentsServices';

function App() {
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDocumentsWrapperAsync() {
      try {
        const docs = await documentsServices.getAllDocumentsAsync();
        setUploadedDocuments(docs);
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

  return (
    <div>
      <ul>
        {uploadedDocuments.map((doc) => (
          <li key={doc.id}>
            {doc.name} {doc['uploaded_at']}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
