"use strict";

// 微分方程式を求めるためのクラスです。
class DiffEq {

	#range;
	
	// 計算時の刻み幅。
	step;

	// 関数の値。
	value;

	// 導関数。
	df;

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

	// 初期値のみの結果を取得します。
	createInitialResult() {
		return [{x: this.range.min, y: this.value}];
	}

	// 計算結果を取得します。
	result() {
		const results = this.createInitialResult();

		for (let stepIndex = 1; stepIndex <= this.maxStep; stepIndex++) {
			const currX = this.range.min + this.step * (stepIndex - 1);
			const nextX = this.range.min + this.step * stepIndex;
			const currY = results.at(-1).y;
			const nextY = this.execStep(currX, currY);
			results.push({x: nextX, y: nextY});
		}

		return results;
	}

	// ステップの計算を実行します。
	execStep(x, y) {
		throw new Error;
	}
}

// 陽的 Euler 法で微分方程式を求めるためのクラスです。
class ExplicitEuler extends DiffEq {

	// Implement.
	execStep(x, y) {
		return y + this.df(x, y) * this.step;
	}
}

// Kutta の 3次公式で微分方程式を求めるためのクラスです。
class KuttasThirdOrder extends DiffEq {

	// 直近で使用した調査点のメモ。
	#lastPoints;

	// Butcher 配列。
	#bt = [
		[+0/1, +0/1, +0/1, +0/1],
		[+1/2, +1/2, +0/2, +0/2],
		[+2/2, -2/2, +4/2, +0/2],
		[+6/6, +1/6, +2/3, +1/6]
	];

	// 最後に使用した調査点の一覧を取得します。
	get lastPoints() {
		return this.#lastPoints;
	}

	// Implement.
	execStep(x, y) {

		const points = new Array(this.#bt.length);
		points[0] = {x, y};

		for (let i = 1; i < this.#bt.length; i++) {
			const pointX = x + this.#bt[i][0] * this.step;
			const pointY = y + points.reduce((s, p, j) => {
				return s + this.#bt[i][j + 1] * this.df(p.x, p.y) * this.step;
			}, 0);
			points[i] = {x: pointX, y: pointY};
		}

		this.#lastPoints = points;

		return points.at(-1).y;
	}
}
