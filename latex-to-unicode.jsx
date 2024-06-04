import * as React from "react";
import json from "./unicode_latex_unicodemath.json" with { type: "json" };
import { subscript, superscript } from "./subscript_superscript.json" with { type: "json" };

export default function LaTeXToUnicode() {
	const [state, setState] = React.useState({ value: "" });

	function replace(str) {
		let val = str;
		for (const [_, char, latex] of json) {
			if (char !== "" && char.charCodeAt(0) > 127 && latex.length > 2) {
				val = val.replaceAll(new RegExp(`\\${latex}(?![a-zA-Z])`, "g"), char);
			}
		}
		val = val
			.replaceAll(/_\{(.*?)\}/g, (_, sub) => sub.replaceAll(/./g, (sub) => subscript[sub] ?? sub))
			.replaceAll(/\^\{(.*?)\}/g, (_, sub) => sub.replaceAll(/./g, (sup) => superscript[sup] ?? sup))
			.replaceAll(/_(.)/g, (_, sub) => subscript[sub] ?? sub)
			.replaceAll(/\^(.)/g, (_, sup) => superscript[sup] ?? sup);
		return val.replaceAll(/\$(.*?)\$/g, "$1");
	}

	const handleInput = (event) =>
		setState({ ...state, value: event.target.value });

	return (
		<div>
			<h2>LaTeX To Unicode</h2>
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
