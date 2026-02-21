/**
 * 国名から国コードを逆引きする辞書を作成する
 * @param {string} locale - 'ja' や 'en' など
 * @returns {Object} { "日本": "JP", "アメリカ合衆国": "US", ... }
 */
function createCountryReverseLookup(locale = "en") {
	const displayNames = new Intl.DisplayNames([locale], {
		type: "region",
		fallback: "none", // 存在しないコードなら undefined を返す
	});

	const reverseLookup = {};
	const A = "A".charCodeAt(0);
	const Z = "Z".charCodeAt(0);

	// A-Z の2文字を総当たり
	for (let i = A; i <= Z; i++) {
		for (let j = A; j <= Z; j++) {
			const code = String.fromCharCode(i, j);
			const name = displayNames.of(code);

			// 有効な国名が取得できた場合のみ辞書に追加
			if (name !== undefined) {
				reverseLookup[name] = code;
			}
		}
	}

	return reverseLookup;
}

// 実行してJSON形式で出力
const dictJa = createCountryReverseLookup("en");
console.log(JSON.stringify(dictJa, null, 2));
