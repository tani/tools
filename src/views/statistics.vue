<script setup lang="ts">
import { computed, ref } from "vue";
import ToolHeader from "../components/ToolHeader.vue";
import ToolCard from "../components/ToolCard.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import {
  round,
  mean,
  variance,
  standardDeviation,
  max,
  min,
  modes,
  median,
  firstQuartile,
  thirdQuartile,
  hist,
  split
} from "../utils/statistics";

const input = ref("10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 10, 20, 30, 55, 66, 77, 88");

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
    <ToolHeader
      title="Statistics"
      description="Calculate mean, variance, standard deviation, and other basic statistical measures from a list of numbers."
    />

    <div class="row">
      <div class="col-12 mb-4">
        <ToolCard title="Statistics Summary" no-padding>
          <!-- Row 1 -->
          <div class="row g-0 text-center border-bottom">
            <div class="col-md-4 border-end py-3">
              <div class="small text-uppercase text-muted mb-1" style="font-size: 0.7rem;">
                Mean
              </div>
              <div class="fs-4 fw-bold text-primary">
                {{ values.length ? round(mean(values)) : '-' }}
              </div>
            </div>
            <div class="col-md-4 border-end py-3">
              <div class="small text-uppercase text-muted mb-1" style="font-size: 0.7rem;">
                Variance
              </div>
              <div class="fs-4 fw-bold text-primary">
                {{ values.length ? round(variance(values)) : '-' }}
              </div>
            </div>
            <div class="col-md-4 py-3">
              <div class="small text-uppercase text-muted mb-1" style="font-size: 0.7rem;">
                Std Deviation
              </div>
              <div class="fs-4 fw-bold text-primary">
                {{ values.length ? round(standardDeviation(values)) : '-' }}
              </div>
            </div>
          </div>
          <!-- Row 2 -->
          <div class="row g-0 text-center border-bottom">
            <div class="col-md-4 border-end py-3">
              <div class="small text-uppercase text-muted mb-1" style="font-size: 0.7rem;">
                Q1 (25th)
              </div>
              <div class="fs-4 fw-bold">{{ values.length ? firstQuartile(values) : '-' }}</div>
            </div>
            <div class="col-md-4 border-end py-3">
              <div class="small text-uppercase text-muted mb-1" style="font-size: 0.7rem;">
                Median (50th)
              </div>
              <div class="fs-4 fw-bold">{{ values.length ? median(values) : '-' }}</div>
            </div>
            <div class="col-md-4 py-3">
              <div class="small text-uppercase text-muted mb-1" style="font-size: 0.7rem;">
                Q3 (75th)
              </div>
              <div class="fs-4 fw-bold">{{ values.length ? thirdQuartile(values) : '-' }}</div>
            </div>
          </div>
          <!-- Row 3 -->
          <div class="row g-0 text-center">
            <div class="col-md-4 border-end py-3">
              <div class="small text-uppercase text-muted mb-1" style="font-size: 0.7rem;">
                Mode
              </div>
              <div class="fs-4 fw-bold">
                {{ values.length ? modes(values)?.join(", ") : '-' }}
              </div>
            </div>
            <div class="col-md-4 border-end py-3">
              <div class="small text-uppercase text-muted mb-1" style="font-size: 0.7rem;">
                Max / Min
              </div>
              <div class="fs-4 fw-bold">
                <span class="text-success">{{ values.length ? max(values) : '-' }}</span>
                <span class="mx-2 text-muted">/</span>
                <span class="text-danger">{{ values.length ? min(values) : '-' }}</span>
              </div>
            </div>
            <div class="col-md-4 py-3">
              <div class="small text-uppercase text-muted mb-1" style="font-size: 0.7rem;">
                Total Count
              </div>
              <div class="fs-4 fw-bold">{{ values.length }}</div>
            </div>
          </div>
        </ToolCard>
      </div>
    </div>
    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="Input Numbers" class="h-100" no-padding>
          <MonospaceEditor
            v-model="input"
            :rows="15"
          />
        </ToolCard>
      </div>
      <div class="col-lg-6 mb-4">
        <ToolCard title="Histogram View" class="h-100">
          <div
            class="d-flex flex-column bg-light"
            style="overflow-x: auto; min-height: 300px"
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
        </ToolCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-monospace {
  font-family: var(--bs-font-monospace);
}
</style>
