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
			Quote.#instance.#addCiteInfos();
			Quote.#instance.#adjustAnchors();
		}
	}

	// 引用情報を表示。
	#addCiteInfos() {
		const quotes = document.getElementsByTagName("blockquote");
		window.addEventListener("beforeprint", () => onPrint(true));
		window.addEventListener("afterprint", () => onPrint(false));
		for (const quote of quotes) {
			addCiteInfo(quote);
		}

		function addCiteInfo(quote) {
			if(!quote.cite) {
				return;
			}

			const cite = document.createElement("cite");
			cite.className = "info";
			const a = document.createElement("a");
			a.href = quote.cite;
			a.target = "_parent";
			a.append(Quote.#CITE_TEXT);
			const span = document.createElement("span");
			span.className = "url";
			span.append(` : ${quote.cite}`);

			cite.appendChild(a);
			cite.appendChild(span);
			quote.parentNode.insertBefore(cite, quote);
		}

		function onPrint(flag) {
			for (const quote of quotes) {
				const prev = quote.previousElementSibling;
				const cite = prev.tagName === "cite" ? prev : null;
				cite?.classList?.toggle("forPrint", flag);
			}
		}
	}

	// a 要素の href 属性を調整。
	#adjustAnchors() {
		for (const quote of document.getElementsByTagName("blockquote")) {
			for (const anchor of quote.getElementsByTagName("a")) {
				adjustAnchor(anchor, quote);
			}
		}

		function adjustAnchor(anchor, quote) {
			const cite = quote.getAttribute("cite");
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
