var scripts 	= ["commands", "dashboard", "songRequest", "test", "app", "login"];

(function loadScripts() {
	$.getScript("js/partials/" + scripts.shift() + ".js", () => {
		if (scripts.length) {
			loadScripts();
		}
	});
}());