import { createContext, useContext } from 'react';

// Document upload progress, shared app-wide (UploadProvider in UploadContext.jsx), so an upload keeps going
// and stays visible while the user moves around.
export const UploadContext = createContext(null);

export function useUpload() {
  return useContext(UploadContext);
}
