<script setup lang="ts">
import { loadDefaultJapaneseParser } from "budoux";
import { computed, ref } from "vue";
import CopyButton from "../components/CopyButton.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";

const parser = loadDefaultJapaneseParser();

const input = ref(
	"親譲りの無鉄砲で小供の時から損ばかりしている。小学校に居る時分学校の二階から飛び降りて一週間ほど腰を抜かした事がある。なぜそんな無闇をしたと聞くがある人がある。別段深い理由でもない。新築の二階から首を出していたら、同級生の一人が冗談に、いくら威張っても、そこから飛び降りる事は出来まい。弱虫やーい。と囃したからである。小使に負ぶさって帰って来た時、おやじが大きな眼をして二階ぐらいから飛び降りて腰を抜かす奴があるかと云ったから、この次は抜かさずに飛んで見せますと答えた。",
);
const maxLength = ref(10);

const output = computed(() => {
	if (!input.value.trim()) return "";

	const chunks = parser.parse(input.value);
	let result = "";
	let currentLine = "";

	for (const chunk of chunks) {
		// If adding this chunk exceeds the max length, start a new line
		if (
			currentLine.length + chunk.length > maxLength.value &&
			currentLine.length > 0
		) {
			result += `${currentLine}\n`;
			currentLine = chunk;
		} else {
			currentLine += chunk;
		}
	}

	result += currentLine;
	return result;
});
</script>

<template>
	<div>
		<ToolHeader
			title="Japanese Wrap"
			description="Insert newlines into Japanese text at natural boundaries using BudouX, ensuring each line stays within a specified character limit."
		/>

		<ToolCard title="Configuration" class="mb-4">
			<div class="row g-3 align-items-center">
				<div class="col-md-4">
					<label
						for="maxLength"
						class="form-label fw-bold small text-uppercase text-muted"
						>Max characters per line</label
					>
					<input
						id="maxLength"
						v-model.number="maxLength"
						type="number"
						class="form-control"
						min="1"
						max="1000"
					/>
					<div class="form-text">
						The text will break at the nearest BudouX chunk before this limit.
					</div>
				</div>
			</div>
		</ToolCard>

		<div class="row">
			<div class="col-lg-6 mb-4">
				<ToolCard title="Original Text" class="h-100" no-padding>
					<MonospaceEditor
						v-model="input"
						:rows="15"
						placeholder="Enter Japanese text here..."
					/>
				</ToolCard>
			</div>
			<div class="col-lg-6 mb-4">
				<ToolCard title="Formatted Result" class="h-100" no-padding>
					<template #header-actions>
						<CopyButton :content="output" />
					</template>
					<MonospaceEditor :model-value="output" readonly bg-light :rows="15" />
				</ToolCard>
			</div>
		</div>
	</div>
</template>
