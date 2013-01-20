define(function Layer() {
	var html = $('#layer-tabbar').html();
	return Class.extend({
		init: function(index) {
			if (index != 1) {
				var ohtml = html.replace(/(ayer( )?)1/g,"$1"+index);
				$('#layer-tabbar').prepend(ohtml);
			}
			this.index = index;
			this.canvas = $('#layer'+index).get(0);
			this.context = this.canvas.getContext('2d');
		},
		refresh: function(c) {
			if (!c) c = 'black';
			this.context.fillStyle = c;
			this.context.fillRect(0,0,32,32);
		}
	});
});