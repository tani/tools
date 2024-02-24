import * as React from 'react';
import htm from 'htm';
import Chart from 'react-apexcharts';

const html = htm.bind(React.createElement)

function round(num) {
    for (let i = 0; i < 256; i++) {
        if (Math.floor(num * Math.pow(10, i)) !== 0) {
            return Math.floor(num * Math.pow(10, i+2)) / Math.pow(10, i+2);
        }
    }
}

function mean(nums) {
    if (nums.length === 0) {
        return NaN;
    } else {
        const mu = nums.reduce((p,c)=>p+c,0)/nums.length;
        return mu;
    }
}

function variance(nums) {
    if (nums.length === 0) {
        return NaN;
    } else {
        const mu = mean(nums);
        const sigma2 = nums.reduce((p,c)=>p+Math.pow(c-mu,2),0)/nums.length;
        return sigma2;
    }
}

function standardDeviation(nums) {
    if (nums.length === 0) {
        return NaN;
    } else {
        const sigma2 = variance(nums);
        const sigma = Math.sqrt(sigma2);
        return sigma;
    }
}


function max(nums) {
    if (nums.length === 0) {
        return NaN;
    } else {
        const max = Math.max(...nums);
        return max;
    }
}

function min(nums) {
    if (nums.length === 0) {
        return NaN;
    } else {
        const min = Math.min(...nums);
        return min;
    }
}

function midRange(nums) {
    if (nums.length === 0) {
        return NaN;
    } else {
        const mid = (min(nums) + max(nums)) / 2;
        return mid;
    }
}

function range(nums) {
    if (nums.length === 0) {
        return NaN;
    } else {
        const range = max(nums) - min(nums);
        return range;
    }
}

function modes(nums) {
    if (nums.length === 0) {
        return [];
    } else {
        const counts = nums.reduce((c, n) => (c[n] = (c[n] ?? 0) + 1, c), {});
        const max = Math.max(...Object.values(counts));
        const modes = Object.keys(counts).filter(k => counts[k] === max);
        return modes;
    }
}

function median(nums) {
    if (nums.length === 0) {
        return NaN;
    } else if(nums.length % 2 === 1) {
        const mid = Math.floor(nums.length / 2);
        const med = nums[mid];
        return med;
    } else {
        const mid = nums.length / 2;
        const med = (nums[mid - 1] + nums[mid]) / 2;
        return med;
    }
}

function firstQuartile(nums) {
    if (nums.length === 0) {
        return NaN;
    } else {
        const med = median(nums);
        const small = nums.filter(x => x < med);
        const q1 = median(small);
        return q1
    }
}

function thirdQuartile(nums) {
    if (nums.length === 0) {
        return NaN;
    } else {
        const med = median(nums);
        const large = nums.filter(x => x > med);
        const q3 = median(large);
        return q3
    }
}

function hist(nums) {
    if (nums.length === 0) {
        return {};
    } else {
        const counts = nums.reduce((c, n) => (c[n] = (c[n] ?? 0) + 1, c), {});
        return counts
    }
}

function split(str) {
    return str.split(/[^0-9.+-]+/).filter(x => x !== '').map(Number).filter(x => !isNaN(x))
}

export default function WordCount() {
    const [state, setState] = React.useState({ value: "" })
    const handleInput = (event) => setState({ ...state, value: split(event.target.value) })
    return html`
        <div>
            <h2>Basic Statistics</h2>
            <div className="row">
                <div className="col-sm-12">
                    <table className="table">
                        <tbody>
                            <tr>
                                <th>Mean</th>
                                <td>${round(mean(state.value))}</td>
                                <th>Variance</th>
                                <td>${round(variance(state.value))}</td>
                                <th>Standard deviation</th>
                                <td>${round(standardDeviation(state.value))}</td>
                            </tr>
                            <tr>
                                <th>First quartile</th>
                                <td>${firstQuartile(state.value)}</td>
                                <th>Median/ Second quartile</th>
                                <td>${median(state.value)}</td>
                                <th>Third quartile</th>
                                <td>${thirdQuartile(state.value)}</td>
                            </tr>
                            <tr>
                                <th>Mode</th>
                                <td>${modes(state.value)?.join(", ")}</td>
                                <th>Max</th>
                                <td>${max(state.value)}</td>
                                <th>Min</th>
                                <td>${min(state.value)}</td>
                            </tr>
                            <tr>
                                <th>Mid-range</th>
                                <td>${midRange(state.value)}</td>
                                <th>Range</th>
                                <td>${range(state.value)}</td>
                                <th>Count</th>
                                <td>${state.value.length}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="row">
                <div className="col-sm-6">
                    <textarea className="form-control mt-3" onInput=${handleInput} rows="20"></textarea>
                </div>
                <div className="col-sm-6">
                    <${Chart} options=${{xaxis: {categories: Object.keys(hist(state.value))}}} series=${[{name: "Count", data: Object.values(hist(state.value))}]} type="bar" />
                </div>
            </div>
        </div>
    `
}
