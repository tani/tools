import React from 'https://esm.sh/react@18';
import htm from 'https://esm.sh/htm@3';
import ReactDiffViewer from "https://esm.sh/react-diff-viewer";
const html = htm.bind(React.createElement);

export function ReplaceText() {
    const [state, setState] = React.useState({ text: "", replace: "", search: "" })
    const handleInput = (key) => (event) => setState({ ...state, [key]: event.target.value })
    const result = (() => {
        try {
            return state.text.replace(new RegExp(state.search, "g"), state.replace)
        } catch {
            return state.text
        }
    })()
    const Diff = html`
        <div className="mt-5">
            <${ReactDiffViewer}
                oldValue=${state.text}
                newValue=${result}
                leftTitle="Deleted"
                rightTitle="Added" />
        </div>
    `
    return html`
        <div>
            <h2>Replace Text</h2>
            <label for="search" className="form-label">Search</label>
            <input name="search" className="form-control" onInput=${handleInput("search")} />
            <label for="replace" className="form-label">Replace</label>
            <input name="replace" className="form-control" onInput=${handleInput("replace")} />
            <div className="row">
                <div className="col-sm-6">
                    <label for="text" className="form-label">Input</label>
                    <textarea name="text" className="form-control" onInput=${handleInput("text")} rows="20"></textarea>
                </div>
                <div className="col-sm-6">
                    <label for="result" className="form-label">Output</label>
                    <textarea name="result" className="form-control" value=${result} readOnly rows="20"></textarea>
                </div>
            </div>
            ${ state.text === result ? null : Diff }
        </div>
    `
}