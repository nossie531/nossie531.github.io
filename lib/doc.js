"use strict";

{
	/* -- スクリプトのロード --
	 - Chrome のバグで XML 形式からは import 宣言が無効 (import 構文は有効)
	 - https://issues.chromium.org/issues/40518469 */
	import("./nav/nav.js");

	// 文書表示用の基本クラス。
	class Doc {
		static #instance = null;

		static {
			window.Doc = Doc;
			this.#instance = new Doc();
			this.#instance.#setupViewport();
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
}

