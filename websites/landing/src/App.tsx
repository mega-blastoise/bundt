import { BrowserRouter, Routes, Route } from 'react-router';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Setup } from './pages/Setup';
import { Cookbook } from './pages/Cookbook';
import { Recipe } from './pages/Recipe';

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Nav />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/cookbook" element={<Cookbook />} />
          <Route path="/cookbook/:id" element={<Recipe />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
