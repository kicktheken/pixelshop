define(["actions","layer","canvas"],function Engine(Actions, Layer, Canvas) {
	var _this, actions, canvas, context;
	var buf, s, pressed, mode, color, layers, order, activeLayer = -1;
	var host = /[^\/]+\/\/[^\/]+/g.exec(window.location.href) + g.proxyPrefix;
	var sizes = [6,8,10,15,20,24,30];
	var saveTimer, saved, email;
	var darkPattern, lightPattern, cheight = $(".container").height() + 1;
	var authURL = "https://accounts.google.com/o/oauth2/auth";
	var blankcolor = { toRgb: function() { return {r:0,g:0,b:0,a:0}; } };
	return Class.extend({
		init: function($canvas) {
			if (typeof _this !== 'undefined') {
				throw "Engine is a singleton and cannot be initialized more than once";
			}
			_this = this;
			g['Engine'] = this;
			actions = new Actions();
			canvas = $canvas.get(0);
			context = canvas.getContext('2d');
			pressed = false;
			layers = [];
			order = [];
			s = 4;
			buf = new Canvas(g.width,g.height);
			mode = 'draw';
			saved = true;
			email = "";
			_this.addLayer();
			_this.refreshBackground();
			_this.initSignin();
			_this.resize();
			_this.initDialogs();
		},
		initSignin: function() {
			var oauth2 = config.oauth2, query = [];
			for (var param in oauth2) {
				query.push(param+"="+oauth2[param]);
			}
			$('#signin').attr("href", authURL+"?"+query.join("&"));
		},
		initDialogs: function() {
			$("#toolbar").dialog({
				dialogClass: "no-close",
				title:"",
				position: [canvas.width/2-251,41],
				resizable: false,
				width:503,
				height:55
			});
			$("#colors").dialog({
				dialogClass: "no-close",
				position: [0,100],
				resizable: false,
				width:90,
				minWidth:90,
				height:426
			});
			$("#layers").dialog({
				dialogClass: "no-close",
				position: [canvas.width-129,100],
				resizable: false,
				width:129,
				minWidth:129,
				height:400
			});
			$(".ui-dialog").draggable("option", "containment", "#canvas");
		},
		reposition: function(selector,newwidth,newheight) {
			try { //disable for initial setup
				var pos = $(selector).dialog("option","position");
				pos[0] = Math.floor(pos[0]/canvas.width*newwidth);
				pos[1] = Math.floor(pos[1]/canvas.height*newheight);
				pos[1] = Math.max(cheight, pos[1]);
				$(selector).dialog("option", {position:pos});
			} catch(err) {
				return false;
			}
			return true;
		},
		resize: function() {
			var width = $(window).width(), height = $(window).height();
			height -= cheight;
			if (_this.reposition("#toolbar",width,height)) {
				_this.reposition("#colors",width,height)
				_this.reposition("#layers",width,height)
			}
			canvas.width = width;
			canvas.height = height;

			context.fillStyle = lightPattern;
			context.fillRect(0,0,width,height);
			_this.refresh();
		},
		viewWidth: function() {
			return g.width/sizes[s];
		},
		viewHeight: function() {
			return g.height/sizes[s];
		},
		refresh: function() {
			var size = sizes[s], visible = 0;
			var width = Math.ceil(canvas.width/size);
			var height = Math.ceil(canvas.height/size);
			context.fillStyle = lightPattern;
			context.fillRect(0,0,canvas.width,canvas.height);
			var v = layers[activeLayer].buf.viewable(width,height);
			context.fillStyle = lightPattern;
			context.fillRect(v.x*size,v.y*size,v.width*size,v.height*size);
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
			var c = document.createElement("canvas"), ct = c.getContext('2d');
			var d = sizes[s], h = d/2, m = h-1;
			c.width = d;
			c.height = d;
			ct.fillStyle = "#bbb";
			ct.fillRect(0,0,d,d);
			ct.fillStyle = "#ddd";
			ct.fillRect(h,1,m,m);
			ct.fillRect(1,h,m,m);
			darkPattern = ct.createPattern(c,"repeat");
			ct.fillRect(0,0,d,d);
			ct.fillStyle = "#f4f4f4";
			ct.fillRect(h,1,m,m);
			ct.fillRect(1,h,m,m);
			lightPattern = ct.createPattern(c,"repeat");
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
		setActiveLayer: function(index,local) {
			activeLayer = index;
			if (local) {
				$("#layers .sortable li").removeClass("active");
				$("#li-layer"+(index+1)).addClass("active");
			}
			_this.refresh();
		},
		defaultColors: function() {
			return ['blue','red','green','yellow','orange','brown','black','white','purple','beige'];
		},
		setColor: function(c) {
			$('[name="radio"]').removeAttr("checked").button('refresh');
			$('label[for="draw"]').addClass("ui-state-active");
			_this.setMode('draw');
            color = c;
		},
		setMode: function(m) {
			mode = m;
		},
		perform: function(x,y) {
			var changed = false;
			switch (mode) {
			case 'draw': 	changed = _this.draw(color,x,y); break;
			case 'fill': 	return;
			case 'eraser': 	changed = _this.draw(blankcolor,x,y); break;
			case 'drag': 	return _this.move(x,y);
			case 'dropper': return;
			case 'select': 	return;
			case 'brighten':return;
			case 'darken':	return;
			}
			if (changed) {
				_this.queueSave();
			}
		},
		queueSave: function() {
			saved = false;
			clearTimeout(saveTimer);
			saveTimer = setTimeout(_this.saveWorkspace, g.timeout*2);
			
		},
		isSaved: function() {
			return saved;
		},
		load: function(image) {
			_this.addLayer();
			actions.load(layers[activeLayer],image);
			_this.queueSave();
			_this.refresh();
			_this.updateUndo();
		},
		resetWorkspace: function() {
			var toRemove = layers.splice(1,layers.length-1);
			for (var i in toRemove) {
				toRemove[i].remove();
			}
			layers[0].resetWorkspace();
			order = [0];
			_this.setActiveLayer(0,true);
		},
		loadWorkspace: function() {
			var qs = window.location.hash, query = "";
			if (qs.length && /#access_token=\w+/.test(qs)) {
				query = "?" + qs.substr(1);
				log.info(query);
				window.location.hash = "";
			}
			$.get(host+'/getworkspace'+query, function(data) {
				if (data.length === 0) {
					return;
				}
				var workspace = typeof data === 'object' ? data : JSON.parse(data);
				if (workspace.email) {
					email = workspace.email;
					$('#email').text(email);
					$('#signin').removeClass('btn-danger')
					.attr("href","#").text("Sign out")
					.click(function(e) {
						e.preventDefault();
						$(this).addClass('btn-danger').text("Sign in");
						email = "";
						$('#email').text(email);
						log.info("commencing signoff");
						$(this).unbind('click');

						_this.saveWorkspace(true);
					});
				}
				if (!workspace.layers) {
					return;
				}
				var binarray = [];
				for (var i=0; i<workspace.layers.length; i++) {
					binarray.push(workspace.layers.charCodeAt(i));
				}
				LZMA.decompress(binarray, function(json) {
					workspace.layers = JSON.parse(json);
					_this._loadWorkspace(workspace);
				});
			}).fail(function(err) {
				log.error("unable to load workspace");
				$(window).unbind('beforeunload');
			});
		},
		_loadWorkspace: function(workspace) {
			var finished = 0;
			function loadImage() {
				if (this instanceof Image) {
					workspace.layers[this.i].img = this;
					this.onload = null;
				}
				finished++;
				if (finished < workspace.numLayers) {
					return;
				}
				var diff = layers.length - workspace.numLayers;
				if (diff > 0) {
					var toRemove = layers.splice(layers.length - diff,diff);
					for (var i=0; i<order.length; i++) {
						if (layers[order[i]] === undefined) {
							order.splice(i,1);
							i--;
						}
					}
					for (var i in toRemove) {
						toRemove[i].remove();
					}
				} else if (diff < 0) {
					diff *= -1;
					for (var i=0; i<diff; i++) {
						var l = layers.length;
						layers.push(new Layer(l));
						order.unshift(l);
					}
				}
				for (var i=layers.length-1; i>=0; i--) {
					layers[order[i]].setWorkspace(workspace.layers[i]);
				}
				var i = order[workspace.active];
				$('#li-layer'+(activeLayer+1)).removeClass('active');
				_this.setActiveLayer(i,true);
			}
			for (var i=0; i<workspace.numLayers; i++) {
				if (!workspace.layers[i].data) {
					loadImage();
					continue;
				}
				var img = new Image();
				img.onload = loadImage;
				img.i = i;
				img.src = workspace.layers[i].data;
			}
		},
		saveWorkspace: function(logoff) {
			var workspace = { numLayers: layers.length, layers: [] };
			for (var i=layers.length-1; i>=0; i--) {
				if (activeLayer === order[i]) {
					workspace.active = i;
				}
				workspace.layers[i] = layers[order[i]].getWorkspace();
			}
			var layersData = JSON.stringify(workspace.layers);
			LZMA.compress(layersData,1,function(result) {
				var binstring = String.fromCharCode.apply(null,result);
				if (email.length) {
					workspace.email = email;
				}
				workspace.layers = binstring;
				var data = JSON.stringify(workspace);
				var action = (logoff) ? '/newworkspace' : '/saveworkspace';
				$.ajax({
					type: "POST",
					url: host+action,
					data: data,
					success: function(data) {
						log.info("save successful (length: "+binstring.length+")");
						saved = true;
						if (logoff) {
							_this.resetWorkspace();
							_this.initSignin();
						}
						//_this._loadWorkspace(workspace);
					},
					error: function(err) {
						//log.error("failed to save workspave");
						if (logoff) {
							_this.resetWorkspace();
							_this.initSignin();
						}
					},
					timeout: g.timeout
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
		export: function() {
			var obj = buf.toDataObject();
			if (!obj.data) {
				return;
			}
			var dataURL = obj.data;
			var base64img = dataURL.substr(dataURL.indexOf(',')+1).toString();
			$('#hidden').val(base64img);
			$('form').attr("action",host+'/exportpng').submit();
		},
		draw: function(color,x,y) {
			var size = sizes[s];
			x = Math.floor(x/size);
			y = Math.floor(y/size);
			var ret = actions.draw(layers[activeLayer],color,x,y);
			_this.refresh();
			_this.updateUndo();
			return ret;
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
