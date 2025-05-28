const XML_NS = "http://www.w3.org/XML/1998/namespace";
const HTML_NS = "http://www.w3.org/1999/xhtml";

// 文書引用のための要素です。
class DocQuote extends HTMLElement {
	static #INFO_TEXT = "引用元";

	#internals = null;
	#elms = {
		css: this.#createStyleLinkElm(),
		body: this.#createBodyElm(),
		info: this.#createInfoElm()
	};

	constructor() {
		super();
		this.attachShadow({mode: "open"});
		this.#internals = this.attachInternals();
	}

	// -- override --
	async connectedCallback() {
		this.#loading = true;
		this.#setupElements();
		if (this.src) {
			const srcDoc = await this.#fetchSrc(this.src);
			this.#importSrcDoc(srcDoc);
		}
	}

	// src 属性を取得します。
	get src() {
		const val = this.getAttribute("src");
		return val ? URL.parse(val, location.href)?.toString() || val : null;
	}

	// blockquote 要素を取得します。
	get #quote() {
		return this.#elms.body?.getElementsByTagName("blockquote")?.[0] || null;
	}

	// ロード状態を設定します。
	set #loading(value) {
		this.style.display = value ? "none" : "";
		this.#internals.states[value ? "add" : "delete"]("loading");
	}

	// 引用を終了します。
	endQuote() {
		const srcDoc = this.#contentSrc();
		this.#importSrcDoc(srcDoc);
	}

	// URL の対象がページ内に存在するかを取得します。
	#hasTarget(url) {
		const id = Util.idFromUrl(url);
		const cite = this.#quote.getAttribute("cite");
		const isSamePage = Util.isSamePage(url, URL.parse(cite));
		return isSamePage && this.shadowRoot.getElementById(id) !== null;
	}

	// 要素を設定します。
	#setupElements() {
		this.shadowRoot.append(this.#elms.info, this.#elms.body);
	}

	// スタイルリンク要素を作成します。
	#createStyleLinkElm() {
		const result = document.createElement("link");
		result.rel = "stylesheet";
		result.href = new URL("quote.css", import.meta.url);
		return result;
	}

	// 本体要素を作成します。
	#createBodyElm() {
		return document.createElement("div");
	}

	// 情報要素を作成します。
	#createInfoElm() {
		const self = this;
		const result = document.createElement("div");
		const button = document.createElement("button");
		result.classList.add("info");
		result.append(button);
		button.type = "button";
		button.append(DocQuote.#INFO_TEXT);
		button.addEventListener("click", toggleOn);
		return result;

		function byFocusOperation() {
			return result.querySelector("button:focus-visible") !== null;
		}

		function toggleOn(event) {
			const byFocus = byFocusOperation();
			button.removeEventListener("click", toggleOn);
			window.addEventListener("click", toggleOff, true);
			window.addEventListener("focus", toggleOff, true);
			self.shadowRoot.addEventListener("click", toggleOff, true);
			self.shadowRoot.addEventListener("focus", toggleOff, true);
			result.classList.add("open");
			button.tabIndex = -1;

			if (byFocus) {
				focusFirstAnchor();
			}
		}

		function toggleOff(event) {
			if (result.contains(event.target) || event.target === self) {
				return;
			}

			button.tabIndex = 0;
			result.classList.remove("open");
			self.shadowRoot.removeEventListener("focus", toggleOff, true);
			self.shadowRoot.removeEventListener("click", toggleOff, true);
			window.removeEventListener("focus", toggleOff, true);
			window.removeEventListener("click", toggleOff, true);
			button.addEventListener("click", toggleOn);
		}

		function focusFirstAnchor() {
			const fstAnchor = result.getElementsByTagName("a")[0];
			fstAnchor.focus();
		}
	}

	// この要素の内容から引用文書を生成します。
	#contentSrc() {
		const template = this.getElementsByTagName("template")?.[0] || null;
		const blockquote = this.getElementsByTagName("blockquote")[0];
		const result = Util.createHtml(template?.content || null, blockquote);
		const cite = result.getElementsByTagName("blockquote")[0]?.cite;
		Util.resolveUrls(result, "a", "href", cite);
		return result;
	}

	// 引用文書を取り込みます。
	#importSrcDoc(srcDoc) {
		this.#importLang(srcDoc);
		this.#importHeadStyles(srcDoc);
		this.#importHeadScripts(srcDoc);
		this.#importCite(srcDoc);
		this.#importBlockQuotes(srcDoc);
		this.#adjustAnchors();
	}

	// 言語属性を取り込みます。
	#importLang(srcDoc) {
		const roots = [srcDoc.documentElement, srcDoc.body];
		const langs = roots.map(x => x.getAttributeNS(XML_NS, "lang"));
		const lang = langs.filter(x => !!x).at(-1);
		if (lang) {
			this.#elms.body.setAttributeNS(XML_NS, "lang", lang);
		}
	}

	// 引用情報を取り込みます。
	#importCite(srcDoc) {
		const srcQuote = srcDoc.getElementsByTagName("blockquote")[0];

		if (srcQuote.dataset.time) {
			const dstDate = document.createElement("time");
			dstDate.append(srcQuote.dataset.time);
			this.#elms.info.append(dstDate);
		}

		if (srcQuote.cite) {
			const dstAnchor = document.createElement("a");
			dstAnchor.href = srcQuote.cite;
			dstAnchor.append(srcQuote.cite);
			this.#elms.info.append(dstAnchor);
		}
	}

	// スタイルを取り込みます。
	#importHeadStyles(srcDoc) {
		const self = this;
		const dstCssElms = document.createDocumentFragment();
		const query = "head > :where(style, link[rel=\"stylesheet\"])";
		const srcCssElms = srcDoc.querySelectorAll(query);
		let loadingCount = 0;

		appendStyle(this.#elms.css);
		for (const srcCssElm of srcCssElms) {
			appendStyle(document.importNode(srcCssElm, true));
		}

		this.shadowRoot.prepend(dstCssElms);

		function appendStyle(elm) {
			dstCssElms.append(elm);
			elm.addEventListener("load", updateState);
			elm.addEventListener("error", updateState);
			loadingCount++;
		}

		function updateState() {
			loadingCount--;
			if (loadingCount === 0) {
				self.#loading = false;
			}
		}
	}

	// スクリプトを取り込みます。
	#importHeadScripts(srcDoc) {
		const dstRules = [];
		for (const script of srcDoc.querySelectorAll("script[src]")) {
			const newScript = document.createElement("script");
			newScript.src = URL.parse(script.src, this.src);
			this.append(newScript);
		}
	}

	// 引用要素を取り込みます。
	#importBlockQuotes(srcDoc) {
		for (const bqElm of srcDoc.body.querySelectorAll(":scope > blockquote")) {
			this.#elms.body.append(bqElm);
		}
	}

	// アンカーのリンクを調整します。
	#adjustAnchors() {
		const self = this;
		for (const anchor of this.#elms.body.querySelectorAll("a[href]")) {
			adjustAnchor(anchor);
		}

		function adjustAnchor(anchor) {
			const hrefUrl = URL.parse(anchor.getAttribute("href"));
			const hasTarget = self.#hasTarget(hrefUrl);
			if (!hasTarget) {
				anchor.href = hrefUrl.toString();
			} else {
				anchor.href = "javascript:;";
				anchor.addEventListener("click", () => {
					const id = Util.idFromUrl(hrefUrl);
					self.#gotoTarget(id);
				});
			}
		}
	}

	// 指定したＩＤの要素へビューを移動します。
	#gotoTarget(id) {
		const target = this.shadowRoot.getElementById(id);
		target.scrollIntoView();
	}

	// 引用対象を取得します。
	async #fetchSrc(src) {
		const result = await Util.fetchXhtml(new URL(src));
		const cite = result.getElementsByTagName("blockquote")[0]?.cite;
		Util.resolveUrls(result, "link", "href", src);
		Util.resolveUrls(result, "script", "src", src);
		Util.resolveUrls(result, "img", "src", src);
		Util.resolveUrls(result, "a", "href", cite);
		return result;
	}
}

// ユーティリティクラスです。
class Util {
	// 二つの URL が同じページのものかを確認します。
	static isSamePage(urlX, urlY) {
		return urlX && urlY
			&& urlX.origin === urlY.origin
			&& urlX.pathname === urlY.pathname
			&& urlX.search === urlY.search;
	}

	// URL からハッシュの ID を取得します。
	static idFromUrl(url) {
		if (!url) {
			return null;
		}

		return /#(.*)/.exec(url.hash)?.[1] || null;
	}

	// HTML 文書を生成します。
	static createHtml(inHead, inBody) {
		const impl = document.implementation;
		const doctype = impl.createDocumentType("html", null, null);
		const result = impl.createDocument(HTML_NS, "html", doctype);
		const head = result.createElement("head");
		const body = result.createElement("body");
		result.documentElement.append(head);
		result.documentElement.append(body);
		head.append(inHead);
		body.append(inBody);
		return result;
	}

	// 文書中の指定した種類の全ての属性値を URL を解決します。
	static resolveUrls(doc, tagName, attrName, baseUrl) {
		const elms = doc.querySelectorAll(`${tagName}[${attrName}]`);
		for (const elm of elms) {
			const oldVal = elm.getAttribute(attrName);
			const newVal = URL.parse(oldVal, baseUrl) || oldVal;
			elm.setAttribute(attrName, newVal);
		}
	}

	// XHTML 文書をロードします。
	static async fetchXhtml(url) {
		if (!url) {
			return null;
		}

		const response = await fetch(url).catch(() => null);
		if (!response?.ok) {
			return null;
		}

		const text = await response.text();
		return (new DOMParser()).parseFromString(text, "application/xhtml+xml");
	}
}

customElements.define("doc-quote", DocQuote);
