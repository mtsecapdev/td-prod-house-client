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

// POST a query

// DELETE one document

export default {
  getAllDocumentsAsync,
};
