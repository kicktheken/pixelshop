define(function Canvas() {
	function defaultOffset(width,height) {
		return {x: width/8, y: height/8 };
	}
	return Class.extend({
		init: function(width,height) {
			this.canvas = document.createElement('canvas');
			this.canvas.width = width;
			this.canvas.height = height;
			this.context = this.canvas.getContext('2d');
			this.offset = defaultOffset(width,height);
		},
		draw: function(color,x,y) {
			var c = color.toRgb();
			if (c.a === 0) {
				return;
			}
			var d = this.context.createImageData(1,1), old;
			x += this.offset.x;
			y += this.offset.y;
			d.data[0] = c.r;
			d.data[1] = c.g;
			d.data[2] = c.b;
			d.data[3] = (c.a) ? c.a*255 : 255;
			this.context.putImageData(d,x,y);
			if (!this.bounds) {
				old = this.bounds = [x,y,x,y];
			} else {
				var b = this.bounds;
				old = [b[0],b[1],b[2],b[3]];
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
			}
			return old;
		},
		collapse: function(buf) {
			var x = buf.offset.x - this.offset.x;
			var y = buf.offset.y - this.offset.y;
			this.context.drawImage(buf.canvas,x,y);
		},
		clear: function() {
			this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
		},
		getViewData: function(width,height) {
			return this.context.getImageData(this.offset.x,this.offset.y,width,height);
		},
		getViewDataFromBounds: function(width,height) {
			if (!this.bounds) {
				return;
			}
			var b = this.bounds;
			var x = (b[0]+b[2]-width)/2, y = (b[1]+b[3]-height)/2;
			return this.context.getImageData(x,y,width,height);

		}
	});
});