<template>
  <RouterView v-slot="{ Component }">
    <div>
      <nav class="navbar bg-light">
        <div class="container-fluid">
          <RouterLink class="navbar-brand" to="/">Taniguchi's Tools</RouterLink>
        </div>
      </nav>
      <div class="container-fluid">
        <div class="row">
          <div class="col-sm-2 pt-3">
            <div class="list-group">
              <RouterLink
                class="list-group-item list-group-item-action"
                active-class="active"
                to="/unicode-to-latex"
              >
                Unicode to LaTeX
              </RouterLink>
              <RouterLink
                class="list-group-item list-group-item-action"
                active-class="active"
                to="/latex-to-unicode"
              >
                LaTeX to Unicode
              </RouterLink>
              <RouterLink
                class="list-group-item list-group-item-action"
                active-class="active"
                to="/replace-text"
              >
                Replace Text
              </RouterLink>
              <RouterLink
                class="list-group-item list-group-item-action"
                active-class="active"
                to="/find-differences"
              >
                Find Differences
              </RouterLink>
              <RouterLink
                class="list-group-item list-group-item-action"
                active-class="active"
                to="/svg-to-png"
              >
                Convert SVG to PNG
              </RouterLink>
              <RouterLink
                class="list-group-item list-group-item-action"
                active-class="active"
                to="/word-count"
              >
                Word Count
              </RouterLink>
              <RouterLink
                class="list-group-item list-group-item-action"
                active-class="active"
                to="/basic-statistics"
              >
                Basic Statistics
              </RouterLink>
              <RouterLink
                class="list-group-item list-group-item-action"
                active-class="active"
                to="/mermaid-editor"
              >
                Mermaid Editor
              </RouterLink>
            </div>
          </div>
          <div class="col-sm-10 pt-3">
            <component :is="Component" />
          </div>
        </div>
      </div>
    </div>
  </RouterView>
</template>
