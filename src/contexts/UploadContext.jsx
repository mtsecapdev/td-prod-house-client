import { useState, useRef, useCallback } from 'react';
import { documents } from '../services/api';
import { UploadContext } from './upload';


// Where the progress bar stands when each import step ends, in order. A step that reports its own progress
// (current of total: converting pages, describing figures) fills the stretch from the step before it.
// Describing figures takes the largest share: ~10-20 s per figure.
const phaseWeights = {
  uploaded: 5, splitting: 10, converting: 45, chunking: 50, embedding: 55,
  storing: 58, describing: 92, summarizing: 97, done: 100, error: 0,
};
const phaseOrder = Object.keys(phaseWeights);

export function UploadProvider({ children }) {
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const onDoneRef = useRef(null);

  /** onDone(docId | null) when processing ends; onStarted() once the document exists (it can be listed). */
  const startUpload = useCallback((file, onDone, onStarted) => {
    setUploading(true);
    setUploadPhase(null);
    setUploadMsg('');
    setUploadProgress(0);
    setUploadFileName(file.name);
    onDoneRef.current = onDone || null;

    documents.uploadStream(file, (evt) => {
      if (evt.phase === 'uploaded') onStarted?.();
      setUploadPhase(evt.phase);
      setUploadMsg(evt.message || '');
      const step = phaseOrder.indexOf(evt.phase);
      if (step > 0 && evt.current != null && evt.total > 1) {
        const base = phaseWeights[phaseOrder[step - 1]];
        setUploadProgress(Math.round(base + (evt.current / evt.total) * (phaseWeights[evt.phase] - base)));
      } else if (phaseWeights[evt.phase] !== undefined) {
        setUploadProgress(phaseWeights[evt.phase]);
      }
      if (evt.phase === 'done' || evt.phase === 'error') {
        onDoneRef.current?.(evt.phase === 'done' ? evt.docId : null);
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
