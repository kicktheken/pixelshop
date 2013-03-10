define(function Map() {
	return Class.extend({
		init: function() {
			this.map = new Object();
		},
		set: function(x,y,val) {
			if (this.map[y] === undefined) {
				this.map[y] = new Object();
			}
			this.map[y][x] = val;
		},
		get: function(x,y) {
			if (this.map[y] === undefined) {
				return;
			}
			return this.map[y][x];
		}
	});
});
