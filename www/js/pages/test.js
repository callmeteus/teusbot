$(document).on("click", "a[href='#nav-test-alert']", function(e) {
	e.preventDefault();
	socket.emit("test", "alert");
});

$(document).on("click", "a[href='#nav-test-donation']", function(e) {
	e.preventDefault();
	socket.emit("test", "donation");
});