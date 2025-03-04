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

	// ラプラシアン行列を取得します。
	createLaplacianMatrix() {
		const n = this.nodes.length;
		const result = new Matrix(n, n);
		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n; j++) {
				const w = i === j ? 0 : this.dc;
				const d = i === j ? this.dc * (result.n  - 1) : 0;
				result.pos(i, j).val = w - d;
			}
		}

		return result;
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
		const curr = new Vector(currents);
		const m = this.createLaplacianMatrix();
		const diff = m.mulMat(curr).mulVal(this.step);
		const result = curr.add(diff);
		return result.arr;
	}
}

// 陰解法による拡散計算のためのクラスです。
class ImplicitDiffEq extends DiffEq {
	// Implement.
	execStep(currents) {
		const vector = this.getLinearEqVector(currents);
		const matrix = this.getLinearEqMatrix(currents);
		return matrix.linearEq(vector).arr;
	}

	// 線形方程式のベクタ部分を取得します。
	getLinearEqVector(currents) {
		return new Vector(currents);
	}

	// 線形方程式の行列部分をを取得します。
	getLinearEqMatrix(currents) {
		const e = Matrix.identity(currents.length);
		const m = this.createLaplacianMatrix();
		return e.sub(m.mulVal(this.step));
	}
}

// 二次の陰解法による拡散計算のためのクラスです。
class CrankNicolsonDiffEq extends ImplicitDiffEq {
	// Override.
	getLinearEqVector(currents) {
		const m = this.createLaplacianMatrix()
		const c = new Vector(currents);
		const d = m.mulMat(c).mulVal(0.5 * this.step); 
		return c.add(d);
	}
	
	// Override.
	getLinearEqMatrix(currents) {
		const e = Matrix.identity(currents.length);
		const m = this.createLaplacianMatrix();
		return e.sub(m.mulVal(0.5 * this.step));
	}
}

class ExpIntegratorDiffEq extends DiffEq {
	// Implement.
	execStep(currents) {
		const vector = new Vector(currents);
		const m = this.createLaplacianMatrix();
		const mt = m.mulVal(this.step);
		return mt.expMul(vector).arr;
	}
}

