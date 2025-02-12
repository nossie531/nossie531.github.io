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
		const vector = this.getLinearEqVector(currents);
		const matrix = this.getLinearEqMatrix(currents);
		return matrix.linearEq(vector).arr;
	}

	// 線形方程式のベクタ部分を取得します。
	getLinearEqVector(nodes) {
		const nSize = nodes.length;
		const vector = new Vector(nSize);
		for (let i = 0; i < nSize; i++) {
			vector.pos(i).val = nodes[i];
		}

		return vector;
	}

	// 線形方程式の行列部分をを取得します。
	getLinearEqMatrix(nodes) {
		const nSize = nodes.length;
		const matrix = new Matrix(nSize, nSize);
		const v = this.dc * this.step;

		for (let i = 0; i < nSize; i++) {
			for (let j = 0; j < nSize; j++) {
				matrix.pos(i, j).val = i !== j ? -v : 1 + v * (nSize - 1);
			}
		}

		return matrix;
	}
}

// 二次の陰解法による拡散計算のためのクラスです。
class CrankNicolsonDiffEq extends ImplicitDiffEq {
	// Override.
	getLinearEqVector(nodes) {
		const nSize = nodes.length;
		const vector = new Vector(nSize);
		const v = this.dc * this.step;

		for (let i = 0; i < nSize; i++) {
			vector.pos(i).val = nodes[i] + 0.5 * v * nodes.reduce((r, x) => r + x - nodes[i], 0);
		}

		return vector;
	}
	
	// Override.
	getLinearEqMatrix(nodes) {
		const nSize = nodes.length;
		const matrix = new Matrix(nSize, nSize);
		const v = this.dc * this.step;
		
		for (let i = 0; i < nSize; i++) {
			for (let j = 0; j < nSize; j++) {
				matrix.pos(i, j).val = i !== j ? -0.5 * v : 1 + 0.5 * v * (nSize - 1);
			}
		}

		return matrix;
	}
}

