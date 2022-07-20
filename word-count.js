import { htm, React, _ } from './deps.js'
const html = htm.bind(React.createElement)

export default function WordCount() {
    const [state, setState] = React.useState({ value: "" })
    const handleInput = (event) => setState({ ...state, value: event.target.value })
    return html`
        <div>
            <h2>Word Count</h2>
            <div className="row">
                <div className="col-sm-12">
                    <table className="table">
                        <tbody>
                            <tr>
                                <th>Characters</th>
                                <td>${[...state.value].length}</td>
                                <th>Words</th>
                                <td>${_.words(state.value).length}</td>
                                <th>Lines</th>
                                <td>${state.value.split(/\r\n|\r|\n/).length}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="row">
                <div className="col-sm-12">
                    <textarea className="form-control mt-3" onInput=${handleInput} rows="20"></textarea>
                </div>
            </div>
        </div>
    `
}
