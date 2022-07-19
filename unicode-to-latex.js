import { h, render } from 'https://jspm.dev/preact@10';
import { useState } from 'http://jspm.dev/preact@10/hooks';
import htm from 'https://jspm.dev/htm@3'
const html = htm.bind(h)

var response = await fetch('./unicode_latex_unicodemath.json')
var json = await response.json()

function replace(str) {
    for(const [ _, char, latex ] of json) {
        if(char !== "" && char.charCodeAt(0) > 127 && latex.length > 2) {
            str = str.replaceAll(char, `$${latex}$`)
        }
    }
    return str.replaceAll(/\$\$/g, '')
}

function UnicodeToLaTeX() {
    const [state, setState] = useState({ value: "" })
    const handleInput = (event) => setState({ ...state, value: event.target.value })
    return html`
        <div>
            <h2>Unicode To LaTeX</h2>
            <textarea onInput=${handleInput} rows="20"></textarea>
            <textarea value=${replace(state.value)} readOnly rows="20"></textarea>
        </div>
    `
}

render(html`<${UnicodeToLaTeX} />`, document.getElementById("unicode-to-latex"));