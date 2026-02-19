import { Outlet, Link, useNavigate } from "react-router-dom";
import logoPng from "../assets/newsery-logo.png";
import "./shell.css";

export default function AppShell() {
  const navigate = useNavigate();

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <a
            className="brandMark"
            href="https://newsery.app/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open newsery.app"
            title="Open newsery.app"
          >
            <img className="brandLogo" src={logoPng} alt="Newsery" />
          </a>
          <div className="brandText">
            <div className="brandName">Newsery</div>
          </div>
        </div>

        <div className="topbarRight">
          <button
            type="button"
            className="topbarDashBtn"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <Link to="/dashboard">Dashboard</Link>
        <span className="dot">•</span>
        <Link to="/feed">Feed</Link>
      </footer>
    </div>
  );
}
