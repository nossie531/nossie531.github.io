"use strict";

{
	/* -- スクリプトのロード --
	 - Chrome のバグで XML 形式からは import 宣言が無効 (import 構文は有効)
	 - https://issues.chromium.org/issues/40518469 */
	import("../../../lib/quote.js");
	import("../../../lib/prism/prism.js").then(() => setupPrismJs());

	// このサイトの管理用の基本クラス。
	class Base {
		static #instance = null;

		// このインスタンスを初期化。
		static init() {
			if (Base.#instance) {
				throw new Error;
			}

			Base.#instance = new Base();
			Base.#instance.#setupGoogleAnalytics();
			document.addEventListener("DOMContentLoaded", () => {
				Base.#instance.#setupCodes();
				Base.#instance.#setupIframes();
			});
		}
		
		/* コードブロックをフォーカス可能に設定。*/
		#setupCodes() {
			const selector = "pre > code:only-child, pre > samp:only-child";
			for (const target of document.querySelectorAll(selector)) {
				target.setAttribute("tabindex", 0);
			}
		}

		// Google Analytics との連携を設定。
		#setupGoogleAnalytics() {
			const gtagId = "G-X01B3QVSC1";
			window.gtag = gtag;
			window.dataLayer = window.dataLayer || [];
			setGtagJs();
			setDataLayer();

			function setGtagJs() {
				const scriptHolder = document.currentScript.parentNode;
				const script = document.createElement("script");
				script.src = `https://www.googletagmanager.com/gtag/js?id=${gtagId}`;
				script.async = true;
				scriptHolder.append(script);
			}

			function setDataLayer() {
				gtag("js", new Date());
				gtag("config", gtagId);
			}

			function gtag() {
				window.dataLayer.push(arguments);
			}
		}

		/* iframe の高さを内容に依存するよう設定。
		 - 欠陥: 印刷時の倍率指定が等倍以外だとレイアウトが崩れる。
		 - 欠陥: 印刷時のメディアクエリの変化に追随できない。
		 - 後者の制限は印刷系イベントの活用で迂回できる。*/
		#setupIframes() {
			const observer = new ResizeObserver(onResize);
			const iframes = document.querySelectorAll("iframe.autoHeight");
			for (const iframe of iframes) {
				Util.afterIframeLoaded(iframe, onDomLoaded);
			}

			function onDomLoaded(iframe) {
				adjustIframeHeight(iframe);
				observer.observe(iframe.contentDocument.documentElement);
			}

			function onResize(entries) {
				for (const entry of entries) {
					const iframe = entry.target.ownerDocument.defaultView.frameElement;
					adjustIframeHeight(iframe);
				}
			}

			function adjustIframeHeight(iframe) {
				const root = iframe.contentDocument.documentElement;
				const height = Math.ceil(root.getBoundingClientRect().height);
				iframe.style.height = height + "px";
			}
		}
	}

	// ユーティリティクラス。
	class Util {
		// iframe のロード後にコールバックを設定。
		static afterIframeLoaded(iframe, callback) {
			const exec = () => callback(iframe);
			if (Util.#isIframeLoading(iframe)) {
				iframe.contentWindow.addEventListener("DOMContentLoaded", exec, true);
			} else {
				exec();
			}
		}

		/* iframe が内容をロード中かを取得。
		 - Chrome や Firefox は iframe の初期状態でダミー文書を持つ。
		 - https://issues.chromium.org/issues/41443865 */
		static #isIframeLoading(iframe) {
			const doc = iframe.contentDocument;
			const isLoading = doc.readyState === "loading";
			const isDummyDoc = doc.body.children.length === 0;
			return isLoading || isDummyDoc;
		}
	}

	/* Prism.js の tabindex の自動設定を無効化。
	 - https://github.com/PrismJS/prism/issues/3658 */
	function setupPrismJs() {
		Prism.hooks.add("complete", (env) => {
			env.element.parentElement.removeAttribute("tabindex");
		});
	}

	Base.init();
}

