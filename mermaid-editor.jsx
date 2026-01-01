import * as React from "react";
import mermaid from "mermaid";

// Initialize mermaid with consistent settings
mermaid.initialize({
	startOnLoad: false,
	theme: "default",
	securityLevel: "loose",
	fontFamily: '"Noto Sans JP", "Helvetica Neue", Arial, sans-serif',
});

const DEFAULT_CODE = `graph TD
    A[ユーザー] -->|入力| B(React)
    B -->|監視| C{変更あり?}
    C -->|Yes| D["generateSvg()"]
    D -->|SVG文字列| E["getDimensions()"]
    E -->|サイズ| F["createCanvas()"]
    F -->|Context| G["drawToCanvas()"]
    G -->|PNG Data| H[画像表示]
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style H fill:#bbf,stroke:#333,stroke-width:2px`;

/**
 * Converts a Mermaid SVG string to a PNG data URL.
 */
async function convertSvgToPng(svgString, scale = 2) {
	const parser = new DOMParser();
	const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
	const svgElement = svgDoc.documentElement;

	// Extract dimensions with fallbacks
	let width = parseFloat(svgElement.getAttribute("width"));
	let height = parseFloat(svgElement.getAttribute("height"));

	if (!width || !height) {
		const viewBox = svgElement.getAttribute("viewBox");
		if (viewBox) {
			const [, , vbWidth, vbHeight] = viewBox.split(/\s+|,/).map(parseFloat);
			width = vbWidth;
			height = vbHeight;
		}
	}

	// Default fallbacks if parsing fails
	width = width || 800;
	height = height || 600;

	const canvas = document.createElement("canvas");
	canvas.width = Math.ceil(width * scale);
	canvas.height = Math.ceil(height * scale);

	const img = new Image();
	// UTF-8 safe encoding for Base64
	const base64Svg = btoa(unescape(encodeURIComponent(svgString)));

	await new Promise((resolve, reject) => {
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = `data:image/svg+xml;base64,${base64Svg}`;
	});

	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

	return canvas.toDataURL("image/png");
}

const PREVIEW_STYLE = {
	display: "flex",
	justifyContent: "center",
	alignItems: "center",
	minHeight: 400,
	border: "solid 1px #ccc",
	borderRadius: 5,
	overflow: "auto",
	backgroundColor: "white",
};

export default function MermaidEditor() {
	const [code, setCode] = React.useState(DEFAULT_CODE);
	const [imageUrl, setImageUrl] = React.useState("");
	const [error, setError] = React.useState("");
	const [isRendering, setIsRendering] = React.useState(false);
	const lastRenderId = React.useRef(0);

	const renderDiagram = React.useCallback(async (mermaidCode) => {
		const currentRenderId = ++lastRenderId.current;

		if (!mermaidCode.trim()) {
			setImageUrl("");
			setError("");
			setIsRendering(false);
			return;
		}

		setIsRendering(true);

		try {
			// Validate syntax first to avoid internal Mermaid error rendering
			await mermaid.parse(mermaidCode, { suppressErrors: false });

			const id = `mermaid-${Date.now()}`;
			const { svg } = await mermaid.render(id, mermaidCode);

			// Check if this is still the most recent request
			if (currentRenderId !== lastRenderId.current) return;

			const pngUrl = await convertSvgToPng(svg);

			if (currentRenderId !== lastRenderId.current) return;

			setImageUrl(pngUrl);
			setError("");
		} catch (e) {
			if (currentRenderId !== lastRenderId.current) return;
			console.error("Mermaid Render Error:", e);
			setError(e.message || "Invalid Mermaid syntax");
			setImageUrl("");
		} finally {
			if (currentRenderId === lastRenderId.current) {
				setIsRendering(false);
			}
		}
	}, []);

	// Debounced render on code change
	React.useEffect(() => {
		const timer = setTimeout(() => {
			renderDiagram(code);
		}, 500);
		return () => clearTimeout(timer);
	}, [code, renderDiagram]);

	return (
		<div className="mermaid-editor">
			<h2>Mermaid Editor</h2>
			<div className="row">
				<div className="col-sm-12">
					<textarea
						className="form-control font-monospace mb-3"
						style={{ minHeight: "200px" }}
						placeholder="graph TD; A-->B;"
						value={code}
						onChange={(e) => setCode(e.target.value)}
					/>
				</div>
			</div>

			<div className="row mb-2">
				<div className="col-sm-6 text-start">
					<h5>Preview (PNG Image)</h5>
				</div>
				<div className="col-sm-6 text-end">
					<a
						href={imageUrl || "#"}
						className={`btn btn-primary btn-sm ${
							!imageUrl || error ? "disabled" : ""
						}`}
						download="mermaid-diagram.png"
					>
						Download PNG
					</a>
				</div>
			</div>

			<div className="row">
				<div className="col-sm-12">
					<div style={PREVIEW_STYLE}>
						{!code && (
							<div className="text-muted p-4">Please enter Mermaid code</div>
						)}

						{isRendering && code && (
							<div className="text-muted p-4">
								<output className="spinner-border text-primary spinner-border-sm me-2">
									<span className="visually-hidden">Loading...</span>
								</output>
								Rendering...
							</div>
						)}

						{error && !isRendering && (
							<div className="alert alert-danger m-3 text-start w-100">
								<strong>Error:</strong> <span>{error}</span>
							</div>
						)}

						{imageUrl && !error && !isRendering && (
							<img
								src={imageUrl}
								className="img-fluid"
								alt="Rendered Diagram"
								title="Right click to save"
							/>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}