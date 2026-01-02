export function round(num: number) {
  for (let i = 0; i < 256; i++) {
    if (Math.floor(num * 10 ** i) !== 0) {
      return Math.floor(num * 10 ** (i + 2)) / 10 ** (i + 2);
    }
  }
  return num;
}

export function mean(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  return nums.reduce((p, c) => p + c, 0) / nums.length;
}

export function variance(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  const mu = mean(nums);
  return nums.reduce((p, c) => p + (c - mu) ** 2, 0) / nums.length;
}

export function standardDeviation(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  const sigma2 = variance(nums);
  return Math.sqrt(sigma2);
}

export function max(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  return Math.max(...nums);
}

export function min(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  return Math.min(...nums);
}

export function midRange(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  return (min(nums) + max(nums)) / 2;
}

export function range(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  return max(nums) - min(nums);
}

export function modes(nums: number[]) {
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

export function median(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  const sorted = [...nums].sort((a, b) => a - b);
  if (sorted.length % 2 === 1) {
    const mid = Math.floor(sorted.length / 2);
    return sorted[mid];
  }
  const mid = sorted.length / 2;
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function firstQuartile(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return median(sorted.slice(0, mid));
}

export function thirdQuartile(nums: number[]) {
  if (nums.length === 0) {
    return Number.NaN;
  }
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.ceil(sorted.length / 2);
  return median(sorted.slice(mid));
}

export function hist(nums: number[]) {
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

export function split(value: string) {
  return value
    .split(/[^0-9.+-]+/)
    .filter((x) => x !== "")
    .map(Number)
    .filter((x) => !Number.isNaN(x));
}
