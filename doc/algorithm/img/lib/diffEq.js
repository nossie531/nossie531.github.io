"use strict";

// 拡散計算のためのクラスです。
class DiffEq {

	#range;
	#nodes;
	
	// 拡散係数。
	dc;

	// 計算時の刻み幅。
	step;

	// 最大ステップ数を取得します。
	get maxStep() {
		return Math.ceil((this.range.max - this.range.min) / this.step);
	}

	// 計算領域を取得します。
	get range() {
		return this.#range;
	}

	// 計算領域を設定します。
	set range(value) {
		this.#range = {...value};
	}

	// 各ノードの初期値を取得します。
	get nodes() {
		return this.#nodes;
	}

	// 各ノードの初期値を設定します。
	set nodes(value) {
		this.#nodes = [...value];
	}

	// 初期値のみの結果を取得します。
	createInitialResult() {
		return this.nodes.map(v => [{x: this.range.min, y: v}]);
	}

	// 計算結果を取得します。
	result() {
		const results = this.createInitialResult();

		for (let stepIndex = 1; stepIndex <= this.maxStep; stepIndex++) {
			const x = this.range.min + this.step * stepIndex;
			const nexts = this.execStep(results.map(x => x.at(-1).y));
			for (let i = 0; i < nexts.length; i++) {
				results[i].push({x, y: nexts[i]});
			}
		}

		return results;
	}

	// ステップの計算を実行します。
	execStep(currents) {
		throw new Error;
	}
}

// 陽解法による拡散計算のためのクラスです。
class ExplicitDiffEq extends DiffEq {

	// Implement.
	execStep(currents) {
		const results = new Array(currents.length);

		for (let i = 0; i < currents.length; i++) {
			const base = currents[i];
			const diff = currents.reduce((s, x) => s + (x - base), 0);
			const y = base + this.dc * diff * this.step;
			results[i] = y;
		}

		return results;
	}
}

// 陰解法による拡散計算のためのクラスです。
class ImplicitDiffEq extends DiffEq {

	// Implement.
	execStep(currents) {
		const results = new Array(currents.length);
		const matrix = this.getDiffuseMatrix(currents);
		return matrix.calcLinearEquation();
	}

	// 分散を表す行列を取得します。
	getDiffuseMatrix(nodes) {
		const nSize = nodes.length;
		const array = Matrix.newInternalArray(nSize, nSize + 1);
		const v = this.dc * this.step;

		for (let i = 0; i < nSize; i++) {
			array[i][nSize] = nodes[i];
		}

		for (let i = 0; i < nSize; i++) {
			for (let j = 0; j < nSize; j++) {
				array[i][j] = i !== j ? -v : 1 + v * (nSize - 1);
			}
		}

		return new Matrix(array);
	}
}

// 二次の陰解法による拡散計算のためのクラスです。
class CrankNicolsonDiffEq extends ImplicitDiffEq {

	// Override.
	getDiffuseMatrix(nodes) {
		const nSize = nodes.length;
		const array = Matrix.newInternalArray(nSize, nSize + 1);
		const v = this.dc * this.step;
		
		for (let i = 0; i < nSize; i++) {
			array[i][nSize] = nodes[i] + 0.5 * v * nodes.reduce((r, x) => r + x - nodes[i], 0);
		}

		for (let i = 0; i < nSize; i++) {
			for (let j = 0; j < nSize; j++) {
				array[i][j] = i !== j ? -0.5 * v : 1 + 0.5 * v * (nSize - 1);
			}
		}

		return new Matrix(array);
	}
}

// 行列を操作するためのクラスです。
class Matrix {

	#arr;
	#rowSize;
	#colSize;

	// 指定したサイズの二次元配列を生成します。
	constructor(arr) {
		if (!(arr instanceof Array)) {
			throw new Error;
		}

		if (!arr.every(x => x instanceof Array && x.length === arr[0].length)) {
			throw new Error;
		}

		this.#arr = arr;
		this.#rowSize = arr.length;
		this.#colSize = arr[0].length;
	}

	// 行数を取得します。
	get rowSize() {
		this.#rowSize;
	}

	// 列数を取得します。
	get colSize() {
		this.#colSize;
	}

	// 指定したサイズの内部配列を生成します。
	static newInternalArray(rowSize, colSize) {
		return ([...Array(rowSize)]).map(_ => ([...Array(colSize)]).map(_ => 0));
	}

	// 内部配列を複製します。
	cloneInternalArray() {
		return JSON.parse(JSON.stringify(this.#arr));
	}

	// 連立一次方程式を計算します [Gauss-Jordan 法 (ピボット選択なし)]。
	calcLinearEquation() {
		if (this.rowSize === this.colSize - 1) {
			throw new Error;
		}

		const a = this.cloneInternalArray();

		for (let k = 0; k < a.length; k++) {

			const pivotRow = a[k];
			const pivotValue = a[k][k];
			for (let j = k; j < a.length + 1; j++) {      
				pivotRow[j] /= pivotValue;
			}

			for (let i = 0; i < a.length; i++) {

				if (i === k) {
					continue;
				}

				const targetRow = a[i];
				const targetRowPivotCol = targetRow[k];
				for (let j = k; j < a.length + 1; j++){
					targetRow[j] -= targetRowPivotCol * pivotRow[j];
				}
			}
		}

		return a.map(x => x[a.length]);
	}
}
