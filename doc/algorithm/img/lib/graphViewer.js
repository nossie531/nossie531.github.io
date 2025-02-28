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

		// 指定した円要素に位置を設定します。
		setCircle(elm, point) {
			const circleElm = Util.getElm(elm);
			circleElm.setAttribute("cx", this.#zero.x + point.x * this.#magnify);
			circleElm.setAttribute("cy", this.#zero.y - point.y * this.#magnify);
		}

		// 指定したテキスト要素に位置を設定します。
		setLabel(elm, point, dx, dy) {
			const textElm = Util.getElm(elm);
			textElm.setAttribute("x", this.#zero.x + point.x * this.#magnify + (dx || 0));
			textElm.setAttribute("y", this.#zero.y - point.y * this.#magnify + (dy || 0));
		}

		// 指定したパス要素に点列を描画します。
		setPath(elm, points) {
			const pathElm = Util.getElm(elm);
			const vPoints = points.map(x => new Point(x));
			pathElm.setAttribute("d", this.#toValD(vPoints));
		}

		// 指定したパス要素に点列を関数として描画します。
		setFuncPath(elm, points) {
			const pathElm = Util.getElm(elm);
			const vPoints = points.map(x => new Point(x));
			pathElm.setAttribute("d", this.#toValD(this.#cutPoints(vPoints)));
		}

		// 指定したパス要素に線分を長さ指定で描画します。
		setPathLine(elm, line, length) {
			const pathElm = Util.getElm(elm);
			const p1 = line[0], p2 = line[1];
			const vec = {x: p2.x - p1.x, y: p2.y - p1.y};
			const mag = length / Math.sqrt(vec.x ** 2 + vec.y ** 2);
			const newLine = [p1, {x: p1.x + vec.x * mag, y: p1.y + vec.y * mag}];
			pathElm.setAttribute("d", this.#toValD(newLine));
		}

		// 指定したグループ要素に座標軸を描画します。
		appendAxis(elm) {
			const groupElm = Util.getElm(elm);
			const xElm = document.createElementNS(SVG_NS, "path");
			const yElm = document.createElementNS(SVG_NS, "path");
			const xs = new Point(this.#gridArea.x, this.#zero.y);
			const xe = new Point(this.#gridArea.x + this.#gridArea.width + MARGIN, this.#zero.y);
			const ys = new Point(this.#zero.x, this.#gridArea.y + this.#gridArea.height);
			const ye = new Point(this.#zero.x, this.#gridArea.y - MARGIN);
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
		appendGridX(elm, width) {
			const groupElm = Util.getElm(elm);
			for (let x = 0 + width; x <= this.#area.xMax; x += width) {
				const pathElm = document.createElementNS(SVG_NS, "path");
				const p1 = new Point(this.#zero.x + x * this.#magnify, this.#gridArea.y - MARGIN);
				const p2 = new Point(this.#zero.x + x * this.#magnify, this.#gridArea.y + this.#gridArea.height);
				pathElm.setAttribute("d", this.#toRawD([p1, p2]));
				groupElm.append(pathElm);
			}
		}

		// 指定したグループ要素に点列を描画します。
		appendPointsPath(elm, points) {
			const groupElm = Util.getElm(elm);
			const vPoints = points.map(x => new Point(x));
			for (let i = 1; i < vPoints.length; i++) {
				const pathElm = document.createElementNS(SVG_NS, "path");
				pathElm.setAttribute("d", this.#toValD([vPoints[i - 1], vPoints[i]]));
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
			const yMax = (this.#gridArea.height - this.#origin.y + MARGIN) / this.#magnify;
			return new Rect(xMin, yMin, xMax, yMax);
		}

		// 指定した点列のための d 属性値をオフセット補正して取得します。
		#toValD(points) {
			const results = new Array;
			const vPoints = points.map(p => (p ? new Point(
				this.#zero.x + p.x * this.#magnify,
				this.#zero.y - p.y * this.#magnify
			) : null));
			return this.#toRawD(vPoints);
		}

		// 指定した点列のための d 属性値を取得します。
		#toRawD(points) {
			const results = new Array;

			for (let i = 0; i < points.length; i++) {
				const operator = i === 0 || points[i - 1] === null ? "M" : "L";
				if (points[i]) {
					results.push(`${operator} ${points[i].toFixed(2)}`);
				}
			}

			return results.join(" ");
		}

		// 点列を範囲内に収まるよう分解します。
		#cutPoints(points) {
			const result = new Array;
			for (let i = 1; i < points.length; i++) {
				const last = result.at(-1);
				const p1 = points[i - 1];
				const p2 = points[i];
				const line = this.#area.clampLine(p1, p2);
				if (!line) {
					if (last) {
						result.push(null);
					}
					continue;
				}
				
				if (!last) {
					result.push(line.p1);
				}

				result.push(line.p2);
			}

			return result;
		}
	}

	// 点を管理します。
	class Point {
		#x;
		#y;
		constructor(...args) {
			if (typeof args[0] === "object") {
				this.#x = args[0].x;
				this.#y = args[0].y;
			} else if (typeof args[0] === "number" && typeof args[1] === "number") {
				this.#x = args[0];
				this.#y = args[1];
			} 
		}

		get x() {
			return this.#x;
		}

		get y() {
			return this.#y;
		}

		sub(value) {
			return new Point(this.x - value.x, this.y - value.y);
		}

		eq(value) {
			if (!value instanceof Point) {
				return false;
			}

			return this.x === value.x && this.y === value.y;
		}

		toFixed(digits) {
			return `${this.x.toFixed(digits)},${this.y.toFixed(digits)}`;
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

		// 座標が矩形に収まるかどうかを取得します。
		contains(p) {
			return (p.x >= this.#xMin && p.x <= this.#xMax)
				&& (p.y >= this.#yMin && p.y <= this.#yMax);
		}

		// 線分が矩形に収まるようにします。
		clampLine(p1, p2) {
			if (p1.eq(p2)) {
				return this.contains(p1) ? {p1, p2} : null;
			}

			const d = p2.sub(p1);;
			const kL = d.x ? (this.#xMin - p1.x) / d.x : null;
			const kR = d.x ? (this.#xMax - p1.x) / d.x : null;
			const kB = d.y ? (this.#yMin - p1.y) / d.y : null;
			const kT = d.y ? (this.#yMax - p1.y) / d.y : null;
			const hitP1 = this.contains(p1);
			const hitP2 = this.contains(p2);
			const hitL = Util.sorted(0, kL, 1) && Util.sorted(this.#yMin, p1.y + kL * d.y, this.#yMax);
			const hitR = Util.sorted(0, kR, 1) && Util.sorted(this.#yMin, p1.y + kR * d.y, this.#yMax);
			const hitB = Util.sorted(0, kB, 1) && Util.sorted(this.#xMin, p1.x + kB * d.y, this.#xMax);
			const hitT = Util.sorted(0, kT, 1) && Util.sorted(this.#xMin, p1.x + kT * d.y, this.#xMax);
			const ks = [
				hitP1 ? 0 : null,
				hitP2 ? 1 : null,
				hitL ? kL : null,
				hitR ? kR : null,
				hitB ? kB : null,
				hitT ? kT : null
			].filter(x => x !== null).sort((a, b) => a - b);
			const ps = ks.map(k => ({x: p1.x + k * d.x, y: p1.y + k * d.y}));
			return ps.length >= 2 ? {p1: ps[0], p2: ps[1]} : null;
		}
	}

	// ユーティリティ。
	class Util {
		// 引数が昇順かどうかを取得します。
		static sorted(...args) {
			for (let i = 1; i < args.length; i++) {
				if (args[i - 1] > args[i]) {
					return false;
				}
			}

			return true;
		}

		// 要素を取得します。
		static getElm(spec) {
			if (spec instanceof Element) {
				return spec;
			} else if (typeof spec === "string") {
				return document.getElementById(spec);
			} else {
				throw new Error;
			}
		}
	}

	window.GraphViewer = GraphViewer;
}
