const BASE_API_URL = import.meta.env.VITE_API_BASE_URL;

/**
 *
 * @returns Doc[] where Doc is an object of shape = {id, name, uploaded_at}
 */
async function getAllDocumentsAsync() {
  try {
    const res = await fetch(BASE_API_URL);
    // All the server side code was coded to always return a "data" object property in the response
    const { data } = await res.json();

    // For any non-2XX status code responses.
    if (!res.ok) {
      throw new Error(data.message);
    }

    return data.message.docs;
  } catch (error) {
    // The default message is if we encounter any non-server handled errors
    throw new Error(error.message || 'Unable to reach the server');
  }
}

// POST one document
async function uploadDocument(file) {
  try {
    const formData = new FormData();
    formData.append('uploaded_file', file);

    const uploadUrl = new URL('documents/upload', BASE_API_URL);
    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });
    const { data } = await res.json();

    if (!res.ok) {
      throw new Error(data.message);
    }

    return data.message;
  } catch (error) {
    throw new Error(error.message || 'Unable to reach the server');
  }
}

// POST a query

// DELETE one document
/**
 *
 * @param {string} id
 * @returns Object containing the deleted document's properties.
 */
async function deleteDocumentAsync(id) {
  try {
    const deleteUrl = new URL(`documents/${id}`, BASE_API_URL);
    const res = await fetch(deleteUrl, {
      method: 'DELETE',
    });
    // All the server side code was coded to always return a "data" object property in the response
    const { data } = await res.json();

    // For any non-2XX status code responses.
    if (!res.ok) {
      throw new Error(data.message);
    }

    return data.message.deletedDocument;
  } catch (error) {
    // The default message is if we encounter any non-server handled errors
    throw new Error(error.message || 'Unable to reach the server');
  }
}

export default {
  getAllDocumentsAsync,
  deleteDocumentAsync,
  uploadDocument,
};
