"use strict";

{
	/* -- スクリプトのロード --
	 - Chrome のバグで XML 形式からは import 宣言が無効 (import 構文は有効)
	 - https://issues.chromium.org/issues/40518469 */
	import("./nav/nav.js");

	// このサイトの管理用の基本クラス。
	class Doc {
		static #instance = null;

		// このインスタンスを初期化。
		static init() {
			if (Doc.#instance) {
				throw new Error;
			}

			Doc.#instance = new Doc();
			Doc.#instance.#setupViewport();
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
	}

	window.Doc = Doc;
}

Doc.init();

