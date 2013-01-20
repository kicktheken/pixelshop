define(["layer"],function Canvas(Layer) {
	var _this;
	var color, layers, activeLayer = -1;
	return Class.extend({
		init: function() {
			if (typeof _this !== 'undefined') {
                throw "Canvas is a singleton and cannot be initialized more than once";
            }
            _this = this;
            g['Canvas'] = this;
            layers = [];
            _this.addLayer();
		},
		setLayerOrder: function(order) {

		},
		addLayer: function() {
			if (layers.length >= 8) {
				return;
			}
			if (activeLayer >= 0) {
				$('#li-layer'+activeLayer).removeClass('active');
			}
			activeLayer = layers.length+1;
			layers.unshift(new Layer(activeLayer));
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
		}
	});
})