<template>
  <RouterView v-slot="{ Component }">
    <div>
      <nav class="navbar navbar-expand-lg bg-light border-bottom">
        <div class="container-fluid">
          <RouterLink class="navbar-brand" to="/">Taniguchi's Tools</RouterLink>
          <button
            class="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#sidebarMenu"
            aria-controls="sidebarMenu"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span class="navbar-toggler-icon"></span>
          </button>
        </div>
      </nav>

      <div class="container-fluid">
        <div class="row">
          <!-- Sidebar / Accordion Area -->
          <div class="col-lg-2 pt-3 border-end sidebar-container">
            <div class="collapse d-lg-block" id="sidebarMenu">
              <div class="list-group list-group-flush mb-3">
                <div class="list-group-item fw-bold text-muted small text-uppercase bg-light">
                  Text & Coding
                </div>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/replace"
                >
                  🔁 Replace
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/prettier"
                >
                  🎨 Prettier Formatter
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/diff"
                >
                  🔍 Diff
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/regex-finder"
                >
                  🧭 Regex Finder
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/regex-cheat-sheet"
                >
                  📚 Regex Cheat Sheet
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/word-count"
                >
                  📝 Word Count
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/fold-strings"
                >
                  📂 Fold Strings
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/code-highlight"
                >
                  💡 Code Highlighter
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/encoding-converter"
                >
                  🔡 Encoding Converter
                </RouterLink>

                <div class="list-group-item fw-bold text-muted small text-uppercase bg-light mt-2">
                  Math & LaTeX
                </div>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/unicode-latex"
                >
                  🔣 Unicode → LaTeX
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/latex-unicode"
                >
                  🧮 LaTeX → Unicode
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/math-preview"
                >
                  ♾️ Math Preview
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/statistics"
                >
                  📊 Statistics
                </RouterLink>

                <div class="list-group-item fw-bold text-muted small text-uppercase bg-light mt-2">
                  Graphics & Images
                </div>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/image-resize"
                >
                  🖼️ Image Resize
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/ocr"
                >
                  👁️ OCR
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/svg-png"
                >
                  🖼️ SVG → PNG
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/mermaid"
                >
                  🧜‍♀️ Mermaid
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/bg-remover"
                >
                  ✂️ BG Remover
                </RouterLink>

                <div class="list-group-item fw-bold text-muted small text-uppercase bg-light mt-2">
                  PDF Tools
                </div>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/pdf-viewer"
                >
                  📄 PDF Viewer
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/pdf-merge"
                >
                  🔗 PDF Merge
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/pdf-extract"
                >
                  ✂️ PDF Extract
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/pdf-resize"
                >
                  📏 PDF Resize
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/pdf-sort"
                >
                  🔃 PDF Sort
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/pdf-text"
                >
                  📝 PDF → Text
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/pdf-fonts"
                >
                  🔤 PDF Fonts
                </RouterLink>

                <div class="list-group-item fw-bold text-muted small text-uppercase bg-light mt-2">
                  Utilities
                </div>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/pomodoro"
                >
                  ⏱️ Pomodoro
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/whois-rdap"
                >
                  🌐 WHOIS / RDAP
                </RouterLink>
              </div>
            </div>
          </div>

          <!-- Main Content Area -->
          <div class="col-lg-10 pt-3 main-content">
            <component :is="Component" />
          </div>
        </div>
      </div>
    </div>
  </RouterView>
</template>

<style>
@media (min-width: 992px) {
  .sidebar-container {
    min-height: calc(100vh - 56px);
    position: sticky;
    top: 56px;
  }
}

/* Mobile & Tablet adjustments */
@media (max-width: 991.98px) {
  .sidebar-container {
    border-end: none !important;
    border-bottom: 1px solid #dee2e6;
  }
}
</style>
