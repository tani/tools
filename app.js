import * as React from "react";
import * as ReactDOM from "react-dom/client";
import htm from "htm"
import { NavLink, Link, HashRouter, Routes, Route } from "react-router-dom";
const html = htm.bind(React.createElement)
const UnicodeToLaTeX = React.lazy(() => import('./unicode-to-latex.js'));
const ReplaceText = React.lazy(() => import('./replace-text.js'));
const FindDifferences = React.lazy(() => import('./find-differences.js'));
const SvgToPng = React.lazy(() => import('./svg-to-png.js'));
const WordCount = React.lazy(() => import('./word-count.js'));
const BasicStatistics = React.lazy(() => import('./basic-statistics.js'));


function menuClassName({ isActive }) {
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
                        <${NavLink} className=${menuClassName} to="/unicode-to-latex">Unicode to LaTeX<//>
                        <${NavLink} className=${menuClassName} to="/replace-text">Replace Text<//>
                        <${NavLink} className=${menuClassName} to="/find-differences">Find Differences<//>
                        <${NavLink} className=${menuClassName} to="/svg-to-png">Convert SVG to PNG<//>
                        <${NavLink} className=${menuClassName} to="/word-count">Word Count<//>
                        <${NavLink} className=${menuClassName} to="/basic-statistics">Basic Statistics<//>
                    </div>
                </div>
                <div className="col-sm-10 pt-3">
                    <${React.Suspense} fallback=${html`<div>Loading...</div>`}>
                        <${Routes}>
                            <${Route} path="/unicode-to-latex" element=${html`<${UnicodeToLaTeX} />`} />
                            <${Route} path="/replace-text" element=${html`<${ReplaceText} />`} />
                            <${Route} path="/find-differences" element=${html`<${FindDifferences} />`} />
                            <${Route} path="/svg-to-png" element=${html`<${SvgToPng} />`} />
                            <${Route} path="/word-count" element=${html`<${WordCount} />`} />
                            <${Route} path="/basic-statistics" element=${html`<${BasicStatistics} />`} />
                        <//>
                    <//>
                </div>
            </div>
        </div>
    <//>
    `
}

ReactDOM.render(html`<${App} />`, document.getElementById('app'))
//ReactDOM.createRoot().render()
