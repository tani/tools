import { h, render } from 'https://esm.sh/preact@10';
import { Router } from 'https://esm.sh/preact-router@3';
import { Link } from 'https://esm.sh/preact-router@3/match';
import htm from 'https://esm.sh/htm@3';
import { createHashHistory } from 'https://esm.sh/history';
import { UnicodeToLaTeX } from './unicode-to-latex.js';

const html = htm.bind(h)

function App() {
    return html`
    <div>
        <nav class="navbar bg-light">
          <div class="container-fluid">
            <${Link} class="navbar-brand" href="/">Taniguchi's Tools<//>
          </div>
        </nav>
        <div class="container-fluid">
            <div class="row">
                <div class="col-sm-2 pt-3">
                    <div class="list-group">
                        <${Link} activeClassName="active" class="list-group-item list-group-item-action" href="/unicode-to-latex">Unicode To LaTeX<//>
                    </div>
                </div>
                <div class="col-sm-10 pt-3">
                    <${Router} history=${createHashHistory()}>
                        <${UnicodeToLaTeX} default path="/unicode-to-latex" />
                    <//>
                </div>
            </div>
        </div>
    </div>
    `
}

render(html`<${App} />`, document.getElementById('app'))