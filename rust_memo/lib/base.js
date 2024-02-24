class Base {
	static #instance = null;

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
			Base.#instance.#setupBlockquotes();
		});
	}

	static insertTitle() {
		Base.#getCurrentScript().parentNode.append(document.title);
	}

	static #getCurrentScript() {
		const scripts = document.getElementsByTagName("script");
		return scripts[scripts.length - 1];
	}

	static #createScriptElement(src) {
		const result = document.createElement("script");
		result.src = src;
		return result;
	}

	static #createGtagJs(src) {
		const url = "https://www.googletagmanager.com/gtag/js?id=G-X01B3QVSC1";
		const result = Base.#createScriptElement(url);
		result.async = true;
		return result;
	}
	
	#setupViewport() {
		const meta = document.createElement("meta");
		meta.name = "viewport";
		meta.content = "width=device-width,initial-scale=1,minimum-scale=1";
		document.head.insertBefore(meta, document.head.firstElement);
	}

	#setupGoogleAnalytics() {
		const scriptHolder = Base.#getCurrentScript().parentNode;
		scriptHolder.append(Base.#createGtagJs());
		window.dataLayer = window.dataLayer || [];
		function gtag(){dataLayer.push(arguments);}
		gtag('js', new Date());
		gtag('config', 'G-X01B3QVSC1');
	}

	/* Chrome は XHTML と ES Module の組合せに未対応のため自前でロード。
	 - https://issues.chromium.org/issues/40518469 */
	#setupScripts() {
		const scriptHolder = Base.#getCurrentScript().parentNode;
		const navJs = Base.#createScriptElement("lib/nav/nav.js");
		const prismJs = Base.#createScriptElement("lib/prism/prism.js");
		prismJs.addEventListener("load", this.#setupPrismJs.bind(this));
		scriptHolder.append(navJs, prismJs);
	}

	/* Prism.js の tabindex の自動設定を無効化。
	 - https://github.com/PrismJS/prism/issues/3658 */
	#setupPrismJs() {
		Prism.hooks.add("complete", (env) => {
			env.element.parentElement.removeAttribute("tabindex");
		});
	}

	/* ブロックコードをフォーカス可能に設定。*/
	#setupCodes() {
		const selector = "pre > code:only-child, pre > samp:only-child";
		for (const target of document.querySelectorAll(selector)) {
			target.setAttribute("tabindex", 0);
		}
	}

	/* blockquote 要素内の a 要素の href 属性を調整。*/
	#setupBlockquotes() {
		const selector = "blockquote";
		for (const target of document.querySelectorAll(selector)) {
			for (const anchor of target.getElementsByTagName("a")) {
				adjustAnchor(anchor, target);
			}
		}

		function adjustAnchor(anchor, blockquote) {
			const cite = blockquote.getAttribute("cite");
			const href = anchor.getAttribute("href");
			if (cite && href && !isAbsUrl(href)) {
				anchor.href = (new URL(href, cite)).toString();
			}
		}

		/* URL が絶対かを判定。
		JavaScript 標準の URL は相対から絶対へ解決可能だが相対 URL を持てない。
		そのため、下記ではややまわりくどい解決策を取っている…。
		 - https://github.com/whatwg/url/issues/531 */
		function isAbsUrl(urlStr) {
			return new URL(urlStr, "dummy://dummy/").protocol !== "dummy:";
		}
	}
}

Base.init();
