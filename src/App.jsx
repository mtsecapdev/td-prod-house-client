import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UploadProvider } from './contexts/UploadContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Brief from './pages/Brief';
import Review from './pages/Review';
import OutlinePlan from './pages/plan/OutlinePlan';
import DocReview from './pages/DocReview';
import ImageBrief from './pages/ImageBrief';
import ImagePrompt from './pages/ImagePrompt';
import ImageProgress from './pages/ImageProgress';
import ImageReview from './pages/ImageReview';
import Chat from './pages/Chat';
import Library from './pages/Library';
import Assets from './pages/Assets';

export default function App() {
  return (
    <BrowserRouter>
      <UploadProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="chat" element={<Chat />} />
            <Route path="library" element={<Library />} />
            <Route path="assets" element={<Assets />} />
            <Route path="create/deck" element={<Brief />} />
            <Route path="create/deck/:id/outline" element={<OutlinePlan />} />
            <Route path="create/deck/:id/review" element={<Review />} />
            <Route path="create/doc" element={<Brief />} />
            <Route path="create/doc/:id/outline" element={<OutlinePlan />} />
            <Route path="create/doc/:id/review" element={<DocReview />} />
            <Route path="create/image" element={<ImageBrief />} />
            <Route path="create/image/:id/prompt" element={<ImagePrompt />} />
            <Route path="create/image/:id/progress" element={<ImageProgress />} />
            <Route path="create/image/:id/review" element={<ImageReview />} />
          </Route>
        </Routes>
      </UploadProvider>
    </BrowserRouter>
  );
}
