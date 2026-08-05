import { useState, useEffect } from 'react';

import documentsServices from './services/documentsServices';

function App() {
  const [uploadedDocuments, setUploadedDocuments] = useState([]);

  useEffect(() => {
    async function fetchDocumentsWrapperAsync() {
      const docs = await documentsServices.getAllDocumentsAsync();
      setUploadedDocuments(docs);
    }

    fetchDocumentsWrapperAsync();

    return () => {
      setUploadedDocuments([]);
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
