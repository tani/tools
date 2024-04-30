import * as React from "react";
import Chart from "react-apexcharts";

function round(num) {
	for (let i = 0; i < 256; i++) {
		if (Math.floor(num * 10 ** i) !== 0) {
			return Math.floor(num * 10 ** (i + 2)) / 10 ** (i + 2);
		}
	}
}

function mean(nums) {
	if (nums.length === 0) {
		return Number.NaN;
	}
	const mu = nums.reduce((p, c) => p + c, 0) / nums.length;
	return mu;
}

function variance(nums) {
	if (nums.length === 0) {
		return Number.NaN;
	}
	const mu = mean(nums);
	const sigma2 = nums.reduce((p, c) => p + (c - mu) ** 2, 0) / nums.length;
	return sigma2;
}

function standardDeviation(nums) {
	if (nums.length === 0) {
		return Number.NaN;
	}
	const sigma2 = variance(nums);
	const sigma = Math.sqrt(sigma2);
	return sigma;
}

function max(nums) {
	if (nums.length === 0) {
		return Number.NaN;
	}
	const max = Math.max(...nums);
	return max;
}

function min(nums) {
	if (nums.length === 0) {
		return Number.NaN;
	}
	const min = Math.min(...nums);
	return min;
}

function midRange(nums) {
	if (nums.length === 0) {
		return Number.NaN;
	}
	const mid = (min(nums) + max(nums)) / 2;
	return mid;
}

function range(nums) {
	if (nums.length === 0) {
		return Number.NaN;
	}
	const range = max(nums) - min(nums);
	return range;
}

function modes(nums) {
	if (nums.length === 0) {
		return [];
	}

	const counts = {};
	let max = 0;

	// Count frequencies of each number and track the maximum frequency
	for (let i = 0; i < nums.length; i++) {
		const num = nums[i];
		counts[num] = (counts[num] ?? 0) + 1;
		if (counts[num] > max) {
			max = counts[num];
		}
	}

	// Find all numbers that have the maximum frequency
	const modes = [];
	for (const num in counts) {
		if (counts[num] === max) {
			modes.push(num);
		}
	}

	return modes;
}

function median(nums) {
	if (nums.length === 0) {
		return Number.NaN;
	}
	if (nums.length % 2 === 1) {
		const mid = Math.floor(nums.length / 2);
		const sorted = nums.toSorted();
		const med = sorted[mid];
		return med;
	}
	const mid = nums.length / 2;
	const sorted = nums.toSorted();
	const med = (sorted[mid - 1] + sorted[mid]) / 2;
	return med;
}

function firstQuartile(nums) {
	if (nums.length === 0) {
		return Number.NaN;
	}
	const med = median(nums);
	const small = nums.filter((x) => x < med);
	const q1 = median(small);
	return q1;
}

function thirdQuartile(nums) {
	if (nums.length === 0) {
		return Number.NaN;
	}
	const med = median(nums);
	const large = nums.filter((x) => x > med);
	const q3 = median(large);
	return q3;
}

function hist(nums) {
	if (nums.length === 0) {
		return {};
	}
	const counts = {};
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

function split(str) {
	return str
		.split(/[^0-9.+-]+/)
		.filter((x) => x !== "")
		.map(Number)
		.filter((x) => !Number.isNaN(x));
}

export default function WordCount() {
	const [state, setState] = React.useState({ value: "" });
	const handleInput = (event) =>
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
					<textarea
						className="form-control mt-3"
						onInput={handleInput}
						rows="20"
					/>
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
