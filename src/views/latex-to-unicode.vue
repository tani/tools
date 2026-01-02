<script setup lang="ts">
import { computed, ref } from "vue";
import jsonRaw from "../assets/unicode_latex_unicodemath.json";
import subscriptSuperscriptRaw from "../assets/subscript_superscript.json";

const json = jsonRaw as [string, string, string][];
const subscript = subscriptSuperscriptRaw.subscript as Record<string, string>;
const superscript = subscriptSuperscriptRaw.superscript as Record<string, string>;
const input = ref("");

function replace(value: string) {
  let val = value;
  for (const [, char, latex] of json) {
    if (char !== "" && char.charCodeAt(0) > 127 && latex.length > 2) {
      val = val.replaceAll(new RegExp(`\\${latex}(?![a-zA-Z])`, "g"), char);
    }
  }
  val = val
    .replaceAll(/_\{(.*?)\}/g, (_, sub: string) => sub.replaceAll(/./g, (s) => subscript[s] ?? s))
    .replaceAll(/\^\{(.*?)\}/g, (_, sub: string) =>
      sub.replaceAll(/./g, (s) => superscript[s] ?? s),
    )
    .replaceAll(/_(.)/g, (_, sub: string) => subscript[sub] ?? sub)
    .replaceAll(/\^(.)/g, (_, sup: string) => superscript[sup] ?? sup);
  return val.replaceAll(/\$(.*?)\$/g, "$1");
}

const output = computed(() => replace(input.value));
</script>

<template>
  <div>
    <h2 class="display-6">LaTeX To Unicode</h2>
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
