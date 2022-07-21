import * as React from 'react';
import htm from 'htm';
import { Canvg } from 'canvg';
const html = htm.bind(React.createElement);

export default function SvgToPng() {
    const [state, setState] = React.useState({ x: 300, y: 300, svg: "", png: "", raw: "" })
    const handleInput = (key) => async (event) => {
        await setState({ ...state, [key]: event.target.value })
    }
    const handleClick = async () => {
        const canvas = document.createElement('canvas')
        canvas.width = state.x;
        canvas.height =  state.y;
        const context = canvas.getContext('2d')
        const graphics = await Canvg.fromString(context, state.raw);
        await graphics.render()
        const png = canvas.toDataURL()
        await setState({ ...state, png })
    }
    const handleChange = async (event) => {
        const file = event.target.files[0]
        const raw = await file.text()
        const svg = 'data:image/svg+xml,' + encodeURIComponent(raw)
        await setState({ ...state, raw, svg })
    }
    const style = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: 400,
        border: 'solid 1px #ccc',
        borderRadius: 5,
        overflowY: 'auto'
    }
    return html`
        <div>
            <h2>SVG to PNG</h2>
            <div className="row">
                <div className="col-sm-3">
                    <input name="x" className="form-control" type="number" onInput=${handleInput("x")} value=${state.x} />
                </div>
                <div className="col-sm-3">
                    <input name="y" className="form-control" type="number" onInput=${handleInput("y")} value=${state.y} />
                </div>
                <div className="col-sm-3">
                    <input name="file" className="form-control" type="file" accept="image/svg+xml" onChange=${handleChange} />
                </div>
                <div className="col-sm-3">
                    <button className="btn btn-primary" onClick=${handleClick}>Convert</button>
                </div>
            </div>
            <div className="row mt-2">
                <div className="col-sm-6">
                    <div style=${style}>
                        ${state.svg === "" ? html`<h3>SVG</h3>` : html`<img with=${state.x} height=${state.y} src=${state.svg} />`}
                    </div>
                </div>
                <div className="col-sm-6">
                    <div style=${style}>
                        ${state.png === "" ? html`<h3>PNG</h3>` : html`<img with=${state.x} height=${state.y} src=${state.png} />`}
                    </div>
                </div>
            </div>
        </div>
    `
}
