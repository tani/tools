<script setup lang="ts">
import { Bash } from "just-bash";
import { onMounted, ref, watch } from "vue";
import CopyButton from "../components/CopyButton.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";

const oldText = ref(
	"This is the original text.\nIt has several lines.\nOne line will be removed.\nAnother will be changed.",
);
const newText = ref(
	"This is the modified text.\nIt has several lines.\nAnother has been changed.\nOne line was added.",
);
const output = ref("");
const error = ref("");
const isProcessing = ref(false);

let bash: Bash | null = null;

onMounted(() => {
	bash = new Bash();
	runDiff();
});

const runDiff = async () => {
	if (!bash) return;
	isProcessing.value = true;
	error.value = "";

	try {
		await bash.writeFile("old.txt", oldText.value);
		await bash.writeFile("new.txt", newText.value);
		const result = await bash.exec("diff -u old.txt new.txt");
		// diff returns exit code 1 if differences are found, which is normal behavior
		if (result.exitCode > 1) {
			error.value = result.stderr || `Diff failed with code ${result.exitCode}`;
		} else {
			output.value = result.stdout;
		}
	} catch (e) {
		error.value = String(e);
	} finally {
		isProcessing.value = false;
	}
};

watch([oldText, newText], () => {
	runDiff();
});
</script>

<template>
	<div>
		<ToolHeader
			title="Diff"
			description="Compare two text blocks and visualize the differences using unified diff."
		/>

		<div class="row">
			<div class="col-lg-6 mb-4">
				<ToolCard title="Old Version" class="h-100" no-padding>
					<MonospaceEditor v-model="oldText" :rows="10" />
				</ToolCard>
			</div>
			<div class="col-lg-6 mb-4">
				<ToolCard title="New Version" class="h-100" no-padding>
					<MonospaceEditor v-model="newText" :rows="10" />
				</ToolCard>
			</div>
			<div class="col-12 mb-4">
				<ToolCard title="Unified Diff" no-padding>
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
						language="diff"
						readonly
						:rows="15"
						:bg-light="true"
					/>
				</ToolCard>
			</div>
		</div>
	</div>
</template>
