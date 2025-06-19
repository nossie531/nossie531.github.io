"use strict";

{
	/* -- スクリプトのロード --
	 - Chrome のバグで XML 形式からは import 宣言が無効 (import 構文は有効)
	 - https://issues.chromium.org/issues/40518469 */
	import("../../../lib/prism/prism.js").then(() => setupPrismJs());

	// このサイトの管理用の基本クラス。
	class Base {
		static #instance = null;

		static {
			this.#instance = new Base();
			this.#instance.#setupGoogleAnalytics();
			document.addEventListener("DOMContentLoaded", () => {
				this.#instance.#setupCodes();
			});
		}
		
		// コードブロックをフォーカス可能に設定。
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
				gtag("config", gtagId, {cookie_domain: "auto"});
			}

			function gtag() {
				window.dataLayer.push(arguments);
			}
		}
	}

	/* Prism.js の tabindex の自動設定を無効化。
	 - https://github.com/PrismJS/prism/issues/3658 */
	function setupPrismJs() {
		Prism.hooks.add("complete", (env) => {
			env.element.parentElement.removeAttribute("tabindex");
		});
	}
}

