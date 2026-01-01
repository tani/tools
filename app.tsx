import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { NavLink, Link, BrowserRouter, Routes, Route } from "react-router-dom";
import "bootswatch/dist/lumen/bootstrap.min.css";
import "@git-diff-view/react/styles/diff-view.css";
const UnicodeToLaTeX = React.lazy(() => import("./unicode-to-latex"));
const LaTeXToUnicode = React.lazy(() => import("./latex-to-unicode"));
const ReplaceText = React.lazy(() => import("./replace-text"));
const FindDifferences = React.lazy(() => import("./find-differences"));
const SvgToPng = React.lazy(() => import("./svg-to-png"));
const WordCount = React.lazy(() => import("./word-count"));
const BasicStatistics = React.lazy(() => import("./basic-statistics"));
const MermaidEditor = React.lazy(() => import("./mermaid-editor"));

function menuClassName({ isActive }: { isActive: boolean }) {
  return [isActive ? "active" : "", "list-group-item", "list-group-item-action"].join(" ");
}

function App() {
  return (
    <BrowserRouter>
      <nav className="navbar bg-light">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">
            Taniguchi's Tools
          </Link>
        </div>
      </nav>
      <div className="container-fluid">
        <div className="row">
          <div className="col-sm-2 pt-3">
            <div className="list-group">
              <NavLink className={menuClassName} to="/unicode-to-latex">
                Unicode to LaTeX
              </NavLink>
              <NavLink className={menuClassName} to="/latex-to-unicode">
                LaTeX to Unicode
              </NavLink>
              <NavLink className={menuClassName} to="/replace-text">
                Replace Text
              </NavLink>
              <NavLink className={menuClassName} to="/find-differences">
                Find Differences
              </NavLink>
              <NavLink className={menuClassName} to="/svg-to-png">
                Convert SVG to PNG
              </NavLink>
              <NavLink className={menuClassName} to="/word-count">
                Word Count
              </NavLink>
              <NavLink className={menuClassName} to="/basic-statistics">
                Basic Statistics
              </NavLink>
              <NavLink className={menuClassName} to="/mermaid-editor">
                Mermaid Editor
              </NavLink>
            </div>
          </div>
          <div className="col-sm-10 pt-3">
            <React.Suspense fallback={<div>Loading...</div>}>
              <Routes>
                <Route path="/unicode-to-latex" element={<UnicodeToLaTeX />} />
                <Route path="/latex-to-unicode" element={<LaTeXToUnicode />} />
                <Route path="/replace-text" element={<ReplaceText />} />
                <Route path="/find-differences" element={<FindDifferences />} />
                <Route path="/svg-to-png" element={<SvgToPng />} />
                <Route path="/word-count" element={<WordCount />} />
                <Route path="/basic-statistics" element={<BasicStatistics />} />
                <Route path="/mermaid-editor" element={<MermaidEditor />} />
              </Routes>
            </React.Suspense>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

const container = document.getElementById("app");
if (container) {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
