import Header from '../components/Header';
import Footer from '../components/Footer';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-root">
      <Header />
      <main className="container">{children}</main>
      <Footer />
    </div>
  );
}
