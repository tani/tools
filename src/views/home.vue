<template>
  <div class="py-4">
    <div class="mb-4">
      <h2 class="display-6 mb-1">Pick a tool to get started</h2>
      <p class="text-muted mb-0">
        Browse the collection below and jump straight into the utility you need.
      </p>
    </div>

    <div v-for="category in categories" :key="category.title" class="mb-5">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h3 class="h5 mb-0">{{ category.title }}</h3>
        <span class="badge bg-secondary text-uppercase small"
          >{{ category.items.length }} tools</span
        >
      </div>

      <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
        <div v-for="tool in category.items" :key="tool.path" class="col">
          <RouterLink class="card h-100 text-decoration-none home-tool-card" :to="tool.path">
            <div class="card-body">
              <div class="d-flex align-items-center mb-2">
                <span class="fs-4 me-2">{{ tool.icon }}</span>
                <h4 class="h6 mb-0 text-dark">{{ tool.name }}</h4>
              </div>
              <p class="text-muted small mb-0">{{ tool.description }}</p>
            </div>
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const categories = [
  {
    title: "Text & Coding",
    items: [
      { icon: "🔁", name: "Replace", path: "/replace", description: "Batch replace text with advanced options." },
      { icon: "🎨", name: "Prettier Formatter", path: "/prettier", description: "Format JSON, YAML, and code snippets instantly." },
      { icon: "🔍", name: "Diff", path: "/diff", description: "Compare two texts side by side and highlight changes." },
      { icon: "🧭", name: "Regex Finder", path: "/regex-finder", description: "Search content using powerful regular expressions." },
      { icon: "📚", name: "Regex Cheat Sheet", path: "/regex-cheat-sheet", description: "Quickly reference regex tokens and examples." },
      { icon: "📝", name: "Word Count", path: "/word-count", description: "Count words, characters, and reading time." },
      { icon: "📂", name: "Fold Strings", path: "/fold-strings", description: "Wrap long strings or code at your preferred width." },
      { icon: "💡", name: "Code Highlighter", path: "/code-highlight", description: "Highlight syntax for dozens of programming languages." },
      { icon: "🔡", name: "Encoding Converter", path: "/encoding-converter", description: "Convert uploaded text files between popular character sets." },
    ],
  },
  {
    title: "Math & LaTeX",
    items: [
      { icon: "🔣", name: "Unicode → LaTeX", path: "/unicode-latex", description: "Convert Unicode math symbols to LaTeX markup." },
      { icon: "🧮", name: "LaTeX → Unicode", path: "/latex-unicode", description: "Turn LaTeX expressions into readable Unicode." },
      { icon: "♾️", name: "Math Preview", path: "/math-preview", description: "Preview rendered math expressions in real time." },
      { icon: "📊", name: "Statistics", path: "/statistics", description: "Calculate descriptive statistics from your dataset." },
    ],
  },
  {
    title: "Graphics & Images",
    items: [
      { icon: "🖼️", name: "Image Resize", path: "/image-resize", description: "Resize images while keeping quality in check." },
      { icon: "👁️", name: "OCR", path: "/ocr", description: "Extract text from images using OCR." },
      { icon: "🖼️", name: "SVG → PNG", path: "/svg-png", description: "Export SVG artwork to high-quality PNG files." },
      { icon: "🧜‍♀️", name: "Mermaid", path: "/mermaid", description: "Generate diagrams from Mermaid markdown." },
      { icon: "✂️", name: "BG Remover", path: "/bg-remover", description: "Remove backgrounds from images automatically." },
    ],
  },
  {
    title: "PDF Tools",
    items: [
      { icon: "📄", name: "PDF Viewer", path: "/pdf-viewer", description: "View PDF documents directly in the browser." },
      { icon: "🔗", name: "PDF Merge", path: "/pdf-merge", description: "Combine multiple PDFs into a single file." },
      { icon: "✂️", name: "PDF Extract", path: "/pdf-extract", description: "Extract specific pages from a PDF." },
      { icon: "📏", name: "PDF Resize", path: "/pdf-resize", description: "Adjust page sizes and margins for PDFs." },
      { icon: "🔃", name: "PDF Sort", path: "/pdf-sort", description: "Reorder PDF pages with drag-and-drop ease." },
      { icon: "📝", name: "PDF → Text", path: "/pdf-text", description: "Convert PDF content into editable text." },
      { icon: "🔤", name: "PDF Fonts", path: "/pdf-fonts", description: "Inspect and list fonts embedded in PDFs." },
    ],
  },
  {
    title: "Utilities",
    items: [
      { icon: "⏱️", name: "Pomodoro", path: "/pomodoro", description: "Track focus sessions with the Pomodoro timer." },
    ],
  },
];
</script>

<style scoped>
.home-tool-card {
  color: inherit;
  transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
  border: 1px solid #e9ecef;
}

.home-tool-card:hover {
  transform: translateY(-2px);
  border-color: #0d6efd;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.08);
}
</style>
