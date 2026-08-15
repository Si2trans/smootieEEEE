import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    exclude: ["@paddleocr/paddleocr-js"],
    include: ["@techstark/opencv-js", "clipper-lib", "js-yaml", "onnxruntime-web"]
  }
});
