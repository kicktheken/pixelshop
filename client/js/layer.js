define(function Layer() {
	var $tabbar = $('#layer-tabbar'), html = $tabbar.html();
	var pwidth, pheight;
	function initTabbar() {
		$('#layer-tabbar a').removeAttr('style');
		$tabbar.sortable({
			update: function(e,ui) {
				var order = [];
				$('#layer-tabbar li').each(function(e) {
					order.push(this.id[this.id.length-1]-1);
				});
				g.Canvas.setLayerOrder(order);
			}
		});
	}
	return Class.extend({
		init: function(i) {
			var pcanvas, index = i+1;
			if (i === 1) {
				initTabbar();
			}
			if (i > 0) {
				var ohtml = html.replace(/(ayer( )?)1/g,"$1"+index);
				$tabbar.prepend(ohtml);
				pcanvas = $('#layer'+index).get(0);
			} else {
				$('#layer-tabbar .active a').css({'cursor':'default'});
				pcanvas = $('#layer'+index).get(0);
				pwidth = pcanvas.width;
				pheight = pcanvas.height;
			}
			this.index = index;
			this.preview = pcanvas.getContext('2d');
			var buf = g.createCanvas(g.width,g.height);
			this.canvas = buf.canvas;
			this.context = buf.context;
			this.offset = g.offset;
			this.visible = true;
			this.initEvents(i);
		},
		initEvents: function(i) {
			var _this = this, index = i+1;
			$('#eyelayer'+index).click(function(e) {
				if (_this.visible) {
					_this.visible = false;
					$(this).removeClass('icon-eye-open').addClass('icon-eye-close');
				} else {
					_this.visible = true;
					$(this).removeClass('icon-eye-close').addClass('icon-eye-open');
				}
				g.Canvas.refresh();
			});
			$('#li-layer'+index+' a').click(function(e) {
				g.Canvas.setActiveLayer(i);
			});
		},
		refresh: function(c) {
			if (!c) c = 'black';
			this.preview.fillStyle = c;
			this.preview.fillRect(0,0,32,32);
		},
		draw: function(color,x,y) {
			x += this.offset.x;
			y += this.offset.y;
			var c = color.toRgb();
			var d = this.context.createImageData(1,1);
			d.data[0] = c.r;
			d.data[1] = c.g;
			d.data[2] = c.b;
			d.data[3] = (c.a) ? c.a*255 : 255;
			this.context.putImageData(d,x,y);
		}
	});
});