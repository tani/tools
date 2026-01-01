import * as React from "react";

export default function SvgToPng() {
  const [state, setState] = React.useState({
    x: 300,
    y: 300,
    svg: "",
    png: "",
    raw: "",
  });

  const handleInput = (key: "x" | "y") => async (event: React.ChangeEvent<HTMLInputElement>) => {
    setState({ ...state, [key]: Number.parseInt(event.target.value, 10) });
  };

  const handleClick = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = state.x;
    canvas.height = state.y;
    const context = canvas.getContext("2d");
    if (!context) return;

    const img = new Image();
    const svgBlob = new Blob([state.raw], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          context.drawImage(img, 0, 0, state.x, state.y);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });

      const png = canvas.toDataURL();
      setState({ ...state, png });
    } catch (error) {
      console.error("Conversion failed", error);
      URL.revokeObjectURL(url);
    }
  };

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const raw = await file.text();
    const svg = `data:image/svg+xml,${encodeURIComponent(raw)}`;
    setState({ ...state, raw, svg });
  };

  const style: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: 400,
    border: "solid 1px #ccc",
    borderRadius: 5,
    overflowY: "auto",
  };

  return (
    <div>
      <h2>SVG to PNG</h2>
      <div className="row">
        <div className="col-sm-3">
          <input
            name="x"
            className="form-control"
            type="number"
            onChange={handleInput("x")}
            value={state.x}
          />
        </div>
        <div className="col-sm-3">
          <input
            name="y"
            className="form-control"
            type="number"
            onChange={handleInput("y")}
            value={state.y}
          />
        </div>
        <div className="col-sm-3">
          <input
            name="file"
            className="form-control"
            type="file"
            accept="image/svg+xml"
            onChange={handleChange}
          />
        </div>
        <div className="col-sm-3">
          <button className="btn btn-primary" onClick={handleClick} type="button">
            Convert
          </button>
        </div>
      </div>
      <div className="row mt-2">
        <div className="col-sm-6">
          <div style={style}>
            {state.svg === "" ? (
              <h3>SVG</h3>
            ) : (
              <img width={state.x} height={state.y} src={state.svg} alt="svg" />
            )}
          </div>
        </div>
        <div className="col-sm-6">
          <div style={style}>
            {state.png === "" ? (
              <h3>PNG</h3>
            ) : (
              <img width={state.x} height={state.y} src={state.png} alt="png" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
