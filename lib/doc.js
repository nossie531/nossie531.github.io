"use strict";

{
	/* -- スクリプトのロード --
	 - Chrome のバグで XML 形式からは import 宣言が無効 (import 構文は有効)
	 - https://issues.chromium.org/issues/40518469 */
	import("./doc_nav/nav.mjs");
	import("./doc_quote/quote.mjs");

	const Util = createUtil(); 

	// 文書表示用の基本クラスです。
	class Doc {
		static #instance = null;

		static {
			window.Doc = Doc;
			this.#instance = new Doc();
			this.#instance.#setupViewport();
			this.#instance.#setupInitialScroll();
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

		// 初期スクロール位置を設定します。
		//
		// # このメソッドの導入背景
		// - 一部のカスタム要素はサブリソースの読込後に高さが変化する。
		// - 読込前後で後続の要素の位置が唐突に変化するのは不自然である。
		// - 読込完了まで後続の要素を CSS で非表示にしてそれを予防している。
		// - この副作用で非表示中のハッシュ要素へのスクロールが無効になる。
		#setupInitialScroll() {
			if (!location.hash) {
				return;
			}

			const id = location.hash.slice(1);
			Util.waitElementLoading(id, keepScrollTry);

			function keepScrollTry() {
				const elm = document.getElementById(id);
				const notFound = Util.isPageLoaded() && !elm;
				const scrolled = window.scrollX || window.scrollY;
				if (notFound || scrolled) {
					return;
				}

				if (Util.isDisplayed(elm)) {
					elm.scrollIntoView();
					return;
				}

				window.requestAnimationFrame(keepScrollTry);
			}
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

	// 内部使用のためのユーティリティです。
	function createUtil() {
		return class {
			// ページがロード済かを取得します。
			static isPageComplete() {
				return document.readyState === "complete";
			}

			// 
			static isPageLoaded() {
				return document.readyState !== "loading";
			}

			// 要素が表示されているかを取得します。
			static isDisplayed(elm) {
				for (let cur = elm; cur; cur = cur.parentElement) {
					if (window.getComputedStyle(cur).display === "none") {
						return false;
					}
				}

				return true;
			}

			// 要素のロードを待機してコールバックします。
			static waitElementLoading(id, callback) {
				const mo = new MutationObserver(_ => {
					if (document.getElementById(id)) {
						callback();
						mo.disconnect();
					}
				});

				if (Util.isPageComplete()) {
					return;
				}

				document.addEventListener("DOMContentLoaded", _ => {
					mo.disconnect();
				});

				mo.observe(document, {
					subtree: true,
					childList: true,
					attributes: false
				});
			}
		}
	}
}

