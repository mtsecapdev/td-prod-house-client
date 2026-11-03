import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Brief from './pages/Brief';
import Outline from './pages/Outline';
import Progress from './pages/Progress';
import Review from './pages/Review';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="create/deck" element={<Brief />} />
          <Route path="create/deck/:id/outline" element={<Outline />} />
          <Route path="create/deck/:id/progress" element={<Progress />} />
          <Route path="create/deck/:id/review" element={<Review />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
