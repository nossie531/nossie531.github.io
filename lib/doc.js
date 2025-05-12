"use strict";

{
	/* -- スクリプトのロード --
	 - Chrome のバグで XML 形式からは import 宣言が無効 (import 構文は有効)
	 - https://issues.chromium.org/issues/40518469 */
	import("./nav/nav.js");

	const XML_NS = "http://www.w3.org/XML/1998/namespace";
	const HTML_NS = "http://www.w3.org/1999/xhtml";

	// 文書表示用の基本クラスです。
	class Doc {
		static #instance = null;

		static {
			window.Doc = Doc;
			this.#instance = new Doc();
			this.#instance.#setupViewport();
		}

		// 現在実行中のスクリプトの直後にタイトルを追加します。
		static insertTitle() {
			document.currentScript.parentNode.append(document.title);
		}
		
		// ビューポートを設定します。
		#setupViewport() {
			const meta = document.createElement("meta");
			meta.name = "viewport";
			meta.content = "width=device-width,initial-scale=1,minimum-scale=1";
			document.head.insertBefore(meta, document.head.firstElementChild);
		}
	}

	// 文書引用のための要素です。
	class DocQuote extends HTMLElement {
		static #INFO_TEXT = "引用元";

		static {
			customElements.define("doc-quote", this);
		}

		#body = null;
		#info = null;

		constructor() {
			super();
		}

		// オーバーライド。
		async connectedCallback() {
			this.#setupElements();
			this.#loadQuote();
		}

		// src 属性を取得します。
		get src() {
			const val = this.getAttribute("src");
			return val ? URL.parse(val, location.href)?.toString() || val : null;
		}

		// blockquote 要素を取得します。
		get #quote() {
			return this.#body?.getElementsByTagName("blockquote")?.[0] || null;
		}

		// 既定のスタイルシート URL を取得します。
		get #defaultStyleUrl() {
			return new URL("../style/quote.css", Util.scriptUrl);
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
			this.#body = this.#createBody();
			this.#info = this.#createInfo();
			this.attachShadow({mode: "open"});
			this.shadowRoot.append(this.#info, this.#body);
		}

		// 本体要素を作成します。
		#createBody() {
			return document.createElement("div");
		}

		// 情報要素を作成します。
		#createInfo() {
			const self = this;
			const result = document.createElement("div");
			const button = document.createElement("button");
			result.classList.add("info");
			result.append(button);
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

		// 言語属性を取込ます。
		#importLang(srcDoc) {
			const roots = [document.documentElement, document.body];
			const langs = roots.map(x => x.getAttributeNS(XML_NS, "lang"));
			const lang = langs.filter(x => !!x).at(-1);
			if (lang) {
				this.#body.setAttributeNS(XML_NS, "lang", lang);
			}
		}

		// 引用情報を取込ます。
		#importCite(srcDoc) {
			const srcQuote = srcDoc.getElementsByTagName("blockquote")[0];

			if (srcQuote.dataset.time) {
				const dstDate = document.createElement("time");
				dstDate.append(srcQuote.dataset.time);
				this.#info.append(dstDate);
			}

			if (srcQuote.cite) {
				const dstAnchor = document.createElement("a");
				dstAnchor.href = srcQuote.cite;
				dstAnchor.append(srcQuote.cite);
				this.#info.append(dstAnchor);
			}
		}

		// スタイルを取込ます。
		#importStyles(srcDoc) {
			const dstRules = [];
			const dstStyle = document.createElement("style");
			dstRules.push(`@import url("${this.#defaultStyleUrl}");`);
			for (const srcLink of srcDoc.querySelectorAll("link[rel=\"stylesheet\"]")) {
				dstRules.push(`@import url("${srcLink.href}");`);
			}
			dstStyle.innerHTML = dstRules.join("\n");
			this.shadowRoot.prepend(dstStyle);
		}
	
		// スクリプトを取込ます。
		#importScripts(srcDoc) {
			const dstRules = [];
			for (const script of srcDoc.querySelectorAll("script[src]")) {
				const newScript = document.createElement("script");
				newScript.src = URL.parse(script.src, this.src);
				this.append(newScript);
			}
		}

		// 要素を取込ます。
		#importElements(srcDoc) {
			this.#body.append(Util.cloneContentsRange(srcDoc.body));
		}

		// アンカーのリンクを調整します。
		#adjustAnchors() {
			const self = this;
			for (const anchor of this.querySelectorAll("a[href]")) {
				adjustAnchor(anchor);
			}

			function adjustAnchor(anchor) {
				const hrefUrl = Url.parse(anchor.getAttribute("href"));
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

		// 引用対象をロードします。
		async #loadQuote() {
			const srcDoc = await this.#fetchQuote();
			this.#importLang(srcDoc);
			this.#importStyles(srcDoc);
			this.#importScripts(srcDoc);
			this.#importCite(srcDoc);
			this.#importElements(srcDoc);
			this.#adjustAnchors();
		}

		// 引用対象を取得します。
		async #fetchQuote() {
			if (!this.src) {
				const result = Util.createHtml(Util.cloneContentsRange(this));
				const cite = result.getElementsByTagName("blockquote")[0]?.cite;
				Util.resolveUrls(result, "a", "href", cite);
				return result;
			} else {
				const result = await Util.fetchXhtml(new URL(this.src));
				const cite = result.getElementsByTagName("blockquote")[0]?.cite;
				Util.resolveUrls(result, "link", "href", this.src);
				Util.resolveUrls(result, "script", "src", this.src);
				Util.resolveUrls(result, "img", "src", this.src);
				Util.resolveUrls(result, "a", "href", cite);
				return result;
			}
		}
	}

	// ユーティリティクラスです。
	class Util {
		static #scriptUrl = null;

		static {
			this.#scriptUrl = URL.parse(document.currentScript.src);
		}

		// このスクリプトの URL を取得します。
		static get scriptUrl() {
			return this.#scriptUrl;
		}

		// 二つの URL が同じページのものかを確認します。
		static isSamePage(urlX, urlY) {
			return urlX && urlY
				&& urlX.origin === urlY.origin
				&& urlX.pathname === urlY.pathname
				&& urlX.search === urlY.search;
		}

		// 点が矩形に包含されるかを確認します。
		static inRect(p, r) {
			const xOk = p.x >= r.left && p.x <= r.right;
			const yOk = p.y >= r.top && p.y <= r.bottom;
			return xOk && yOk;
		}

		// URL からハッシュの ID を取得します。
		static idFromUrl(url) {
			if (!url) {
				return null;
			}

			return /#(.*)/.exec(url.hash)?.[1] || null;
		}

		// 要素の内容を含んだ範囲をクローンします。
		static cloneContentsRange(elm) {
			const result = document.createRange();
			result.selectNodeContents(elm);
			return result.cloneContents();
		}

		// HTML 文書を生成します。
		static createHtml(contents) {
			const impl = document.implementation;
			const doctype = impl.createDocumentType("html", null, null);
			const result = impl.createDocument(HTML_NS, "html", doctype);
			const head = result.createElement("head");
			const body = result.createElement("body");
			result.documentElement.append(head);
			result.documentElement.append(body);
			body.append(contents);
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
}

