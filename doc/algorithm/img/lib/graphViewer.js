"use strict";

{
	const SVG_NS = document.documentElement.namespaceURI;
	const MARGIN = 10;

	// グラフの表示を担当します。
	class GraphViewer {
		#gridArea;
		#origin;
		#magnify;

		// このクラスのインスタンスを作成します。
		constructor(gridArea, origin, magnify) {
			this.#gridArea = {...gridArea};
			this.#origin = {...origin};
			this.#magnify = magnify !== undefined ? magnify : 1;
		}

		// 指定したテキスト要素に位置を設定します。
		setLabel(id, point, dx, dy) {
			const textElm = document.getElementById(id);
			textElm.setAttribute("x", this.#zero.x + point.x * this.#magnify + (dx || 0));
			textElm.setAttribute("y", this.#zero.y - point.y * this.#magnify + (dy || 0));
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
			const xElm = document.createElementNS(SVG_NS, "path");
			const yElm = document.createElementNS(SVG_NS, "path");
			const xs = {x: this.#gridArea.x, y: this.#zero.y};
			const xe = {x: this.#gridArea.x + this.#gridArea.width + MARGIN, y: this.#zero.y};
			const ys = {x: this.#zero.x, y: this.#gridArea.y + this.#gridArea.height};
			const ye = {x: this.#zero.x, y: this.#gridArea.y - MARGIN};
			xElm.setAttribute("d", this.#toRawD([xs, xe]));
			yElm.setAttribute("d", this.#toRawD([ys, ye]));
			groupElm.append(xElm, yElm);

			const xTextElm = groupElm.getElementsByClassName("x")[0];
			const xTextOffset = {x: 7, y: -8};
			if (xTextElm) {
				xTextElm.setAttribute("x", xe.x + xTextOffset.x);
				xTextElm.setAttribute("y", xe.y + xTextOffset.y);
			}
		}

		// 指定したグループ要素に X 軸グリッドを描画します。
		appendGridX(id, width) {
			const groupElm = document.getElementById(id);
			for (let x = 0 + width; x <= this.#area.xMax; x += width) {
				const pathElm = document.createElementNS(SVG_NS, "path");
				const p1 = {x: this.#zero.x + x * this.#magnify, y: this.#gridArea.y - MARGIN};
				const p2 = {x: this.#zero.x + x * this.#magnify, y: this.#gridArea.y + this.#gridArea.height};
				pathElm.setAttribute("d", this.#toRawD([p1, p2]));
				groupElm.append(pathElm);
			}
		}

		// 指定したグループ要素に点列を描画します。
		appendPointsPath(id, points) {
			const groupElm = document.getElementById(id);
			for (let i = 1; i < points.length; i++) {
				const pathElm = document.createElementNS(SVG_NS, "path");
				pathElm.setAttribute("d", this.#toValD([points[i - 1], points[i]]));
				groupElm.append(pathElm);
			}
		}

		// ゼロ点を取得します。
		get #zero() {
			return {
				x: this.#gridArea.x + this.#origin.x,
				y: this.#gridArea.y + this.#gridArea.height - this.#origin.y
			};
		}

		// 描画可能範囲を取得します。
		get #area() {
			const xMin = -this.#origin.x / this.#magnify;
			const yMin = -this.#origin.y / this.#magnify;
			const xMax = (this.#gridArea.width - this.#origin.x) / this.#magnify;
			const yMax = (this.#gridArea.height - this.#origin.y) / this.#magnify;
			return new Rect(xMin, yMin, xMax, yMax);
		}

		// 指定した点列のための d 属性値をオフセット補正して取得します。
		#toValD(points) {
			const results = new Array;
			const vPoints = points.map(p => ({
				x: this.#zero.x + p.x * this.#magnify,
				y: this.#zero.y - p.y * this.#magnify
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
				if (!isLast && !this.#area.inX(points[i].x) && !this.#area.inX(points[i + 1].x)) {
					continue;
				}

				const p1 = !isLast ? points[i] : points[i - 1];
				const p2 = !isLast ? points[i + 1] : points[i];
				const line = x => (p2.y - p1.y) / (p2.x - p1.x) * (x - p1.x) + p1.y;
				const x = this.#area.clampX(points[i].x);
				const y = line(x);
				result.push({x, y});
			}

			return result;
		}
	}

	// 矩形を管理します。
	class Rect {
		#xMin;
		#yMin;
		#xMax;
		#yMax;

		// このクラスのインスタンスを作成します。
		constructor(xMin, yMin, xMax, yMax) {
			this.#xMin = xMin;
			this.#yMin = yMin;
			this.#xMax = xMax;
			this.#yMax = yMax;
		}

		// x 座標の最小値を取得します。
		get xMin() {
			return this.#xMin;
		}

		// y 座標の最小値を取得します。
		get yMin() {
			return this.#yMin;
		}

		// x 座標の最大値を取得します。
		get xMax() {
			return this.#xMax;
		}

		// y 座標の最大値を取得します。
		get yMax() {
			return this.#yMax;
		}

		// 指定された x 座標が矩形の範囲内にあるかを確認します。
		inX(value) {
			return value >= this.#xMin && value  <= this.#xMax;
		}

		// 指定された x 座標が矩形の範囲内に収まるようにします。
		clampX(value) {
			return Math.min(Math.max(value, this.#xMin), this.#xMax);
		}
	}

	window.GraphViewer = GraphViewer;
}
