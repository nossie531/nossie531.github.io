"use strict";

{
	// ナビゲーションの管理クラス。
	class NavManager {
		#mainNav;
		#elements = {
			root: this.#createRoot(),
			head: this.#createHead(),
			toggleLink: this.#createToggleLink(NavUtil.getToggleText(true)),
			pageTopLink: this.#createPageTopLink("[▲]"),
			upLink: this.#createRelatedLink("up", "[↑]"),
			prevLink: this.#createRelatedLink("prev", "[←]"),
			nextLink: this.#createRelatedLink("next", "[→]"),
		};

		// 各要素を構築。
		constructor() {
			this.#elements.root.append(this.#elements.head);
			this.#elements.head.append(this.#elements.prevLink);
			this.#elements.head.append(this.#elements.nextLink);
			this.#elements.head.append(this.#elements.upLink);
			this.#elements.head.append(this.#elements.pageTopLink);
			this.#elements.head.append(this.#elements.toggleLink);
			this.#mainNav = new NavMaker(this.#elements.root);
		}

		// 起動。
		static exec() {
			const nav = new NavManager;
			nav.#setupToggleAction();
			nav.#setupVerticalLinks();
			nav.#setupRelatedLinks();
			nav.#setupIndexHighlight();
			nav.#startResponseObserve();
		}

		// レスポンスの監視を開始。
		#startResponseObserve() {
			const reader = new TreeStackReader(document.documentElement);
			Util.addCallbackOnPageLoading(() => {
				for (let act; act = reader.nextAction();) {
					if (!NavUtil.getSectionHeader(act.elm)) {
						continue;
					}

					if (!this.#elements.root.parentElement) {
						this.#insertMainNav();
					}

					if (act.isPushed) {
						this.#mainNav.pushElm(act.elm);
					} else {
						this.#mainNav.popElm();
					}
				}
			});
		}

		// メイン目次の組込。
		#insertMainNav() {
			const fstSection = document.getElementsByTagName("section")[0];
			if (fstSection) {
				fstSection.before(this.#elements.root);
			} else {
				document.body.append(this.#elements.root);
			}
		}

		// 縦方向移動系のリンクスタイルの更新。
		#setupVerticalLinks() {
			const self = this;
			refresh();
			window.addEventListener("scroll", refresh);
			function refresh() {
				const atPageTop = document.documentElement.scrollTop === 0;
				self.#elements.upLink.classList.toggle("none", !atPageTop);
				self.#elements.pageTopLink.classList.toggle("none", atPageTop);
			}
		}

		// トグルボタン押下時の動作を設定。
		#setupToggleAction() {
			this.#elements.toggleLink.addEventListener("click", () => {
				const isOpened = this.#elements.root.classList.contains("open");
				this.#elements.root.classList.toggle("open");
				this.#elements.toggleLink.textContent = NavUtil.getToggleText(isOpened);
			});
		}

		// 関連リンクを設定。
		#setupRelatedLinks() {
			const indexUrl = new URL("index.xhtml", document.URL);
			const promise = Util.fetchXhtml(indexUrl.toString());
			promise.then((indexDoc) => {
				if (indexUrl.toString() === (new URL(document.URL).toString())) {
					return;
				}

				const prevUrl = findOffsetUrl(indexDoc, document.URL, -1);
				const nextUrl = findOffsetUrl(indexDoc, document.URL, +1);
				this.#elements.upLink.href = indexUrl.toString();
				setAnchorHref(this.#elements.prevLink, prevUrl);
				setAnchorHref(this.#elements.nextLink, nextUrl);
			});


			function setAnchorHref(anchor, url) {
				if (url) {
					anchor.href = url.toString();
				}
			}

			function findOffsetUrl(indexDoc, href, offset) {
				if (!indexDoc || !href) {
					return null;
				}

				const anchors = Array.from(indexDoc.getElementsByTagName("a"));
				const currIndex = anchors.findIndex(x => x.href === document.URL);
				return anchors[currIndex + offset]?.href || null;
			}
		}

		// 目次にスクロールに伴うハイライトを設定。
		#setupIndexHighlight() {
			const mainNav = this.#mainNav;
			window.addEventListener("scroll", refresh);

			function refresh() {
				if (!mainNav.rootIndex) {
					return;
				}

				const sectionRange = getSectionRange(mainNav.sections);
				if (!sectionRange) {
					mainNav.rootIndex.style.backgroundImage = "transparent";
				} else {
					const anchorMin = mainNav.getAnchorFrom(sectionRange.min);
					const anchorMax = mainNav.getAnchorFrom(sectionRange.max);
					const baseTop = mainNav.rootIndex.getBoundingClientRect().top;
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
					mainNav.rootIndex.style.backgroundImage = `linear-gradient(${grad})`;
				}
			}

			function getSectionRange(sections) {
				const minIndex = getFirstViewIndex(sections);
				const maxIndex = sections.findLastIndex(Util.isInScrollY);
				return minIndex < 0 ? null : {
					min: sections[minIndex],
					max: sections[maxIndex]
				};
			}

			function getFirstViewIndex(sections) {
				const topIndex = Util.arrayWindow(sections, 2).findLastIndex(isTopView);
				return topIndex >= 0 ? topIndex : sections.findIndex(Util.isInScrollY);
			}

			function isTopView(sectionPair) {
				const currRect = sectionPair[0].getBoundingClientRect();
				const nextRect = sectionPair[1]?.getBoundingClientRect();
				const min = currRect.top;
				const max = nextRect ? nextRect.top : currRect.bottom;
				return min <= 0 && 0 <= max;
			}
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
	}

	// 目次の生成装置。
	class NavMaker {
		#target;
		#rootIndex;
		#sectionToAnchors = new Map;

		constructor(root) {
			this.#target = root;
		}

		// ルート要素。
		get rootIndex() {
			return this.#rootIndex;
		}

		// 対象セクションの配列。
		get sections() {
			return Array.from(this.#sectionToAnchors, ([key, value]) => key);
		}

		// セクションに対応するリンクを取得。
		getAnchorFrom(section) {
			return this.#sectionToAnchors.get(section);
		}

		// 文書要素のプッシュ。
		pushElm(elm) {
			if (elm.tagName !== "section") {
				return;
			}

			if (this.#target.tagName !== "ul") {
				const ul = document.createElement("ul");
				this.#target.append(ul);
				this.#target = ul;
				this.#rootIndex = this.#rootIndex || ul;
			}

			const header = NavUtil.getSectionHeader(elm);
			const title = NavUtil.createTitlePart(header);
			const li = document.createElement("li");
			const a = document.createElement("a");
			const jumpTo = NavUtil.jumpTo.bind(null, header);
			a.tabIndex = 0;
			a.href = "javascript:;"
			a.addEventListener("click", jumpTo);
			a.append(title);
			li.append(a);
			this.#target.append(li)
			this.#target = li;
			this.#sectionToAnchors.set(elm, a);
		}

		// 文書要素のポップ。
		popElm() {
			this.#target = this.#target.parentNode;
		}
	}

	// ナビゲーション関連のユーティリティ。
	class NavUtil {
		static #openText = "[≡]";
		static #closeText = "[×]";

		// タイトル部を生成。
		static createTitlePart(header) {
			const contents = Util.cloneContents(header);
			Util.removeAnchors(contents);
			Util.trimTextNodes(contents);
			return contents;
		}

		// トグルリンク用のテキストを取得。
		static getToggleText(flag) {
			return flag ? NavUtil.#openText : NavUtil.#closeText;
		}

		// セクション要素の見出しを取得。
		static getSectionHeader(elm) {
			const sectionElm = elm?.tagName === "section" ? elm : null;
			const hgroupElm = getFirstElementIf(sectionElm, "hgroup");
			return getFirstElementIf(hgroupElm || sectionElm, "h1");

			function getFirstElementIf(elm, tagName) {
				const fstElm = elm?.firstElementChild;
				return fstElm?.tagName === tagName ? fstElm : null;
			}
		}

		// 指定した要素へジャンプします。
		static jumpTo(elm) {
			Util.clearUrlHash();
			elm.scrollIntoView();
			animation("none");
			window.requestAnimationFrame(animation.bind(null, "var(--firstHighlightAnim)"));
			elm.addEventListener("animationend", animation.bind(null, ""), { once: true });

			function animation(value) {
				elm.style.animation = value;
			}
		}
	}

	// 文書ツリーのスタックリーダー。
	class TreeStackReader {
		#lastElm;
		#isPushed = true;
		#isPending = false;
		#isJustConstructed = true;

		constructor(elm) {
			this.#lastElm = elm;
		}

		// 次の動作を実行。
		nextAction() {
			if (this.#lastElm === null) {
				return null;
			}

			if (this.#isJustConstructed) {
				this.#isJustConstructed = false;
			} else if (this.#isPushed) {
				const nextElm = this.#lastElm.firstElementChild;
				this.#lastElm = nextElm || this.#lastElm;
				this.#isPushed = !!nextElm;
				this.#isPending = false;
			} else {
				const nextElm = this.#lastElm.nextElementSibling;
				const isPending = !nextElm && !Util.isLoadDone(this.#lastElm.parentElement);
				this.#lastElm = isPending ? this.#lastElm : (nextElm || this.#lastElm.parentElement);
				this.#isPushed = isPending ? this.#isPushed : !!nextElm;
				this.#isPending = isPending;
			}

			if (this.#isPending || this.#lastElm === null) {
				return null;
			} else {
				return { elm: this.#lastElm, isPushed: this.#isPushed };
			}
		}
	}

	// ユーティリティクラス。
	class Util {
		// 要素の内容をクローン。
		static cloneContents(elm) {
			const range = document.createRange();
			range.selectNodeContents(elm);
			return range.cloneContents();
		}

		// 文書のロードが完了済かを取得。
		static isDocLoadDone() {
			return document.readyState !== "loading";
		}

		// 要素のロードが完了済かを取得。
		static isLoadDone(elm) {
			if (Util.isDocLoadDone()) {
				return true;
			}

			for (let curr = elm; curr; curr = curr.parentNode) {
				if (curr.nextElementSibling) {
					return true;
				}
			}

			return false;
		}
			
		// 要素がビューポートの縦スクロール内にあるかを取得。
		static isInScrollY(elm) {
			const rect = elm.getBoundingClientRect();
			return rect.bottom >= 0 && rect.top <= window.innerHeight;
		}

		// 配列を指定サイズの重複した部分配列へと分解。
		static arrayWindow(arr, size) {
			return arr.map((_, i) => arr.slice(i, i + size));
		}

		// ページロード中のコールバックを登録。
		static addCallbackOnPageLoading(f) {
			if (Util.isDocLoadDone()) {
				f();
				return;
			}

			const observer = new MutationObserver(callback);
			const root = document.documentElement;
			const options =  { childList: true, subtree: true };
			observer.observe(root, options);

			function callback(_records, observer) {
				f();
				if (Util.isDocLoadDone()) {
					observer.disconnect();
				}
			}
		}

		// 現在の URL からハッシュ部分を削除。
		static clearUrlHash() {
			history.replaceState(null, null, " ");
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

	NavManager.exec();
}
