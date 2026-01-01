import * as React from "react";
import jsonRaw from "./unicode_latex_unicodemath.json" with { type: "json" };
import subscriptSuperscriptRaw from "./subscript_superscript.json" with { type: "json" };

const json = jsonRaw as [string, string, string][];
const subscript = subscriptSuperscriptRaw.subscript as Record<string, string>;
const superscript = subscriptSuperscriptRaw.superscript as Record<string, string>;

export default function LaTeXToUnicode() {
  const [state, setState] = React.useState({ value: "" });

  function replace(str: string) {
    let val = str;
    for (const [_, char, latex] of json) {
      if (char !== "" && char.charCodeAt(0) > 127 && latex.length > 2) {
        val = val.replaceAll(new RegExp(`\\${latex}(?![a-zA-Z])`, "g"), char);
      }
    }
    val = val
      .replaceAll(/_\{(.*?)\}/g, (_, sub: string) => sub.replaceAll(/./g, (s) => subscript[s] ?? s))
      .replaceAll(/\^\{(.*?)\}/g, (_, sub: string) =>
        sub.replaceAll(/./g, (s) => superscript[s] ?? s),
      )
      .replaceAll(/_(.)/g, (_, sub: string) => subscript[sub] ?? sub)
      .replaceAll(/\^(.)/g, (_, sup: string) => superscript[sup] ?? sup);
    return val.replaceAll(/\$(.*?)\$/g, "$1");
  }

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) =>
    setState({ ...state, value: event.target.value });

  return (
    <div>
      <h2>LaTeX To Unicode</h2>
      <div className="row">
        <div className="col-sm-6">
          <textarea className="form-control mt-3" onChange={handleInput} rows={20} />
        </div>
        <div className="col-sm-6">
          <textarea className="form-control mt-3" value={replace(state.value)} readOnly rows={20} />
        </div>
      </div>
    </div>
  );
}
