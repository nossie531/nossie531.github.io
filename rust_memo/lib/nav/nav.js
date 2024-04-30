"use strict";

{
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
			const setupNav = nav.#setupNav.bind(nav);
			Nav.#setupHeaderIds();
			Util.addCallbackOnDomLoaded(setupNav);
		}

		// nav 要素の設定。
		async #setupNav() {
			this.#buildElements();
			this.#setupToggleAction();
			this.#setupScrollAction();
			await this.#setupRelatedLinks();

			const fstSection = document.getElementsByTagName("section")[0];
			if (fstSection) {
				fstSection.before(this.#elements.root);
			} else {
				document.body.appendChild(this.#elements.root);
			}
		}

		// 関連リンクを設定。
		async #setupRelatedLinks() {
			const indexUrl = new URL("index.xhtml", document.URL);
			const indexDoc = await Util.fetchXhtml(indexUrl.toString());
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
			const sections = getH1Sections();
			const indexElm = this.#elements.root.querySelector("ul.index");
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

			function getH1Sections() {
				const query = "section:has(> h1), section:has(> hgroup > h1)";
				return Array.from(document.querySelectorAll(query));
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
		#createIndex(elm) {
			const sections = this.#getNavSections(elm);
			if (sections.length === 0) {
				return document.createDocumentFragment();
			}

			const ul = document.createElement("ul");
			for (const section of sections) {
				const header = Nav.#getSectionHeader(section);
				const children = this.#createIndex(section);
				ul.append(this.#createIndexEntry(header, children));
			}

			ul.classList.toggle("index", elm.tagName === "body");
			return ul;
		}

		// 目次の項目を一つ作成。
		#createIndexEntry(header, children) {
			const li = document.createElement("li");
			const a = document.createElement("a");
			const vHeader = Nav.#adjustForHeader(Util.cloneContents(header));
			const vChildren = children || document.createDocumentFragment();
			a.href = "#" + header.id;
			a.append(vHeader);
			li.append(a, vChildren);
			return li;
		}

		// 指定した要素の子孫から目次セクションを取得。
		#getNavSections(elm) {
			const result = [];
			const tw = document.createTreeWalker(elm, NodeFilter.SHOW_ELEMENT);

			for (let elm = tw.nextNode(); elm;) {
				const scElm = elm.tagName === "section" ? elm : null;
				const h1Elm = Nav.#getSectionHeader(elm);
				result.push(...(h1Elm ? [scElm] : []));
				elm = scElm ? tw.nextSibling() : tw.nextNode();
			}

			return result;
		}

		// 要素の内容をヘッダ用にカスタマイズします。
		static #adjustForHeader(elm) {
			Util.removeAnchors(elm);
			Util.trimTextNodes(elm);
			return elm;
		}

		// セクション要素の見出しを取得。
		static #getSectionHeader(elm) {
			const sectionElm = elm?.tagName === "section" ? elm : null;
			const hgroupElm = getFirstElementIf(sectionElm, "hgroup");
			return getFirstElementIf(hgroupElm || sectionElm, "h1");

			function getFirstElementIf(elm, tagName) {
				const fstElm = elm?.firstElementChild;
				return fstElm?.tagName === tagName ? fstElm : null;
			}
		}

		// 全セクションのヘッダ要素に ID を設定。
		static #setupHeaderIds() {
			const root = document.documentElement;
			const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
			const ctx = [{ elm: root, seq: null }];
			const update = (function*(){})().next.bind(generateUpdate());
			Util.addCallbackOnNewElement(update);
			Util.addCallbackOnDomLoaded(update);

			function *generateUpdate() {
				for (let curr = tw.nextNode(); curr; curr = tw.nextNode(curr)) {
					const level = getCtxLevel(curr);
					const header = Nav.#getSectionHeader(curr);
					ctx[level] = { elm: curr, seq: getSeq(curr) };
					ctx.length = level + 1;
					if (header) {
						const seqs = ctx.map(x => x.seq).filter(x => x !== null);
						header.id = header.id || "header" + seqs.join("-");
					}
				}

				if (document.readyState === "loading") {
					yield;
				} else {
					return;
				}
			}

			function getSeq(elm) {
				if (!Nav.#getSectionHeader(elm)) {
					return null;
				} else {
					const level = getCtxLevel(elm);
					const lastSibling = level < ctx.length ? ctx[level] : null;
					return typeof(lastSibling?.seq) === "number" ? lastSibling.seq + 1 : 0;
				}
			}

			function getCtxLevel(elm) {
				if (elm.parentNode === ctx.at(-1).elm) {
					return ctx.length;
				} else {
					return ctx.findLastIndex(x => x.elm.nextElementSibling === elm);
				}
			}

			function getHeaderId(header, seqs) {
				return header.id || "header" + seqs.join("-");
			}
		}
	}

	// ユーティリティクラス。
	class Util {
		// 文書のロード完了後にコールバック。
		static addCallbackOnDomLoaded(f) {
			if (document.readyState === "loading") {
				document.addEventListener("DOMContentLoaded", f);
			} else {
				f();
			}
		}

		// 新要素の検出時にコールバック。
		static addCallbackOnNewElement(f) {
			const root = document.documentElement;
			const observer = new MutationObserver(() => f());
			observer.observe(root, { childList: true, subtree: true });
		}

		// 要素の内容をクローン。
		static cloneContents(elm) {
			const range = document.createRange();
			range.selectNodeContents(elm);
			return range.cloneContents();
		}

		// 次の要素を取得します。
		static nextElement(elm) {
			let curr = elm;

			if (curr.firstElementChild) {
				return curr.firstElementChild;
			}

			for (let ctx = curr; ctx ; ctx = ctx.parentNode) {
				if (ctx.nextElementSibling) {
					return ctx.nextElementSibling;
				}
			}

			return null;
		}

		// XHTML 文書をロード。
		static async fetchXhtml(url) {
			const response = await fetch(url).catch(() => null);
			if (!response) {
				return null;
			}

			const text = await response.text();
			return (new DOMParser()).parseFromString(text, "application/xhtml+xml");
		}

		// 要素内の a 要素から href 属性を削除します。
		static removeAnchors(elm) {
			for (const a of [].values.call(elm.querySelectorAll("a"))) {
				a.removeAttribute("href");
			}
		}

		// 要素内のテキストから空白をトリムします。
		static trimTextNodes(elm) {
			const tw = document.createTreeWalker(elm, NodeFilter.SHOW_TEXT);
			while (tw.nextNode()) {
				if (tw.currentNode.previousSibling === null) {
					tw.currentNode.data = tw.currentNode.data.replace(/^\s*/, "");
				}

				if (tw.currentNode.nextSibling === null) {
					tw.currentNode.data = tw.currentNode.data.replace(/\s*$/, "");
				}
			}
		}
	}

	Nav.exec();
}
