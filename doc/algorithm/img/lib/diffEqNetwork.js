{
	class Connector {
		#nodeRadius;

		constructor(nodeId, parentId) {
			this.#nodeRadius = this.#getNodeRadius(nodeId);
		}

		join(gId, n1Id, n2Id, opt) {
			const gElm = document.getElementById(gId);
			const pathElm = gElm.children[0];
			const labelElm = gElm.children[1];
			const c1 = this.#getNodePos(document.getElementById(n1Id));
			const c2 = this.#getNodePos(document.getElementById(n2Id));
			this.#setPath(pathElm, c1, c2, opt);
			this.#setLabel(labelElm, c1, c2, opt);
		}

		#setPath(pathElm, c1, c2, opt) {
			const vRot = opt?.rot || 0;
			const rS = this.#nodeRadius;
			const rL = Math.min(rS * 3, c2.sub(c1).norm() - 2 * rS);
			const p1 = c1.add(c2.sub(c1).normalize().mul(+rS).rot(+vRot));
			const p2 = c1.add(c2.sub(c1).normalize().mul(+rL).rot(+vRot));
			const p3 = c2.add(c2.sub(c1).normalize().mul(-rL).rot(-vRot));
			const p4 = c2.add(c2.sub(c1).normalize().mul(-rS).rot(-vRot));
			const d = `M ${p1.toFixed(2)} C ${p2.toFixed(2)} ${p3.toFixed(2)} ${p4.toFixed(2)}`;
			pathElm.setAttribute("d", d);
		}

		#setLabel(labelElm, c1, c2, opt) {
			const defaultOffset = new Vec2(-10, -5);
			const manualOffset = new Vec2(opt?.dx || 0, opt?.dy || 0);
			const v = c2.sub(c1);
			const m = c1.add(c2).mul(0.5);
			const p = m.add(defaultOffset).add(manualOffset);
			const deg = Math.atan(v.y / v.x) * 180 / Math.PI;
			labelElm.setAttribute("x", p.x.toFixed(2));
			labelElm.setAttribute("y", p.y.toFixed(2));
			labelElm.setAttribute("transform", `rotate(${deg.toFixed(2)}, ${m.toFixed(2)})`);
		}

		#getNodePos(elm) {
			const transform = elm.getAttribute("transform");
			const rexpArr = /translate\(\s*(\d+)\s*,\s*(\d+)\)/.exec(transform);
			return new Vec2(parseFloat(rexpArr[1]), parseFloat(rexpArr[2]));
		}

		#getNodeRadius(id) {
			const elm = document.getElementById(id);
			return parseFloat(elm.getAttribute("r"));
		}
	}

	class Vec2 {
		constructor(x, y) {
			this.x = x;
			this.y = y;
		}

		add(v) {
			return new Vec2(this.x + v.x, this.y + v.y);
		}

		sub(v) {
			return new Vec2(this.x - v.x, this.y - v.y);
		}

		mul(val) {
			return new Vec2(this.x * val, this.y * val);
		}

		rot(theta) {
			const x = this.x * Math.cos(theta) - this.y * Math.sin(theta);
			const y = this.x * Math.sin(theta) + this.y * Math.cos(theta);
			return new Vec2(x, y);
		}

		norm() {
			return Math.sqrt(this.x * this.x + this.y * this.y);
		}

		normalize() {
			return new Vec2(this.x / this.norm(), this.y / this.norm());
		}

		toFixed(n) {
			return `${this.x.toFixed(n)},${this.y.toFixed(n)}`;
		}
	}

	window.Connector = Connector;
}

