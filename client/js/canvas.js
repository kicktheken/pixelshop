define(["layer"],function Canvas(Layer) {
	var _this;
	var context, size, pressed, color, layers, order, activeLayer = -1;
	return Class.extend({
		init: function($canvas) {
			if (typeof _this !== 'undefined') {
                throw "Canvas is a singleton and cannot be initialized more than once";
            }
            _this = this;
            g['Canvas'] = this;
            context = $canvas.get(0).getContext('2d');
            pressed = false;
            layers = [];
            order = [];
            size = 20;
            _this.addLayer();
		},
		setLayerOrder: function(o) {
			order = o;
		},
		addLayer: function() {
			if (layers.length >= 8) {
				return;
			}
			if (activeLayer >= 0) {
				$('#li-layer'+activeLayer).removeClass('active');
			}
			activeLayer = layers.length+1;
			layers.push(new Layer(activeLayer));
			order.unshift(activeLayer);
			var d = _this.defaultColors();
			for (var l in layers) {
				layers[l].refresh(d[l]);
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
			x = Math.floor(x/size)*size;
			y = Math.floor(y/size)*size;
			context.fillStyle = color.toRgbString();
			context.fillRect(x,y,size,size);
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
		}
	});
})