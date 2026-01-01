import * as React from "react";
import { DiffView, DiffModeEnum } from "@git-diff-view/react";
import { generateDiffFile } from "@git-diff-view/file";

export default function ReplaceText() {
  const [state, setState] = React.useState({
    text: "",
    replace: "",
    search: "",
  });

  const handleInput =
    (key: "text" | "replace" | "search") =>
    (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setState({ ...state, [key]: event.target.value });
    };

  const result = (() => {
    try {
      if (!state.search) return state.text;
      return state.text.replace(new RegExp(state.search, "g"), state.replace);
    } catch {
      return state.text;
    }
  })();

  const diffFile = React.useMemo(() => {
    let oldText = (state.text || "").replace(/\r\n/g, "\n");
    let newText = (result || "").replace(/\r\n/g, "\n");
    if (oldText === newText) return null;

    // Ensure they end with newline to avoid mismatch warnings in the viewer
    if (oldText && !oldText.endsWith("\n")) oldText += "\n";
    if (newText && !newText.endsWith("\n")) newText += "\n";

    const file = generateDiffFile(
      "Deleted",
      oldText,
      "Added",
      newText,
      "plaintext",
      "plaintext",
    );
    file.initRaw();
    return file;
  }, [state.text, result]);

  return (
    <div>
      <h2>Replace Text</h2>
      <label htmlFor="search" className="form-label">
        Search
      </label>
      <input name="search" className="form-control" onChange={handleInput("search")} />
      <label htmlFor="replace" className="form-label">
        Replace
      </label>
      <input name="replace" className="form-control" onChange={handleInput("replace")} />
      <div className="row">
        <div className="col-sm-6">
          <label htmlFor="text" className="form-label">
            Input
          </label>
          <textarea name="text" className="form-control" onChange={handleInput("text")} rows={20} />
        </div>
        <div className="col-sm-6">
          <label htmlFor="result" className="form-label">
            Output
          </label>
          <textarea name="result" className="form-control" value={result} readOnly rows={20} />
        </div>
      </div>
      {diffFile && (
        <div className="mt-5">
          <DiffView diffFile={diffFile} diffViewMode={DiffModeEnum.Split} />
        </div>
      )}
    </div>
  );
}
