class Quote {
	static #CITE_TEXT = "[引用元]";
	static #instance = null;

	static init() {
		Quote.#instance = new Quote();
		if (document.readyState !== "loading") {
			exec();
		} else {
			document.addEventListener("DOMContentLoaded", () => {
				exec();
			});
		}

		function exec() {
			Quote.#instance.#adjustAnchors();
			Quote.#instance.#addCiteInfos();
		}
	}


	/* 引用情報を表示します。 */
	#addCiteInfos() {
		for (const target of document.getElementsByTagName("blockquote")) {
			addCiteInfo(target);
		}

		function addCiteInfo(blockquote) {
			if(!blockquote.cite) {
				return;
			}

			const cite = document.createElement("cite");
			cite.className = "info";
			const a = document.createElement("a");
			a.href = blockquote.cite;
			a.target = "_parent";
			a.append(Quote.#CITE_TEXT);
			const span = document.createElement("span");
			span.className = "url";
			span.append(` : ${blockquote.cite}`);

			cite.appendChild(a);
			cite.appendChild(span);
			blockquote.parentNode.insertBefore(cite, blockquote);
		}
	}

	// a 要素の href 属性を調整。
	#adjustAnchors() {
		for (const target of document.getElementsByTagName("blockquote")) {
			for (const anchor of document.getElementsByTagName("a")) {
				adjustAnchor(anchor, target);
			}
		}

		function adjustAnchor(anchor, blockquote) {
			const cite = blockquote.getAttribute("cite");
			const href = anchor.getAttribute("href");

			if (!cite && !href) {
				return;
			}

			const citeUrl = new URL(cite);
			const hrefUrl = new URL(href, cite);
			if (!isSamePage(hrefUrl, citeUrl) || !isIdInDoc(hrefUrl)) {
				anchor.href = hrefUrl.toString();
				anchor.target = "_parent";
			} else {
				anchor.href = hrefUrl.hash;
				anchor.target = "_self";
			}
		}

		function isSamePage(urlX, urlY) {
			return urlX.origin === urlY.origin
				&& urlX.pathname === urlY.pathname
				&& urlX.search === urlY.search;
		}

		function isIdInDoc(url) {
			const id = /#(.*)/.exec(url.hash)?.[1] || null;
			return document.getElementById(id) !== null;
		}

		/* URL が絶対 URL かを判定。
		JavaScript 標準の URL は相対から絶対へ解決可能だが相対 URL を持てない。
		そのため、下記ではややまわりくどい解決策を取っている…。
		 - https://github.com/whatwg/url/issues/531 */
		function isAbsUrl(urlStr) {
			return new URL(urlStr, "dummy://dummy/").protocol !== "dummy:";
		}
	}
}

Quote.init();
