define(["actions","layer","canvas"],function Engine(Actions, Layer, Canvas) {
	var _this, actions, canvas, context;
	var bg, buf, s, pressed, mode, color, colori, layers, order, activeLayer = -1;
	var host = /[^\/]+\/\/[^\/]+/g.exec(window.location.href) + g.proxyPrefix;
	var sizes = [6,8,10,15,20,24,30], cursor, dotted, drawing;
	var saveTimer, saved, email, cheight = $(".container").height() + 1;
	var darkPattern, lightPattern, medPattern, pan, selected, clipboard;
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
			s = 3;
			buf = new Canvas(g.width,g.height);
			bg = new Canvas(g.width,g.height);
			cursor = new Canvas(sizes[s],sizes[s]);
			selected = false;
			clipboard = false;
			pan = {x:0,y:0};
			mode = 'draw';
			saved = true;
			drawing = false;
			email = "";
			_this.initDotted();
			_this.addLayer();
			_this.refreshBackground();
			_this.initSignin();
			_this.resize();
			_this.initDialogs();
			_this._updateDo();
			_this.updateLayers();
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
				position: [canvas.width/2-274,41],
				resizable: false,
				width:552,
				height:56
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
		initDotted: function() {
			dotted = document.createElement("canvas");
			var d = 2, h = d/2;
			dotted.width = d;
			dotted.height = d;
			var ct = dotted.getContext('2d');
			ct.fillStyle = 'white';
			ct.fillRect(0,0,d,d);
			ct.fillStyle = 'black';
			ct.fillRect(0,0,h,h);
			ct.fillRect(h,h,h,h);
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
			var edge = sizes[sizes.length-1];
			bg.canvas.width = width+edge;
			bg.canvas.height = height+edge;
			_this.refresh();
		},
		viewWidth: function() {
			return canvas.width/sizes[s];
		},
		viewHeight: function() {
			return canvas.height/sizes[s];
		},
		refresh: function(cx,cy) {
			context.shadowBlur = 0;
			var size = sizes[s], visible = 0;
			var width = Math.ceil(canvas.width/size);
			var height = Math.ceil(canvas.height/size);
			var xrem = Math.ceil(canvas.width/2)+buf.offset.x + pan.x;
			xrem = xrem%size - ((xrem%size > 0) ? size : 0);
			var yrem = Math.ceil(canvas.height/2)+buf.offset.y + pan.y;
			yrem = yrem%size - ((yrem%size > 0) ? size : 0);

			bg.context.fillStyle = darkPattern;
			bg.context.fillRect(0,0,bg.canvas.width,bg.canvas.height);
			var v = layers[activeLayer].buf.viewable(width,height);

			var remx = Math.ceil(canvas.width/2)+buf.offset.x;
			remx = remx%size - ((remx%size > 0) ? size : 0);
			var remy = Math.ceil(canvas.height/2)+buf.offset.y;
			remy = remy%size - ((remy%size > 0) ? size : 0);

			var dx = pan.x-xrem+remx, dy = pan.y-yrem+remy;
			bg.context.fillStyle = medPattern;
			bg.context.fillRect(v.x*size+dx, v.y*size+dy, v.width*size, v.height*size);
			var l = buf.viewable(width,height);
			bg.context.fillRect(l.x*size+dx, l.y*size+dy, l.width*size, l.height*size);
			var minx = Math.min(v.x,l.x), maxx = Math.max(v.x,l.x);
			var miny = Math.min(v.y,l.y), maxy = Math.max(v.y,l.y);
			bg.context.fillStyle = lightPattern;
			bg.context.fillRect(maxx*size+dx, maxy*size+dy, (v.width-maxx+minx)*size, (v.height-maxy+miny)*size);
			context.drawImage(bg.canvas,xrem,yrem);

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
						context.fillRect(x*size+remx+pan.x, y*size+remy+pan.y, size, size);
					}
				}
			}

			if (selected) {
				var mx = selected.x-Math.ceil(g.width/2);
				var my = selected.y-Math.ceil(g.height/2);
				width = selected.width;
				height = selected.height;
				cursor.canvas.width = width*size+2;
				cursor.canvas.height = height*size+2;
				cursor.context.strokeStyle = context.createPattern(dotted,"repeat");
				cursor.context.lineWidth = 2;
				cursor.context.strokeRect(1,1,width*size,height*size);
				mx = mx*size + Math.ceil(canvas.width/2)+buf.offset.x + pan.x;
				my = my*size + Math.ceil(canvas.height/2)+buf.offset.y + pan.y;
				context.drawImage(cursor.canvas,mx,my);
				if (selected.done && cx >= mx && cx <= mx+width*size && cy >= my && cy <= my+height*size) {
					canvas.style.cursor = "move";
				} else {
					canvas.style.cursor = "";
				}
				if (selected.data) {
					var d = selected.data;
					for (var y=0; y<height; y++) {
						for (var x=0; x<width; x++) {
							var i = (x+y*width)*4;
							if (d.data[i+3] > 0) {
								context.fillStyle = 'rgba('+d.data[i]+','+d.data[i+1]+','+d.data[i+2]+','+d.data[i+3]+')';
								var sx = x*size+mx;
								var sy = y*size+my;
								context.fillRect(sx, sy, size, size);
							}
						}
					}
				}
			} else {
				canvas.style.cursor = "";
			}
			$(canvas).removeClass();
			if (mode === 'pan') {
				$(canvas).addClass((pressed) ? "handclosed" : "handopen");
			} else if (mode === 'move') {
				canvas.style.cursor = "move";
			} else if (typeof cx !== 'undefined' && typeof cy !== 'undefined') {
				cx = Math.floor((cx-xrem)/size)*size + xrem - 1;
				cy = Math.floor((cy-yrem)/size)*size + yrem - 1;
				if (!selected) {
					context.drawImage(cursor.canvas,cx,cy);
				}
				context.font="bold 14px Arial";
				context.textAlign="right";
				context.textBaseline="top";
				context.fillStyle = 'black';
				context.shadowColor = 'white';
				context.shadowBlur = 3;
				var hx = Math.ceil((cx - (v.x*size+dx))/size)+1;
				var hy = Math.ceil((cy - (v.y*size+dy))/size)+1;
				context.fillText(hx+","+hy,canvas.width-10,10);
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
			ct.fillStyle = "#ccc";
			ct.fillRect(0,0,d,d);
			ct.fillStyle = "#e0e0e0";
			ct.fillRect(h,1,m,m);
			ct.fillRect(1,h,m,m);
			medPattern = ct.createPattern(c,"repeat");
			
			cursor.canvas.width = d+2;
			cursor.canvas.height = d+2;
			cursor.clear();
			cursor.context.strokeStyle = ct.createPattern(dotted,"repeat");
			cursor.context.lineWidth = 2;
			cursor.context.strokeRect(1,1,d,d);
			_this.refresh();
		},
		setLayerOrder: function(o) {
			order = o;
			_this.refresh();
		},
		updateLayers: function() {
			var option = (layers.length > 1) ? 'enable' : 'disable';
			$('#combinelayer').button(option);
			$('#removelayer').button(option);
		},
		addLayer: function() {
			activeLayer = layers.length;
			var layer = new Layer(activeLayer);
			layers.push(layer);
			order.unshift(activeLayer);
			layer.refresh();
			_this.updateLayers();
			_this.setActiveLayer(activeLayer,true);
		},
		cloneLayer: function() {
			var old = layers[activeLayer];
			var i = order.indexOf(activeLayer);
			activeLayer = layers.length;
			order.splice(i,0,activeLayer);
			var layer = new Layer(activeLayer);
			layers.push(layer);
			layer.copy(old);
			_this.updateLayers();
			_this.setActiveLayer(activeLayer,true);
		},
		combineLayer: function() {
			if (layers.length <= 1) {
				return;
			}
			var src = layers.splice(activeLayer,1)[0], dest;
			var ri;
			for (var i in order) {
				if (order[i] === activeLayer) {
					order.splice(i,1);
					ri = i;
				} else if (order[i] > activeLayer) {
					order[i]--;
				}
			}
			if (ri == order.length) {
				activeLayer = order[ri-1];
				dest = layers[activeLayer];
				src.buf.collapse(dest.buf);
				dest.copy(src);
			} else {
				activeLayer = order[ri];
				dest = layers[activeLayer];
				dest.buf.collapse(src.buf);
			}
			dest.refresh();
			src.remove();
			_this.updateLayers();
			_this.setActiveLayer(activeLayer,true);
		},
		removeLayer: function() {
			if (layers.length <= 1) {
				return;
			}
			var layer = layers.splice(activeLayer,1)[0];
			var ri;
			for (var i in order) {
				if (order[i] === activeLayer) {
					order.splice(i,1);
					ri = i;
				} else if (order[i] > activeLayer) {
					order[i]--;
				}
			}
			layer.remove();
			_this.updateLayers();
			activeLayer = (ri == order.length) ? order[ri-1] : order[ri];
			_this.setActiveLayer(activeLayer,true);
		},
		setActiveLayer: function(index,local) {
			activeLayer = index;
			if (local) {
				$("#layers .sortable li").removeClass("active");
				$("#li-layer"+layers[activeLayer].index).addClass("active");
			}
			_this.refresh();
		},
		defaultColors: function() {
			return ['blue','red','green','yellow','orange','brown','black','white','purple','beige'];
		},
		setColor: function(i) {
			if (mode !== 'fill') {
				$('[name="radio"]').removeAttr("checked").button('refresh');
				$('label[for="draw"]').addClass("ui-state-active");
				_this.setMode('draw');
			}
			color = $("#color"+i).spectrum('get');
			$("#colors .sortable li").css({
				"background" : "",
				"border" : ""
			});
			$("#li-color"+i).css({
				"background" : color.toHexString(),
				"border" : "1px solid black"
			});
			colori = i;
		},
		unloadSelected: function() {
			if (selected.data) {
				var c = document.createElement("canvas"), ct = c.getContext('2d');
				c.width = selected.width;
				c.height = selected.height;
				ct.putImageData(selected.data,0,0);
				var index;
				if (selected.index) {
					for (var i in layers) {
						if (layers[i].index === selected.index) {
							index = i;
							break;
						}
					}
				} else {
					index = activeLayer;
				}
				if (typeof index !== 'undefined') {
					layers[index].buf.context.drawImage(c,selected.x,selected.y);
					layers[index].refresh();
				}
			}
			selected = false;
		},
		setMode: function(m) {
			if (pressed) { // prevent switching modes while mousedown
				return false;
			}
			mode = m;
			_this.unloadSelected();
			_this.refreshBackground();
			return true;
		},
		perform: function(x,y) {
			var changed = false;
			switch (mode) {
			case 'draw': 	changed = _this.draw(color,x,y); break;
			case 'fill': 	changed = _this.fill(color,x,y); break;
			case 'eraser': 	changed = _this.draw(blankcolor,x,y); break;
			case 'pan': 	return _this.pan(x,y);
			case 'dropper': changed = _this.selectColor(x,y); break;
			case 'select': 	return _this.select(x,y);
			case 'move':	changed = _this.move(x,y); break;
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
		beforeUnload: function() {
			if (!_this.isSaved()) {
				if (Modernizr.localstorage) {
					_this.saveWorkspace('local');
				} else {
					return "You have unsaved changes.";
				}
			}
		},
		load: function(image) {
			_this.unloadSelected();
			_this.addLayer();
			actions.load(layers[activeLayer],image);
			_this.queueSave();
			_this.refreshBackground();
			_this._updateDo();
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
				if (!data || data.length === 0) {
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

						_this.saveWorkspace('logoff');
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
					var localWorkspace = _this.getLocalWorkspace();
					if (localWorkspace) {
						localWorkspace.email = workspace.email;
						_this._loadWorkspace(localWorkspace);
					} else {
						_this._loadWorkspace(workspace);
					}
				});
			}).fail(function(err) {
				var workspace = _this.getLocalWorkspace();
				if (workspace) {
					_this._loadWorkspace(workspace);
				} else {
					log.error("unable to load workspace");
					var defaultColors = _this.defaultColors();
					$('.colorpicker').each(function(i) {
						var c = defaultColors[i];
						i = (i+1)%10;
						$('#color'+i).spectrum('set', c);
					});
					_this.setColor(1);
				}
				saved = false;
			});
		},
		deleteLocalWorkspace: function() {
			Object.keys(localStorage).forEach(function(key){
				localStorage.removeItem(key);
			});
		},
		getLocalWorkspace: function() {
			if (!Modernizr.localstorage || !localStorage.workspace) {
				return false;
			}
			var workspace = JSON.parse(localStorage.workspace);
			var valid = isInt(workspace.numLayers);
			valid = valid && workspace.layers instanceof Array && workspace.layers.length > 0;
			valid = valid && typeof workspace.pan === 'object';
			valid = valid && isInt(workspace.pan.x) && isInt(workspace.pan.y);
			if (!valid) {
				_this.deleteLocalWorkspace();
				return false;
			}
			var w = workspace.layers;
			for (var i in w) {
				if (typeof w[i] !== 'object' || !isInt(w[i].ox) || !isInt(w[i].oy)) {
					_this.deleteLocalWorkspace();
					return false;
				}
				if (w[i].data) {
					valid = /^data:image\/png;base64,[A-Za-z0-9+/=]+/.test(w[i].data);
					valid = valid && isInt(w[i].x) && isInt(w[i].y) && isInt(w[i].w) && isInt(w[i].h);
					if (!valid) {
						_this.deleteLocalWorkspace();
						return false;
					}
				}
			}
			delete workspace.email;
			_this.deleteLocalWorkspace();
			return workspace;
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
				pan = workspace.pan;
				for (var i=0; i<workspace.colors.length; i++) {
					var index = (i+1)%10;
					$('#color'+index).spectrum('set',workspace.colors[i]);
				}
				_this.setColor(1);
				_this.refresh();
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
		saveWorkspace: function(action) {
			var workspace = { numLayers: layers.length, layers: [], colors: [], pan: pan };
			for (var i=layers.length-1; i>=0; i--) {
				if (activeLayer === order[i]) {
					workspace.active = i;
				}
				workspace.layers[i] = layers[order[i]].getWorkspace();
			}
			$('.colorpicker').each(function(i) {
				i = (i+1)%10;
				workspace.colors.push($('#color'+i).spectrum('get').toRgbString());
			});
			if (action === 'local') {
				localStorage.workspace = JSON.stringify(workspace);
				return;
			}
			var layersData = JSON.stringify(workspace.layers);
			LZMA.compress(layersData,1,function(result) {
				var binstring = String.fromCharCode.apply(null,result);
				if (email.length) {
					workspace.email = email;
				}
				workspace.layers = binstring;
				var data = JSON.stringify(workspace);
				var action = (action === 'logoff') ? '/newworkspace' : '/saveworkspace';
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
		draw: function(color,cx,cy) {
			drawing = true;
			var size = sizes[s];
			var x = Math.floor((cx-canvas.width/2-pan.x)/size);
			var y = Math.floor((cy-canvas.height/2-pan.y)/size);
			var ret = actions.draw(layers[activeLayer],color,x,y);
			_this.refresh(cx,cy);
			_this._updateDo();
			return ret;
		},
		fill: function(color,cx,cy) {
			var size = sizes[s];
			var x = Math.floor((cx-canvas.width/2-pan.x)/size);
			var y = Math.floor((cy-canvas.height/2-pan.y)/size);
			var ret = actions.fill(layers[activeLayer],color,x,y);
			_this.refresh(cx,cy);
			_this._updateDo();
			return ret;
		},
		selectColor: function(cx,cy) {
			var size = sizes[s];
			var x = Math.floor((cx-canvas.width/2-pan.x)/size);
			var y = Math.floor((cy-canvas.height/2-pan.y)/size);
			var pixel = layers[activeLayer].buf.pixel(x,y);
			color = $('#color'+colori).spectrum('set',pixel.toColorString()).spectrum('get');
			$("#li-color"+colori).css({
				"background" : color.toHexString(),
				"border" : "1px solid black"
			});
		},
		pan: function(x,y) {
			var size = sizes[s];
			var px = pan.x + x-pressed.x, py = pan.y + y-pressed.y;
			var xlim = buf.canvas.width/2*size, ylim = buf.canvas.height/2*size;
			if (px > xlim) {
				pan.x = xlim;
			} else if (px < -xlim) {
				pan.x = -xlim;
			} else {
				pan.x = px;
			}
			if (py > ylim) {
				pan.y = ylim;
			} else if (py < -ylim) {
				pan.y = -ylim;
			} else {
				pan.y = py;
			}
			_this.refresh();
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
		select: function(cx,cy) {
			var size = sizes[s];
			var x = Math.floor((cx-canvas.width/2-pan.x)/size)+Math.ceil(g.width/2);
			var y = Math.floor((cy-canvas.height/2-pan.y)/size)+Math.ceil(g.height/2);
			if (canvas.style.cursor == "move" && selected.done) {
				var v = selected;
				if (!v.data) {
					v.data = layers[activeLayer].buf.context.getImageData(v.x,v.y,v.width,v.height);
					layers[activeLayer].buf.clear(v.x,v.y,v.width,v.height);
				}
				if (typeof v.dx === 'undefined') {
					v.dx = x-v.x;
					v.dy = y-v.y;
					v.src = {x:v.x,y:v.y};
				}
				v.x = x-v.dx;
				v.y = y-v.dy;
			} else {
				if (!selected || selected.done) {
					_this.unloadSelected();
					selected = { src: {x:x,y:y} };
				}
				selected.width = Math.abs(selected.src.x-x)+1;
				selected.height = Math.abs(selected.src.y-y)+1;
				selected.x = Math.min(selected.src.x,x);
				selected.y = Math.min(selected.src.y,y);
			}
			_this.refresh(cx,cy);
		},
		setDimensions: function() {
			var $input = $('#dimensions');
			var s = $input.val();
			s = s.split(/[^0-9]+/);
			if (s.length > 1 && isInt(s[0]) && isInt(s[1])) {
				g.width = s[0];
				g.height = s[1];
				buf.setDimensions(g.width,g.height);
				for (var i in layers) {
					layers[i].buf.setDimensions(g.width,g.height);
				}
				_this.refresh();
			}
			$('#resize-dialog').dialog('close');
			$input.val("");
		},
		resizeCanvas: function() {
			$('#dimensions').attr('placeholder',g.width+'x'+g.height);
			$('#frame').attr('placeholder',g.width+'x'+g.height);
			function apply() {
				
			}
			$(".numeric input").keyup(function (e) {
				if (e.keyCode == 13) {
					_this.setDimensions();
				}
			});
			$('#resize-dialog').dialog({
				dialogClass: "no-close",
				modal:true,
				draggable:false,
				resizable:false,
				width:190,
				height:150,
				title: "Dimensions",
				buttons: {
					Apply: _this.setDimensions,
					Cancel: function() {
						$(this).dialog('close');
					}
				}
			});
		},
		undo: function() {
			_this.updateDo('undo');
		},
		updateDo: function(task) {
			if (pressed) {
				return; // disable actions on mousedown
			}
			var ret = actions[task]();
			if (!ret) {
				return;
			}
			if (typeof ret === 'object') {
				selected = ret;
			}
			if (ret.index === layers[activeLayer].index) {
				mode = 'select';
				$('[name="radio"]').removeAttr("checked").button('refresh');
				$('label[for="select"]').addClass("ui-state-active");
				_this.refresh();
			} else {
				if (task === 'redo' || typeof ret === 'object') {
					_this.unloadSelected();
				} else {
					selected = false;
				}
				_this.refreshBackground(); // restore cursor
			}
			_this._updateDo();
		},
		_updateDo: function() {
			if (actions.canUndo()) {
				$('#undo').button('enable');
			} else {
				$('#undo').button('disable');
			}
			if (actions.canRedo()) {
				$('#redo').button('enable');
			} else {
				$('#redo').button('disable');
			}
		},
		redo: function() {
			_this.updateDo('redo');
		},
		copy: function() {
			if (selected && selected.done) {
				var v = selected;
				v.data = layers[activeLayer].buf.context.getImageData(v.x,v.y,v.width,v.height);
				clipboard = selected; // keep reference as to not clear what was previously there
			}
		},
		cut: function() {
			if (selected && selected.done) {
				var v = selected;
				clipboard = {x:v.x,y:v.y,width:v.width,height:v.height,done:true};
				clipboard.data = layers[activeLayer].buf.context.getImageData(v.x,v.y,v.width,v.height);
				actions.cut(layers[activeLayer],clipboard);
				_this.refresh();
			}
		},
		paste: function() {
			if (clipboard) {
				actions.paste(layers[activeLayer],clipboard);
				var c = clipboard;
				selected = {x:c.x,y:c.y,width:c.width,height:c.height,data:c.data,done:true};
				selected.src = {x:selected.x,y:selected.y};
				mode = 'select';
				$('[name="radio"]').removeAttr("checked").button('refresh');
				$('label[for="select"]').addClass("ui-state-active");
				_this.refresh();
			}
		},
		cursorMove: function(x,y) {
			if (!pressed) {
				_this.refresh(x,y);
			} else {
				_this.perform(x,y);
				pressed.x = x;
				pressed.y = y;
			}
		},
		cursorStart: function(x,y) {
			pressed = {x:x,y:y,mx:0,my:0};
			_this.perform(x,y);
		},
		cursorEnd: function(e) {
			pressed = false;
			if (drawing) {
				actions.endDraw();
				drawing = false;
			} else if (selected) {
				if (selected.done) {
					// if references are same, it's a paste
					if (clipboard === selected) {
						actions.paste(layers[activeLayer],clipboard);
						var c = clipboard; // undo reference so next time is a drag select
						selected = {x:c.x,y:c.y,width:c.width,height:c.height,done:true};
						selected.data = c.data;
					} else {
						actions.dragSelect(layers[activeLayer],selected);
					}
					selected.src = {x:selected.x,y:selected.y};
				} else {
					selected.done = true;
				}
				_this.refresh(e.x-1,e.y-1-cheight);
			}
		},
		cursorOut: function() {
			_this.refresh();
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
				$('#zoomin').button('disable');
			} else if (s === 0) {
				$('#zoomout').button('disable');
			} else {
				$('#zoomin').button('enable');
				$('#zoomout').button('enable');
			}
		}
	});
});
