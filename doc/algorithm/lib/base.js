"use strict";

{
	// このサイトの管理用の基本クラス。
	class Base {
		static #instance = null;

		// このインスタンスを初期化。
		static init() {
			if (Base.#instance) {
				throw new Error;
			}

			Base.#instance = new Base();
			Base.#instance.#setupViewport();
			Base.#instance.#setupScripts();
			document.addEventListener("DOMContentLoaded", () => {
				Base.#instance.#setupFocusableElements();
				Base.#instance.#setupKatex();
			});
		}

		// 現在実行中のスクリプトの直後にタイトルを追加。
		static insertTitle() {
			document.currentScript.parentNode.append(document.title);
		}
		
		// ビューポートを設定。
		#setupViewport() {
			const meta = document.createElement("meta");
			meta.name = "viewport";
			meta.content = "width=device-width,initial-scale=1,minimum-scale=1";
			document.head.insertBefore(meta, document.head.firstElementChild);
		}

		/* Chrome は XHTML と ES Module の組合せに未対応のため自前でロード。
		 - https://issues.chromium.org/issues/40518469 */
		#setupScripts() {
			const scriptHolder = document.currentScript.parentNode;
			import("../../../lib/nav/nav.js");
		}

		#setupKatex() {
			window.renderMathInElement(document.body, {output: "mathml"});
		}

		#setupFocusableElements() {
			for (const target of document.querySelectorAll("div.math, div.cmpFigure")) {
				target.tabIndex = 0;
				target.addEventListener("pointerdown", _ => {
					math.focus();
					event.preventDefault();
				});
			}
		}
	}

	window.Base = Base;
}

Base.init();

