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

class Matrix {
	#arr;
	#m;
	#n;

	static zero(m, n) {
		return Reflect.construct(Matrix, arguments);
	}

	static identity(n) {
		const result = new Matrix(n, n);
		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n; j++) {
				result.pos(i, j).val = i === j ? 1 : 0;
			}
		}

		return result;
	}

	constructor() {
		if (isMat(arguments)) {
			this.#m = arguments[0].#m;
			this.#n = arguments[0].#n;
			this.#arr = [...arguments[0].#arr];
		} else if (isDim1(arguments)) {
			this.#m = arguments[0];
			this.#n = 1;
			this.#arr = Array(this.#m).fill(0);
		} else if (isDim2(arguments)) {
			this.#m = arguments[0];
			this.#n = arguments[1];
			this.#arr = Array(this.#m * this.#n).fill(0);
		} else if (isVecArray(arguments)) {
			this.#m = arguments[0].length;
			this.#n = 1;
			this.#arr = [...arguments[0]];
		} else if (isMatArray(arguments)) {
			this.#m = arguments[0].length;
			this.#n = arguments[0][0].length;
			this.#arr = arguments[0].flat();
		} else {
			throw new Error;
		}

		function isMat(args) {
			return args.length === 1
				&& args[0] instanceof Matrix;
		}

		function isDim1(args) {
			return args.length === 1
				&& typeof args[0] === "number";
		}

		function isDim2(args) {
			return args.length === 2
				&& typeof args[0] === "number"
				&& typeof args[1] === "number";
		}

		function isVecArray(args) {
			return args.length === 1
				&& args[0] instanceof Array
				&& typeof args[0][0] === "number";
		}

		function isMatArray(args) {
			return args.length === 1
				&& args[0] instanceof Array
				&& args[0][0] instanceof Array;
		}
	}

	get m() {
		return this.#m;
	}

	get n() {
		return this.#n;
	}

	at(i, j) {
		return this.pos.apply(this, arguments).val;
	}

	pos(i, j) {
		const arr = this.#arr;
		const index = i * this.#n + (j || 0);
		return {
			get val() { return arr[index]; },
			set val(value) { arr[index] = value; }
		};
	}

	colVec(colIdx) {
		const result = new Vector(this.m);
		for (let i = 0; i < result.m; i++) {
			result.pos(i).val = this.at(i, colIdx);
		}

		return result;
	}

	edit(f) {
		const result = new Matrix(this.m, this.n);
		for (let i = 0; i < result.m; i++) {
			for (let j = 0; j < result.n; j++) {
				result.pos(i, j).val = f(this, i, j);
			}
		}

		return result;
	}

	dot(x) {
		if (this.m !== x.m || this.n !== 1 || x.n !== 1) {
			throw new Error;
		}

		return this.#arr.values().reduce((s, c, i) => s + c * x.#arr[i], 0);
	}

	vecProj(x) {
		if (this.m !== x.m || this.n !== 1 || x.n !== 1) {
			throw new Error;
		}

		const result = new Vector(this.m);
		return x.mulVal(this.dot(x) / x.dot(x));
	}

	add(x) {
		if (this.m !== x.m || this.n !== x.n) {
			throw new Error;
		}

		const result = new Matrix(this);
		for (let i = 0; i < result.#arr.length; i++) {
			result.#arr[i] += x.#arr[i];
		}

		return result;
	}

	sub(x) {
		if (this.m !== x.m || this.n !== x.n) {
			throw new Error;
		}

		const result = new Matrix(this);
		for (let i = 0; i < result.#arr.length; i++) {
			result.#arr[i] -= x.#arr[i];
		}

		return result;
	}

	mulVal(x) {
		const result = new Matrix(this);
		for (let i = 0; i < result.#arr.length; i++) {
			result.#arr[i] *= x;
		}

		return result;
	}

	mulMat(x) {
		if (x.m !== this.n) {
			throw new Error;
		}

		const result = new Matrix(this.m, x.n);
		const len = this.n;
		for (let i = 0; i < result.m; i++) {
			for (let j = 0; j < result.n; j++) {
				let sigma = 0;
				for (let k = 0; k < len; k++) {
					sigma += this.at(i, k) * x.at(k, j);
				}
				result.pos(i, j).val = sigma;
			}
		}

		return result;
	}
}

const Vector = Matrix;

class Calc {
	static #mulMap;

	static {
		this.#mulMap = mulMap();

		function mulMap() {
			return new Map([
				[Number.prototype, leftNumMap()],
				[Matrix.prototype, leftMatMap()]
			]);
		}

		function leftNumMap() {
			return new Map([
				[Number.prototype, mulNumByNum],
				[Matrix.prototype, flip(mulMatByNum)]
			]);
		}

		function leftMatMap() {
			return new Map([
				[Number.prototype, mulMatByNum],
				[Matrix.prototype, mulMatByMat]
			]);
		}

		function flip(f) {
			return (x, y) => f(y, x);
		}

		function mulNumByNum(x, y) {
			return x * y;
		}

		function mulMatByNum(x, y) {
			return x.mulVal(y);
		}

		function mulMatByMat(x, y) {
			return x.mulMat(y);
		}
	}

	static mul(x, y) {
		const xProto = Object.getPrototypeOf(x);
		const yProto = Object.getPrototypeOf(y);
		const fMul = this.#mulMap.get(xProto).get(yProto);
		return fMul(x, y);
	}
}
