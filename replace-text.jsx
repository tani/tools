import * as React from "react";
import ReactDiffViewer from "react-diff-viewer";

export default function ReplaceText() {
	const [state, setState] = React.useState({
		text: "",
		replace: "",
		search: "",
	});

	const handleInput = (key) => (event) => {
		setState({ ...state, [key]: event.target.value });
	};

	const result = (() => {
		try {
			return state.text.replace(new RegExp(state.search, "g"), state.replace);
		} catch {
			return state.text;
		}
	})();

	return (
		<div>
			<h2>Replace Text</h2>
			<label htmlFor="search" className="form-label">
				Search
			</label>
			<input
				name="search"
				className="form-control"
				onInput={handleInput("search")}
			/>
			<label htmlFor="replace" className="form-label">
				Replace
			</label>
			<input
				name="replace"
				className="form-control"
				onInput={handleInput("replace")}
			/>
			<div className="row">
				<div className="col-sm-6">
					<label htmlFor="text" className="form-label">
						Input
					</label>
					<textarea
						name="text"
						className="form-control"
						onInput={handleInput("text")}
						rows="20"
					/>
				</div>
				<div className="col-sm-6">
					<label htmlFor="result" className="form-label">
						Output
					</label>
					<textarea
						name="result"
						className="form-control"
						value={result}
						readOnly
						rows="20"
					/>
				</div>
			</div>
			{state.text !== result && (
				<div className="mt-5">
					<ReactDiffViewer
						oldValue={state.text}
						newValue={result}
						leftTitle="Deleted"
						rightTitle="Added"
					/>
				</div>
			)}
		</div>
	);
}
