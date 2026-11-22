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
								<template
									v-for="(group, index) in groupedTools"
									:key="group.category"
								>
									<div
										class="list-group-item fw-bold text-muted small text-uppercase bg-light"
										:class="{ 'mt-2': index > 0 }"
									>
										{{ group.category }}
									</div>
									<RouterLink
										v-for="tool in group.items"
										:key="tool.path"
										class="list-group-item list-group-item-action"
										active-class="active"
										:to="tool.path"
									>
										{{ tool.icon }} {{ tool.name }}
									</RouterLink>
								</template>
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

<script setup lang="ts">
import { computed } from "vue";
import { tools } from "./tools";

const groupedTools = computed(() => {
	const groups = new Map<string, typeof tools>();
	const order = [
		"Text Tools",
		"Developer Tools",
		"Math & LaTeX",
		"Graphics & Images",
		"PDF Tools",
		"Utilities",
	];

	for (const cat of order) {
		groups.set(cat, []);
	}

	for (const tool of tools) {
		if (!groups.has(tool.category)) {
			groups.set(tool.category, []);
		}
		groups.get(tool.category)?.push(tool);
	}

	return Array.from(groups.entries())
		.filter(([_, items]) => items.length > 0)
		.map(([category, items]) => ({
			category,
			items,
		}));
});
</script>

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
		border-bottom: 1px solid #dee2e6;
	}
}
</style>
