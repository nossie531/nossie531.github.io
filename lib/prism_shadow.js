// Prism.js を Shadow DOM に適用するスクリプト。

"use strict";

{
	const curr = document.currentScript;
	import("./prism/prism.js").then(() => {
		const root = curr.parentElement.shadowRoot;
		const codes = root.querySelectorAll("code[class|=\"language\"]");
		for (const code of codes) {
			const lang = getLang(code);
			const rawText = code.textContent;
			const hlText = Prism.highlight(rawText, Prism.languages[lang], lang);
			code.innerHTML = hlText;
		}
	});
	
	function getLang(code) {
		const LANG_PFX = "language-";
		const langClass = [...code.classList].find(x => x.startsWith(LANG_PFX));
		return langClass.slice(LANG_PFX.length);
	}
}
