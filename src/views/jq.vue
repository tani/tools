<script setup lang="ts">
import { Bash } from "just-bash";
import { onMounted, ref, watch } from "vue";
import CopyButton from "../components/CopyButton.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";

const jqFilter = ref(".");
const inputJson = ref(
	'{\n  "name": "jq",\n  "type": "tool",\n  "tags": ["json", "processor"]\n}',
);
const output = ref("");
const error = ref("");
const isProcessing = ref(false);

let bash: Bash | null = null;

onMounted(() => {
	bash = new Bash();
	runJq();
});

const runJq = async () => {
	if (!bash) return;
	isProcessing.value = true;
	error.value = "";

	try {
		await bash.writeFile("data.json", inputJson.value);
		// Escape single quotes for bash string
		const filter = jqFilter.value.replace(/'/g, "'\\''");
		const result = await bash.exec(`jq '${filter}' data.json`);
		output.value = result.stdout;
		if (result.stderr) {
			error.value = result.stderr;
		}
		if (result.exitCode !== 0 && !result.stderr) {
			error.value = `Process exited with code ${result.exitCode}`;
		}
	} catch (e) {
		error.value = String(e);
	} finally {
		isProcessing.value = false;
	}
};

watch([jqFilter, inputJson], () => {
	runJq();
});
</script>

<template>
	<div>
		<ToolHeader
			title="JQ Playground"
			description="Run JQ filters against JSON data in your browser."
		/>

		<div class="row">
			<div class="col-lg-6 mb-4">
				<ToolCard title="JQ Filter" class="h-100" no-padding>
					<MonospaceEditor v-model="jqFilter" :rows="10" placeholder="." />
				</ToolCard>
			</div>
			<div class="col-lg-6 mb-4">
				<ToolCard title="Input JSON" class="h-100" no-padding>
					<MonospaceEditor
						v-model="inputJson"
						language="json"
						:rows="10"
						placeholder="{}"
					/>
				</ToolCard>
			</div>
		</div>

		<div class="row">
			<div class="col-12">
				<ToolCard title="Output" no-padding>
					<template #header-actions>
						<CopyButton :content="output" />
					</template>
					<div
						v-if="error"
						class="p-3 bg-danger bg-opacity-10 text-danger font-monospace"
					>
						{{ error }}
					</div>
					<MonospaceEditor
						v-model="output"
						readonly
						language="json"
						:rows="10"
						:bg-light="true"
					/>
				</ToolCard>
			</div>
		</div>
	</div>
</template>
