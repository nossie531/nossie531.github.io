"use strict";

{
	// ナビゲーションの管理クラス。
	class NavManager {
		#mainNav;
		#subNavs = new Array;
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
			this.#mainNav = new MainNavMaker();
			this.#elements.root.append(this.#elements.head);
			this.#elements.root.append(this.#mainNav.index);
			this.#elements.head.append(this.#elements.prevLink);
			this.#elements.head.append(this.#elements.nextLink);
			this.#elements.head.append(this.#elements.upLink);
			this.#elements.head.append(this.#elements.pageTopLink);
			this.#elements.head.append(this.#elements.toggleLink);
		}

		// 起動。
		static async exec() {
			const nav = new NavManager;
			nav.#setupToggleAction();
			nav.#setupVerticalLinks();
			nav.#setupIndexHighlight();
			nav.#startResponseObserve();
			await nav.#setupRelatedLinks();
		}

		// レスポンスの監視を開始。
		#startResponseObserve() {
			const reader = new TreeStackReader(document.documentElement);
			Util.addCallbackOnPageLoading(() => {
				for (let act; act = reader.nextAction();) {
					if (act.elm.tagName === "nav" && act.elm.classList.contains("sub")) {
						if (act.isPushed) {
							const nav = act.elm;
							const nm = new SubNavMaker();
							nav.append(nm.index);
							this.#subNavs.push(nm);
						}
					} else if (NavUtil.getSectionHeader(act.elm)) {
						if (act.isPushed) {
							this.#mainNav.pushSection(act.elm);
							this.#subNavs.at(-1)?.pushSection(act.elm);
						} else {
							this.#mainNav.popSection();
							this.#subNavs.at(-1)?.popSection();
						}

						if (!act.isPushed && this.#subNavs.length > 0) {
							if (this.#subNavs.at(-1).level < 0) {
								this.#subNavs.pop();
							}
						}
					}
				}

				if (!this.#elements.root.parentElement) {
					this.#setupMainNav();
				}
			});
		}

		// メイン目次の設定。
		#setupMainNav() {
			const noHeader = document.body?.classList?.contains("noHeader");
			const fstHeader = document.getElementsByTagName("header")[0];
			if (fstHeader) {
				fstHeader.after(this.#elements.root);
			} else if (noHeader){
				document.body.prepend(this.#elements.root);
			}
		}

		// 縦方向移動系のリンクスタイルの設定。
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

		// 目次にスクロールに伴うハイライトを設定。
		#setupIndexHighlight() {
			const mainNav = this.#mainNav;
			window.addEventListener("scroll", refresh);

			function refresh() {
				if (!mainNav.index) {
					return;
				}

				const sectionRange = getSectionRange(mainNav.sections);
				if (!sectionRange) {
					mainNav.index.style.backgroundImage = "transparent";
				} else {
					const anchorMin = mainNav.getAnchorFrom(sectionRange.min);
					const anchorMax = mainNav.getAnchorFrom(sectionRange.max);
					const baseTop = mainNav.index.getBoundingClientRect().top;
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
					mainNav.index.style.backgroundImage = `linear-gradient(${grad})`;
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
				/* -- NOTE: Math.trunc の理由。
				 * これがないと、目標要素へのページ内ジャンプの完了後、判定が微妙にずれる。
				 * なぜなら、調査時点の一般的なブラウザでは、問題の操作の完了後、目標要素と
				 * ビューポート両者の上辺は完全には一致せず、1 ピクセル未満の誤差が存在する
				 * (特にスムーズスクロール時)。そのため、上側に範囲を少し広げる必要がある。*/
				return Math.trunc(min) <= 0 && 0 < Math.trunc(max);
			}

			function vsSmoothScroll(x) {
				return Math.round(x);
			}
		}

		// 関連リンクを設定。
		async #setupRelatedLinks() {
			const indexUrl = getIndexUrl();
			const indexDoc = await Util.fetchXhtml(indexUrl);
			const currUrl = new URL(document.URL);
			const prevUrl = findUrlByOffset(currUrl, -1, indexDoc);
			const nextUrl = findUrlByOffset(currUrl, +1, indexDoc);
			setAnchorHref(this.#elements.upLink, indexDoc && indexUrl);
			setAnchorHref(this.#elements.prevLink, prevUrl);
			setAnchorHref(this.#elements.nextLink, nextUrl);

			function isSamePageUrl(x, y) {
				return x.origin === y.origin
					&& x.pathname === y.pathname
					&& x.search === y.search;
			}

			function getHrefUrl(a) {
				if (!a) {
					return null;
				} else {
					return new URL(a.getAttribute("href"), indexUrl);
				}
			}

			function getIndexUrl() {
				const currUrl = new URL(document.URL);
				if (currUrl.pathname === "/") {
					return null;
				} else if (currUrl.pathname.matchAll(/\/?index.xhtml/g).next().value) {
					return new URL("../index.xhtml", document.URL);
				} else {
					return new URL("index.xhtml", document.URL);
				}
			}

			function findUrlByOffset(url, offset, indexDoc) {
				if (!indexDoc) {
					return null;
				}

				const anchors = Array.from(indexDoc.getElementsByTagName("a"));
				const currIndex = anchors.findIndex(x => isSamePageUrl(getHrefUrl(x), url));
				const targetIndex = currIndex >= 0 ? currIndex + offset : -1;
				return getHrefUrl(anchors[targetIndex]);
			}

			function setAnchorHref(anchor, url) {
				if (url) {
					anchor.href = url.toString();
				}
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

	// メイン目次の生成装置。
	class MainNavMaker {
		#index;
		#target;
		#sectionToAnchors = new Map;

		constructor() {
			this.#index = document.createElement("ul");
			this.#target = this.#index;
		}

		// ルート要素。
		get index() {
			return this.#index;
		}

		// 対象セクションの配列。
		get sections() {
			return Array.from(this.#sectionToAnchors, ([key, value]) => key);
		}

		// セクションに対応するリンクを取得。
		getAnchorFrom(section) {
			return this.#sectionToAnchors.get(section);
		}

		// セクションをプッシュ。
		pushSection(section) {
			if (this.#target.tagName !== "ul") {
				const ul = document.createElement("ul");
				this.#target.append(ul);
				this.#target = ul;
			}

			const header = NavUtil.getSectionHeader(section);
			const title = NavUtil.cloneForLinkTitle(header);
			const li = document.createElement("li");
			const a = document.createElement("a");
			NavUtil.setJump(a, header);
			a.append(title);
			li.append(a);
			this.#target.append(li)
			this.#target = li;
			this.#sectionToAnchors.set(section, a);
		}

		// セクションをポップ。
		popSection() {
			if (this.#target.tagName === "ul") {
				this.#target = this.#target.parentNode.parentNode;
			} else if (this.#target.tagName === "li") {
				this.#target = this.#target.parentNode;
			}
		}
	}

	// サブ目次の生成装置。
	class SubNavMaker {
		#index;
		#target;
		#level = 0;

		constructor() {
			this.#index = this.#createOuter();
			this.#target = this.#index;
		}

		// レベルを取得。
		get level() {
			return this.#level;
		}

		// 目次要素を取得。
		get index() {
			return this.#index;
		}

		// 文書要素のプッシュ。
		pushSection(section) {
			this.#level++;
			if (this.#level === 1) {
				const mainHeader = NavUtil.getSectionHeader(section);
				const subHeader = NavUtil.getSectionSubHeader(section);
				const mainTitle = NavUtil.cloneForLinkTitle(mainHeader);
				const subTitle = NavUtil.cloneForTextTitle(subHeader);
				const dt = document.createElement("dt");
				const dd = document.createElement("dd");
				const a = document.createElement("a");
				NavUtil.setJump(a, mainHeader);
				a.append(mainTitle);
				dt.append(a);
				dd.append(subTitle);
				this.#index.append(dt);
				this.#index.append(dd);
			}
		}

		// 文書要素のポップ。
		popSection() {
			this.#level--;
		}

		// リストの外側を生成。
		#createOuter() {
			const result = document.createElement("dl");
			result.classList.add("normal");
			result.classList.add("lowProfile");
			return result;
		}
	}

	// ナビゲーション関連のユーティリティ。
	class NavUtil {
		static #openText = "[≡]";
		static #closeText = "[×]";

		// リンクタイトル用の要素をクローン。
		static cloneForLinkTitle(elm) {
			const contents = Util.cloneContents(elm);
			Util.removeAnchors(contents);
			Util.trimTextNodes(contents);
			return contents;
		}

		// テキストタイトル用の要素をクローン。
		static cloneForTextTitle(elm) {
			const contents = Util.cloneContents(elm);
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

		// セクション要素のサブ見出しを取得。
		static getSectionSubHeader(elm) {
			const header = NavUtil.getSectionHeader(elm);
			return header.nextElementSibling;
		}

		// リンク要素にターゲット要素へのジャンプ動作を設定。
		static setJump(anchorElm, targetElm) {
			const jumpTo = NavUtil.jumpTo.bind(null, targetElm);
			anchorElm.href = "javascript:;"
			anchorElm.addEventListener("click", jumpTo);
		}

		// 指定した要素へジャンプ。
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
			if (!url) {
				return null;
			}

			const response = await fetch(url).catch(() => null);
			if (!response.ok) {
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

	NavManager.exec().then();
}
