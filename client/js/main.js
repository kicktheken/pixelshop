define([
	"engine",
	"lib/jqueryui",
	"lib/bootstrap",
	"lib/spectrum",
	"lib/keymaster",
	"lib/lzma",
	"config"
],
function Main(Engine) {
	window.googlekey = g.analytics;
	document.onselectstart = function() {return false;};

	function init() {
		var $canvas = $('#canvas');

		// default globals
		g.ts = function() { return new Date().getTime(); };
		g.width = 40;
		g.height = 40;
		g.INITTIME = g.ts();

		$('.brand small').html(version);
		$('.buttonset').buttonset();
		g.mobile = 'ontouchstart' in window;
		g.cursorstart = (g.mobile) ? 'touchstart' : 'mousedown';
		var engine = new Engine($canvas), disableClick = false;
		$(window).resize(engine.resize);
		$(window).bind('beforeunload',engine.beforeUnload);

		// fix jqueryui bug
		$('#draw').focus(function(e) {
			$(this).blur();
		}).blur();
		$('#addlayer').focus(function(e) {
			$(this).blur();
		}).blur().click(engine.addLayer).mouseout(function(e) {
			$(this).tooltip('hide');
		});
		$('#clonelayer').click(engine.cloneLayer);
		$('#combinelayer').click(engine.combineLayer);
		$('#removelayer').click(engine.removeLayer);

		$('#slider').slider({
			value:1,
			min:1,
			max:30,
			slide:function(e,ui) {
				$('#scale').val(ui.value+'x');
			}
		});
		$('#scale').change(function(e) {
			var val = /\d+/.exec($(this).val());
			val = (isInt(val) && val > 0) ? val : 1;
			$('#slider').slider('value',val);
		});

		var tabbar = $('#colors .sortable').sortable({
			placeholder: "ui-state-highlight",
			axis: "y",
			update: function (e,ui) {
				var i = 1;
				$('#colors .sortable li').each(function(e) {
					var index = toId(this.id);
					$('#key-color'+index).html(i);
					colororder[i] = index;
					i = (i+1)%10;
				});
			}
		});
		var colororder = [0,1];
		var html = tabbar.html(), ohtml = html;
		for (var i = 2; i != 1; i = (i+1)%10) {
			html += ohtml.replace(/color1/g,"color"+i).replace(/>1/g,">"+i);
			colororder.push(i);
		}
		tabbar.html(html);

		$('.colorpicker').spectrum({
			preferredFormat: 'name',
			showInput: true,
			showAlpha: true,
			showInitial: true,
			showButtons: g.mobile,
			change: function(color) {
				engine.setColor();
			},
			show: function() {
				if (g.mobile) {
					engine.setColorIndex(toId(this.id));
				}
				disableClick = true;
			},
			hide: function() {
				disableClick = false;
			}
		});
		engine.loadWorkspace();
		$("#colors .sortable li").bind(g.cursorstart, function(e) {
			engine.setColorIndex(toId(this.id));
		});

		//key('⌘+r, ctrl+r', function(){ return false });
		key('1,2,3,4,5,6,7,8,9,0', function(e,h) {
			engine.setColorIndex(colororder[h.shortcut]);
		});
		var paintKeys = ['q','w','e','r','t','y'];
		key(paintKeys.join(','), function(e,h) {
			var id = '';
			switch (h.shortcut) {
				case 'q': id = 'draw'; break;
				case 'w': id = 'fill'; break;
				case 'e': id = 'eraser'; break;
				case 'r': id = 'pan'; break;
				case 't': id = 'dropper'; break;
				case 'y': id = 'select'; break;
			}
			if (id.length > 0) {
				if (engine.setMode(id)) {
					$('[name="radio"]').removeAttr("checked").button('refresh');
					// jquery ui bug? have to explicitly highlight
					$('label[for="'+id+'"]').addClass("ui-state-active");
				}
			}
		});
		$('[name="radio"]').click(function(e) {
			engine.setMode(this.id);
		});
		function uk(k) {
			return "<div class='light key'>"+k+"</div>";
		}
		function uks() {
			var a = Array.prototype.slice.call(arguments,0);
			return $.map(a,uk).join(' +');
		}
		function tooltip(elem,title,placement) {
			if (!placement) {
				placement = 'top';
			}
			$(elem).tooltip({
				title: title,
				html: true,
				placement:placement,
				container: 'body',
				delay: 500
			});
		}
		$('#toolbar label').each(function(i,e) {
			var title = $(e).attr('for');
			title = title[0].toUpperCase() + title.substr(1);
			tooltip(e,title+uk(paintKeys[i].toUpperCase()));
		});
		var metakey = (/Mac OS/i.test(navigator.userAgent)) ? '⌘' : 'Ctrl';
		tooltip('#zoomin','Zoom In');
		tooltip('#zoomout','Zoom Out');
		tooltip('#undo','Undo'+uks(metakey,'Z'));
		tooltip('#redo','Redo'+uks(metakey,'shift','Z'));
		tooltip('#resize','Resize');
		tooltip('#addlayer','Add Layer');
		tooltip('#clonelayer','Clone Layer');
		tooltip('#combinelayer','Combine Down Layer');
		tooltip('#removelayer','Remove Layer');
		tooltip('#download','Download','bottom');
		tooltip('#upload','Upload','bottom');

		var cheight = $(".container").height()+1;
		function canvasCoords(f,e,$this) {
			var offset = $this.parent().offset();
			var width = $(window).width();
			var height = $(window).height() - cheight;
			var x = e.pageX - offset.left - 1;
			var y = e.pageY - offset.top - cheight - 1;
			if (withinBounds(x,y,0,0,width,height)) {
				f(x,y);
			}
		}
		document.onselectstart = function() {return false;};
		if (g.mobile) {
			$canvas.bind('touchmove', function(e) {
				e.preventDefault();
				e = e.originalEvent.touches[0];
				canvasCoords(engine.cursorMove,e,$canvas);
			}).bind('touchstart', function(e) {
				e.preventDefault();
				e = e.originalEvent.touches[0];
				canvasCoords(engine.cursorStart,e,$canvas);
			}).bind('touchend', function(e) {
				engine.cursorEnd();
			});
		} else {
			$canvas.mousemove(function(e) {
				canvasCoords(engine.cursorMove,e,$canvas);
			}).mousedown(function(e) {
				if (!disableClick) {
					canvasCoords(engine.cursorStart,e,$canvas);
				}
			});
			document.addEventListener('mouseup', engine.cursorEnd);
			$canvas.mouseleave(engine.cursorOut);
		}

		$('#zoomin').click(engine.zoomIn);
		$('#zoomout').click(engine.zoomOut);
		$('#undo').click(engine.undo);
		$('#redo').click(engine.redo);
		$('#download').click(engine.download);
		$('#upload').click(function() {
			var e = document.createEvent("MouseEvents");
			e.initEvent("click", true, false);
			$('#upload-file').get(0).dispatchEvent(e);
		});
		$('#resize').click(engine.resizeCanvas);
		$('#feedback').click(engine.feedback);
		key('⌘+z, ctrl+z', engine.undo);
		key('⌘+shift+z, ctrl+shift+z', engine.redo);
		key('⌘+c, ctrl+c', engine.copy);
		key('⌘+x, ctrl+x', engine.cut);
		key('⌘+v, ctrl+v', engine.paste);
		key('⌘+a, ctrl+a', engine.selectAll);
		key('⌘+shift+s, ctrl+shift+s', engine.purge); // purge corrupted workspace

		$('#searchbox').keyup(function(e) {
			var val = $(this).val();
			if (/(gif|png|jpg|jpeg|bmp)$/.test(val)) {
				log.info('loading '+val);
				engine.loadExternal(val);
			}
		});

		if (typeof FileReader !== 'undefined') {
			log.info('file api available');
			function handleFileUpload(file) {
				if (!/^image/.test(file.type)) {
					log.error("file "+file.name+" is not an image type");
					return false;
				}
				var reader = new FileReader();
				reader.onload = function(e) {
					reader.onload = null;
					var image = new Image();
					image.onload = function() {
						this.onload = null;
						engine.upload(this);
					};
					image.src = e.target.result;
				};
				reader.readAsDataURL(file);
				return false;
			};
			$('#upload-file').change(function(e) {
				e.preventDefault();
				handleFileUpload(e.delegateTarget.files[0]);
			});
			document.ondragover = function () { return false; };
			document.ondragend = function () { return false; };
			document.ondrop = function(e) {
				e.preventDefault();
				handleFileUpload(e.dataTransfer.files[0]);
			};
		} else {
			log.info('file api unavailable');
		}

		key('enter', function() { $('#searchbox').focus(); });
		log.info((g.ts() - g.INITTIME) + 'ms startup time');
	}
	$(document).ready(init);
});
