import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mean,
  median,
  firstQuartile,
  thirdQuartile,
  variance,
  standardDeviation,
  round,
  split,
} from "./statistics";

test("mean calculation", () => {
  assert.equal(mean([10, 20, 30]), 20);
  assert.equal(mean([1, 2]), 1.5);
  assert.ok(Number.isNaN(mean([])));
});

test("median calculation (odd)", () => {
  assert.equal(median([10, 20, 30]), 20);
  assert.equal(median([30, 10, 20]), 20); // sorting check
});

test("median calculation (even)", () => {
  assert.equal(median([10, 20, 30, 40]), 25);
});

test("quartiles calculation (odd - Moore & McCabe)", () => {
  // dataset: 1, 2, 3, 4, 5
  // median: 3
  // lower half: 1, 2 -> Q1: 1.5
  // upper half: 4, 5 -> Q3: 4.5
  const data = [1, 2, 3, 4, 5];
  assert.equal(firstQuartile(data), 1.5);
  assert.equal(thirdQuartile(data), 4.5);
});

test("quartiles calculation (even)", () => {
  // dataset: 1, 2, 3, 4, 5, 6
  // median: 3.5
  // lower half: 1, 2, 3 -> Q1: 2
  // upper half: 4, 5, 6 -> Q3: 5
  const data = [1, 2, 3, 4, 5, 6];
  assert.equal(firstQuartile(data), 2);
  assert.equal(thirdQuartile(data), 5);
});

test("quartiles with duplicates", () => {
  const data = [1, 2, 2, 2, 3];
  // sorted: 1, 2, 2, 2, 3
  // mid index: 2 (value 2)
  // lower: 1, 2 -> Q1: 1.5
  // upper: 2, 3 -> Q3: 2.5
  assert.equal(firstQuartile(data), 1.5);
  assert.equal(thirdQuartile(data), 2.5);
});

test("variance and std deviation", () => {
  const data = [1, 2, 3];
  // mean: 2
  // diffs^2: (1-2)^2 + (2-2)^2 + (3-2)^2 = 1 + 0 + 1 = 2
  // variance: 2 / 3
  assert.equal(round(variance(data)), round(2 / 3));
  assert.equal(round(standardDeviation(data)), round(Math.sqrt(2 / 3)));
});

test("split function", () => {
  assert.deepEqual(split("10, 20 30\n40"), [10, 20, 30, 40]);
  assert.deepEqual(split("1.5; -2.5 +3"), [1.5, -2.5, 3]);
});
