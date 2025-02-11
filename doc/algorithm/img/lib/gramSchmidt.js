window.addEventListener("DOMContentLoaded", setup);

function setup() {
	const viewer = new Viewer(isometric());
	const identity = Matrix.identity(3);
	const zero = Vector.zero(3);
	const axis = Calc.mul(identity, 250);
	const x3 = new Vector([150, 100, 200]);
	const y1 = new Vector([200, 0, 0]);
	const y2 = new Vector([0, 150, 0]);
	const y3 = x3.sub(x3.vecProj(y1)).sub(x3.vecProj(y2));
	const projX3Y1 = x3.vecProj(y1);
	const projX3Y2 = x3.vecProj(y2);
	viewer.editLine("axisY1", zero, axis.colVec(0));
	viewer.editLine("axisY2", zero, axis.colVec(1));
	viewer.editLine("x3", zero, x3);
	viewer.editLine("y1", zero, y1);
	viewer.editLine("y2", zero, y2);
	viewer.editLine("y3", zero, y3);
	viewer.editLine("prodX3Y1", zero, projX3Y1);
	viewer.editLine("prodX3Y2", zero, projX3Y2);
	viewer.editMath("x3Text", x3, {offset: [-20,0]});
	viewer.editMath("y1Text", y1, {offset: [0,10]});
	viewer.editMath("y2Text", y2, {offset: [0,10]});
	viewer.editMath("y3Text", y3, {offset: [40, 0]});
	viewer.editMath("prodX3Y1Text", projX3Y1, {offset: [-10, -20], align: "r"});
	viewer.editMath("prodX3Y2Text", projX3Y2, {offset: [10, -20]});
	viewer.editPointGuide("x3Guide", x3);
}

function isometric() {
	return new Matrix([
		[-Math.sqrt(1/2), Math.sqrt(1/2), 0],
		[Math.sqrt(1/6), Math.sqrt(1/6), -Math.sqrt(2/3)],
	]);
}

class Viewer {
	static #SVG_NS = "http://www.w3.org/2000/svg";
	#root;
	#conv;

	constructor(conv) {
		this.#root = document.getElementsByTagNameNS(Viewer.#SVG_NS, "g")[0];
		this.#conv = conv;
	}

	editLine(id, p1, p2) {
		const c1 = Calc.mul(this.#conv, p1);
		const c2 = Calc.mul(this.#conv, p2);
		const d = Viewer.#lineD(c1, c2);
		const path = document.getElementById(id);
		path.setAttribute("d", d);
	}

	editPointGuide(id, p) {
		const g = document.getElementById(id);
		for (let i = 1; i <= 0b111; i++) {
			for (let j = 1; j <= 0b111; j++) {
				if (i >= j || [1, 2, 4].indexOf(i ^ j) < 0) {
					continue;
				}
				const p1 = p.edit((a, r, c) => (1 << r) & i ? a.at(r, c) : 0);
				const p2 = p.edit((a, r, c) => (1 << r) & j ? a.at(r, c) : 0);
				const c1 = Calc.mul(this.#conv, p1);
				const c2 = Calc.mul(this.#conv, p2);
				const path = document.createElementNS(Viewer.#SVG_NS, "path");
				path.setAttribute("d", Viewer.#lineD(c1, c2));
				g.append(path);
			}
		}
	}

	editMath(id, p, opt) {
		const right = opt?.align === "r";
		const c = Calc.mul(this.#conv, p);
		const x = c.at(0) + (opt?.offset?.[0] || 0);
		const y = c.at(1) + (opt?.offset?.[1] || 0);
		const fobj = document.getElementById(id);
		const math = fobj.firstElementChild;
		const width = parseFloat(fobj.getAttribute("width"));
		const adjust = right ? width : 0;
		fobj.setAttribute("x", Viewer.#fmtValue(x - adjust));
		fobj.setAttribute("y", Viewer.#fmtValue(y));
		math.style.float = right ? "right" : "left";
	}

	static #lineD(p1, p2) {
		return `M ${Viewer.#fmtPoint(p1)} L ${Viewer.#fmtPoint(p2)}`;
	}

	static #fmtPoint(p) {
		const x = Viewer.#fmtValue(p.at(0));
		const y = Viewer.#fmtValue(p.at(1));
		return `${x},${y}`;
	}

	static #fmtValue(v) {
		return v.toFixed(2);
	}
}
