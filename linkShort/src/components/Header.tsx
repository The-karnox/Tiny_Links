import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <h1 className="logo"><Link to="/">linkShort</Link></h1>
        <nav>
          <Link to="/">Create</Link>
          <Link to="/links">Links</Link>
        </nav>
      </div>
    </header>
  );
}
