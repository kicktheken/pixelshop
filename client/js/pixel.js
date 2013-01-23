define(function Pixel() {
	var context = document.createElement('canvas').getContext('2d');
	return Class.extend({
		// passed with color or context
		init: function(c,x,y) {
			if (typeof c.toRgb === 'function') {
				var c = c.toRgb();
				var d = context.createImageData(1,1);
				d.data[0] = c.r;
				d.data[1] = c.g;
				d.data[2] = c.b;
				d.data[3] = (typeof c.a === 'undefined') ? 255: c.a*255;
				this.d = d;
				this.x = x;
				this.y = y;
			} else {
				this.d = c.getImageData(x,y,1,1);
				this.x = x;
				this.y = y;
			}
		},
		exists: function() {
			return !!this.d;
		},
		draw: function(context) {
			context.putImageData(this.d,this.x,this.y);
		},
		diff: function(p) {
			return  p.d.data[0] !== this.d.data[0]
				|| p.d.data[1] !== this.d.data[1]
				|| p.d.data[2] !== this.d.data[2]
				|| p.d.data[3] !== this.d.data[3]
				|| this.y !== p.y || this.x !== p.x;
		},
		toString: function() {
			var d = this.d.data, x = this.x, y = this.y;
			d = [d[0],d[1],d[2],d[3]];
			return [x,y].join(',')+' -> rgba('+d.join(',')+')';
		}
	});
});