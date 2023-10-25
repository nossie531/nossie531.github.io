"use strict";

// ナビゲーションを管理するクラスです。
class Nav {

	static #openText = "[≡]";
	static #closeText = "[×]";

	#elements = {
		root: this.#createRoot(),
		head: this.#createHead(),
		toggleLink: this.#createToggleLink(Nav.#openText),
		pageTopLink: this.#createPageTopLink("[▲]"),
		upLink: this.#createRelatedLink("up", "[↑]"),
		prevLink: this.#createRelatedLink("prev", "[←]"),
		nextLink: this.#createRelatedLink("next", "[→]"),
	};

	// 起動。
	static exec() {
		const nav = new Nav;
		if (document.readyState !== "loading") {
			nav.#setup();
		} else {
			document.addEventListener("DOMContentLoaded", () => nav.#setup());
		}
	}

	// 各要素を設定。
	#setup() {
		this.#setupHeaderIds(document.body, "header");
		this.#buildElements();
		this.#setupToggleAction();
		this.#setupRelatedLinks();
		this.#setupScrollAction();

		const fstSection = document.getElementsByTagName("section")[0];
		if (fstSection) {
			fstSection.before(this.#elements.root);
		} else {
			document.body.appendChild(this.#elements.root);
		}
	}

	// 全セクションのヘッダ要素に ID を設定。
	#setupHeaderIds(element, contextId) {
		let sectionId = 0;
		for (const section of this.#getCapSections(element)) {
			const secHeader = section.firstElementChild;
			secHeader.id = secHeader.id || contextId + "-" + sectionId++;
			this.#setupHeaderIds(section, secHeader.id);
		}
	}

	// トグルボタン押下時の動作を設定。
	#setupToggleAction() {
		this.#elements.toggleLink.addEventListener("click", () => {
			const isOpened = this.#elements.root.classList.contains("open");
			this.#elements.root.classList.toggle("open");
			this.#elements.toggleLink.textContent = !isOpened ? Nav.#closeText : Nav.#openText;
		});
	}

	// スクロール時の動作を設定。
	#setupScrollAction() {
		const indexElm = this.#elements.root.querySelector("ul.index");
		const sections = Array.from(document.getElementsByTagName("section"));
		window.addEventListener("scroll", () => scrollCallback.call(this));
		scrollCallback.call(this);

		function scrollCallback() {
			updateUpOrTopLink.call(this);
			if (indexElm) {
				updateIndexHighlight();
			}
		}

		function isInView(elm) {
			const bcr = elm.getBoundingClientRect();
			return bcr.bottom >= 0 && bcr.top <= window.innerHeight;
		}

		function isFirstView(elm) {
			const prev = elm.previousElementSibling;
			if (prev?.tagName === "section") {
				return !isInView(prev) && isInView(elm);
			} else {
				const bcr = elm.getBoundingClientRect();
				return bcr.top <= 0 && bcr.bottom >= 0;
			}
		}

		function getSectionRange() {
			const maxIndex = sections.findLastIndex(isInView);
			const fstIndex = sections.slice(0, maxIndex + 1).findLastIndex(isFirstView);
			const minIndex = maxIndex < 0 ? - 1 : Math.max(0, fstIndex);
			return { isEmpty: maxIndex < 0, min: sections[minIndex], max: sections[maxIndex] };
		}

		function getAnchorElmFromSectionElm(sectionElm) {
			const headerElm = sectionElm.querySelector("h1");
			return indexElm.querySelector(`a[href=\"#${headerElm.id}\"]`);
		}

		function updateUpOrTopLink() {
			const atPageTop = document.documentElement.scrollTop === 0;
			this.#elements.upLink.classList.toggle("none", !atPageTop);
			this.#elements.pageTopLink.classList.toggle("none", atPageTop);
		}

		function updateIndexHighlight() {
			const sectionRange = getSectionRange();
			if (sectionRange.isEmpty) {
				indexElm.style.backgroundImage = "transparent";
			} else {
				const anchorMin = getAnchorElmFromSectionElm(sectionRange.min);
				const anchorMax = getAnchorElmFromSectionElm(sectionRange.max);
				const baseTop = indexElm.getBoundingClientRect().top;
				const hlMin = anchorMin.getBoundingClientRect().top - baseTop;
				const hlMax = anchorMax.getBoundingClientRect().bottom - baseTop;
				const colors = { st: "transparent", hl: "var(--nav-hl-color)" };
				const stops = [
					{ color: colors.st, position: `0%` },
					{ color: colors.st, position: `calc(${Math.round(hlMin)}px - 0.2em)` },
					{ color: colors.hl, position: `calc(${Math.round(hlMin)}px)` },
					{ color: colors.hl, position: `calc(${Math.round(hlMax)}px)` },
					{ color: colors.st, position: `calc(${Math.round(hlMax)}px + 0.2em)` },
					{ color: colors.st, position: `100%` },
				];
				const grad = stops.map((x) => `${x.color} ${x.position}`).join(",");
				indexElm.style.backgroundImage = `linear-gradient(${grad})`;
			}
		};
	}

	// 要素を組み立て。
	#buildElements() {
		const e = this.#elements;
		e.root.append(e.head);
		e.head.append(e.prevLink, e.nextLink, e.upLink, e.pageTopLink, e.toggleLink);
		e.root.append(this.#createIndex(document.body));
	}

	// ルート要素を生成。
	#createRoot() {
		const result = document.createElement("nav");
		result.classList.add("forPage");
		return result;
	}

	// ヘッダ要素を生成。
	#createHead() {
		const result = document.createElement("div");
		result.classList.add("head");
		return result;
	}

	// ナビゲーションの表示切替のためのリンク要素を生成。
	#createToggleLink(text) {
		const result = document.createElement("a");
		result.classList.add("toggle");
		result.href = "javascript:;";
		result.append(text);
		return result;
	}

	// ページ先頭へのリンク要素を生成。
	#createPageTopLink(text) {
		const result = document.createElement("a");
		result.href = location.href.replace(/#.*/, "");
		result.append(text);
		result.addEventListener("click", () => {
			document.documentElement.scrollTo({left: 0, top: 0, behavior: "smooth"});
			history.pushState(null, null, location.href.replace(/#.*/, ""));
			event.preventDefault();
		});

		return result;
	}

	// 関連ページへのリンク要素を生成。
	#createRelatedLink(className, text) {
		const result = document.createElement("a");
		result.classList.add(className);
		result.append(text);
		return result;
	}

	// 目次要素を生成。
	#createIndex(element) {
		const sections = this.#getCapSections(element);
		if (sections.length === 0) {
			return document.createDocumentFragment();
		}

		const ul = document.createElement("ul");
		for (const section of sections) {
			const secHeader = section.firstElementChild;
			const secChildren = this.#createIndex(section);
			ul.append(this.#createIndexEntry(secHeader, secChildren));
		}

		ul.classList.toggle("index", element.tagName === "body");
		return ul;
	}

	// 目次の項目を一つ作成します。
	#createIndexEntry(header, children) {
		const li = document.createElement("li");
		const a = document.createElement("a");
		const vChildren = children || document.createDocumentFragment();
		a.href = "#" + header.id;
		a.innerHTML = header.innerHTML;
		li.append(a, vChildren);
		return li;
	}

	// 指定した要素の子孫から代表となるセクションを取得。
	#getCapSections(element) {
		const result = [];
		const tw = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);

		tw.nextNode();
		for (let elm = tw.nextNode(); elm;) {
			const isSection = elm.tagName === "section";
			const hasH1 = elm.firstElementChild?.tagName === "h1";
			result.push(...(isSection && hasH1 ? [elm] : []))
			elm = isSection ? tw.nextSibling() : tw.nextNode();
		}

		return result;
	}

	// 関連リンクを設定。
	async #setupRelatedLinks() {
		const indexUrl = new URL("index.xhtml", document.URL);
		const indexDoc = await Nav.#fetchXhtml(indexUrl.toString());
		if (indexUrl.toString() !== (new URL(document.URL).toString())) {
			this.#elements.upLink.href = indexUrl.toString();
			setAnchorHref(this.#elements.prevLink, findOffsetUrl(document.URL, -1));
			setAnchorHref(this.#elements.nextLink, findOffsetUrl(document.URL, +1));
		}

		function setAnchorHref(anchor, url) {
			if (url) {
				anchor.href = url.toString();
			}
		}

		function findOffsetUrl(href, offset) {
			if (!indexDoc || !href) {
				return null;
			}

			const anchors = Array.from(indexDoc.getElementsByTagName("a"));
			const currIndex = anchors.findIndex(x => x.href === document.URL);
			return anchors[currIndex + offset]?.href || null;
		}
	}

	// XHTML 文書のロード。
	static async #fetchXhtml(url) {
		const response = await fetch(url);
		const text = await response.text();
		return (new DOMParser()).parseFromString(text, "application/xhtml+xml");
	}
}

Nav.exec();
