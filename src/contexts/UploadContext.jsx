import { createContext, useContext, useState, useRef, useCallback } from 'react';
import { documents } from '../services/api';

const UploadContext = createContext(null);

const phaseWeights = {
  uploaded: 5, splitting: 10, converting: 55, chunking: 65,
  embedding: 75, storing: 80, summarizing: 90, done: 100, error: 0,
};

export function UploadProvider({ children }) {
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const onDoneRef = useRef(null);

  const startUpload = useCallback((file, onDone) => {
    setUploading(true);
    setUploadPhase(null);
    setUploadMsg('');
    setUploadProgress(0);
    setUploadFileName(file.name);
    onDoneRef.current = onDone || null;

    documents.uploadStream(file, (evt) => {
      setUploadPhase(evt.phase);
      setUploadMsg(evt.message || '');
      if (evt.phase === 'converting' && evt.total > 1) {
        const base = phaseWeights.splitting;
        const range = phaseWeights.converting - base;
        setUploadProgress(Math.round(base + (evt.current / evt.total) * range));
      } else if (phaseWeights[evt.phase] !== undefined) {
        setUploadProgress(phaseWeights[evt.phase]);
      }
      if (evt.phase === 'done' || evt.phase === 'error') {
        onDoneRef.current?.();
        setTimeout(() => {
          setUploading(false);
          setUploadPhase(null);
          setUploadProgress(0);
        }, 3000);
      }
    }).catch((err) => {
      setUploadMsg(`Upload failed: ${err.message}`);
      setUploadPhase('error');
      setTimeout(() => {
        setUploading(false);
        setUploadPhase(null);
        setUploadProgress(0);
      }, 5000);
    });
  }, []);

  return (
    <UploadContext.Provider value={{
      uploading, uploadPhase, uploadMsg, uploadProgress, uploadFileName, startUpload,
    }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  return useContext(UploadContext);
}
