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

		// クリックイベントを処理して要素の表示トグルを ON にします。
		function toggleOn(event) {
			button.removeEventListener("click", toggleOn);
			window.addEventListener("click", toggleOff, true);
			window.addEventListener("focus", toggleOff, true);
			self.shadowRoot.addEventListener("click", toggleOff, true);
			self.shadowRoot.addEventListener("focus", toggleOff, true);
			result.classList.add("open");
			button.tabIndex = -1;

			if (byKeyboard()) {
				focusFirstAnchor();
			}
		}

		// クリックイベントを処理して要素の表示トグルを OFF にします。
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

		// キーボード由来のクリックか判定します。
		function byKeyboard() {
			return result.querySelector("button:focus-visible") !== null;
		}

		// 最初のアンカーにフォーカスします。
		function focusFirstAnchor() {
			result.getElementsByTagName("a")[0].focus();
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

	// スタイルをロードします。
	#importHeadStyles(srcDoc) {
		const self = this;
		const stylingElms = [this.#elms.css].concat(srcDocStylingElms());
		let loadDoneCount = 0;
		stylingElms.forEach(readyForLoad);
		this.shadowRoot.prepend(Util.toDocFragment(stylingElms));

		// スタイル系要素を配列で取得します。
		function srcDocStylingElms() {
			const query = "head > :where(style, link[rel=\"stylesheet\"])";
			const elms = Array.from(srcDoc.querySelectorAll(query));
			return elms.map(elm => document.importNode(elm, true));
		}

		// スタイル系要素のロード準備をします。
		function readyForLoad(stylingElm) {
			stylingElm.addEventListener("load", updateDoneCount);
			stylingElm.addEventListener("error", updateDoneCount);
		}

		// スタイルのロード終了を記録します。
		function updateDoneCount() {
			self.#loading = ++loadDoneCount < stylingElms.length;
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

	// アンカー群のリンクを調整します。
	#adjustAnchors() {
		const self = this;
		for (const anchor of this.#elms.body.querySelectorAll("a[href]")) {
			adjustAnchor(anchor);
		}

		// アンカーのリンクを調整します。
		function adjustAnchor(anchor) {
			anchor.addEventListener("click", event => {
				const elm = getDestinationElm(anchor);
				if (elm) {
					self.#jumpTo(elm);
					event.preventDefault();
				}
			});
		}

		// 移動先の要素を取得します。
		function getDestinationElm(anchor) {
			const hrefUrl = URL.parse(anchor.getAttribute("href"));
			for (const docQuote of document.getElementsByTagName("doc-quote")) {
				const cite = docQuote.#quote.getAttribute("cite");
				const id = Util.idFromUrl(hrefUrl);
				if (!Util.isSamePage(hrefUrl, URL.parse(cite))) {
					continue;
				} else if (hrefUrl.toString() === URL.parse(cite).toString()) {
					return docQuote;
				} else {
					const target = docQuote.shadowRoot.getElementById(id);
					if (!target || target.contains(anchor)) {
						return null;
					} else {
						return target;
					}
				}
			}

			return null;
		}
	}
		
	// 指定した要素へジャンプします。
	#jumpTo(elm) {
		Util.scrollTo(elm);
		Util.reserveOnetimeAnimation(animationElm(elm), "var(--jumpAnim)");
		function animationElm(elm) {
			if (!(elm instanceof DocQuote)) {
				return elm;
			} else {
				return Util.findHeader(elm.shadowRoot) || elm;
			}
		}
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
	
	// 要素配下の最初のヘッダを取得します。
	static findHeader(elm) {
		return elm.querySelector("h1, h2, h3, h4, h5, h6");
	}

	// 要素群から文書フラグメントを作成します。
	static toDocFragment(elms) {
		const result = document.createDocumentFragment();
		result.append.apply(result, elms);
		return result;
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

	// スクロール位置を履歴に保存してスクロール。
	static scrollTo(elm) {
		window.history.pushState(null, "");
		elm.scrollIntoView();
	}

	// 一度きりのアニメーションを予約します。
	static reserveOnetimeAnimation(elm, value) {
		const attach = setAnimation.bind(null, value);
		const detach = setAnimation.bind(null, "");
		setAnimation("");
		window.requestAnimationFrame(attach);
		function setAnimation(value) {
			elm.style.animation = value;
			if (value && value !== "") {
				elm.addEventListener("animationend", detach, { once: true });
			}
		}
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
