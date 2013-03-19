define(["pixel","map"],function Canvas(Pixel,Map) {
	return Class.extend({
		init: function(width,height,canvas) {
			if (canvas) {
				this.canvas = canvas;
			} else {
				this.canvas = document.createElement('canvas');
			}
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
			var ret = [this.canvas,this.context];
			this.canvas = canvas;
			this.context = context;
			return ret;
		},
		resetDimensions: function(cc) {
			this.canvas = cc[0];
			this.context = cc[1];
		},
		draw: function(pixel) {
			pixel.draw(this.context);
			var x = pixel.x, y = pixel.y;
			this.updateBounds(x,y,x,y);
		},
		isValid: function(p) {
			return p.x < this.canvas.width && p.x >= 0 &&
				p.y < this.canvas.height && p.y >=0;
		},
		fill: function(pixel,map) {
			if (typeof map === 'undefined') {
				map = this.map = new Map();
				this.fillColor(new Pixel(this.context,pixel.x,pixel.y),pixel);
				delete this.map;
				return map;
			} else {
				this.fillMap(map,pixel);
			}
		},
		fillColor: function(oldp,newp) {
			var queue = [newp], p, np;
			while (queue.length > 0) {
				p = queue.shift();
				if (!oldp.diffColor(new Pixel(this.context,p.x,p.y))) {
					p.draw(this.context);
					this.map.set(p.x,p.y,true);
					if (p.x < this.canvas.width-1) {
						queue.push(new Pixel(p,p.x+1,p.y));
					}
					if (p.y < this.canvas.height-1) {
						queue.push(new Pixel(p,p.x,p.y+1));
					}
					if (p.x > 0) {
						queue.push(new Pixel(p,p.x-1,p.y));
					}
					if (p.y > 0) {
						queue.push(new Pixel(p,p.x,p.y-1));
					}
				}
			}
		},
		fillMap: function(m,pixel) {
			for (var y in m.map) {
				for (var x in m.map[y]) {
					this.context.putImageData(pixel.d,x,y);
				}
			}
		},
		pixel: function(x,y,color) {
			x += this.offset.x + Math.ceil(this.canvas.width/2);
			y += this.offset.y + Math.ceil(this.canvas.height/2);
			if (color) {
				return new Pixel(color,x,y);
			}
			return new Pixel(this.context,x,y);
		},
		loadActualSize: function(image) {
			this.clear();
			var x = Math.max(Math.ceil((this.canvas.width-image.width)/2),0);
			var y = Math.max(Math.ceil((this.canvas.height-image.height)/2),0);
			var width = Math.min(this.canvas.width,image.width);
			var height = Math.min(this.canvas.height,image.height);
			this.context.drawImage(image,x,y);
			this.updateBounds(x,y,x+width,y+height);
		},
		loadFit: function(image) {
			this.clear();
			var hs = this.canvas.width/image.width;
			var vs = this.canvas.height/image.height;
			this.context.save();
			this.context.scale(hs,vs);
			this.context.drawImage(image,0,0);
			this.context.restore();
			this.updateBounds(0,0,this.canvas.width,this.canvas.height);
		},
		loadFitVertical: function(image) {
			this.clear();
			var x = Math.max(Math.ceil((this.canvas.width-image.width)/2),0);
			var vs = this.canvas.height/image.height;
			var width = Math.min(this.canvas.width,image.width);
			this.context.save();
			this.context.scale(1,vs);
			this.context.drawImage(image,x,0);
			this.context.restore();
			this.updateBounds(x,0,x+width,this.canvas.height);
		},
		loadFitHorizontal: function(image) {
			this.clear();
			var y = Math.max(Math.ceil((this.canvas.height-image.height)/2),0);
			var hs = this.canvas.width/image.width;
			var height = Math.min(this.canvas.height,image.height);
			this.context.save();
			this.context.scale(hs,1);
			this.context.drawImage(image,0,y);
			this.context.restore();
			this.updateBounds(0,y,this.canvas.width,y+height);
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
		getOffset: function() {
			return {x:this.offset.x,y:this.offset.y};
		},
		setOffset: function(offset) {
			this.offset.x = offset.x;
			this.offset.y = offset.y;
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
		toDataObject: function(local) {
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
			if (local) {
				ret.img = canvas;
			} else {
				ret.data = canvas.toDataURL();
			}
			return ret;
		},
		export: function(selected,scale) {
			var x = 0, y = 0, width = this.canvas.width, height = this.canvas.height;
			if (selected) {
				x = selected.x;
				y = selected.y;
				width = selected.width;
				height = selected.height;
			}
			var canvas = this.canvas;
			if (scale > 1) {
				canvas = document.createElement("canvas");
				var context = canvas.getContext('2d');
				canvas.width = width*scale;
				canvas.height = height*scale;
				var d = this.context.getImageData(x,y,width,height);
				for (var j=0; j<height; j++) {
					for (var k=0; k<width; k++) {
						var i = (k+j*width)*4;
						if (d.data[i+3] > 0) {
							context.fillStyle = 'rgba('+d.data[i]+','+d.data[i+1]+','+d.data[i+2]+','+d.data[i+3]+')';
							context.fillRect(k*scale, j*scale, scale, scale);
						}
					}
				}
			}
			return canvas.toDataURL();
		},
		putData: function(data) {
			this.context.putImageData(data,0,0);
		},
		getData: function(width,height) {
			if (arguments.length === 0) {
				return this.context.getImageData(0,0,this.canvas.width,this.canvas.height);
			}
			var x = this.offset.x - width/2;
			var y = this.offset.y - height/2;
			return this.context.getImageData(x,y,width,height);
		},
		getViewData: function(x,y,width,height) {
			x += Math.ceil(this.canvas.width/2) - Math.ceil(width/2);
			y += Math.ceil(this.canvas.height/2) - Math.ceil(height/2);
			return this.context.getImageData(x,y,width+1,height+1);
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
