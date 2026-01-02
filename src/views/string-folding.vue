<script setup lang="ts">
import { ref, computed } from 'vue';

const inputText = ref(`John bought 3 apples for 30 cents with 100 cents. How much is the change?
Jane bought 1 candy for 5 cents with 50 cents. How much is the change?
Bob bought 2 loaves of bread for 128 cents with 1000 cents. How much is the change?
Alice bought 1 game for 2980 cents with 10000 cents. How much is the change?
Ken bought 1 bicycle for 19800 cents with 300000 cents. How much is the change?
Mary bought 2 stickers for 1 cent with 5 cents. How much is the change?
Tom bought 10 juices for 120 cents with 1500 cents. How much is the change?
Maki bought 2 dresses for 3980 cents with 20000 cents. How much is the change?
Naoto bought 5 chocolates for 8 cents with 60 cents. How much is the change?
Sakura bought 1 car for 500000 cents with 1000000 cents. How much is the change?`);
const showSteps = ref(false);
const diffChar = ref("#");
const copyBtnText = ref("Copy");
const copyRegexBtnText = ref("Copy Regex");

const lineCount = computed(() => inputText.value.split(/\n/).filter(line => line.trim()).length);

const limitDiffChar = () => {
  if (diffChar.value.length > 1) {
    diffChar.value = diffChar.value.substring(0, 1);
  }
};

const computeLCSDiff = (str1: string, str2: string) => {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = m;
  let j = n;
  let merged = "";

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && str1[i - 1] === str2[j - 1]) {
      merged = str1[i - 1] + merged;
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      merged = diffChar.value + merged;
      j--;
    } else {
      merged = diffChar.value + merged;
      i--;
    }
  }

  const escapedDiffChar = diffChar.value.replace(/[.*+?^${}()|[\\]/g, '\\$&');
  const regex = new RegExp(`${escapedDiffChar}+`, 'g');
  return merged.replace(regex, diffChar.value);
};

const processedData = computed(() => {
  const lines = inputText.value.split(/\r\n|\r|\n/).filter(line => line.trim());
  
  if (lines.length === 0) return { finalResult: "", regexResult: "", steps: [] };
  if (lines.length === 1) return { finalResult: lines[0], regexResult: lines[0], steps: [] };

  let currentResult = lines[0];
  const steps = [];

  for (let i = 1; i < lines.length; i++) {
    const nextLine = lines[i];
    const prevResult = currentResult;
    const newResult = computeLCSDiff(prevResult, nextLine);

    steps.push({
      stepIndex: i,
      inputA: prevResult,
      inputB: nextLine,
      output: newResult
    });

    currentResult = newResult;
  }

  const escapedDiffChar = diffChar.value.replace(/[.*+?^${}()|[\\]/g, '\\$&');
  const regexPattern = new RegExp(`${escapedDiffChar}+`, 'g');
  const regexResult = currentResult.replace(regexPattern, '(.+?)');

  return { finalResult: currentResult, regexResult, steps };
});

const copyToClipboard = () => {
  navigator.clipboard.writeText(processedData.value.finalResult).then(() => {
    copyBtnText.value = "Copied!";
    setTimeout(() => {
      copyBtnText.value = "Copy";
    }, 2000);
  });
};

const copyRegexToClipboard = () => {
  navigator.clipboard.writeText(processedData.value.regexResult).then(() => {
    copyRegexBtnText.value = "Copied!";
    setTimeout(() => {
      copyRegexBtnText.value = "Copy Regex";
    }, 2000);
  });
};
</script>

<template>
  <div>
    <h2 class="display-6">String Folding Tool</h2>
    <p class="text-muted mb-4">
      Compare strings line-by-line using the LCS algorithm and replace differences with "{{ diffChar }}".
    </p>

    <div class="card mb-4 shadow-sm">
      <div class="card-header fw-bold small text-uppercase text-muted">Configuration</div>
      <div class="card-body">
        <div class="row align-items-center g-3">
          <div class="col-auto">
            <label for="diffChar" class="form-label mb-0 fw-bold small">Replacement Character</label>
          </div>
          <div class="col-auto">
            <input 
              id="diffChar"
              type="text" 
              v-model="diffChar"
              @input="limitDiffChar"
              class="form-control form-control-sm text-center font-monospace"
              style="width: 3rem;"
            >
          </div>
          <div class="col-auto ms-auto">
            <div class="form-check mb-0">
              <input 
                class="form-check-input"
                type="checkbox" 
                v-model="showSteps"
                id="showSteps"
              >
              <label class="form-check-label small fw-bold text-muted text-uppercase" for="showSteps" style="font-size: 0.75rem;">
                Show Calculation Steps
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <!-- Input Area -->
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span class="fw-bold small text-uppercase text-muted">Unicode Input</span>
            <span class="badge bg-secondary opacity-75">{{ lineCount }} lines</span>
          </div>
          <div class="card-body p-0">
            <textarea
              class="form-control border-0 font-monospace p-3"
              placeholder="Enter your strings here..."
              v-model="inputText"
              spellcheck="false"
              rows="15"
              style="resize: none;"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Result Area -->
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">
            Processed Results
          </div>
          <div class="card-body bg-light overflow-auto p-3" style="min-height: 382px;">
            <div v-if="!inputText.trim()" class="text-center text-muted py-5 small">
              Results will appear here
            </div>
            
            <div v-else>
              <!-- Regex Result -->
              <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <label class="small fw-bold text-uppercase text-muted mb-0" style="font-size: 0.7rem;">Regex Pattern</label>
                  <button class="btn btn-sm btn-link p-0 text-decoration-none small" style="font-size: 0.7rem;" @click="copyRegexToClipboard">
                    {{ copyRegexBtnText }}
                  </button>
                </div>
                <div class="p-3 border rounded bg-white font-monospace text-break small" style="color: #d946ef;">
                  {{ processedData.regexResult || "(No input)" }}
                </div>
              </div>

              <!-- Final Result -->
              <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <label class="small fw-bold text-uppercase text-muted mb-0" style="font-size: 0.7rem;">Final Folded Result</label>
                  <button class="btn btn-sm btn-link p-0 text-decoration-none small" style="font-size: 0.7rem;" @click="copyToClipboard">
                    {{ copyBtnText }}
                  </button>
                </div>
                <div class="p-3 border rounded bg-white font-monospace text-break fw-bold fs-6">
                  {{ processedData.finalResult || "(No input)" }}
                </div>
              </div>

              <!-- Calculation Steps -->
              <div v-if="showSteps && processedData.steps.length > 0">
                <label class="small fw-bold text-uppercase text-muted mb-2 d-block" style="font-size: 0.7rem;">Step-by-Step Evolution</label>
                <div v-for="step in processedData.steps" :key="step.stepIndex" class="card mb-2 border-0 shadow-none bg-white">
                  <div class="card-body p-2 border rounded">
                    <span class="badge bg-info text-dark mb-2" style="font-size: 0.6rem;">Step {{ step.stepIndex }}</span>
                    <div class="row g-1 font-monospace" style="font-size: 0.75rem;">
                      <div class="col-1 text-muted text-end">A:</div>
                      <div class="col-11 text-break">{{ step.inputA }}</div>
                      
                      <div class="col-1 text-muted text-end">B:</div>
                      <div class="col-11 text-break">{{ step.inputB }}</div>
                      
                      <div class="col-1 text-warning text-end">↓</div>
                      <div class="col-11 text-break text-primary fw-bold">{{ step.output }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-monospace {
  font-family: var(--bs-font-monospace);
}
</style>
