import { h } from 'https://esm.sh/preact@10';
import { useState } from 'http://esm.sh/preact@10/hooks';
import htm from 'https://esm.sh/htm@3'
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

export function UnicodeToLaTeX() {
    const [state, setState] = useState({ value: "" })
    const handleInput = (event) => setState({ ...state, value: event.target.value })
    return html`
        <div>
            <h2>Unicode To LaTeX</h2>
            <textarea class="form-control mt-3" onInput=${handleInput} rows="20"></textarea>
            <textarea class="form-control mt-3" value=${replace(state.value)} readOnly rows="20"></textarea>
        </div>
    `
}