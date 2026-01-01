import * as React from "react";
import Chart from "react-apexcharts";

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
  const max = Math.max(...nums);
  return max;
}

function min(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  const min = Math.min(...nums);
  return min;
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
  const range = max(nums) - min(nums);
  return range;
}

function modes(nums: number[]) {
  if (nums.length === 0) {
    return [];
  }

  const counts: Record<number, number> = {};
  let maxFreq = 0;

  // Count frequencies of each number and track the maximum frequency
  for (let i = 0; i < nums.length; i++) {
    const num = nums[i];
    counts[num] = (counts[num] ?? 0) + 1;
    if (counts[num] > maxFreq) {
      maxFreq = counts[num];
    }
  }

  // Find all numbers that have the maximum frequency
  const modes: string[] = [];
  for (const num in counts) {
    if (counts[num] === maxFreq) {
      modes.push(num);
    }
  }

  return modes;
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

function split(str: string) {
  return str
    .split(/[^0-9.+-]+/)
    .filter((x) => x !== "")
    .map(Number)
    .filter((x) => !Number.isNaN(x));
}

export default function BasicStatistics() {
  const [state, setState] = React.useState<{ value: number[] }>({ value: [] });
  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) =>
    setState({ ...state, value: split(event.target.value) });
  return (
    <div>
      <h2>Basic Statistics</h2>
      <div className="row">
        <div className="col-sm-12">
          <table className="table">
            <tbody>
              <tr>
                <th>Mean</th>
                <td>{round(mean(state.value))?.toString()}</td>
                <th>Variance</th>
                <td>{round(variance(state.value))?.toString()}</td>
                <th>Standard deviation</th>
                <td>{round(standardDeviation(state.value))?.toString()}</td>
              </tr>
              <tr>
                <th>First quartile</th>
                <td>{firstQuartile(state.value)?.toString()}</td>
                <th>Median/ Second quartile</th>
                <td>{median(state.value)?.toString()}</td>
                <th>Third quartile</th>
                <td>{thirdQuartile(state.value)?.toString()}</td>
              </tr>
              <tr>
                <th>Mode</th>
                <td>{modes(state.value)?.join(", ")}</td>
                <th>Max</th>
                <td>{max(state.value)?.toString()}</td>
                <th>Min</th>
                <td>{min(state.value)?.toString()}</td>
              </tr>
              <tr>
                <th>Mid-range</th>
                <td>{midRange(state.value)?.toString()}</td>
                <th>Range</th>
                <td>{range(state.value)?.toString()}</td>
                <th>Count</th>
                <td>{state.value.length}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="row">
        <div className="col-sm-6">
          <textarea className="form-control mt-3" onChange={handleInput} rows={20} />
        </div>
        <div className="col-sm-6">
          <Chart
            options={{ xaxis: { categories: Object.keys(hist(state.value)) } }}
            series={[{ name: "Count", data: Object.values(hist(state.value)) }]}
            type="bar"
          />
        </div>
      </div>
    </div>
  );
}
