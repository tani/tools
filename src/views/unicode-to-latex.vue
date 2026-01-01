<script setup lang="ts">
import { computed, ref } from "vue";
import jsonRaw from "../assets/unicode_latex_unicodemath.json";

const json = jsonRaw as [string, string, string][];
const input = ref("");

function replace(value: string) {
  let val = value;
  for (const [, char, latex] of json) {
    if (char !== "" && char.charCodeAt(0) > 127 && latex.length > 2) {
      val = val.replaceAll(char, `$${latex}$`);
    }
  }
  return val.replaceAll(/\$\$\$/g, "$");
}

const output = computed(() => replace(input.value));
</script>

<template>
  <div>
    <h2>Unicode To LaTeX</h2>
    <div class="row">
      <div class="col-sm-6">
        <textarea v-model="input" class="form-control mt-3" rows="20" />
      </div>
      <div class="col-sm-6">
        <textarea class="form-control mt-3" :value="output" readonly rows="20" />
      </div>
    </div>
  </div>
</template>
