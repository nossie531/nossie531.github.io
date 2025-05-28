"use strict";

{
	/* -- スクリプトのロード --
	 - Chrome のバグで XML 形式からは import 宣言が無効 (import 構文は有効)
	 - https://issues.chromium.org/issues/40518469 */
	import("./doc_nav/nav.mjs");
	import("./doc_quote/quote.mjs");

	// 文書表示用の基本クラスです。
	class Doc {
		static #instance = null;

		static {
			window.Doc = Doc;
			this.#instance = new Doc();
			this.#instance.#setupViewport();
		}
	
		// 現在実行中の引用を完了します。
		static endQuote() {
			const docQuote = document.currentScript.parentNode;
			const ceRegistry = window.customElements;
			const docQuoteDefined = !!ceRegistry.get("doc-quote");
			if (docQuoteDefined) {
				docQuote.endQuote();
			} else {
				ceRegistry.whenDefined("doc-quote").then(_ => {
					docQuote.endQuote();
				});
			}
		}
		
		// ビューポートを設定します。
		#setupViewport() {
			const meta = document.createElement("meta");
			meta.name = "viewport";
			meta.content = "width=device-width,initial-scale=1,minimum-scale=1";
			document.head.insertBefore(meta, document.head.firstElementChild);
		}
	}

	// 題名を表示するための要素です。
	class DocTitle extends HTMLElement {
		static {
			customElements.define("doc-title", this);
		}

		constructor() {
			super();
		}
	
		// オーバーライド。
		connectedCallback() {
			this.append(document.title);
		}
	}
}

