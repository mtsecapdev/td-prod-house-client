import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UploadProvider } from './contexts/UploadContext';
import Layout from './components/Layout';
import Workspace from './pages/Workspace';
import OpenGeneration from './pages/OpenGeneration';
import Library from './pages/Library';
import Assets from './pages/Assets';

export default function App() {
  return (
    <BrowserRouter>
      <UploadProvider>
        <Routes>
          <Route element={<Layout />}>
            {/* The workspace: chat, with the deck/document made in it open beside it */}
            <Route index element={<Workspace />} />
            <Route path="c/:conversationId" element={<Workspace />} />
            <Route path="c/:conversationId/g/:generationId" element={<Workspace />} />
            {/* A deck/document by id (and links from before the workspace) opens in its conversation */}
            <Route path="g/:id" element={<OpenGeneration />} />
            <Route path="create/deck/:id/*" element={<OpenGeneration />} />
            <Route path="create/doc/:id/*" element={<OpenGeneration />} />
            <Route path="chat" element={<Navigate to="/" replace />} />
            <Route path="create/*" element={<Navigate to="/" replace />} />
            <Route path="library" element={<Library />} />
            <Route path="assets" element={<Assets />} />
          </Route>
        </Routes>
      </UploadProvider>
    </BrowserRouter>
  );
}
