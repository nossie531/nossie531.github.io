"strict";

class View {

	#el = null;

	constructor(model) {
		this.vm = model;
	}

	static exec() {
		var view = new View(new Model);
		document.addEventListener("DOMContentLoaded", () => view.#bindUi());
	}

	get el() {
		if (this.#el === null) {
			this.#el = {
				e1rx: document.getElementById("e1rx"),
				e1ry: document.getElementById("e1ry"),
				e2cx: document.getElementById("e2cx"),
				e2cy: document.getElementById("e2cy"),
				e2rx: document.getElementById("e2rx"),
				e2ry: document.getElementById("e2ry"),
				chkAbsolute: document.getElementById("chkAbsolute"),
				dText: document.getElementById("dText"),
				sample: document.getElementById("sample")
			};
		}

		return this.#el;
	}

	#bindUi() {
		const {el, vm} = this;
		Binder.bindNumberInput(el.e2cx, v => vm.e2.cx = v, () => this.#refresh());
		Binder.bindNumberInput(el.e2cy, v => vm.e2.cy = v, () => this.#refresh());
		Binder.bindNumberInput(el.e1rx, v => vm.inputE1Rx(v), () => this.#refresh());
		Binder.bindNumberInput(el.e1ry, v => vm.inputE1Ry(v), () => this.#refresh());
		Binder.bindNumberInput(el.e2rx, v => vm.inputE2Rx(v), () => this.#refresh());
		Binder.bindNumberInput(el.e2ry, v => vm.inputE2Ry(v), () => this.#refresh());
		Binder.bindCheckInput(el.chkAbsolute, v => vm.absolute = v, () => this.#refresh());
		this.#refresh();
	}

	#refresh() {
		this.#refreshInputs();
		this.#refreshSvg();
	}

	#refreshInputs() {
		this.el.e1rx.value = this.vm.e1.rx;
		this.el.e1ry.value = this.vm.e1.ry;
		this.el.e2cx.value = this.vm.e2.cx;
		this.el.e2cy.value = this.vm.e2.cy;
		this.el.e2rx.value = this.vm.e2.rx;
		this.el.e2ry.value = this.vm.e2.ry;
		this.el.chkAbsolute.checked = this.vm.absolute;
		this.el.e2rx.readOnly = !this.vm.e2RxEnabled;
		this.el.e2ry.readOnly = !this.vm.e2RyEnabled;
	}

	#refreshSvg() {
		this.el.sample.replaceChildren();
		if (this.#getDArr().length) {
			const SVG_NS = "http://www.w3.org/2000/svg";
			const path = document.createElementNS(SVG_NS, "path");
			const d = this.#getDArr();
			path.setAttribute("d", d.join(" "));
			this.el.sample.appendChild(path);
			this.el.dText.value = d.join("\n");
		}
	}

	#getDArr() {
		if (this.vm.controlPoints.length !== 4) 
			return [];
		const {e1, e2} = this.vm;
		const ps = this.vm.controlPoints;
		const lf1 = e1.rx >= e2.rx ? 1 : 0;
		const lf2 = e1.rx >= e2.rx ? 0 : 1;
		const su = new SvgPathUtil(this.vm.absolute);
		su.pushM(ps[0]);
		su.pushA(ps[1], e1, 0, lf1, 0);
		su.pushL(ps[2]);
		su.pushA(ps[3], e2, 0, lf2, 0);
		su.pushZ();
		return su.arr;
	}
}

class Model {

	absolute = false;
	e1 = new Ellipse(0, 0, 100, 50);
	e2 = new Ellipse(0, -200, 0, 0);

	get e2RxEnabled() {
		return this.e1.rx !== 0 || (this.e1.rx === 0 && this.e1.ry === 0);
	}

	get e2RyEnabled() {
		return this.e1.ry !== 0 || (this.e1.rx === 0 && this.e1.ry === 0);
	}

	get controlPoints() {
		if (!this.#validateInput()) {
			return [];
		}

		const dirMode = this.#polarPoint === null;
		const poleTgt = this.#polarPoint ?? this.e2.cp.add(this.e2.cp.add(this.e1.cp.rev));
		const pis1 = MyMath.polarEdge(poleTgt, this.e1, dirMode);
		const pis2 = MyMath.polarEdge(poleTgt, this.e2, dirMode);
		if (pis1.length === 0 || pis2.length === 0) {
			return [];
		}

		const p0p1 = this.e1.rx >= this.e2.rx ? pis1.reverse() : pis1;
		const p2p3 = this.e1.rx >= this.e2.rx ? pis2 : pis2.reverse();
		return [...p0p1, ...p2p3]; 
	}

	get #polarPoint() {
		if (this.e1.rx === this.e2.rx) {
			return null;
		}

		const d = this.e2.cp.add(this.e1.cp.rev);
		const k = this.e1.rx / (this.e1.rx - this.e2.rx);
		return this.e1.cp.add(d.mul(k));
	}

	inputE1Rx(v) {
		this.e1.rx = v;
		if (this.e1.ry !== 0) {
			this.e2.rx = v / this.e1.ry * this.e2.ry;
		} else {
			this.e2.ry = 0;
		}
	}

	inputE1Ry(v) {
		this.e1.ry = v;
		if (this.e1.rx !== 0) {
			this.e2.ry = v / this.e1.rx * this.e2.rx;
		} else {
			this.e2.rx = 0;
		}
	}

	inputE2Rx(v) {
		this.e2.rx = v;
		if (this.e1.rx !== 0) {
			this.e2.ry = this.e1.ry / this.e1.rx * v;
		}
	}

	inputE2Ry(v) {
		this.e2.ry = v;
		if (this.e1.ry !== 0) {
			this.e2.rx = this.e1.rx / this.e1.ry * v;
		}
	}

	#validateInput() {
		return [this.e1.rx, this.e1.ry, this.e2.cx, this.e2.cy].every(x => typeof x === "number");
	}
}

class Point {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	get rev() {
		return new Point(-this.x, -this.y);
	}

	add(p) {
		return new Point(this.x + p.x, this.y + p.y);
	}

	mul(k) {
		return new Point(this.x * k, this.y * k);
	}

	equals(p) {
		return p && this.x === p.x && this.y === p.y;
	}
}

class Ellipse {
	constructor(cx, cy, rx, ry) {
		this.cx = cx;
		this.cy = cy;
		this.rx = rx;
		this.ry = ry;
	}

	get lp() {
		return new Point(this.cx - this.rx, this.cy);
	}

	get rp() {
		return new Point(this.cx + this.rx, this.cy);
	}

	get tp() {
		return new Point(this.cx, this.cy - this.ry);
	}

	get bp() {
		return new Point(this.cx, this.cy + this.ry);
	}

	get cp() {
		return new Point(this.cx, this.cy);
	}

	move(p) {
		return new Ellipse(this.cx + p.x, this.cy + p.y, this.rx, this.ry);
	}
}

class MyMath {

	// 点と楕円から楕円と極線の交点を配列で取得。
	static polarEdge(p, e, dirMode = false) {

		if (e.rx === 0) return [e.tp, e.bp];
		if (e.ry === 0) return [e.lp, e.rp];

		const tArr = internal(...transformInput(p, e));
		const pArr = tArr.map(x => revTransformOutput(x));
		return MyMath.rotSign(p, pArr[0], pArr[1]) >= 0 ? pArr : pArr.reverse();

		function internal(p, e) {
			const qParam = (dirMode ? getDirQuadraticParam : getQuadraticParam)(p, e);
			const lParam = (dirMode ? getDirLinearParam : getLinearParam)(p, e);
			const xArr = MyMath.quadraticEuqtion(qParam.a, qParam.b, qParam.c);
			const line = x => lParam.a * x + lParam.b;
			Util.assert(xArr?.length === 0 || xArr?.length === 2);
			return xArr.map(x => new Point(x, line(x)));
		}

		function getLinearParam(p, e) {
			const a = (-p.x / p.y) * (e.ry / e.rx) ** 2;
			const b = e.ry ** 2 / p.y;
			return { a, b };
		}

		function getQuadraticParam(p, e) {
			const a = (e.rx * p.y) ** 2 + (e.ry * p.x) ** 2;
			const b = -2 * p.x * (e.rx * e.ry) ** 2;
			const c = e.rx ** 4 * (e.ry ** 2 - p.y ** 2);
			return { a, b, c };
		}

		function getDirLinearParam (p, e) {
			const a = (-p.x / p.y) * (e.ry / e.rx) ** 2;
			return { a, b: 0 };
		}

		function getDirQuadraticParam(p, e) {
			const a = (e.rx * p.y) ** 2 + (e.ry * p.x) ** 2;
			const c = -(e.rx ** 4 * p.y ** 2);
			return { a, b: 0, c };
		}

		function getTransformPlan() {
			const move = e.cp.rev;
			const swXY = Math.abs(p.add(move).x) > Math.abs(p.add(move).y);
			return { move, swXY };
		}

		function transformInput(p, e) {
			const plan = getTransformPlan();
			const mp = p.add(plan.move);
			const me = e.move(plan.move);
			const rp = new Point(...(plan.swXY ? [mp.y, mp.x] : [mp.x, mp.y]));
			const re = new Ellipse(0, 0, ...(plan.swXY ? [me.ry, me.rx] : [me.rx, me.ry]));
			return [rp, re];
		}

		function revTransformOutput(p) {
			const plan = getTransformPlan();
			const rp = new Point(...(plan.swXY ? [p.y, p.x] : [p.x, p.y]));
			const mp = rp.add(plan.move.rev);
			return mp;
		}
	}

	// 指定された３点を順に巡る回転方向を取得。
	static rotSign(p0, p1, p2) {
		const [v1, v2] = [p1, p2].map(p => p.add(p0.rev));
		return Math.sign(v1.x * v2.y - v1.y * v2.x);
	}

	// 二次方程式の解を配列で取得。
	static quadraticEuqtion(a, b, c) {

		if (a === 0) {
			return b !== 0 ? [-c / b] : c !== 0 ? [] : null;
		} 

		const d = b ** 2 - 4 * a * c;

		if (d < 0) {
			return [];
		}

		const xc = -b / (2 * a);
		const xd = Math.sqrt(d) / (2 * a);
		return [xc - xd, xc  + xd];
	}
}

class Binder {

	static bindNumberInput(inputElm, input, refresh) {
		inputElm.addEventListener("change", () => {
			input(Util.parseNullOrFloat(inputElm.value));
			refresh();
		});
	}
	
	static bindCheckInput(inputElm, input, refresh) {
		inputElm.addEventListener("change", () => {
			input(inputElm.checked);
			refresh();
		});
	}
}

class SvgPathUtil {

	#pos = null;
	#absolute = false;
	#precision = 2;
	#arr = [];

	constructor(absolute) {
		this.#absolute = absolute;
	}

	get arr() {
		return [...this.#arr];
	}

	pushM(p) {
		const pText = `${this.#num(p.x)},${this.#num(p.y)}`;
		this.#arr.push(`M${pText}`);
		this.#pos = p;
	}

	pushL(p) {
		if (p.equals(this.#pos)) return;
		const cL = this.#absolute ? "L" : "l";
		const d = this.#absolute ? p : p.add(this.#pos.rev);
		const dText = `${this.#num(d.x)},${this.#num(d.y)}`;
		this.#arr.push(`${cL}${dText}`);
		this.#pos = p;
	}

	pushA(p, e, angle, lf, sf) {
		if (p.equals(this.#pos)) return;
		const cA = this.#absolute ? "A" : "a";
		const d = this.#absolute ? p : p.add(this.#pos.rev);
		const rText = `${this.#num(e.rx)},${this.#num(e.ry)}`;
		const dText = `${this.#num(d.x)},${this.#num(d.y)}`;
		this.#arr.push(`${cA}${rText},${angle},${lf},${sf},${dText}`);
		this.#pos = p;
	}

	pushZ() {
		this.#arr.push(`Z`);
	}

	#num(v) {
		return v.toFixed(this.#precision);
	}
}


class Util {
	static assert(x) {
		if (!x) throw new Error("Assertion failed.");
	}

	static parseNullOrFloat(text) {
		return Number.isNaN(parseFloat(text)) ? null : parseFloat(text);
	}
}

View.exec();
