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
		g.width = 30;
		g.height = 30;
		g.INITTIME = g.ts();

		$('.buttonset').buttonset();
		var engine = new Engine($canvas), disableClick = false;
		$(window).resize(engine.resize);
		$(window).bind('beforeunload',engine.beforeUnload);

		// fix jqueryui bug
		$('#addlayer').focus(function(e) {
			$(this).blur();
		}).blur().click(engine.addLayer);
		$('#clonelayer').click(engine.cloneLayer);
		$('#combinelayer').click(engine.combineLayer);
		$('#removelayer').click(engine.removeLayer);

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
			showButtons: false,
			change: function(color) {
				engine.setColor();
			},
			show: function() {
				disableClick = true;
			},
			hide: function() {
				disableClick = false;
			}
		});
		engine.loadWorkspace();
		$("#colors .sortable li").mousedown(function(e) {
			engine.setColorIndex(toId(this.id));
		});

		//key('⌘+r, ctrl+r', function(){ return false });
		key('1,2,3,4,5,6,7,8,9,0', function(e,h) {
			engine.setColorIndex(colororder[h.shortcut]);
		});
		var paintKeys = ['q','w','e','r','t','y','u'];
		key(paintKeys.join(','), function(e,h) {
			var id = '';
			switch (h.shortcut) {
				case 'q': id = 'draw'; break;
				case 'w': id = 'fill'; break;
				case 'e': id = 'eraser'; break;
				case 'r': id = 'pan'; break;
				case 't': id = 'dropper'; break;
				case 'y': id = 'select'; break;
				case 'u': id = 'move'; break;
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
		tooltip('#combinelayer','Combine Layer');
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
		if ('ontouchstart' in window) {
			$canvas.bind('touchmove', function(e) {
				e.preventDefault();
				e = e.orginalEvent.touches[0];
				canvasCoords(engine.cursorMove,e,$canvas);
			}).bind('touchstart', function(e) {
				e.preventDefault();
				e = e.orginalEvent.touches[0];
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
		$('#download').click(engine.export);
		$('#resize').click(engine.resizeCanvas);
		//$('#load').click(engine.loadWorkspace);
		key('⌘+z, ctrl+z', engine.undo);
		key('⌘+shift+z, ctrl+shift+z', engine.redo);
		key('⌘+c, ctrl+c', engine.copy);
		key('⌘+x, ctrl+x', engine.cut);
		key('⌘+v, ctrl+v', engine.paste);
		key('⌘+shift+s, ctrl+shift+s', engine.save); // purge corrupted workspace

		if (typeof FileReader !== 'undefined') {
			log.info('file api available');
			document.ondragover = function () { return false; };
			document.ondragend = function () { return false; };
			document.ondrop = function(e) {
				e.preventDefault();
				var file = e.dataTransfer.files[0], reader = new FileReader();
				reader.onload = function(e) {
					reader.onload = null;
					var image = new Image();
					image.onload = function() {
						this.onload = null;
						engine.load(this);
					};
					image.src = e.target.result;
				};
				reader.readAsDataURL(file);
				return false;
			};
		}

		key('enter', function() { $('.searchbox').focus(); });
		log.info((g.ts() - g.INITTIME) + 'ms startup time');
	}
	$(document).ready(init);
});
