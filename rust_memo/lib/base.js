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

	#setupScripts() {
		const scriptHolder = Base.#getCurrentScript().parentNode;
		const navJs = Base.#createScriptElement("lib/nav/nav.js");
		const prismJs = Base.#createScriptElement("lib/prism/prism.js");
		prismJs.addEventListener("load", this.#setupPrismJs.bind(this));
		scriptHolder.append(navJs, prismJs);
	}

	#setupPrismJs() {
		/* Prism.js の tabindex の自動設定を無効化。
		- https://github.com/PrismJS/prism/issues/3658 */
		Prism.hooks.add("complete", (env) => {
			env.element.parentElement.removeAttribute("tabindex");
		});
	}

	#setupCodes() {
		const codes = document.querySelectorAll("pre > code:only-child, pre > samp:only-child");
		for (const code of codes) {
			code.setAttribute("tabindex", 0);
		}
	}
}

Base.init();
