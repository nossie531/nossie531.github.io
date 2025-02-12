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

	get arr() {
		return this.#arr;
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

	linearEq(v) {
		if (this.m !== this.n || v.n !== 1 || this.n !== v.m) {
			throw new Error;
		}

		const b = new Vector(v);
		const a = new Matrix(this);

		for (let k = 0; k < a.n; k++) {
			swapPivot(a, k);
			const pivot = a.at(k, k);

			b.pos(k).val /= pivot;
			for (let j = k; j < a.n; j++) {      
				a.pos(k, j).val /= pivot;
			}

			for (let i = 0; i < a.m; i++) {
				if (i === k) {
					continue;
				}

				const mag = a.at(i, k);
				b.pos(i).val -= mag * b.at(k);
				for (let j = k; j < a.n; j++){
					a.pos(i, j).val -= mag * a.at(k, j);
				}
			}
		}

		return b;

		function swapPivot(a, k) {
			let maxAbs = a.at(k, k);
			let maxAbsRow = k;
			for (let i = k + 1; i < a.n; i++) {
				if (Math.abs(a.at(i, k)) > maxAbs) {
					maxAbs = Math.abs(a.at(i, k));
					maxAbsRow = i;
				}
			}

			if (maxAbs === 0) {
				throw new Error;
			}

			let memo;
			for (let i = k; i < a.n; i++) {
				let memo = a.at(k, i);
				a.pos(k, i).val = a.at(maxAbsRow, i);
				a.pos(maxAbsRow, i).val = memo;
			}
		}
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
