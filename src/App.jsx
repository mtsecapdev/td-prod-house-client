import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Brief from './pages/Brief';
import Outline from './pages/Outline';
import Progress from './pages/Progress';
import Review from './pages/Review';
import DocOutline from './pages/DocOutline';
import DocProgress from './pages/DocProgress';
import DocReview from './pages/DocReview';
import ImageBrief from './pages/ImageBrief';
import ImagePrompt from './pages/ImagePrompt';
import ImageProgress from './pages/ImageProgress';
import ImageReview from './pages/ImageReview';
import InfographicBrief from './pages/InfographicBrief';
import InfographicProgress from './pages/InfographicProgress';
import InfographicReview from './pages/InfographicReview';
import Library from './pages/Library';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="library" element={<Library />} />
          <Route path="create/deck" element={<Brief />} />
          <Route path="create/deck/:id/outline" element={<Outline />} />
          <Route path="create/deck/:id/progress" element={<Progress />} />
          <Route path="create/deck/:id/review" element={<Review />} />
          <Route path="create/doc" element={<Brief />} />
          <Route path="create/doc/:id/outline" element={<DocOutline />} />
          <Route path="create/doc/:id/progress" element={<DocProgress />} />
          <Route path="create/doc/:id/review" element={<DocReview />} />
          <Route path="create/image" element={<ImageBrief />} />
          <Route path="create/image/:id/prompt" element={<ImagePrompt />} />
          <Route path="create/image/:id/progress" element={<ImageProgress />} />
          <Route path="create/image/:id/review" element={<ImageReview />} />
          <Route path="create/infographic" element={<InfographicBrief />} />
          <Route path="create/infographic/:id/progress" element={<InfographicProgress />} />
          <Route path="create/infographic/:id/review" element={<InfographicReview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
