"use strict";

{
	/* -- スクリプトのロード --
	 - Chrome のバグで XML 形式からは import 宣言が無効 (import 構文は有効)
	 - https://issues.chromium.org/issues/40518469 */
	import("../../../lib/nav/nav.js");

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

		#setupKatex() {
			window.renderMathInElement(document.body, {output: "mathml"});
		}

		// フォーカス可能要素を設定。
		#setupFocusableElements() {
			// NOTE: フォーカスによりスクロール操作を素早く行えるようにしている。
			// これにより横長の内容がスクリーン範囲を超えても良いようにしている。
			for (const target of document.querySelectorAll("div.math, div.cmpFigure")) {
				target.tabIndex = 0;
				target.addEventListener("pointerdown", _ => {
					target.focus();
					event.preventDefault();
				});
			}
		}
	}

	window.Base = Base;
}

Base.init();

