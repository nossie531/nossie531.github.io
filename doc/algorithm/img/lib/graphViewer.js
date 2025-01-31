"use strict";

// 画像の表示のためのクラス。
class GraphViewer {

	static #SVG_NS = "http://www.w3.org/2000/svg";

	magnify = 1;

	#gridArea;
	#offset;
	#range;

	// このクラスのインスタンスを作成します。
	constructor(range, origin, gridArea) {
		this.#range = {...range};
		this.#gridArea = {...gridArea};
		this.#offset = {
			x: this.#gridArea.x + origin.x,
			y: this.#gridArea.y + this.#gridArea.height - origin.y
		};
	}

	// 指定したテキスト要素に位置を設定します。
	setLabel(id, point, dx, dy) {
		const textElm = document.getElementById(id);
		textElm.setAttribute("x", this.#offset.x + point.x * this.magnify + (dx || 0));
		textElm.setAttribute("y", this.#offset.y - point.y * this.magnify + (dy || 0));
	}

	// 指定したパス要素に点列を描画します。
	setPath(id, points) {
		const pathElm = document.getElementById(id);
		pathElm.setAttribute("d", this.#toValD(points));
	}

	// 指定したパス要素に点列を関数として描画します。
	setFuncPath(id, points) {
		const pathElm = document.getElementById(id);
		pathElm.setAttribute("d", this.#toValD(this.#truncPoints(points)));
	}

	// 指定したパス要素に線分を長さ指定で描画します。
	setPathLine(id, line, length) {
		const pathElm = document.getElementById(id);
		const p1 = line[0], p2 = line[1];
		const vec = {x: p2.x - p1.x, y: p2.y - p1.y};
		const mag = length / Math.sqrt(vec.x ** 2 + vec.y ** 2);
		const newLine = [p1, {x: p1.x + vec.x * mag, y: p1.y + vec.y * mag}];
		pathElm.setAttribute("d", this.#toValD(newLine));
	}

	// 指定したグループ要素に座標軸を描画します。
	appendAxis(id) {
		const groupElm = document.getElementById(id);
		const xElm = document.createElementNS(GraphViewer.#SVG_NS, "path");
		const yElm = document.createElementNS(GraphViewer.#SVG_NS, "path");
		const xs = {x: this.#gridArea.x, y: this.#offset.y};
		const xe = {x: this.#gridArea.x + this.#gridArea.width, y: this.#offset.y};
		const ys = {x: this.#offset.x, y: this.#gridArea.y + this.#gridArea.height};
		const ye = {x: this.#offset.x, y: this.#gridArea.y};
		xElm.setAttribute("d", this.#toRawD([xs, xe]));
		yElm.setAttribute("d", this.#toRawD([ys, ye]));
		groupElm.append(xElm, yElm);
	}

	// 指定したグループ要素に X 軸グリッドを描画します。
	appendGridX(id, width) {
		const groupElm = document.getElementById(id);
		for (let x = this.#range.min + width; x <= this.#range.max; x += width) {
			const pathElm = document.createElementNS(GraphViewer.#SVG_NS, "path");
			const p1 = {x: this.#offset.x + x * this.magnify, y: this.#gridArea.y};
			const p2 = {x: this.#offset.x + x * this.magnify, y: this.#gridArea.y + this.#gridArea.height};
			pathElm.setAttribute("d", this.#toRawD([p1, p2]));
			groupElm.append(pathElm);
		}
	}

	// 指定したグループ要素に点列を描画します。
	appendPointsPath(id, points) {
		const groupElm = document.getElementById(id);
		for (let i = 1; i < points.length; i++) {
			const pathElm = document.createElementNS(GraphViewer.#SVG_NS, "path");
			pathElm.setAttribute("d", this.#toValD([points[i - 1], points[i]]));
			groupElm.append(pathElm);
		}
	}

	// 指定した点列のための d 属性値をオフセット補正して取得します。
	#toValD(points) {
		const results = new Array;
		const vPoints = points.map(p => ({
			x: this.#offset.x + p.x * this.magnify,
			y: this.#offset.y - p.y * this.magnify
		}));
		return this.#toRawD(vPoints);
	}

	// 指定した点列のための d 属性値を取得します。
	#toRawD(points) {
		const results = new Array;

		for (let i = 0; i < points.length; i++) {
			const operator = i === 0 ? "M" : "L";
			results.push(`${operator} ${points[i].x.toFixed(2)},${points[i].y.toFixed(2)}`);
		}

		return results.join(" ");
	}

	// 点列の端を範囲内に切り落とします。
	#truncPoints(points) {
		const result = new Array;

		for (let i = 0; i < points.length; i++) {
			const isLast = i === points.length - 1;
			if (!isLast && !this.#inRange(points[i].x) && !this.#inRange(points[i + 1].x)) {
				continue;
			}

			const p1 = !isLast ? points[i] : points[i - 1];
			const p2 = !isLast ? points[i + 1] : points[i];
			const line = x => (p2.y - p1.y) / (p2.x - p1.x) * (x - p1.x) + p1.y;
			const x = this.#toInRange(points[i].x);
			const y = line(x);
			result.push({x, y});
		}

		return result;
	}

	// 範囲内に指定した x 座標があるか確認します。
	#inRange(x) {
		return x >= this.#range.min && x <= this.#range.max;
	}

	// 範囲内に収まるよう x 座標を調整します。
	#toInRange(x) {
		return Math.min(Math.max(x, this.#range.min), this.#range.max);
	}
}
