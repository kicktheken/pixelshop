define(["pixel"],function Canvas(Pixel) {
	function defaultOffset(width,height) {
		return {x: width/6, y: height/6 };
	}
	return Class.extend({
		init: function(width,height) {
			this.canvas = document.createElement('canvas');
			this.canvas.width = width;
			this.canvas.height = height;
			this.context = this.canvas.getContext('2d');
			this.offset = defaultOffset(width,height);
		},
		updateBounds: function(minx,miny,maxx,maxy) {
			if (!this.bounds) {
				this.bounds = [minx,miny,maxx,maxy];
			} else {
				var b = this.bounds;
				if (minx < b[0]) {
					b[0] = minx;
				} else if (maxx > b[2]) {
					b[2] = maxx;
				}
				if (miny < b[1]) {
					b[1] = miny;
				} else if (maxy > b[3]) {
					b[3] = maxy;
				}
			}
		},
		draw: function(pixel) {
			pixel.draw(this.context);
			var x = pixel.x, y = pixel.y;
			this.updateBounds(x,y,x,y);
		},
		pixel: function(x,y,color) {
			x += this.offset.x - g.Engine.viewWidth()/2;
			y += this.offset.y - g.Engine.viewHeight()/2;
			if (color) {
				return new Pixel(color,x,y);
			}
			return new Pixel(this.context,x,y);
		},
		load: function(image) {
			var x = this.offset.x-image.width/2;
			var y = this.offset.y-image.height/2;
			var maxx = this.offset.x+image.width/2;
			var maxy = this.offset.y+image.height/2;
			this.context.drawImage(image,x,y);
			this.updateBounds(x,y,maxx,maxy);
		},
		move: function(x,y) {
			this.offset.x += x;
			this.offset.y += y;
			if (this.offset.x < 0) {
				this.offset.x = 0;
			} else if (this.offset.x > this.canvas.width) {
				this.offset.x = this.canvas.width;
			}
			if (this.offset.y < 0) {
				this.offset.y = 0;
			} else if (this.offset.x > this.canvas.height) {
				this.offset.y = this.canvas.height;
			}
		},
		viewable: function(vw,vh) {
			vw /= 2;
			vh /= 2;
			var ret = {x:0, y:0, width:vw*2, height:vh*2};
			if (this.offset.x < vw) {
				ret.x = vw - this.offset.x;
			} else if (this.offset.x > this.canvas.width - vw) {
				ret.width = this.offset.x - this.canvas.width + vw*2;
			}
			if (this.offset.y < vh) {
				ret.y = vh - this.offset.y;
			} else if (this.offset.y > this.canvas.height - vh) {
				ret.height = this.offset.y - this.canvas.height + vh*2;
			}
			return ret;
		},
		collapse: function(buf) {
			var x = this.offset.x - buf.offset.x;
			var y = this.offset.y - buf.offset.y;
			this.context.drawImage(buf.canvas,x,y);
		},
		clear: function() {
			this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
		},
		getViewData: function(width,height) {
			var x = this.offset.x - g.Engine.viewWidth()/2;
			var y = this.offset.y - g.Engine.viewHeight()/2;
			return this.context.getImageData(x,y,width,height);
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