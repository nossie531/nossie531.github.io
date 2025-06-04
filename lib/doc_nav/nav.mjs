// メインナビゲーション要素。
class DocNav extends HTMLElement {
	static #OPEN_TEXT = "[≡]";
	static #CLOSE_TEXT = "[×]";
	static #TO_HEAD_TEXT = "[▲]";
	static #UP_TEXT = "[↑]";
	static #PREV_TEXT = "[←]";
	static #NEXT_TEXT = "[→]";

	// 主処理の実行。
	static exec() {
		const instance = new DocNav();
		instance.#installThis();
	}

	#sectionStack = [];
	#sectionToAnchors = new Map;
	#elms = {
		css: NavUtil.createStyleLinkElm(),
		root: this.#createRootElm(),
		head: this.#createHeadElm(),
		index: this.#createIndexElm(),
		toggleAnchor: this.#createToggleAnchorElm(),
		toHeadAnchor: this.#createToHeadAnchorElm(),
		upAnchor: this.#createPageAnchorElm("up", DocNav.#UP_TEXT),
		prevAnchor: this.#createPageAnchorElm("prev", DocNav.#PREV_TEXT),
		nextAnchor: this.#createPageAnchorElm("next", DocNav.#NEXT_TEXT),
	};

	constructor() {
		super();
		this.attachShadow({mode: "open"});
	}

	// -- override --
	connectedCallback() {
		this.style.display = "none";
		this.#setupElements();
		this.#setupToggleAction();
		this.#setupPageAnchorSwitchAction();
		this.#setupIndexHighlightAction();
		this.#setupCssLoadingObserve();
		this.#setupDocLoadingObserve();
		this.#setupRelatedPageAnchors();
	}

	// 対象セクションの配列。
	get #sections() {
		return Array.from(this.#sectionToAnchors, ([key, value]) => key);
	}

	#getToggleText(flag) {
		return flag ? DocNav.#OPEN_TEXT : DocNav.#CLOSE_TEXT;
	}

	// ルート要素を生成。
	#createRootElm() {
		const result = document.createElement("nav");
		result.classList.add("main");
		return result;
	}

	// ヘッダ要素を生成。
	#createHeadElm() {
		const result = document.createElement("div");
		result.classList.add("head");
		return result;
	}

	// 目次要素を生成。
	#createIndexElm() {
		return document.createElement("ul");
	}

	// ナビゲーションの表示切替のためのアンカー要素を生成。
	#createToggleAnchorElm(text) {
		const result = document.createElement("a");
		result.classList.add("toggle");
		result.href = "javascript:;";
		result.append(this.#getToggleText(true));
		return result;
	}

	// ページ先頭へのアンカー要素を生成。
	#createToHeadAnchorElm(text) {
		const result = document.createElement("a");
		result.href = location.href.replace(/#.*/, "");
		result.append(DocNav.#TO_HEAD_TEXT);
		result.addEventListener("click", event => {
			document.documentElement.scrollTo({left: 0, top: 0, behavior: "smooth"});
			history.pushState(null, null, location.href.replace(/#.*/, ""));
			event.preventDefault();
		});

		return result;
	}

	// 関連ページへのアンカー要素を生成。
	#createPageAnchorElm(className, text) {
		const result = document.createElement("a");
		result.classList.add(className);
		result.append(text);
		return result;
	}

	// この要素の文書への組込。
	#installThis() {
		const self = this;
		const root = document.documentElement;
		Util.observeElmLoading(root, exit => {
			const loaded = Util.isDocLoadDone();
			const fstElm = document.body?.firstElementChild;
			if (loaded || fstElm) {
				exit();
				appendThis();
			}
		});

		function appendThis() {
			const fstElm = document.body?.firstElementChild;
			if (fstElm.tagName === "header") {
				fstElm.after(self);
			} else {
				document.body.prepend(self);
			}
		}
	}

	// 見出しを取り込みます。
	#importSectionHeaders() {
		const self = this;
		for (const section of freshSections()) {
			if (!NavUtil.getSectionHeader(section)) {
				continue;
			}

			const stackDepth = getStackDepth(section);
			const ul = reserveUlElm(stackDepth);
			const li = createLiElm(section);
			ul.append(li);

			const a = li.firstElementChild;
			this.#sectionStack.splice(stackDepth);
			this.#sectionStack.push(section);
			this.#sectionToAnchors.set(section, a);
		}

		function createLiElm(section) {
			const result = document.createElement("li");
			const header = NavUtil.getSectionHeader(section);
			const contents = NavUtil.cloneContentsForAnchor(header);
			const a = createAnchorElm(header, contents);
			result.append(a);
			return result;
		}

		function createAnchorElm(header, contents) {
			const result = document.createElement("a");
			NavUtil.setJump(result, header);
			result.append(contents);
			return result;
		}

		function freshSections() {
			const last = self.#sectionStack.at(-1);
			const sections = document.getElementsByTagName("section");
			const freshCnt = last ? Util.lastIndexOf(sections, last) : sections.length;
			return Array.prototype.slice.call(sections, -freshCnt);
		}

		function getStackDepth(section) {
			for (let anc = section.parentElement; anc; anc = anc.parentElement) {
				if (!NavUtil.getSectionHeader(section)) {
					continue;
				}
				if (self.#sectionStack.indexOf(anc) >= 0) {
					return self.#sectionStack.indexOf(anc) + 1;
				}
			}

			return 0;
		}

		function reserveUlElm(stackDepth) {
			let target = self.#elms.index;;
			for (let i = 0; i < stackDepth; i++) {
				const lastLi = target.lastElementChild;
				const lastUl = lastLi?.getElementsByTagName("ul")[0];
				if (!lastUl) {
					return target.appendChild(document.createElement("ul"));
				} else {
					target = lastUl;
				}
			}

			return target;
		}
	}

	// 各要素を設定。
	#setupElements() {
		this.shadowRoot.append(this.#elms.css);
		this.shadowRoot.append(this.#elms.root);
		this.#elms.root.append(this.#elms.head);
		this.#elms.root.append(this.#elms.index);
		this.#elms.head.append(this.#elms.prevAnchor);
		this.#elms.head.append(this.#elms.nextAnchor);
		this.#elms.head.append(this.#elms.upAnchor);
		this.#elms.head.append(this.#elms.toHeadAnchor);
		this.#elms.head.append(this.#elms.toggleAnchor);
	}

	// トグルボタン押下時の動作を設定。
	#setupToggleAction() {
		this.#elms.toggleAnchor.addEventListener("click", _ => {
			const isOpened = this.#elms.root.classList.contains("open");
			const stateText = this.#getToggleText(isOpened);
			this.#elms.root.classList.toggle("open");
			this.#elms.toggleAnchor.textContent = stateText;
		});
	}

	// ページ移動アンカーの切替動作を設定。
	#setupPageAnchorSwitchAction() {
		const self = this;
		refresh();
		window.addEventListener("scroll", refresh);
		function refresh() {
			const atPageTop = document.documentElement.scrollTop === 0;
			self.#elms.upAnchor.classList.toggle("none", !atPageTop);
			self.#elms.toHeadAnchor.classList.toggle("none", atPageTop);
		}
	}

	// 目次ハイライト時の動作を設定。
	#setupIndexHighlightAction() {
		const self = this;
		window.addEventListener("scroll", refresh);

		function refresh() {
			const sectionRange = getSectionRange(self.#sections);
			if (!sectionRange) {
				self.#elms.index.style.backgroundImage = "transparent";
			} else {
				const anchorMin = self.#sectionToAnchors.get(sectionRange.min);
				const anchorMax = self.#sectionToAnchors.get(sectionRange.max);
				const baseTop = self.#elms.index.getBoundingClientRect().top;
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
				self.#elms.index.style.backgroundImage = `linear-gradient(${grad})`;
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

	// CSS のロード監視を設定。
	#setupCssLoadingObserve() {
		this.#elms.css.addEventListener("load", _ => this.style.display = "")
		this.#elms.css.addEventListener("error", _ => this.style.display = "")
	}

	// 文書のロード監視を設定。
	#setupDocLoadingObserve() {
		const root = document.documentElement;
		Util.observeElmLoading(root, _ => this.#importSectionHeaders());
	}

	// 関連ページへのアンカーを設定。
	async #setupRelatedPageAnchors() {
		const indexUrl = getIndexUrl();
		const indexDoc = await Util.fetchXhtml(indexUrl);
		const currUrl = new URL(document.URL);
		const prevUrl = findUrlByOffset(currUrl, -1, indexDoc);
		const nextUrl = findUrlByOffset(currUrl, +1, indexDoc);
		setAnchorHref(this.#elms.upAnchor, indexDoc && indexUrl);
		setAnchorHref(this.#elms.prevAnchor, prevUrl);
		setAnchorHref(this.#elms.nextAnchor, nextUrl);

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
}

// サブナビゲーション要素。
class DocNavSub extends HTMLElement {
	#internals = null;
	#lastSection = null;
	#elms = {
		css: NavUtil.createStyleLinkElm(),
		root: this.#createRootElm(),
		index: this.#createIndexElm()
	};

	constructor() {
		super();
		this.attachShadow({mode: "open"});
		this.#internals = this.attachInternals();
	}

	// オーバーライド
	connectedCallback() {
		this.#loading = true;
		this.#setupElements();
		this.#setupCssLoadingObserve();
		this.#setupElmLoadingObserve();
	}

	// ロード状態を設定。
	set #loading(value) {
		this.style.display = value ? "none" : "";
		this.#internals.states[value ? "add" : "delete"]("loading");
	}

	// ルート要素を生成。
	#createRootElm() {
		const result = document.createElement("nav");
		result.classList.add("sub");
		return result;
	}

	// 目次要素を生成。
	#createIndexElm() {
		return document.createElement("dl");
	}

	// 見出しを取り込みます。
	#importSectionHeaders() {
		const self = this;
		const areaOwner = NavUtil.getAreaOwner(this);
		for (const section of freshSections()) {
			if (!NavUtil.getSectionHeader(section)) {
				continue;
			}
			if (NavUtil.getAreaOwner(section.parentElement) !== areaOwner) {
				continue;
			}

			const dt = createDtElm(section);
			const dd = createDdElm(section);
			this.#elms.index.append(dt, dd);
			this.#lastSection = section;
		}

		function freshSections() {
			const last = self.#lastSection;
			const sections = areaOwner.getElementsByTagName("section");
			const freshCnt = last ? Util.lastIndexOf(sections, last) : sections.length;
			return Array.prototype.slice.call(sections, -freshCnt);
		}

		function createDtElm(section) {
			const result = document.createElement("dt");
			const a = document.createElement("a");
			const header = NavUtil.getSectionHeader(section);
			const contents = NavUtil.cloneContentsForAnchor(header);
			NavUtil.setJump(a, header);
			a.append(contents);
			result.append(a);
			return result;
		}

		function createDdElm(section) {
			const result = document.createElement("dd");
			const subHeader = NavUtil.getSectionSubHeader(section);
			const contents = NavUtil.cloneContentsForText(subHeader);
			result.append(contents || "");
			return result;
		}
	}

	// 各要素を設定。
	#setupElements() {
		this.shadowRoot.append(this.#elms.css);
		this.shadowRoot.append(this.#elms.root);
		this.#elms.root.append(this.#elms.index);
	}

	// CSS のロード監視を設定。
	#setupCssLoadingObserve() {
		this.#elms.css.addEventListener("load", _ => this.#loading = false)
		this.#elms.css.addEventListener("error", _ => this.#loading = false)
	}

	// 要素のロード監視を設定。
	#setupElmLoadingObserve() {
		const areaOwner = NavUtil.getAreaOwner(this);
		Util.observeElmLoading(areaOwner, _ => this.#importSectionHeaders());
	}
}

// ナビゲーション関連のユーティリティ。
class NavUtil {
	// スタイルリンク要素を生成。
	static createStyleLinkElm() {
		const result = document.createElement("link");
		result.rel = "stylesheet";
		result.href = new URL("nav.css", import.meta.url);
		return result;
	}

	// アンカー用に要素の内容をクローン。
	static cloneContentsForAnchor(elm) {
		if (!elm) {
			return null;
		}

		const contents = Util.cloneContents(elm);
		Util.removeAnchors(contents);
		Util.trimTextNodes(contents);
		return contents;
	}

	// テキスト用に要素の内容をクローン。
	static cloneContentsForText(elm) {
		if (!elm) {
			return null;
		}

		const contents = Util.cloneContents(elm);
		Util.trimTextNodes(contents);
		return contents;
	}

	// 要素が紐づくエリア要素を取得。
	static getAreaOwner(elm) {
		return Util.findAncestor(elm, x => {
			const isBody = x === document.body;
			const hasHeader = !!NavUtil.getSectionHeader(x);
			return isBody || hasHeader;
		});
	}

	// セクション要素の見出しを取得。
	static getSectionHeader(elm) {
		const sh = Util.findSuccession(elm, ["section", "h1"]);
		const shh = Util.findSuccession(elm, ["section", "hgroup", "h1"]);
		return sh || shh || null;
	}

	// セクション要素のサブ見出しを取得。
	static getSectionSubHeader(elm) {
		const header = NavUtil.getSectionHeader(elm);
		return header.nextElementSibling;
	}

	// アンカー要素にターゲット要素へのジャンプ動作を設定。
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

// ユーティリティ。
class Util {
	// 配列を指定サイズの重複した部分配列へと分解。
	static arrayWindow(arr, size) {
		return arr.map((_, i) => arr.slice(i, i + size));
	}

	// 要素の内容をクローン。
	static cloneContents(elm) {
		const range = document.createRange();
		range.selectNodeContents(elm);
		return range.cloneContents();
	}

	// 先祖要素を辿り最初に述語を満たす要素を取得します。
	static findAncestor(elm, pred) {
		for (let curr = elm; curr; curr = curr.parentElement) {
			if (pred(curr)) {
				return curr;
			}
		}

		return null;
	}

	// 先頭子要素を辿りそのタグが指定順なら最後の要素を取得します。
	static findSuccession(elm, tagNames) {
		let seq = 0;
		for (let curr = elm; curr; curr = curr.firstElementChild) {
			if (curr.tagName !== tagNames[seq]) {
				return null;
			} else if (seq === tagNames.length - 1) {
				return curr;
			}
			seq++;
		}

		return null;
	}

	// イテレータから検索対象の位置を取得。
	static indexOnIter(iter, target) {
		let index = 0;
		for (const val of iter) {
			if (val === target) {
				return index;
			}
		}

		return -1;
	}

	// 文書のロードが完了済かを取得。
	static isDocLoadDone() {
		return document.readyState !== "loading";
	}

	// 要素がビューポートの縦スクロール内にあるかを取得。
	static isInScrollY(elm) {
		const rect = elm.getBoundingClientRect();
		return rect.bottom >= 0 && rect.top <= window.innerHeight;
	}

	// 配列風オブジェクトにおける検索対象の後方からの位置を取得。
	static lastIndexOf(arr, target) {
		return Util.indexOnIter(Util.revIter(arr), target);
	}

	// 配列風オブジェクトから逆方向イテレータを作成。
	static *revIter(arr) {
		for (let i = arr.length - 1; i >= 0; i--) {
			yield arr[i];
		}
	}

	// 現在の URL からハッシュ部分を削除。
	static clearUrlHash() {
		history.replaceState(null, null, " ");
	}

	// ページロード中のコールバックを登録。
	static observeElmLoading(elm, callback) {
		if (Util.isDocLoadDone()) {
			callback(_ => {});
			return;
		}

		const observer = new MutationObserver(moCallback);
		const exit = _ => observer.disconnect();
		observer.observe(elm, {childList: true, subtree: true});

		function moCallback(records, observer) {
			if (Util.isDocLoadDone()) {
				observer.disconnect();
			}

			callback(exit);
		}
	}

	// 要素内の a 要素から href 属性を削除。
	static removeAnchors(elm) {
		for (const a of [].values.call(elm.querySelectorAll("a"))) {
			a.removeAttribute("href");
		}
	}

	// 要素内のテキストから空白をトリム。
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

	// XHTML 文書をロード。
	static async fetchXhtml(url) {
		if (!url) {
			return null;
		}

		const response = await fetch(url).catch(_ => null);
		if (!response?.ok) {
			return null;
		}

		const text = await response.text();
		return (new DOMParser()).parseFromString(text, "application/xhtml+xml");
	}
}

customElements.define("doc-nav", DocNav);
customElements.define("doc-nav-sub", DocNavSub);
DocNav.exec();

