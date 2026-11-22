<script setup lang="ts">
import { Bash } from "just-bash";
import { onMounted, ref, watch } from "vue";
import CopyButton from "../components/CopyButton.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";

const sedScript = ref("s/foo/bar/g");
const inputText = ref("foo foo foo\nbar bar bar\nfoo bar foo");
const output = ref("");
const error = ref("");
const isProcessing = ref(false);

let bash: Bash | null = null;

onMounted(() => {
	bash = new Bash();
	runSed();
});

const runSed = async () => {
	if (!bash) return;
	isProcessing.value = true;
	error.value = "";

	try {
		await bash.writeFile("data.txt", inputText.value);
		// Escape single quotes for bash string
		const script = sedScript.value.replace(/'/g, "'\\''");
		const result = await bash.exec(`sed '${script}' data.txt`);
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

watch([sedScript, inputText], () => {
	runSed();
});
</script>

<template>
	<div>
		<ToolHeader
			title="SED Playground"
			description="Run SED scripts in your browser with real-time preview."
		/>

		<div class="row">
			<div class="col-lg-6 mb-4">
				<ToolCard title="SED Script" class="h-100" no-padding>
					<MonospaceEditor
						v-model="sedScript"
						:rows="10"
						placeholder="s/search/replace/g"
					/>
				</ToolCard>
			</div>
			<div class="col-lg-6 mb-4">
				<ToolCard title="Input Text" class="h-100" no-padding>
					<MonospaceEditor
						v-model="inputText"
						:rows="10"
						placeholder="Enter text to process..."
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
						:rows="10"
						:bg-light="true"
					/>
				</ToolCard>
			</div>
		</div>
	</div>
</template>
