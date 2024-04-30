import * as React from 'react';
import htm from 'htm';
const html = htm.bind(React.createElement);

export default function WordCount() {
    const [state, setState] = React.useState({ value: "" });

    const handleInput = (event) => setState({ ...state, value: event.target.value });

    // グラフェムによる文字数のカウントを行う関数
    const countGraphemeClusters = (text) => {
        const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
        const segments = segmenter.segment(text);
        return Array.from(segments).length;
    };

    // 単語数をカウントする関数
    const countWords = (text) => {
        const segmenter = new Intl.Segmenter('en', { granularity: 'word' });
        const segments = segmenter.segment(text);
        let wordCount = 0;
        for (const {segment, isWordLike} of segments) {
            if (isWordLike) {
                wordCount++;
            }
        }
        return wordCount;
    };

    return html`
        <div>
            <h2>Word Count</h2>
            <div className="row">
                <div className="col-sm-12">
                    <table className="table">
                        <tbody>
                            <tr>
                                <th>Characters</th>
                                <td>${countGraphemeClusters(state.value)}</td>
                                <th>Words</th>
                                <td>${countWords(state.value)}</td>
                                <th>Lines</th>
                                <td>${state.value.split(/\r\n|\r|\n/).length}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="row">
                <div className="col-sm-12">
                    <textarea className="form-control mt-3" onInput=${handleInput} rows="20"></textarea>
                </div>
            </div>
        </div>
    `;
}
