import { Hero } from '../components/Hero';
import { Packages } from '../components/Packages';
import { Showcase } from '../components/Showcase';

export function Home() {
  return (
    <>
      <Hero />
      <Showcase />
      <Packages />
    </>
  );
}
