import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import LinksPage from './pages/Links';
import './styles.css';

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/links" element={<LinksPage />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

