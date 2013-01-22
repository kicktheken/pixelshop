define(["actions","layer","canvas"],function Engine(Actions, Layer, Canvas) {
	var _this, actions;
	var context, bg, buf, s, pressed, color, layers, order, activeLayer = -1;
	var sizes = [10,15,20,24,30];
	return Class.extend({
		init: function($canvas) {
			if (typeof _this !== 'undefined') {
                throw "Canvas is a singleton and cannot be initialized more than once";
            }
            _this = this;
            g['Canvas'] = this;
            actions = new Actions();
            context = $canvas.get(0).getContext('2d');
            pressed = false;
            layers = [];
            order = [];
            s = 2;
            bg = new Canvas(g.width,g.height);
            buf = new Canvas(g.width,g.height);
            _this.addLayer();
            _this.refreshBackground();
		},
		refresh: function() {
			context.drawImage(bg.canvas,0,0);
			var size = sizes[s], visible = 0;
			var width = g.width/size, height = g.height/size;
			buf.clear();
			for (var i=layers.length-1; i>=0; i--) {
				var layer = layers[order[i]];
				if (!layer.visible) {
					continue;
				}
				buf.collapse(layer.buf);
				visible++;
			}
			if (!visible) {
				return;
			}
			var d = buf.getViewData(width,height);
			for (var y=0; y<height; y++) {
				for (var x=0; x<width; x++) {
					var i = (x+y*width)*4;
					if (d.data[i+3] > 0) {
						context.fillStyle = 'rgba('+d.data[i]+','+d.data[i+1]+','+d.data[i+2]+','+d.data[i+3]+')';
						context.fillRect(x*size, y*size, size, size);
					}
				}
			}
		},
		refreshBackground: function() {
			bg.context.fillStyle = '#f4f4f4';
			bg.context.fillRect(0,0,g.width,g.height);
			bg.context.fillStyle = '#ddd';
            var size = sizes[s]/2;
            for (var y=0; y<g.height/size; y++) {
            	for (var x=(y%2); x<g.width/size; x+=2) {
            		bg.context.fillRect(x*size,y*size,size,size);
            	}
            }
            _this.refresh();
		},
		setLayerOrder: function(o) {
			order = o;
			_this.refresh();
		},
		addLayer: function() {
			if (layers.length >= 8) {
				return;
			}
			if (activeLayer >= 0) {
				$('#li-layer'+(activeLayer+1)).removeClass('active');
			}
			activeLayer = layers.length;
			layers.push(new Layer(activeLayer));
			order.unshift(activeLayer);
			for (var l in layers) {
				layers[l].refresh();
			}
			return layers.length;
		},
		setActiveLayer: function(index) {
			activeLayer = index;
		},
		defaultColors: function() {
			return ['blue','red','green','yellow','orange','brown','black','white','purple','beige'];
		},
		setColor: function(c) {
            color = c;
		},
		draw: function(x,y) {
			var size = sizes[s];
			x = Math.floor(x/size);
			y = Math.floor(y/size);
			actions.draw(layers[activeLayer],color,x,y);
			_this.refresh();
			_this.updateUndo();
		},
		undo: function() {
			if (actions.undo()) {
				_this.refresh();
				_this.updateUndo();
			}
		},
		updateUndo: function() {
			if (actions.canUndo()) {
				$('#undo').removeClass('disabled');
			} else {
				$('#undo').addClass('disabled',true);
			}
		},
		redo: function() {
			if (actions.redo()) {
				_this.refresh();
				_this.updateUndo();
			}
		},
		cursorMove: function(x,y) {
			if (!pressed) {
				return;
			}
			_this.draw(x,y);
		},
		cursorStart: function(x,y) {
			pressed = true;
			_this.draw(x,y);
		},
		cursorEnd: function() {
			pressed = false;
			actions.endDraw();
		}
	});
})