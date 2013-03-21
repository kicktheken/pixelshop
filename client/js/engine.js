define(["actions","layer","canvas","pixel"],function Engine(Actions, Layer, Canvas, Pixel) {
	var _this, actions, canvas, context, uploadPreview;
	var bg, buf, s, pressed, mode, colorsel, layers, order, activeLayer = -1;
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
			uploadPreview = new Canvas(527,257,$('#upload-preview').get(0));
			selected = false;
			clipboard = false;
			colorsel = new Object();
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
				position: [canvas.width/2-253,41],
				resizable: false,
				width:506,
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
				position: [canvas.width-140,100],
				width:140,
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
			var xrem = Math.ceil(canvas.width/2) + pan.x;
			xrem = xrem%size - ((xrem%size > 0) ? size : 0);
			var yrem = Math.ceil(canvas.height/2) + pan.y;
			yrem = yrem%size - ((yrem%size > 0) ? size : 0);

			bg.context.fillStyle = darkPattern;
			bg.context.fillRect(0,0,bg.canvas.width,bg.canvas.height);
			var v = layers[activeLayer].buf.viewable(width,height);

			var remx = Math.ceil(canvas.width/2);
			remx = remx%size - ((remx%size > 0) ? size : 0);
			var remy = Math.ceil(canvas.height/2);
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
			var ox = Math.floor((pan.x-xrem)/size), oy = Math.floor((pan.y-yrem)/size);
			var d = buf.getViewData(-ox,-oy,width,height);
			for (var y=0; y<height+1; y++) {
				for (var x=0; x<width+1; x++) {
					var i = (x+y*(width+1))*4;
					if (d.data[i+3] > 0) {
						context.fillStyle = 'rgba('+d.data[i]+','+d.data[i+1]+','+d.data[i+2]+','+d.data[i+3]+')';
						context.fillRect(x*size+xrem, y*size+yrem, size, size);
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
				mx = mx*size + Math.ceil(canvas.width/2) + pan.x;
				my = my*size + Math.ceil(canvas.height/2) + pan.y;
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
				context.shadowBlur = 10;
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
		},
		addLayer: function() {
			var i = order.indexOf(activeLayer);
			activeLayer = layers.length;
			var l = (i<=0) ? -1 : layers[order[i-1]].index;
			var layer = new Layer(l);
			layers.push(layer);
			if (i > 0) {
				order.splice(i,0,activeLayer);
			} else {
				order.unshift(activeLayer);
			}
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
			var l = activeLayer, isBefore, workspace, data;
			var undo = function() {
				var i = order.indexOf(l);
				l = layers.length;
				var src,dest;
				if (i >= 0) {
					dest = layers[order[i]];
					order.splice((isBefore) ? i : i+1,0,l);
					src = new Layer(dest.index,isBefore);
				} else {
					throw "fatal error: missing layer"
				}
				src.setWorkspace(workspace);
				dest.buf.putData(data);
				layers.push(src);
				dest.refresh();
				_this.updateLayers();
				_this.refresh();
				workspace = null;
				data = null;
				return true;
			};
			var redo = function() {
				var src = layers[l], dest;
				if (l >= 0) {
					var ri, nl;
					for (var i in order) {
						if (order[i] == l) {
							ri = i;
						} else if (order[i] > l) {
							order[i]--;
						}
					}
					order.splice(ri,1);
					layers.splice(l,1);
					workspace = src.getWorkspace(true);
					isBefore = ri < order.length;
					if (!isBefore) {
						nl = order[ri-1];
						dest = layers[nl];
						data = dest.buf.getData();
						src.buf.collapse(dest.buf);
						dest.copy(src);
					} else {
						nl = order[ri];
						dest = layers[nl];
						data = dest.buf.getData();
						dest.buf.collapse(src.buf);
					}
					dest.refresh();
					src.remove();
					_this.updateLayers();
					if (activeLayer === l) {
						activeLayer = nl;
						_this.setActiveLayer(activeLayer,true);
					} else {
						_this.refresh();
					}
					l = nl;
				}
				return true;
			};
			actions.actionWrapper(undo,redo);
		},
		removeLayer: function() {
			if (layers.length <= 1) {
				actions.clear(layers[activeLayer]);
				_this.refresh();
				return;
			}
			var l = activeLayer, workspace;
			var undo = function() {
				var i = order.indexOf(l);
				l = layers.length;
				var layer;
				if (i >= 0) {
					layer = new Layer(layers[order[i]].index);
					order.splice(i+1,0,l);
				} else {
					order.unshift(l);
					layer = new Layer();
				}
				layers.push(layer);
				layer.setWorkspace(workspace);
				layer.refresh();
				_this.updateLayers();
				_this.refresh();
				workspace = null;
				return true;
			};
			var redo = function() {
				var layer = layers[l];
				if (l >= 0) {
					var ri;
					for (var i in order) {
						if (order[i] == l) {
							ri = i;
						} else if (order[i] > l) {
							order[i]--;
						}
					}
					order.splice(ri,1);
					layers.splice(l,1);
					workspace = layer.getWorkspace(true);
					layer.remove();
					if (activeLayer === l) {
						activeLayer = (ri == order.length) ? order[ri-1] : order[ri];
						_this.setActiveLayer(activeLayer,true);
					} else {
						_this.refresh();
					}
					l = (ri > 0) ? order[ri-1] : -1;
					_this.updateLayers();
				}
				return true;
			};
			actions.actionWrapper(undo,redo);
		},
		setActiveLayer: function(index,local) {
			activeLayer = index;
			if (local) {
				$("#layers .sortable li").removeClass("active");
				$("#li-layer"+layers[activeLayer].index).addClass("active");
			}
			_this.refresh();
		},
		indexTranslation: function(index) {
			for (var i in layers) {
				if (layers[i].index === index) {
					return parseInt(i);
				}
			}
			throw "cannot find index "+index;
		},
		defaultColors: function() {
			return ['blue','red','green','yellow','orange','brown','black','white','purple','beige'];
		},
		setColor: function() {
			if (mode !== 'fill' && mode !== 'dropper') {
				$('[name="radio"]').removeAttr("checked").button('refresh');
				$('label[for="draw"]').addClass("ui-state-active");
				_this.setMode('draw');
			}
			var oldcolor = colorsel.c;
			var color = colorsel.c = $("#color"+colorsel.i).spectrum('get');
			var i = colorsel.i;
			var undo = function() {
				colorsel.c = oldcolor;
				$("#color"+i).spectrum('set',oldcolor.toHexString());
				if (colorsel.i === i) {
					$("#li-color"+i).css({
						"background" : oldcolor.toHexString(),
						"border" : "1px solid black"
					});
				}
				return true;
			};
			var redo = function() {
				colorsel.c = color;
				$("#color"+i).spectrum('set',color.toHexString());
				if (colorsel.i === i) {
					$("#li-color"+i).css({
						"background" : color.toHexString(),
						"border" : "1px solid black"
					});
				}
				return true;
			};
			actions.actionWrapper(undo,redo);
		},
		setColorIndex: function(i) {
			if (mode !== 'fill' && mode !== 'dropper') {
				$('[name="radio"]').removeAttr("checked").button('refresh');
				$('label[for="draw"]').addClass("ui-state-active");
				_this.setMode('draw');
			}
			colorsel.c = $("#color"+i).spectrum('get');
			$("#colors .sortable li").css({
				"background" : "",
				"border" : ""
			});
			$("#li-color"+i).css({
				"background" : colorsel.c.toHexString(),
				"border" : "1px solid black"
			});
			colorsel.i = i;
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
			case 'draw': 	changed = _this.draw(colorsel.c,x,y); break;
			case 'fill': 	changed = _this.fill(colorsel.c,x,y); break;
			case 'eraser': 	changed = _this.draw(blankcolor,x,y); break;
			case 'pan': 	return _this.pan(x,y);
			case 'dropper': changed = _this.selectColor(x,y); break;
			case 'select': 	return _this.select(x,y);
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
		newWorkspace: function() {
			var $dialog = $('#reset-dialog');
			function reset() {
				var val = $('#resetdimensions').val();
				if (!/[0-9]+[^0-9]+[0-9]+/.test(val)) {
					val = "40x40";
				}
				_this.setDimensions.apply(_this,val.split(/[^0-9]+/));
				if ($('#resetcolors').is(':checked')) {
					_this.defaultWorkspace();
				}
				_this.resetWorkspace();
				$dialog.dialog('close');
			}
			$('#resetdimensions').keyup(function (e) {
				if (e.keyCode == 13) { // enter key
					reset();
				}
			});
			$dialog.dialog({
				dialogClass: "no-close",
				modal:true,
				draggable:false,
				resizable:false,
				width:200,
				height:180,
				title:"New Workspace",
				buttons: {
					"Apply": function() {
						reset();
					},
					"Cancel": function() {
						$(this).dialog('close');
					}
				}
			});
			$dialog.parent().find('.ui-dialog-title').css('display','inherit');
			$dialog.dialog('close').dialog('open'); // hack to update height for adding titlebar
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
		defaultWorkspace: function() {
			var workspace = _this.getLocalWorkspace();
			if (workspace) {
				_this._loadWorkspace(workspace);
			} else {
				log.info("loading default workspace");
				var defaultColors = _this.defaultColors();
				$('.colorpicker').each(function(i) {
					var c = defaultColors[i];
					i = (i+1)%10;
					$('#color'+i).spectrum('set', c);
				});
				_this.setColorIndex(1);
			}
			saved = false;
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
					_this.defaultWorkspace();
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
						_this.initSignin();
						_this.saveWorkspace('logoff');
					});
				}
				if (!workspace.layers) {
					_this.defaultWorkspace();
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
				_this.defaultWorkspace();
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
			// check if the workspace is valid
			var valid = isInt(workspace.numLayers) && isInt(workspace.width) && isInt(workspace.height);
			valid = valid && workspace.colors instanceof Array && workspace.colors.length === 10;
			valid = valid && workspace.layers instanceof Array && workspace.layers.length > 0;
			valid = valid && typeof workspace.pan === 'object';
			valid = valid && isInt(workspace.pan.x) && isInt(workspace.pan.y);
			if (!valid) {
				_this.deleteLocalWorkspace();
				return false;
			}
			var w = workspace.layers;
			for (var i in w) {
				if (typeof w[i] !== 'object') {
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
				g.width = workspace.width;
				g.height = workspace.height;
				buf.setDimensions(g.width,g.height);
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
						layers.push(new Layer());
						order.unshift(l);
					}
				}
				for (var i=layers.length-1; i>=0; i--) {
					layers[order[i]].buf.setDimensions(g.width,g.height);
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
				_this.setColorIndex(1);
				_this.updateLayers();
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
			var workspace = {
				numLayers: layers.length,
				layers: [],
				colors: [],
				width: g.width,
				height: g.height,
				pan: pan
			};
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
				var binstring = '';
				for (var i=0; i<result.length; i++) {
					binstring += String.fromCharCode(result[i]);
				}
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
						if (action === 'logoff') {
							_this.resetWorkspace();
							_this.initSignin();
						}
						//_this._loadWorkspace(workspace);
					},
					error: function(err) {
						//log.error("failed to save workspave");
						if (action === 'logoff') {
							_this.resetWorkspace();
							_this.initSignin();
						}
					},
					timeout: g.timeout
				});
			});
		},
		purge: function() {
			saved = true;
			$.get(host+'/deleteworkspace');
			log.info('workspace purged on restart');
		},
		upload: function(image) {
			if (image.width <= buf.canvas.width && image.height <= buf.canvas.height) {
				_this.load('loadActualSize',image);
				return;
			}
			uploadPreview.loadActualSize(image);
			var dialog = $dialog = $('#upload-dialog');
			var width = Math.max(image.width,buf.canvas.width);
			var height = Math.max(image.height,buf.canvas.height);
			$dialog.dialog({
				dialogClass: "no-close",
				modal:true,
				draggable:false,
				resizable:false,
				width:550,
				height:428,
				title:"Load Image",
				buttons: {
					"Actual Size": function() {
						if ($('#expand').is(":checked")) {
							_this.setDimensions(width,height);
						}
						_this.load('loadActualSize',image);
						$(this).dialog('close');
					},
					"Scale to Fit": function() {
						_this.load('loadFit',image);
						$(this).dialog('close');
					},
					"Fit Vertical": function() {
						if ($('#expand').is(":checked")) {
							_this.setDimensions(width,height);
						}
						_this.load('loadFitVertical',image);
						$(this).dialog('close');
					},
					"Fit Horizontal": function() {
						if ($('#expand').is(":checked")) {
							_this.setDimensions(width,height);
						}
						_this.load('loadFitHorizontal',image);
						$(this).dialog('close');
					},
					"Cancel": function() {
						$(this).dialog('close');
					}
				}
			});
			$('#expand').focus(function(e) { // fix jqueryui focus bug
				$(this).blur();
			}).blur();
			$dialog.parent().find('.ui-dialog-title').css('display','inherit');
			$dialog.dialog('close').dialog('open'); // hack to update height for adding titlebar
			var methodMap = ['loadActualSize','loadFit','loadFitVertical','loadFitHorizontal'];
			$dialog.next().find('.ui-button').each(function(i) {
				$(this).hover(function(e) {
					uploadPreview[methodMap[i]](image);
				});
			});
		},
		loadExternal: function(url) { // to bypass same origin security restrictions
			var img = new Image();
			img.onload = function() {
				this.onload = null;
				_this.upload(this);
			};
			img.src = host+'/proxy?url='+url;
		},
		load: function(method,image) {
			_this.unloadSelected();
			_this.addLayer();
			layers[activeLayer].load(method,image);
			_this.queueSave();
			_this.refreshBackground();
		},
		download: function() {
			$("#exportname").keyup(function (e) {
				if (e.keyCode == 13) { // enter key
					_this.export($(this).val(),/\d+/.exec($('#scale').val()));
				}
			});
			var dialog = $dialog = $('#download-dialog');
			$dialog.dialog({
				dialogClass: "no-close",
				modal:true,
				draggable:false,
				resizable:false,
				width:300,
				height:250,
				title:"Save to Disk",
				buttons: {
					Download: function() {
						_this.export($('#exportname').val(),/\d+/.exec($('#scale').val()));
						$(this).dialog('close');
					},
					Cancel: function() {
						$(this).dialog('close');
					}
				}
			});
			$dialog.parent().find('.ui-dialog-title').css('display','inherit');
			$dialog.dialog('close').dialog('open'); // hack to update height for adding titlebar
		},
		export: function(name,scale) {
			var dataURL = buf.export(selected,scale);
			var base64img = dataURL.substr(dataURL.indexOf(',')+1).toString();
			$('#filename').val(name);
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
			return ret;
		},
		selectColor: function(cx,cy) {
			var size = sizes[s];
			var x = Math.floor((cx-canvas.width/2-pan.x)/size);
			var y = Math.floor((cy-canvas.height/2-pan.y)/size);
			var pixel = layers[activeLayer].buf.pixel(x,y);
			_this.refresh(cx,cy);
			if (pixel.isClear()) {
				return; // don't select zero alpha pixel
			}
			var p = new Pixel(colorsel.c,x,y);
			if (!p.diffColor(pixel)) {
				return;
			}
			$('#color'+colorsel.i).spectrum('set',pixel.toColorString());
			_this.setColor();
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
		selectAll: function() {
			if (mode !== 'select') {
				mode = 'select';
				$('[name="radio"]').removeAttr("checked").button('refresh');
				// jquery ui bug? have to explicitly highlight
				$('label[for="select"]').addClass("ui-state-active");
			}
			_this.unloadSelected();
			selected = { width:g.width, height:g.height, x:0, y:0, done:true};
			_this.refresh();
		},
		setDimensions: function(width,height) {
			width = parseInt(width);
			height = parseInt(height);
			if (isInt(width) && isInt(height)) {
				if (width > 1024) {
					width = 1024;
				}
				if (height > 1024) {
					height = 1024;
				}
				var oldwidth = g.width, oldheight = g.height, restore = [];
				var undo = function() {
					g.width = oldwidth;
					g.height = oldheight;
					buf.setDimensions(g.width,g.height);
					for (var i in restore) {
						layers[i].buf.resetDimensions(restore[i]);
					}
					restore = [];
					_this.refresh();
					return true;
				};
				var redo = function() {
					g.width = width;
					g.height = height;
					buf.setDimensions(g.width,g.height);
					for (var i in layers) {
						restore.push(layers[i].buf.setDimensions(g.width,g.height));
					}
					_this.refresh();
					return true;
				};
				actions.actionWrapper(undo,redo);
			}
			$('#dimensions').val("");
		},
		resizeCanvas: function() {
			var $dialog = $('#resize-dialog');
			$('#dimensions').attr('placeholder',g.width+'x'+g.height).keyup(function (e) {
				if (e.keyCode == 13) { // enter key
					_this.setDimensions.apply(_this,$('#dimensions').val().split(/[^0-9]+/));
					$dialog.dialog('close');
				}
			});
			$dialog.dialog({
				dialogClass: "no-close",
				modal:true,
				draggable:false,
				resizable:false,
				width:190,
				height:168,
				title: "Resize",
				buttons: {
					Apply: function() {
						_this.setDimensions.apply(_this,$('#dimensions').val().split(/[^0-9]+/));
						$(this).dialog('close');
					},
					Cancel: function() {
						$(this).dialog('close');
					}
				}
			});
			$dialog.parent().find('.ui-dialog-title').css('display','inherit');
			$dialog.dialog('close').dialog('open'); // hack to update height for adding titlebar
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
				$('#undo').button('disable').tooltip('hide');
			}
			if (actions.canRedo()) {
				$('#redo').button('enable');
			} else {
				$('#redo').button('disable').tooltip('hide');
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
		feedback: function() {
			var $dialog = $('#feedback-dialog');
			$dialog.dialog({
				dialogClass: "no-close",
				modal:true,
				draggable:false,
				resizable:false,
				width:400,
				height:550,
				title: "What to Improve?",
				buttons: {
					Submit: function() {
						var checklist = [], textarea = "";
						$('#feedback-dialog input,textarea').each(function(i) {
							if ("INPUT" == $(this).prop("tagName")) {
								if ($(this).is(':checked')) {
									checklist.push($(this).attr('name'));
								}
							} else {
								textarea = $(this).val();
							}
						});
						var tosend = "v="+version+"&check="+checklist.join(',')+'&text='+textarea;
						$.post(host+'/feedback', tosend);
						$(this).dialog('close');
					},
					Cancel: function() {
						$(this).dialog('close');
					}
				}
			});
			$dialog.parent().find('.ui-dialog-title').css('display','inherit');
			$dialog.dialog('close').dialog('open'); // hack to update height for adding titlebar
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
				var oldsize = sizes[s];
				s++;
				pan.x = Math.round(pan.x*sizes[s]/oldsize);
				pan.y = Math.round(pan.y*sizes[s]/oldsize);
				_this.refreshBackground();
				_this.updateZoom();
			}
		},
		zoomOut: function() {
			if (s > 0) {
				var oldsize = sizes[s];
				s--;
				pan.x = Math.round(pan.x*sizes[s]/oldsize);
				pan.y = Math.round(pan.y*sizes[s]/oldsize);
				_this.refreshBackground();
				_this.updateZoom();
			}
		},
		updateZoom: function() {
			if (s+1 === sizes.length) {
				$('#zoomin').button('disable').tooltip('hide');
			} else if (s === 0) {
				$('#zoomout').button('disable').tooltip('hide');
			} else {
				$('#zoomin').button('enable');
				$('#zoomout').button('enable');
			}
		}
	});
});
