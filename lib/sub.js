{
	document.addEventListener("DOMContentLoaded", () => {
		const sub = document.getElementById("sub");
		sub.src = getQuerys().get("src");
	});

	function getQuerys() {
		const result = new Map;
		const querys = new URL(document.URL).search.substring(1);

		for (const param of querys.split('&')) {
			const [k, v] = param.split('=');
			result.set(decodeURIComponent(k), decodeURIComponent(v));
		}

		return result;
	}
}
