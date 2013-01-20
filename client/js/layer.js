define(function Layer() {
	var $tabbar = $('#layer-tabbar'), html = $tabbar.html();
	return Class.extend({
		init: function(index) {
			if (index === 2) {
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
			if (index != 1) {
				var ohtml = html.replace(/(ayer( )?)1/g,"$1"+index);
				$tabbar.prepend(ohtml);
			} else {
				$('#layer-tabbar .active a').css({'cursor':'default'});
			}
			this.index = index;
			this.canvas = $('#layer'+index).get(0);
			this.context = this.canvas.getContext('2d');
			$('#li-layer'+index+' a').click(function(e) {
				g.Canvas.setActiveLayer(index);
			});
		},
		refresh: function(c) {
			if (!c) c = 'black';
			this.context.fillStyle = c;
			this.context.fillRect(0,0,32,32);
		}
	});
});