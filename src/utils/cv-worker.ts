// Web Worker for OpenCV processing to keep the UI thread responsive
import cvModule from '@techstark/opencv-js';

let cv: any = null;
let isNotified = false;

const notifyReady = () => {
  if (isNotified) return;
  console.log("Worker: OpenCV is fully ready.");
  isNotified = true;
  self.postMessage({ type: 'READY' });
};

const initOpenCV = async () => {
  console.log("Worker: initOpenCV started.");
  try {
    // Determine the actual cv object
    // @ts-ignore
    cv = cvModule.default || cvModule;

    // If it's already ready
    if (cv && cv.Mat) {
      console.log("Worker: Mat found immediately.");
      notifyReady();
      return;
    }

    // Set up callback
    if (cv) {
      cv.onRuntimeInitialized = () => {
        console.log("Worker: onRuntimeInitialized triggered.");
        if (cv.Mat) notifyReady();
      };
    }

    // Handle non-standard thenable (OpenCV.js sometimes lacks .catch)
    if (cv && typeof cv.then === 'function') {
      console.log("Worker: cv has .then(), monitoring state...");
      cv.then((resolvedCv: any) => {
        console.log("Worker: cv then-callback triggered.");
        cv = resolvedCv || cv;
        if (cv && cv.Mat) notifyReady();
      });
      // Do not use .catch() as some Emscripten builds don't support it
    }

    // Polling as a fallback
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (cv && cv.Mat) {
        console.log("Worker: Mat detected via polling at attempt " + attempts);
        clearInterval(checkInterval);
        notifyReady();
      } else if (attempts > 100) {
        console.error("Worker: Polling timeout.");
        clearInterval(checkInterval);
        if (!isNotified) {
          self.postMessage({ type: 'ERROR', message: 'OpenCV initialization timeout (10s)' });
        }
      }
    }, 100);

  } catch (err: any) {
    console.error("Worker: Error in initOpenCV:", err);
    self.postMessage({ type: 'ERROR', message: 'Init Error: ' + err.message });
  }
};

initOpenCV();

self.onmessage = async (e) => {
  const { type, data } = e.data;
  console.log("Worker: Received message:", type);

  if (type === 'PROCESS') {
    if (!cv || !cv.Mat) {
      self.postMessage({ type: 'ERROR', message: 'OpenCV not ready' });
      return;
    }

    const { imageData, x, y, tolerance } = data;
    const { width, height } = imageData;
    let src: any, mask: any, finalMask: any, blurred: any;

    try {
      if (x < 0 || x >= width || y < 0 || y >= height) {
        throw new Error(`Click point (${x}, ${y}) is outside image boundaries.`);
      }

      const rgba = cv.matFromImageData(imageData);
      src = new cv.Mat();
      cv.cvtColor(rgba, src, cv.COLOR_RGBA2RGB);
      rgba.delete();

      // Pre-processing: Median blur to reduce noise/artifacts (crucial for poster-like images)
      blurred = new cv.Mat();
      cv.medianBlur(src, blurred, 3);

      mask = new cv.Mat.zeros(height + 2, width + 2, cv.CV_8UC1);
      const seed = new cv.Point(x, y);
      const newVal = new cv.Scalar(255, 255, 255);
      const loDiff = new cv.Scalar(tolerance, tolerance, tolerance);
      const upDiff = new cv.Scalar(tolerance, tolerance, tolerance);
      
      // Flags: 8-connectivity, Fixed Range (compare to seed, not neighbors), Mask Only
      const flags = 8 | (255 << 8) | cv.FLOODFILL_MASK_ONLY | cv.FLOODFILL_FIXED_RANGE;
      
      cv.floodFill(blurred, mask, seed, newVal, new cv.Rect(), loDiff, upDiff, flags);

      // Extract the actual mask
      const rect = new cv.Rect(1, 1, width, height);
      const rawMask = mask.roi(rect);

      // Post-processing: Morphological Opening/Closing to smooth edges and fill holes
      finalMask = new cv.Mat();
      const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
      cv.morphologyEx(rawMask, finalMask, cv.MORPH_CLOSE, kernel);
      rawMask.delete();
      kernel.delete();

      const resultData = new Uint8ClampedArray(imageData.data);
      const maskData = finalMask.data;
      for (let i = 0; i < maskData.length; i++) {
        if (maskData[i] === 255) {
          resultData[i * 4 + 3] = 0;
        }
      }

      const resultImageData = new ImageData(resultData, width, height);
      self.postMessage({ type: 'RESULT', imageData: resultImageData }, [resultData.buffer] as any);

    } catch (err: any) {
      console.error("Worker: Processing error:", err);
      self.postMessage({ type: 'ERROR', message: err.message || 'Processing failed' });
    } finally {
      if (src) src.delete();
      if (blurred) blurred.delete();
      if (mask) mask.delete();
      if (finalMask) finalMask.delete();
    }
  } else if (type === 'GLOBAL') {
    if (!cv || !cv.Mat) {
      self.postMessage({ type: 'ERROR', message: 'OpenCV not ready' });
      return;
    }

    const { imageData, x, y, tolerance } = data;
    const { width, height } = imageData;
    let src: any, hsv: any, lower: any, upper: any, mask: any;

    try {
      console.log(`Worker: Starting Global Color Removal...`);
      const rgba = cv.matFromImageData(imageData);
      
      // Get the color at the clicked point (seed color)
      const idx = (y * width + x) * 4;
      const sr = imageData.data[idx];
      const sg = imageData.data[idx + 1];
      const sb = imageData.data[idx + 2];

      // Use color distance on the whole image
      const resultData = new Uint8ClampedArray(imageData.data);
      const tSq = tolerance * tolerance * 3; // Simple Euclidean distance squared in RGB space

      for (let i = 0; i < resultData.length; i += 4) {
        const r = resultData[i];
        const g = resultData[i + 1];
        const b = resultData[i + 2];

        const distSq = Math.pow(r - sr, 2) + Math.pow(g - sg, 2) + Math.pow(b - sb, 2);
        
        if (distSq < tSq) {
          resultData[i + 3] = 0; // Transparent
        }
      }

      const resultImageData = new ImageData(resultData, width, height);
      self.postMessage({ type: 'RESULT', imageData: resultImageData }, [resultData.buffer] as any);
      rgba.delete();

    } catch (err: any) {
      console.error("Worker: Global removal error:", err);
      self.postMessage({ type: 'ERROR', message: 'Global removal failed: ' + (err.message || err) });
    }
  } else if (type === 'GRABCUT') {
    if (!cv || !cv.Mat) {
      self.postMessage({ type: 'ERROR', message: 'OpenCV not ready' });
      return;
    }

    const { imageData, rect } = data;
    const { width, height } = imageData;
    let src: any, mask: any, bgdModel: any, fgdModel: any;
    let smallSrc: any, smallMask: any;

    try {
      console.log(`Worker: Starting GrabCut on ${width}x${height} image...`);

      // GrabCut is memory-intensive. For large images, we MUST downsample.
      const MAX_DIM = 600; 
      const scale = Math.min(1.0, MAX_DIM / Math.max(width, height));
      const smallWidth = Math.round(width * scale);
      const smallHeight = Math.round(height * scale);

      console.log(`Worker: Downsampling to ${smallWidth}x${smallHeight} (Scale: ${scale.toFixed(2)})`);

      const rgba = cv.matFromImageData(imageData);
      src = new cv.Mat();
      cv.cvtColor(rgba, src, cv.COLOR_RGBA2RGB);
      rgba.delete();

      // Resize for processing
      smallSrc = new cv.Mat();
      cv.resize(src, smallSrc, new cv.Size(smallWidth, smallHeight), 0, 0, cv.INTER_AREA);

      smallMask = new cv.Mat.zeros(smallHeight, smallWidth, cv.CV_8UC1);
      bgdModel = new cv.Mat();
      fgdModel = new cv.Mat();
      
      // Scale the rectangle
      const smallRect = new cv.Rect(
        Math.max(0, Math.round(rect.left * scale)),
        Math.max(0, Math.round(rect.top * scale)),
        Math.min(Math.round(rect.width * scale), smallWidth - Math.round(rect.left * scale)),
        Math.min(Math.round(rect.height * scale), smallHeight - Math.round(rect.top * scale))
      );
      
      console.log(`Worker: Calling cv.grabCut on downsampled image...`);
      // Increased iterations to 5 for better accuracy
      cv.grabCut(smallSrc, smallMask, smallRect, bgdModel, fgdModel, 5, cv.GC_INIT_WITH_RECT);
      console.log("Worker: cv.grabCut finished.");

      // Upscale mask back to original size
      mask = new cv.Mat();
      cv.resize(smallMask, mask, new cv.Size(width, height), 0, 0, cv.INTER_NEAREST);

      const resultData = new Uint8ClampedArray(imageData.data);
      const maskData = mask.data;
      
      for (let i = 0; i < maskData.length; i++) {
        const val = maskData[i];
        if (val === 0 || val === 2) {
          resultData[i * 4 + 3] = 0;
        }
      }

      console.log("Worker: GrabCut successful.");
      const resultImageData = new ImageData(resultData, width, height);
      self.postMessage({ type: 'RESULT', imageData: resultImageData }, [resultData.buffer] as any);

    } catch (err: any) {
      console.error("Worker: GrabCut error:", err);
      self.postMessage({ type: 'ERROR', message: 'GrabCut failed (possibly image too large): ' + (err.message || err) });
    } finally {
      if (src) src.delete();
      if (smallSrc) smallSrc.delete();
      if (smallMask) smallMask.delete();
      if (mask) mask.delete();
      if (bgdModel) bgdModel.delete();
      if (fgdModel) fgdModel.delete();
    }
  }
};
