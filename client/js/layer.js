define(["canvas"], function Layer(Canvas) {
	var $tabbar = $('#layers .sortable'), html = $tabbar.html();
	var pwidth, pheight, pool = [], numLayers = 0;
	function initTabbar() {
		$tabbar.sortable({
			placeholder: "ui-state-highlight",
			axis: "y",
			update: function(e,ui) {
				var order = [];
				$('#layers .sortable li').each(function(e) {
					order.push(toId(this.id)-1);
				});
				g.Engine.setLayerOrder(order);
			}
		});
	}
	return Class.extend({
		init: function(i) {
			var pcanvas, index = i+1;
			if (i === 1) {
				initTabbar();
			}
			numLayers++;
			if (numLayers > 1) {
				if (pool[index] === undefined) {
					var ohtml = html.replace(/(ayer( )?)1/g,"$1"+index);
					$tabbar.prepend(ohtml);
				} else {
					pool[index].addClass('active');
					$tabbar.prepend(pool[index]);
					delete pool[index];
				}
				pcanvas = $('#layer'+index).get(0);
			} else {
				//$('#layer-tabbar .active a').css({'cursor':'default'});
				pcanvas = $('#layer'+index).get(0);
				pwidth = pcanvas.width;
				pheight = pcanvas.height;
			}
			$("#li-layer"+index).mousedown(function() {
				$("#layers .sortable li").removeClass("active");
				var id = $(this).addClass("active").attr('id');
				g.Engine.setActiveLayer(toId(id)-1);
			});
			this.index = index;
			this.preview = pcanvas.getContext('2d');
			this.preview.width = pcanvas.width;
			this.preview.height = pcanvas.height;
			this.buf = new Canvas(g.width,g.height);
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
				g.Engine.refresh();
			});
			$('#li-layer'+index+' a').click(function(e) {
				g.Engine.setActiveLayer(i);
			});
		},
		copy: function(layer) {
			this.buf.copy(layer.buf);
			this.visible = layer.visible;
			this.refresh();
		},
		remove: function() {
			if (numLayers > 1) {
				pool[this.index] = $("#li-layer"+this.index).detach();
				numLayers--;
			}
		},
		getWorkspace: function() {
			return this.buf.toDataObject();
		},
		setWorkspace: function(obj) {
			this.buf.setCanvas(obj);
			this.refresh();
		},
		resetWorkspace: function() {
			this.buf.reset();
			this.refresh();
		},
		load: function(image) {
			this.buf.load(image);
			this.refresh();
		},
		draw: function(pixel) {
			this.buf.draw(pixel);
			this.refresh();
		},
		refresh: function() {
			var width = this.preview.width, height = this.preview.height;
			var data = this.buf.getViewDataFromBounds(width,height);
			this.preview.clearRect(0,0,width,height);
			if (data) {
				this.preview.putImageData(data,0,0);
			}
		}
		
	});
});
