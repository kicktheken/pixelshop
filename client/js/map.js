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
			if (this.bounds) {
				var b = this.bounds;
				if (x < b[0]) {
					b[0] = x;
				} else if (x > b[2]) {
					b[2] = x;
				}
				if (y < b[1]) {
					b[1] = y;
				} else if (y > b[3]) {
					b[3] = y;
				}
			} else {
				this.bounds = [x,y,x,y];
			}
		},
		get: function(x,y) {
			if (this.map[y] === undefined) {
				return;
			}
			return this.map[y][x];
		}
	});
});
