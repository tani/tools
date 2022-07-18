import React from 'https://esm.sh/react@18';
import { createRoot } from 'https://esm.sh/react-dom@18/client'

const response = await fetch('./unicode_latex_unicodemath.json')
const json = await response.json()

function replace(str) {
    for(const [ _, char, latex ] of json) {
        if(char !== "" && char.charCodeAt(0) > 127 && latex.length > 2) {
            str = str.replaceAll(char, `$${latex}$`)
        }
    }
    return str.replaceAll(/\$\$/g, '')
}

function UnicodeToLaTeX() {
    const [state, setState] = React.useState({ value: "" })
    const handleChange = (event) => setState({ ...state, value: event.target.value })
    return (
        <div>
            <h2>Unicode To LaTeX</h2>
            <textarea onChange={handleChange} rows="20" />
            <textarea value={replace(state.value)} readOnly rows="20" />
        </div>
    )
}

const root = createRoot(document.getElementById("unicode-to-latex"))
root.render(<UnicodeToLaTeX />);