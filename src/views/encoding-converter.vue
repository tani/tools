<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { decode, encode } from "iconv-lite";
import "iconv-lite/encodings";
import { Buffer } from "buffer";
import CopyButton from "../components/CopyButton.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";

const encodingGroups = [
  {
    label: "Node.js native",
    options: [
      { value: "utf8", label: "UTF-8" },
      { value: "cesu8", label: "CESU-8" },
      { value: "ucs2", label: "UCS-2 / UTF-16LE" },
      { value: "utf16le", label: "UTF-16LE (alias: UTF-16)" },
      { value: "ascii", label: "ASCII" },
      { value: "binary", label: "Binary" },
      { value: "base64", label: "Base64" },
      { value: "hex", label: "Hex" },
    ],
  },
  {
    label: "Unicode",
    options: [
      { value: "utf7", label: "UTF-7" },
      { value: "utf7-imap", label: "UTF-7 IMAP" },
      { value: "utf16be", label: "UTF-16BE" },
      { value: "utf16", label: "UTF-16 (with BOM)" },
      { value: "utf32", label: "UTF-32 (with BOM)" },
      { value: "utf32le", label: "UTF-32LE" },
      { value: "utf32be", label: "UTF-32BE" },
    ],
  },
  {
    label: "Windows codepages",
    options: [
      { value: "windows-874", label: "Windows-874 (cp874, win874)" },
      { value: "windows-1250", label: "Windows-1250 (cp1250, win1250)" },
      { value: "windows-1251", label: "Windows-1251 (cp1251, win1251)" },
      { value: "windows-1252", label: "Windows-1252 (cp1252, win1252)" },
      { value: "windows-1253", label: "Windows-1253 (cp1253, win1253)" },
      { value: "windows-1254", label: "Windows-1254 (cp1254, win1254)" },
      { value: "windows-1255", label: "Windows-1255 (cp1255, win1255)" },
      { value: "windows-1256", label: "Windows-1256 (cp1256, win1256)" },
      { value: "windows-1257", label: "Windows-1257 (cp1257, win1257)" },
      { value: "windows-1258", label: "Windows-1258 (cp1258, win1258)" },
    ],
  },
  {
    label: "ISO-8859",
    options: [
      { value: "iso-8859-1", label: "ISO-8859-1" },
      { value: "iso-8859-2", label: "ISO-8859-2" },
      { value: "iso-8859-3", label: "ISO-8859-3" },
      { value: "iso-8859-4", label: "ISO-8859-4" },
      { value: "iso-8859-5", label: "ISO-8859-5" },
      { value: "iso-8859-6", label: "ISO-8859-6" },
      { value: "iso-8859-7", label: "ISO-8859-7" },
      { value: "iso-8859-8", label: "ISO-8859-8" },
      { value: "iso-8859-9", label: "ISO-8859-9" },
      { value: "iso-8859-10", label: "ISO-8859-10" },
      { value: "iso-8859-11", label: "ISO-8859-11" },
      { value: "iso-8859-13", label: "ISO-8859-13" },
      { value: "iso-8859-14", label: "ISO-8859-14" },
      { value: "iso-8859-15", label: "ISO-8859-15" },
      { value: "iso-8859-16", label: "ISO-8859-16" },
    ],
  },
  {
    label: "IBM codepages",
    options: [
      { value: "cp437", label: "IBM 437" },
      { value: "cp720", label: "IBM 720" },
      { value: "cp737", label: "IBM 737" },
      { value: "cp775", label: "IBM 775" },
      { value: "cp808", label: "IBM 808" },
      { value: "cp850", label: "IBM 850" },
      { value: "cp852", label: "IBM 852" },
      { value: "cp855", label: "IBM 855" },
      { value: "cp856", label: "IBM 856" },
      { value: "cp857", label: "IBM 857" },
      { value: "cp858", label: "IBM 858" },
      { value: "cp860", label: "IBM 860" },
      { value: "cp861", label: "IBM 861" },
      { value: "cp862", label: "IBM 862" },
      { value: "cp863", label: "IBM 863" },
      { value: "cp864", label: "IBM 864" },
      { value: "cp865", label: "IBM 865" },
      { value: "cp866", label: "IBM 866" },
      { value: "cp869", label: "IBM 869" },
      { value: "cp922", label: "IBM 922" },
      { value: "cp1046", label: "IBM 1046" },
      { value: "cp1124", label: "IBM 1124" },
      { value: "cp1125", label: "IBM 1125" },
      { value: "cp1129", label: "IBM 1129" },
      { value: "cp1133", label: "IBM 1133" },
      { value: "cp1161", label: "IBM 1161" },
      { value: "cp1162", label: "IBM 1162" },
      { value: "cp1163", label: "IBM 1163" },
    ],
  },
  {
    label: "Mac codepages",
    options: [
      { value: "maccroatian", label: "Mac Croatian" },
      { value: "maccyrillic", label: "Mac Cyrillic" },
      { value: "macgreek", label: "Mac Greek" },
      { value: "maciceland", label: "Mac Iceland" },
      { value: "macroman", label: "Mac Roman" },
      { value: "macromania", label: "Mac Romania" },
      { value: "macthai", label: "Mac Thai" },
      { value: "macturkish", label: "Mac Turkish" },
      { value: "macukraine", label: "Mac Ukraine" },
      { value: "maccenteuro", label: "Mac Central Europe" },
      { value: "macintosh", label: "Macintosh" },
    ],
  },
  {
    label: "KOI8 codepages",
    options: [
      { value: "koi8-r", label: "KOI8-R" },
      { value: "koi8-u", label: "KOI8-U" },
      { value: "koi8-ru", label: "KOI8-RU" },
      { value: "koi8-t", label: "KOI8-T" },
    ],
  },
  {
    label: "Miscellaneous single-byte",
    options: [
      { value: "armscii8", label: "ARMSCII-8" },
      { value: "rk1048", label: "RK1048" },
      { value: "tcvn", label: "TCVN" },
      { value: "georgianacademy", label: "Georgian Academy" },
      { value: "georgianps", label: "Georgian PS" },
      { value: "pt154", label: "PT154" },
      { value: "viscii", label: "VISCII" },
      { value: "iso646-cn", label: "ISO646-CN" },
      { value: "iso646-jp", label: "ISO646-JP" },
      { value: "hproman8", label: "HP Roman8" },
      { value: "tis620", label: "TIS-620" },
    ],
  },
  {
    label: "Japanese (multi-byte)",
    options: [
      { value: "shift_jis", label: "Shift_JIS" },
      { value: "windows-31j", label: "Windows-31J" },
      { value: "windows932", label: "Windows-932" },
      { value: "euc-jp", label: "EUC-JP" },
    ],
  },
  {
    label: "Chinese (multi-byte)",
    options: [
      { value: "gb2312", label: "GB2312" },
      { value: "gbk", label: "GBK" },
      { value: "gb18030", label: "GB18030" },
      { value: "windows936", label: "Windows-936" },
      { value: "euc-cn", label: "EUC-CN" },
    ],
  },
  {
    label: "Korean (multi-byte)",
    options: [
      { value: "ks_c_5601", label: "KS_C_5601" },
      { value: "windows949", label: "Windows-949" },
      { value: "euc-kr", label: "EUC-KR" },
    ],
  },
  {
    label: "Taiwan / Hong Kong (multi-byte)",
    options: [
      { value: "big5", label: "Big5" },
      { value: "big5-hkscs", label: "Big5-HKSCS" },
      { value: "windows950", label: "Windows-950" },
    ],
  },
];

const sourceEncoding = ref("utf8");
const targetEncoding = ref("shift_jis");
const selectedFile = ref<File | null>(null);
const decodedText = ref("");
const convertedText = ref("");
const convertedBinary = ref<Uint8Array | null>(null);
const isProcessing = ref(false);
const conversionError = ref("");

const selectedFileLabel = computed(() => {
  if (!selectedFile.value) return "No file selected yet";
  return `${selectedFile.value.name} (${formatBytes(selectedFile.value.size)})`;
});

const convertedFileName = computed(() => {
  if (!selectedFile.value) return `converted-${targetEncoding.value}.txt`;
  const originalName = selectedFile.value.name;
  const lastDot = originalName.lastIndexOf(".");
  const base = lastDot !== -1 ? originalName.slice(0, lastDot) : originalName;
  const extension = lastDot !== -1 ? originalName.slice(lastDot) : ".txt";
  return `${base}-${targetEncoding.value}${extension}`;
});

const convertedSize = computed(() => convertedBinary.value?.length || 0);

const hasPreview = computed(() => decodedText.value.length > 0 || convertedText.value.length > 0);

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
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    const decoded = decode(buffer, sourceEncoding.value);

    decodedText.value = decoded;

    const encodedBuffer = encode(decoded, targetEncoding.value);
    convertedBinary.value = Uint8Array.from(encodedBuffer);
    convertedText.value = decode(encodedBuffer, targetEncoding.value);
  } catch (error) {
    conversionError.value = error instanceof Error ? error.message : "Failed to convert file.";
    decodedText.value = "";
    convertedText.value = "";
    convertedBinary.value = null;
  } finally {
    isProcessing.value = false;
  }
};

const downloadConvertedFile = () => {
  if (!convertedBinary.value) return;
  const view = convertedBinary.value;
  const safeBuffer = new Uint8Array(view).buffer;
  const blob = new Blob([safeBuffer], {
    type: `text/plain;charset=${targetEncoding.value}`,
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = convertedFileName.value;
  anchor.click();
  URL.revokeObjectURL(url);
};

watch([sourceEncoding, targetEncoding], () => {
  if (selectedFile.value) {
    void readAndConvert();
  }
});
</script>

<template>
  <div>
    <ToolHeader
      title="File Encoding Converter"
      description="Convert the character encoding of uploaded text files in the browser using iconv-lite."
    />

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3 align-items-end">
        <div class="col-lg-4">
          <label for="fileInput" class="form-label fw-bold small text-uppercase text-muted"
            >Upload file</label
          >
          <input
            id="fileInput"
            type="file"
            class="form-control"
            accept=".txt,.csv,.tsv,.log,.json,.html,.xml,.md,.yaml,.yml,text/plain"
            @change="handleFileChange"
          />
          <div class="form-text">Pick a text-based file to recode it into a different charset.</div>
        </div>

        <div class="col-lg-4">
          <label for="sourceEncoding" class="form-label fw-bold small text-uppercase text-muted"
            >Source encoding</label
          >
          <select
            id="sourceEncoding"
            v-model="sourceEncoding"
            class="form-select"
            :disabled="isProcessing"
          >
            <optgroup v-for="group in encodingGroups" :key="group.label" :label="group.label">
              <option
                v-for="encoding in group.options"
                :key="encoding.value"
                :value="encoding.value"
              >
                {{ encoding.label }}
              </option>
            </optgroup>
          </select>
          <div class="form-text">Used to decode the uploaded bytes into readable text.</div>
        </div>

        <div class="col-lg-4">
          <label for="targetEncoding" class="form-label fw-bold small text-uppercase text-muted"
            >Target encoding</label
          >
          <select
            id="targetEncoding"
            v-model="targetEncoding"
            class="form-select"
            :disabled="isProcessing"
          >
            <optgroup v-for="group in encodingGroups" :key="group.label" :label="group.label">
              <option
                v-for="encoding in group.options"
                :key="encoding.value"
                :value="encoding.value"
              >
                {{ encoding.label }}
              </option>
            </optgroup>
          </select>
          <div class="form-text">The encoding used to rebuild the file and download it.</div>
        </div>
      </div>

      <div class="d-flex flex-wrap gap-3 mt-3 align-items-center">
        <span class="badge bg-light text-dark border">{{ selectedFileLabel }}</span>
        <span class="badge bg-light text-dark border" v-if="convertedBinary"
          >Converted size: {{ formatBytes(convertedSize) }}</span
        >
        <span class="badge bg-warning text-dark" v-if="isProcessing">Processing…</span>
      </div>
    </ToolCard>

    <div v-if="conversionError" class="alert alert-danger" role="alert">
      {{ conversionError }}
    </div>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="Decoded preview" class="h-100" no-padding>
          <template #header-actions>
            <span
              class="badge bg-secondary opacity-75"
              v-if="selectedFile"
              >{{ sourceEncoding.toUpperCase() }}</span
            >
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
        <ToolCard title="Converted output" class="h-100" no-padding>
          <template #header-actions>
            <div class="d-flex align-items-center gap-3">
              <CopyButton :content="convertedText" />
              <button
                class="btn btn-sm btn-link p-0 text-decoration-none"
                type="button"
                :disabled="!convertedBinary"
                @click="downloadConvertedFile"
              >
                Download
              </button>
              <span class="badge bg-secondary opacity-75" v-if="convertedBinary">
                {{ targetEncoding.toUpperCase() }}
              </span>
            </div>
          </template>
          <MonospaceEditor
            v-model="convertedText"
            :rows="14"
            readonly
            bgLight
            placeholder="Your converted text will be ready to copy or download."
          />
        </ToolCard>
      </div>
    </div>

    <div v-if="!hasPreview" class="text-center text-muted py-4">
      Upload a file to start converting between encodings.
    </div>
  </div>
</template>
