define(["actions","layer","canvas"],function Engine(Actions, Layer, Canvas) {
	var _this, actions;
	var context, bg, buf, s, pressed, mode, color, layers, order, activeLayer = -1;
	var sizes = [10,15,20,24,30], host = 'http://'+g.host+'/a';
	var blankcolor = { toRgb: function() { return {r:0,g:0,b:0,a:0}; } };
	return Class.extend({
		init: function($canvas) {
			if (typeof _this !== 'undefined') {
                throw "Engine is a singleton and cannot be initialized more than once";
            }
            _this = this;
            g['Engine'] = this;
            actions = new Actions();
            context = $canvas.get(0).getContext('2d');
            pressed = false;
            layers = [];
            order = [];
            s = 2;
            bg = new Canvas(g.width,g.height);
            buf = new Canvas(g.width,g.height);
            mode = 'draw';
            _this.addLayer();
            _this.refreshBackground();
		},
		viewWidth: function() {
			return g.width/sizes[s];
		},
		viewHeight: function() {
			return g.height/sizes[s];
		},
		refresh: function() {
			var size = sizes[s], visible = 0;
			var width = g.width/size, height = g.height/size;
			context.fillStyle = '#bbb';
			context.fillRect(0,0,g.width,g.height);
			var v = layers[activeLayer].buf.viewable(width,height);
			context.fillStyle = '#f4f4f4';
			context.fillRect(v.x*size,v.y*size,v.width*size,v.height*size);
			context.drawImage(bg.canvas,0,0);
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
			bg.clear();
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
			_this.refresh();
		},
		defaultColors: function() {
			return ['blue','red','green','yellow','orange','brown','black','white','purple','beige'];
		},
		setColor: function(c) {
			$('#draw').button('toggle');
			_this.setMode('draw');
            color = c;
		},
		setMode: function(m) {
			mode = m;
		},
		perform: function(x,y) {
			switch (mode) {
			case 'draw': 	return _this.draw(color,x,y);
			case 'fill': 	return;
			case 'eraser': 	return _this.draw(blankcolor,x,y);
			case 'drag': 	return _this.move(x,y);
			case 'dropper': return;
			case 'select': 	return;
			case 'brighten':return;
			case 'darken':	return;
			}
		},
		load: function(image) {
			_this.addLayer();
			actions.load(layers[activeLayer],image);
			_this.refresh();
			_this.updateUndo();
		},
		loadWorkspace: function() {
			$.get(host+'/getworkspace', function(data) {
				
			}).fail(function(err) {
				log.warn("unable to load workspace");
			});
		},
		saveWorkspace: function() {
			var workspace = { active: activeLayer, layers: layers.length };
			for (var i=layers.length-1; i>=0; i--) {
				workspace[i] = layers[order[i]].buf.toDataObject();
			}
			var data = JSON.stringify(workspace);
			LZMA.compress(data,1,function(result) {
				var binstring = String.fromCharCode.apply(null,result);
				$.post(host+'/saveworkspace',binstring,function(data) {
					log.info('data: '+data);
				}).fail(function(err) {
					log.warn("failed to save workspave");
				});
			});
		},
		save: function() {
			var data = buf.canvas.toDataURL();
			data = JSON.stringify(buf.toDataObject());
			LZMA.compress(data,1, function(result) {
				var binstring = String.fromCharCode.apply(null,result);
				log.info(binstring.length);
				var binarray = [];
				for (var i=0; i<binstring.length; i++) {
					binarray.push(binstring.charCodeAt(i));
				}
				LZMA.decompress(binarray, function(result) {
					log.info(result);
				});
			});
		},
		draw: function(color,x,y) {
			var size = sizes[s];
			x = Math.floor(x/size);
			y = Math.floor(y/size);
			actions.draw(layers[activeLayer],color,x,y);
			_this.refresh();
			_this.updateUndo();
		},
		move: function(x,y) {
			var size = sizes[s];
			pressed.mx += x-pressed.x;
			pressed.my += y-pressed.y;
			x = (pressed.mx > 0) ? Math.floor(pressed.mx/size) : Math.ceil(pressed.mx/size);
			y = (pressed.my > 0) ? Math.floor(pressed.my/size) : Math.ceil(pressed.my/size);
			if (x !== 0 || y !== 0) {
				pressed.mx -= x*size;
				pressed.my -= y*size;
				layers[activeLayer].buf.move(-x,-y);
				_this.refresh();
			}
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
			_this.perform(x,y);
			pressed.x = x;
			pressed.y = y;
		},
		cursorStart: function(x,y) {
			pressed = {x:x,y:y,mx:0,my:0};
			_this.perform(x,y);
		},
		cursorEnd: function() {
			pressed = false;
			actions.endDraw();
		},
		zoomIn: function() {
			if (s+1 < sizes.length) {
				s++;
				_this.refreshBackground();
				_this.updateZoom();
			}
		},
		zoomOut: function() {
			if (s > 0) {
				s--;
				_this.refreshBackground();
				_this.updateZoom();
			}
		},
		updateZoom: function() {
			if (s+1 === sizes.length) {
				$('#zoomin').addClass('disabled');
			} else if (s === 0) {
				$('#zoomout').addClass('disabled');
			} else {
				$('#zoomin').removeClass('disabled');
				$('#zoomout').removeClass('disabled');
			}
		}
	});
})