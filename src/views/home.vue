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
					<RouterLink
						class="card h-100 text-decoration-none home-tool-card"
						:to="tool.path"
					>
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
import { computed } from "vue";
import { tools } from "../tools";

const categories = computed(() => {
	const categoryMap = new Map<string, typeof tools>();

	// Define order of categories
	const order = [
		"Text Tools",
		"Developer Tools",
		"Math & LaTeX",
		"Graphics & Images",
		"PDF Tools",
		"Utilities",
	];

	for (const cat of order) {
		categoryMap.set(cat, []);
	}

	for (const tool of tools) {
		if (!categoryMap.has(tool.category)) {
			categoryMap.set(tool.category, []);
		}
		categoryMap.get(tool.category)?.push(tool);
	}

	return Array.from(categoryMap.entries())
		.filter(([_, items]) => items.length > 0)
		.map(([title, items]) => ({
			title,
			items,
		}));
});
</script>

<style scoped>
.home-tool-card {
	color: inherit;
	transition:
		transform 150ms ease,
		box-shadow 150ms ease,
		border-color 150ms ease;
	border: 1px solid #e9ecef;
}

.home-tool-card:hover {
	transform: translateY(-2px);
	border-color: #0d6efd;
	box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.08);
}
</style>
