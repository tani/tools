import * as React from "react";
import json from "./unicode_latex_unicodemath.json" with { type: "json" };

export default function UnicodeToLaTeX() {
	const [state, setState] = React.useState({ value: "" });

	function replace(str) {
		let val = str;
		for (const [_, char, latex] of json) {
			if (char !== "" && char.charCodeAt(0) > 127 && latex.length > 2) {
				val = val.replaceAll(char, `$${latex}$`);
			}
		}
		return val.replaceAll(/\$\$/g, "");
	}

	const handleInput = (event) =>
		setState({ ...state, value: event.target.value });

	return (
		<div>
			<h2>Unicode To LaTeX</h2>
			<div className="row">
				<div className="col-sm-6">
					<textarea
						className="form-control mt-3"
						onInput={handleInput}
						rows="20"
					/>
				</div>
				<div className="col-sm-6">
					<textarea
						className="form-control mt-3"
						value={replace(state.value)}
						readOnly
						rows="20"
					/>
				</div>
			</div>
		</div>
	);
}
