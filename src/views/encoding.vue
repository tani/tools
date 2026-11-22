<script setup lang="ts">
import { computed, ref, watch } from "vue";
import CopyButton from "../components/CopyButton.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";

const encodingGroups = [
	{
		label: "Unicode",
		options: [
			{ value: "utf-8", label: "UTF-8" },
			{ value: "utf-16le", label: "UTF-16LE" },
			{ value: "utf-16be", label: "UTF-16BE" },
		],
	},
	{
		label: "Windows codepages",
		options: [
			{ value: "windows-1250", label: "Windows-1250 (Central European)" },
			{ value: "windows-1251", label: "Windows-1251 (Cyrillic)" },
			{ value: "windows-1252", label: "Windows-1252 (Western)" },
			{ value: "windows-1253", label: "Windows-1253 (Greek)" },
			{ value: "windows-1254", label: "Windows-1254 (Turkish)" },
			{ value: "windows-1255", label: "Windows-1255 (Hebrew)" },
			{ value: "windows-1256", label: "Windows-1256 (Arabic)" },
			{ value: "windows-1257", label: "Windows-1257 (Baltic)" },
			{ value: "windows-1258", label: "Windows-1258 (Vietnamese)" },
			{ value: "windows-874", label: "Windows-874 (Thai)" },
		],
	},
	{
		label: "ISO-8859",
		options: [
			{ value: "iso-8859-2", label: "ISO-8859-2 (Central European)" },
			{ value: "iso-8859-3", label: "ISO-8859-3 (South European)" },
			{ value: "iso-8859-4", label: "ISO-8859-4 (North European)" },
			{ value: "iso-8859-5", label: "ISO-8859-5 (Cyrillic)" },
			{ value: "iso-8859-6", label: "ISO-8859-6 (Arabic)" },
			{ value: "iso-8859-7", label: "ISO-8859-7 (Greek)" },
			{ value: "iso-8859-8", label: "ISO-8859-8 (Hebrew)" },
			{ value: "iso-8859-10", label: "ISO-8859-10 (Nordic)" },
			{ value: "iso-8859-13", label: "ISO-8859-13 (Baltic Rim)" },
			{ value: "iso-8859-14", label: "ISO-8859-14 (Celtic)" },
			{ value: "iso-8859-15", label: "ISO-8859-15 (Western)" },
			{ value: "iso-8859-16", label: "ISO-8859-16 (South-Eastern European)" },
		],
	},
	{
		label: "Japanese",
		options: [
			{ value: "shift_jis", label: "Shift_JIS" },
			{ value: "euc-jp", label: "EUC-JP" },
			{ value: "iso-2022-jp", label: "ISO-2022-JP" },
		],
	},
	{
		label: "Chinese",
		options: [
			{ value: "gbk", label: "GBK" },
			{ value: "gb18030", label: "GB18030" },
			{ value: "big5", label: "Big5" },
		],
	},
	{
		label: "Korean",
		options: [{ value: "euc-kr", label: "EUC-KR" }],
	},
	{
		label: "Other",
		options: [
			{ value: "macintosh", label: "Macintosh" },
			{ value: "koi8-r", label: "KOI8-R" },
			{ value: "koi8-u", label: "KOI8-U" },
			{ value: "ibm866", label: "IBM866" },
		],
	},
];

const sourceEncoding = ref("utf-8");
const selectedFile = ref<File | null>(null);
const decodedText = ref("");
const convertedBinary = ref<Uint8Array | null>(null);
const isProcessing = ref(false);
const conversionError = ref("");

const selectedFileLabel = computed(() => {
	if (!selectedFile.value) return "No file selected yet";
	return `${selectedFile.value.name} (${formatBytes(selectedFile.value.size)})`;
});

const convertedFileName = computed(() => {
	if (!selectedFile.value) return "converted-utf8.txt";
	const originalName = selectedFile.value.name;
	const lastDot = originalName.lastIndexOf(".");
	const base = lastDot !== -1 ? originalName.slice(0, lastDot) : originalName;
	const extension = lastDot !== -1 ? originalName.slice(lastDot) : ".txt";
	return `${base}-utf8${extension}`;
});

const convertedSize = computed(() => convertedBinary.value?.length || 0);

const hasPreview = computed(() => decodedText.value.length > 0);

const formatBytes = (bytes: number) => {
	if (bytes === 0) return "0 B";
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const value = bytes / 1024 ** i;
	return `${value.toFixed(value >= 10 ? 0 : 1)} ${sizes[i]}`;
};

const handleFileChange = (event: Event) => {
	const files = (event.target as HTMLInputElement).files;
	if (!files?.length) return;
	selectedFile.value = files[0];
	void readAndConvert();
	(event.target as HTMLInputElement).value = "";
};

const readAndConvert = async () => {
	if (!selectedFile.value) return;

	isProcessing.value = true;
	conversionError.value = "";

	try {
		const arrayBuffer = await selectedFile.value.arrayBuffer();
		const decoder = new TextDecoder(sourceEncoding.value);
		const decoded = decoder.decode(arrayBuffer);

		decodedText.value = decoded;

		const encoder = new TextEncoder();
		convertedBinary.value = encoder.encode(decoded);
	} catch (error) {
		conversionError.value =
			error instanceof Error ? error.message : "Failed to convert file.";
		decodedText.value = "";
		convertedBinary.value = null;
	} finally {
		isProcessing.value = false;
	}
};

const downloadConvertedFile = () => {
	const data = convertedBinary.value;
	if (!data) return;
	const blob = new Blob([data as BlobPart], {
		type: "text/plain;charset=utf-8",
	});
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = convertedFileName.value;
	anchor.click();
	URL.revokeObjectURL(url);
};

watch([sourceEncoding], () => {
	if (selectedFile.value) {
		void readAndConvert();
	}
});
</script>

<template>
	<div>
		<ToolHeader
			title="Encoding"
			description="Convert uploaded text files to UTF-8 using browser native APIs."
		/>

		<ToolCard title="Configuration" class="mb-4">
			<div class="row g-3 align-items-end">
				<div class="col-lg-6">
					<label
						for="fileInput"
						class="form-label fw-bold small text-uppercase text-muted"
						>Upload file</label
					>
					<input
						id="fileInput"
						type="file"
						class="form-control"
						accept=".txt,.csv,.tsv,.log,.json,.html,.xml,.md,.yaml,.yml,text/plain"
						@change="handleFileChange"
					/>
					<div class="form-text">
						Pick a text-based file to convert it to UTF-8.
					</div>
				</div>

				<div class="col-lg-6">
					<label
						for="sourceEncoding"
						class="form-label fw-bold small text-uppercase text-muted"
						>Source encoding</label
					>
					<select
						id="sourceEncoding"
						v-model="sourceEncoding"
						class="form-select"
						:disabled="isProcessing"
					>
						<optgroup
							v-for="group in encodingGroups"
							:key="group.label"
							:label="group.label"
						>
							<option
								v-for="encoding in group.options"
								:key="encoding.value"
								:value="encoding.value"
							>
								{{ encoding.label }}
							</option>
						</optgroup>
					</select>
					<div class="form-text">
						The encoding used to decode the uploaded bytes.
					</div>
				</div>
			</div>

			<div class="d-flex flex-wrap gap-3 mt-3 align-items-center">
				<span class="badge bg-light text-dark border">{{
					selectedFileLabel
				}}</span>
				<span class="badge bg-light text-dark border" v-if="convertedBinary"
					>Converted size: {{ formatBytes(convertedSize) }} (UTF-8)</span
				>
				<span class="badge bg-warning text-dark" v-if="isProcessing"
					>Processing…</span
				>
			</div>
		</ToolCard>

		<div v-if="conversionError" class="alert alert-danger" role="alert">
			{{ conversionError }}
		</div>

		<div class="row">
			<div class="col-lg-6 mb-4">
				<ToolCard title="Source Preview" class="h-100" no-padding>
					<template #header-actions>
						<span class="badge bg-secondary opacity-75" v-if="selectedFile">{{
							sourceEncoding.toUpperCase()
						}}</span>
					</template>
					<MonospaceEditor
						v-model="decodedText"
						:rows="14"
						readonly
						placeholder="The decoded text from your upload will appear here."
					/>
				</ToolCard>
			</div>

			<div class="col-lg-6 mb-4">
				<ToolCard title="UTF-8 Output" class="h-100" no-padding>
					<template #header-actions>
						<div class="d-flex align-items-center gap-3">
							<CopyButton :content="decodedText" />
							<button
								class="btn btn-sm btn-link p-0 text-decoration-none"
								type="button"
								:disabled="!convertedBinary"
								@click="downloadConvertedFile"
							>
								Download
							</button>
							<span
								class="badge bg-secondary opacity-75"
								v-if="convertedBinary"
							>
								UTF-8
							</span>
						</div>
					</template>
					<MonospaceEditor
						v-model="decodedText"
						:rows="14"
						readonly
						bgLight
						placeholder="Your converted UTF-8 text will be ready to copy or download."
					/>
				</ToolCard>
			</div>
		</div>

		<div v-if="!hasPreview" class="text-center text-muted py-4">
			Upload a file to start converting to UTF-8.
		</div>
	</div>
</template>
