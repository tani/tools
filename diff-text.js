import { htm, React, ReactDiffViewer } from './deps.js'
const html = htm.bind(React.createElement);

export default function DiffText() {
    const [state, setState] = React.useState({ newText: "", oldText: "" })
    const handleInput = (key) => (event) => setState({ ...state, [key]: event.target.value })
    return html`
        <style>
            #diffText {
              height: calc(20em - 2em);
              border-radius: 5px;
              border: solid 1px #ccc;
              overflow-y: scroll;
            }
        </style>
        <div>
            <h2>Diff Text</h2>
            <div className="row">
                <div className="col-sm-6">
                    <label htmlFor="oldText" className="form-label">Old</label>
                    <textarea name="oldText" className="form-control" onInput=${handleInput("oldText")} rows="10"></textarea>
                </div>
                <div className="col-sm-6">
                    <label htmlFor="newText" className="form-label">New</label>
                    <textarea name="newText" className="form-control" onInput=${handleInput("newText")} rows="10"></textarea>
                </div>
                <div className="col-sm-12">
                    <label htmlFor="diffText" className="form-label">Diff</label>
                    <div id="diffText">
                        <${ReactDiffViewer}
                            split=${false}
                            oldValue=${state.oldText}
                            newValue=${state.newText} />
                    </div>
                 </div>
            </div>
        </div>
    `
}
