import * as React from "react";
import { DiffView, DiffModeEnum } from "@git-diff-view/react";
import { generateDiffFile } from "@git-diff-view/file";

const style: React.CSSProperties = {
  height: "18em",
  borderRadius: "5px",
  border: "solid 1px #ccc",
  overflowY: "scroll",
};

export default function DiffText() {
  const [state, setState] = React.useState({ newText: "", oldText: "" });
  const handleInput =
    (key: "newText" | "oldText") => (event: React.ChangeEvent<HTMLTextAreaElement>) =>
      setState({ ...state, [key]: event.target.value });

  const diffFile = React.useMemo(() => {
    let oldText = (state.oldText || "").replace(/\r\n/g, "\n");
    let newText = (state.newText || "").replace(/\r\n/g, "\n");
    if (oldText === newText) return null;

    // Ensure they end with newline to avoid mismatch warnings in the viewer
    if (oldText && !oldText.endsWith("\n")) oldText += "\n";
    if (newText && !newText.endsWith("\n")) newText += "\n";

    const file = generateDiffFile(
      "oldText",
      oldText,
      "newText",
      newText,
      "plaintext",
      "plaintext",
    );
    file.initRaw();
    return file;
  }, [state.oldText, state.newText]);

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
            onChange={handleInput("oldText")}
            rows={10}
          />
        </div>
        <div className="col-sm-6">
          <label htmlFor="newText" className="form-label">
            New
          </label>
          <textarea
            name="newText"
            className="form-control"
            onChange={handleInput("newText")}
            rows={10}
          />
        </div>
        <div className="col-sm-12">
          <label htmlFor="diffText" className="form-label">
            Diff
          </label>
          <div id="diffText" style={style}>
            {diffFile ? (
              <DiffView diffFile={diffFile} diffViewMode={DiffModeEnum.Unified} />
            ) : (
              <div className="p-3 text-center text-muted">No differences found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
