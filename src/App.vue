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
                <div class="list-group-item fw-bold text-muted small text-uppercase bg-light">Text & Coding</div>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/replace-text"
                >
                  🔁 Replace Text
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/find-differences"
                >
                  🔍 Find Differences
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
                  to="/string-folding"
                >
                  📂 String Folding
                </RouterLink>

                <div class="list-group-item fw-bold text-muted small text-uppercase bg-light mt-2">Math & LaTeX</div>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/unicode-to-latex"
                >
                  🔣 Unicode to LaTeX
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/latex-to-unicode"
                >
                  🧮 LaTeX to Unicode
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
                  to="/basic-statistics"
                >
                  📊 Basic Statistics
                </RouterLink>

                <div class="list-group-item fw-bold text-muted small text-uppercase bg-light mt-2">Graphics</div>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/svg-to-png"
                >
                  🖼️ Convert SVG to PNG
                </RouterLink>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/mermaid-editor"
                >
                  🧜‍♀️ Mermaid Editor
                </RouterLink>

                <div class="list-group-item fw-bold text-muted small text-uppercase bg-light mt-2">Utilities</div>
                <RouterLink
                  class="list-group-item list-group-item-action"
                  active-class="active"
                  to="/pomodoro-timer"
                >
                  ⏱️ Pomodoro Timer
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
