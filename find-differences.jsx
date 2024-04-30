import * as React from "react";
import ReactDiffViewer from "react-diff-viewer";

const style = {
	height: "18em",
	borderRadius: "5px",
	border: "solid 1px #ccc",
	overflowY: "scroll",
};

export default function DiffText() {
	const [state, setState] = React.useState({ newText: "", oldText: "" });
	const handleInput = (key) => (event) =>
		setState({ ...state, [key]: event.target.value });
	return (
		<div>
			<h2>Diff Text</h2>
			<div className="row">
				<div className="col-sm-6">
					<label htmlFor="oldText" className="form-label">
						Old
					</label>
					<textarea
						name="oldText"
						className="form-control"
						onInput={handleInput("oldText")}
						rows="10"
					/>
				</div>
				<div className="col-sm-6">
					<label htmlFor="newText" className="form-label">
						New
					</label>
					<textarea
						name="newText"
						className="form-control"
						onInput={handleInput("newText")}
						rows="10"
					/>
				</div>
				<div className="col-sm-12">
					<label htmlFor="diffText" className="form-label">
						Diff
					</label>
					<div id="diffText" style={style}>
						<ReactDiffViewer
							split={false}
							oldValue={state.oldText}
							newValue={state.newText}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
