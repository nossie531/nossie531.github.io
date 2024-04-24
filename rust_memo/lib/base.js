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
			Base.#instance.#setupIframes();
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
		result.async = true;
		return result;
	}

	static #createGtagJs(src) {
		const url = "https://www.googletagmanager.com/gtag/js?id=G-X01B3QVSC1";
		const result = Base.#createScriptElement(url);
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
		const quoteJs = Base.#createScriptElement("lib/quote.js");
		const prismJs = Base.#createScriptElement("lib/prism/prism.js");
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

	/* iframe の高さを内容に依存するよう設定。*/
	#setupIframes() {
		const selector = "iframe.autoHeight";
		for (const target of document.querySelectorAll(selector)) {
			exec(target);
			target.addEventListener("load", () => exec(target));
			target.contentWindow.addEventListener("resize", () => exec(target));
		}

		function exec(target) {
			const root = target.contentDocument.documentElement;
			target.style.height = root.offsetHeight + "px";
		}
	}
}

Base.init();
