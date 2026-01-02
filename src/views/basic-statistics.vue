<script setup lang="ts">
import { computed, ref } from "vue";

const input = ref("");

function round(num: number) {
  for (let i = 0; i < 256; i++) {
    if (Math.floor(num * 10 ** i) !== 0) {
      return Math.floor(num * 10 ** (i + 2)) / 10 ** (i + 2);
    }
  }
  return num;
}

function mean(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  const mu = nums.reduce((p, c) => p + c, 0) / nums.length;
  return mu;
}

function variance(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  const mu = mean(nums);
  const sigma2 = nums.reduce((p, c) => p + (c - mu) ** 2, 0) / nums.length;
  return sigma2;
}

function standardDeviation(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  const sigma2 = variance(nums);
  const sigma = Math.sqrt(sigma2);
  return sigma;
}

function max(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  const maxValue = Math.max(...nums);
  return maxValue;
}

function min(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  const minValue = Math.min(...nums);
  return minValue;
}

function midRange(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  const mid = (min(nums) + max(nums)) / 2;
  return mid;
}

function range(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  const rangeValue = max(nums) - min(nums);
  return rangeValue;
}

function modes(nums: number[]) {
  if (nums.length === 0) {
    return [];
  }

  const counts: Record<number, number> = {};
  let maxFreq = 0;

  for (let i = 0; i < nums.length; i++) {
    const num = nums[i];
    counts[num] = (counts[num] ?? 0) + 1;
    if (counts[num] > maxFreq) {
      maxFreq = counts[num];
    }
  }

  const modesValue: string[] = [];
  for (const num in counts) {
    if (counts[num] === maxFreq) {
      modesValue.push(num);
    }
  }

  return modesValue;
}

function median(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  const sorted = [...nums].sort((a, b) => a - b);
  if (sorted.length % 2 === 1) {
    const mid = Math.floor(sorted.length / 2);
    const med = sorted[mid];
    return med;
  }
  const mid = sorted.length / 2;
  const med = (sorted[mid - 1] + sorted[mid]) / 2;
  return med;
}

function firstQuartile(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  const med = median(nums);
  const small = nums.filter((x) => x < med);
  const q1 = median(small);
  return q1;
}

function thirdQuartile(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  const med = median(nums);
  const large = nums.filter((x) => x > med);
  const q3 = median(large);
  return q3;
}

function hist(nums: number[]) {
  if (nums.length === 0) {
    return {};
  }
  const counts: Record<number, number> = {};
  for (let i = 0; i < nums.length; i++) {
    const num = nums[i];
    if (counts[num] === undefined) {
      counts[num] = 1;
    } else {
      counts[num] += 1;
    }
  }
  return counts;
}

function split(value: string) {
  return value
    .split(/[^0-9.+-]+/)
    .filter((x) => x !== "")
    .map(Number)
    .filter((x) => !Number.isNaN(x));
}

const values = computed(() => split(input.value));
const histogram = computed(() => hist(values.value));
const chartData = computed(() => {
  const keys = Object.keys(histogram.value)
    .map(Number)
    .sort((a, b) => a - b);
  const data = keys.map((k) => ({ label: k.toString(), value: histogram.value[k] }));
  const maxVal = Math.max(...data.map((d) => d.value), 0);
  return { data, maxVal };
});
</script>

<template>
  <div>
    <h2 class="display-6">Basic Statistics</h2>
    <p class="text-muted">
      Calculate mean, variance, standard deviation, and other basic statistical measures from a list of numbers.
    </p>
    <div class="row">
      <div class="col-sm-12">
        <table class="table">
          <tbody>
            <tr>
              <th>Mean</th>
              <td>{{ round(mean(values))?.toString() }}</td>
              <th>Variance</th>
              <td>{{ round(variance(values))?.toString() }}</td>
              <th>Standard deviation</th>
              <td>{{ round(standardDeviation(values))?.toString() }}</td>
            </tr>
            <tr>
              <th>First quartile</th>
              <td>{{ firstQuartile(values)?.toString() }}</td>
              <th>Median/ Second quartile</th>
              <td>{{ median(values)?.toString() }}</td>
              <th>Third quartile</th>
              <td>{{ thirdQuartile(values)?.toString() }}</td>
            </tr>
            <tr>
              <th>Mode</th>
              <td>{{ modes(values)?.join(", ") }}</td>
              <th>Max</th>
              <td>{{ max(values)?.toString() }}</td>
              <th>Min</th>
              <td>{{ min(values)?.toString() }}</td>
            </tr>
            <tr>
              <th>Mid-range</th>
              <td>{{ midRange(values)?.toString() }}</td>
              <th>Range</th>
              <td>{{ range(values)?.toString() }}</td>
              <th>Count</th>
              <td>{{ values.length }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="row mt-3">
      <div class="col-sm-6 mb-3">
        <div class="card h-100">
          <div class="card-header">Input</div>
          <div class="card-body p-0">
            <textarea
              v-model="input"
              class="form-control border-0 font-monospace p-3"
              rows="20"
              style="height: 100%; min-height: 400px; resize: none;"
            />
          </div>
        </div>
      </div>
      <div class="col-sm-6 mb-3">
        <div class="card h-100">
          <div class="card-header">Histogram</div>
          <div
            class="card-body p-2 d-flex flex-column bg-light"
            style="overflow-x: auto; min-height: 400px"
          >
          <svg
            v-if="chartData.data.length > 0"
            :viewBox="`0 0 ${Math.max(400, chartData.data.length * 40)} 300`"
            class="flex-grow-1"
            style="min-width: 100%; height: auto"
            preserveAspectRatio="xMidYMid meet"
          >
            <g v-for="(item, index) in chartData.data" :key="item.label">
              <rect
                :x="index * (Math.max(400, chartData.data.length * 40) / chartData.data.length) + 5"
                :y="250 - (item.value / chartData.maxVal) * 220"
                :width="Math.max(400, chartData.data.length * 40) / chartData.data.length - 10"
                :height="(item.value / chartData.maxVal) * 220"
                style="fill: var(--bs-primary)"
              />
              <text
                :x="index * (Math.max(400, chartData.data.length * 40) / chartData.data.length) + (Math.max(400, chartData.data.length * 40) / chartData.data.length) / 2"
                y="270"
                text-anchor="middle"
                font-size="12"
                fill="currentColor"
              >
                {{ item.label }}
              </text>
              <text
                :x="index * (Math.max(400, chartData.data.length * 40) / chartData.data.length) + (Math.max(400, chartData.data.length * 40) / chartData.data.length) / 2"
                :y="245 - (item.value / chartData.maxVal) * 220"
                text-anchor="middle"
                font-size="10"
                fill="currentColor"
              >
                {{ item.value }}
              </text>
            </g>
            <line
              x1="0"
              y1="250"
              :x2="Math.max(400, chartData.data.length * 40)"
              y2="250"
              stroke="currentColor"
              stroke-width="1"
            />
          </svg>
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
