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
			Base.#instance.#setupGoogleAnalytics();
			Base.#instance.#setupScripts();
			document.addEventListener("DOMContentLoaded", () => {
				Base.#instance.#setupCodes();
				Base.#instance.#setupIframes();
			});
		}

		// 現在実行中のスクリプトの直後にタイトルを追加。
		static insertTitle() {
			Util.getCurrentScript().parentNode.append(document.title);
		}
		
		// ビューポートを設定。
		#setupViewport() {
			const meta = document.createElement("meta");
			meta.name = "viewport";
			meta.content = "width=device-width,initial-scale=1,minimum-scale=1";
			document.head.insertBefore(meta, document.head.firstElement);
		}

		// Google Analytics との連携を設定。
		#setupGoogleAnalytics() {
			const scriptHolder = Util.getCurrentScript().parentNode;
			scriptHolder.append(this.#createGtagJs());
			window.dataLayer = window.dataLayer || [];
			gtag('js', new Date());
			gtag('config', 'G-X01B3QVSC1');
			function gtag() {
				dataLayer.push(arguments);
			}
		}

		// Google 連携用の script 要素を構築。
		#createGtagJs(src) {
			const url = "https://www.googletagmanager.com/gtag/js?id=G-X01B3QVSC1";
			const result = this.#createScriptElement(url);
			return result;
		}

		// script 要素を構築。
		#createScriptElement(src) {
			const result = document.createElement("script");
			result.src = src;
			result.async = true;
			return result;
		}

		/* Chrome は XHTML と ES Module の組合せに未対応のため自前でロード。
		 - https://issues.chromium.org/issues/40518469 */
		#setupScripts() {
			const scriptHolder = Util.getCurrentScript().parentNode;
			const navJs = this.#createScriptElement("lib/nav/nav.js");
			const quoteJs = this.#createScriptElement("lib/quote.js");
			const prismJs = this.#createScriptElement("lib/prism/prism.js");
			prismJs.addEventListener("load", this.#setupPrismJs.bind(this));
			scriptHolder.append(navJs, quoteJs, prismJs);
		}

		/* Prism.js の tabindex の自動設定を無効化。
		 - https://github.com/PrismJS/prism/issues/3658 */
		#setupPrismJs() {
			Prism.hooks.add("complete", (env) => {
				env.element.parentElement.removeAttribute("tabindex");
			});
		}

		/* コードブロックをフォーカス可能に設定。*/
		#setupCodes() {
			const selector = "pre > code:only-child, pre > samp:only-child";
			for (const target of document.querySelectorAll(selector)) {
				target.setAttribute("tabindex", 0);
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
				iframe.style.height = root.offsetHeight + "px";
			}
		}
	}

	// ユーティリティクラス。
	class Util {
		// 現在実行中のスクリプトを取得。
		static getCurrentScript() {
			const scripts = document.getElementsByTagName("script");
			return scripts[scripts.length - 1];
		}

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

	window.Base = Base;
}

Base.init();

