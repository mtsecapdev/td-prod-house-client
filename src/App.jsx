import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UploadProvider } from './contexts/UploadContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/auth';
import SignIn from './pages/SignIn';
import ChangePassword from './pages/ChangePassword';
import Users from './pages/Users';
import Layout from './components/Layout';
import Workspace from './pages/Workspace';
import OpenGeneration from './pages/OpenGeneration';
import Library from './pages/Library';
import Assets from './pages/Assets';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SignedIn />
      </AuthProvider>
    </BrowserRouter>
  );
}

/** The app for a signed-in user; the sign-in page, or the first password change, otherwise. */
function SignedIn() {
  const { user } = useAuth();
  if (user === undefined) return <div className="min-h-screen bg-canvas" aria-busy="true" />;
  if (!user) return <SignIn />;
  if (user.must_change_password) return <ChangePassword forced />;
  return (
    <UploadProvider key={user.id}>
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
          <Route path="account/password" element={<ChangePassword />} />
          <Route path="admin/users" element={user.role === 'admin' ? <Users /> : <Navigate to="/" replace />} />
        </Route>
      </Routes>
    </UploadProvider>
  );
}
