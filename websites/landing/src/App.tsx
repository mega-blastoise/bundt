import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Packages } from './components/Packages';
import { Footer } from './components/Footer';

export function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <Hero />
      <Packages />
      <Footer />
    </div>
  );
}
