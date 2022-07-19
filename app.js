import { ReactRouter, React, ReactDOM, htm } from './deps.js';
const { NavLink, Link, HashRouter, Routes, Route } = ReactRouter;
const html = htm.bind(React.createElement)
const UnicodeToLaTeX = React.lazy(() => import( './unicode-to-latex.js'));
const ReplaceText = React.lazy(() => import( './replace-text.js'));

function menuClassName({isActive}) {
    return [isActive ? "active" : "", "list-group-item", "list-group-item-action"].join(" ")
}

function App() {
    return html`
    <${HashRouter}>
        <nav className="navbar bg-light">
          <div className="container-fluid">
            <${Link} className="navbar-brand" to="/">Taniguchi's Tools<//>
          </div>
        </nav>
        <div className="container-fluid">
            <div className="row">
                <div className="col-sm-2 pt-3">
                    <div className="list-group">
                        <${NavLink} className=${menuClassName} to="/unicode-to-latex">Unicode To LaTeX<//>
                        <${NavLink} className=${menuClassName} to="/replace-text">Replace Text<//>
                    </div>
                </div>
                <div className="col-sm-10 pt-3">
                    <${React.Suspense} fallback=${html`<div>Loading...</div>`}>
                        <${Routes}>
                            <${Route} path="/unicode-to-latex" element=${html`<${UnicodeToLaTeX} />`} />
                            <${Route} path="/replace-text" element=${html`<${ReplaceText} />`} />
                        <//>
                    <//>
                </div>
            </div>
        </div>
    <//>
    `
}

ReactDOM.createRoot(document.getElementById('app')).render(html`<${App} />`)