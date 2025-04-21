"use strict";

document.addEventListener("DOMContentLoaded", _ => new Main(new View));

class Main {

	#view;
	
	constructor(view) {
		this.#view = view;
		this.#bindSize();
		this.#bindBackground();
		this.#bindBorder();
	}

	#bindSize() {
		const [styleRule, selElm] = [this.#view.iconStyle, this.#view.elm.selSize];
		const action = _ => styleRule.width = selElm.selectedOptions[0].innerText;
		selElm.addEventListener("change", action);
		action();
	}

	#bindBorder() {
		const [styleRule, chkElm] = [this.#view.iconStyle, this.#view.elm.chkBorder];
		const action = _ => styleRule.borderColor = chkElm.checked ? "silver" : "transparent";
		chkElm.addEventListener("change", action);
		action();
	}

	#bindBackground() {
		const [styleRule, inpElm] = [this.#view.rootStyle, this.#view.elm.inputBackground];
		const action = _ => styleRule.background = inpElm.value;
		inpElm.addEventListener("change", action);
		action();
	}
}

class View {

	get elm() {
		return {
			selSize: document.getElementById("selSize"),
			inputBackground: document.getElementById("inputBackground"),
			chkBorder: document.getElementById("chkBorder")
		};
	}

	get iconStyle() {
		const styleSheet = document.getElementById("myStyle").sheet;
		const rule = [...styleSheet.cssRules].find(x => x.selectorText === "img.icon");
		return rule.style;
	}

	set iconWidth(value) {
		this.getIconStyle().width = value;
	}

	get rootStyle() {
		const styleSheet = document.getElementById("myStyle").sheet;
		const rule = [...styleSheet.cssRules].find(x => x.selectorText === "#sample");
		return rule.style;
	}
}
