define(function Pixel() {
	var context = document.createElement('canvas').getContext('2d');
	return Class.extend({
		// passed with color or context or pixel
		init: function(c,x,y) {
			if (typeof c.toRgb === 'function') {
				var c = c.toRgb();
				var d = context.createImageData(1,1);
				d.data[0] = c.r;
				d.data[1] = c.g;
				d.data[2] = c.b;
				d.data[3] = (typeof c.a === 'undefined') ? 255: c.a*255;
				this.d = d;
			} else if (typeof c.diffColor === 'function') {
				this.d = context.createImageData(1,1);
				this.copyColor(c);
			} else {
				this.d = c.getImageData(x,y,1,1);
			}
			this.x = x;
			this.y = y;
		},
		exists: function() {
			return !!this.d;
		},
		draw: function(context) {
			context.putImageData(this.d,this.x,this.y);
		},
		diff: function(p) {
			return this.diffColor(p) || this.y !== p.y || this.x !== p.x;
		},
		diffColor: function(p) {
			return  p.d.data[0] !== this.d.data[0]
				|| p.d.data[1] !== this.d.data[1]
				|| p.d.data[2] !== this.d.data[2]
				|| p.d.data[3] !== this.d.data[3];
		},
		copyColor: function(p) {
			this.d.data[0] = p.d.data[0];
			this.d.data[1] = p.d.data[1];
			this.d.data[2] = p.d.data[2];
			this.d.data[3] = p.d.data[3];
		},
		isClear: function() {
			return this.d.data[3] === 0;
		},
		toString: function() {
			var x = this.x, y = this.y;
			return [x+1,y+1].join(',')+' -> '+this.toColorString();
		},
		toColorString: function() {
			var d = this.d.data;
			return 'rgba('+d[0]+','+d[1]+','+d[2]+','+d[3]+')';
		},
		line: function(dest) {
			var ret = [];
			var x = this.x, y = this.y;
			var dx = dest.x - x, dy = dest.y - y;
			if (Math.abs(dx) > Math.abs(dy)) {
				var slope = (dx) ? dy/dx : 0;
				if (dx > 0) {
					for (x=x+1; x < dest.x; x++) {
						ret.push([x,Math.round((x-this.x)*slope+this.y)]);
					}
				} else {
					for (x=x-1; x > dest.x; x--) {
						ret.push([x,Math.round((x-this.x)*slope+this.y)]);
					}
				}
			} else {
				var slope = (dy) ? dx/dy : 0;
				if (dy > 0) {
					for (y=y+1; y < dest.y; y++) {
						ret.push([Math.round((y-this.y)*slope+this.x),y]);
					}
				} else {
					for (y=y-1; y > dest.y; y--) {
						ret.push([Math.round((y-this.y)*slope+this.x),y]);
					}
				}
			}
			return ret;
		}
	});
});
