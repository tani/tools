import React from 'https://esm.sh/react@18';
import ReactDOM from 'https://esm.sh/react-dom@18'
import { HashRouter, Routes, Route, Link, NavLink } from 'https://esm.sh/react-router-dom@6';
import htm from 'https://esm.sh/htm@3';
import { UnicodeToLaTeX } from './unicode-to-latex.js';
import { ReplaceText } from './replace-text.js';

const html = htm.bind(React.createElement)

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
                    <${Routes}>
                        <${Route} path="/unicode-to-latex" element=${html`<${UnicodeToLaTeX} />`} />
                        <${Route} path="/replace-text" element=${html`<${ReplaceText} />`} />
                    <//>
                </div>
            </div>
        </div>
    <//>
    `
}

ReactDOM.createRoot(document.getElementById('app')).render(html`<${App} />`)