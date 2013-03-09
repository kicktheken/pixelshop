define(["pixel"],function Canvas(Pixel) {
	return Class.extend({
		init: function(width,height) {
			this.canvas = document.createElement('canvas');
			this.canvas.width = width;
			this.canvas.height = height;
			this.context = this.canvas.getContext('2d');
			this.offset = {x:0,y:0};
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
		setDimensions: function(width,height) {
			var canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			var context = canvas.getContext('2d');
			context.drawImage(this.canvas,0,0);
			this.canvas = canvas;
			this.context = context;
		},
		draw: function(pixel) {
			pixel.draw(this.context);
			var x = pixel.x, y = pixel.y;
			this.updateBounds(x,y,x,y);
		},
		pixel: function(x,y,color) {
			x += this.offset.x + Math.ceil(this.canvas.width/2);
			y += this.offset.y + Math.ceil(this.canvas.height/2);
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
		loadData: function(data,x,y) {
			this.context.putImageData(data,x,y);
		},
		move: function(x,y) {
			this.offset.x += x;
			this.offset.y += y;
			if (this.offset.x < -this.canvas.width+1) {
				this.offset.x = -this.canvas.width+1;
			} else if (this.offset.x > this.canvas.width-1) {
				this.offset.x = this.canvas.width-1;
			}
			if (this.offset.y < -this.canvas.height+1) {
				this.offset.y = -this.canvas.height+1;
			} else if (this.offset.y > this.canvas.height-1) {
				this.offset.y = this.canvas.height-1;
			}
		},
		viewable: function(width,height) {
			var x = Math.ceil(width/2) - Math.ceil(this.canvas.width/2) - this.offset.x;
			var y = Math.ceil(height/2) - Math.ceil(this.canvas.height/2) - this.offset.y;
			var ret = {x:x, y:y, width:this.canvas.width, height:this.canvas.height};
			return ret;
		},
		copy: function(buf) {
			this.canvas.width = buf.canvas.width;
			this.canvas.height = buf.canvas.height;
			this.context.drawImage(buf.canvas,0,0);
			this.offset.x = buf.offset.x;
			this.offset.y = buf.offset.y;
			var b = buf.bounds;
			if (b) {
				this.updateBounds(b[0],b[1],b[2],b[3]);
			}
		},
		collapse: function(buf) {
			var x = this.offset.x - buf.offset.x;
			var y = this.offset.y - buf.offset.y;
			var b = buf.bounds;
			this.context.drawImage(buf.canvas,x,y);
			if (b) {
				this.updateBounds(b[0],b[1],b[2],b[3]);
			}
		},
		clear: function() {
			if (arguments.length === 4) {
				var a = arguments;
				this.context.clearRect(a[0],a[1],a[2],a[3]);
			} else {
				this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
			}
		},
		reset: function() {
			this.clear();
			this.offset = defaultOffset(this.canvas.width,this.canvas.height);
		},
		setCanvas: function(obj) {
			this.offset.x = obj.ox;
			this.offset.y = obj.oy;
			this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
			if (!obj.w || !obj.h) {
				return;
			}
			this.bounds = [obj.x, obj.y, obj.x+obj.w, obj.y+obj.h];
			this.context.drawImage(obj.img,obj.x,obj.y);
		},
		toDataObject: function() {
			var ret = {
				ox: this.offset.x,
				oy: this.offset.y
			};
			if (!this.bounds) {
				return ret;
			}
			var b = this.bounds, width = b[2]-b[0]+1, height = b[3]-b[1]+1;
			var data = this.context.getImageData(b[0],b[1],width,height);
			var canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			var context = canvas.getContext('2d');
			context.putImageData(data,0,0);
			ret.x = b[0];
			ret.y = b[1];
			ret.w = width;
			ret.h = height;
			ret.data = canvas.toDataURL();
			return ret;
		},
		getData: function(width,height) {
			var x = this.offset.x - width/2;
			var y = this.offset.y - height/2;
			return this.context.getImageData(x,y,width,height);
		},
		getViewData: function(width,height) {
			var x = Math.ceil(this.canvas.width/2) - Math.ceil(width/2);
			var y = Math.ceil(this.canvas.height/2) - Math.ceil(height/2);
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
