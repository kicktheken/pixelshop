define(function Action() {
	return Class.extend({
		init: function(layer) {
			this.layer = layer;
			this.undoQueue = [];
			this.redoQueue = [];
			var b = layer.buf.bounds;
			if (b) {
				this.undoBounds = [b[0],b[1],b[2],b[3]];
			}
			this.redoBounds = null;
		},
		isComplete: function() {
			return !!this.redoBounds;
		},
		complete: function() {
			var b = this.layer.buf.bounds;
			this.redoBounds = [b[0],b[1],b[2],b[3]];
		},
		enqueue: function(undoPixel,redoPixel) {
			this.undoQueue.unshift(undoPixel);
			this.redoQueue.push(redoPixel);
		},
		undo: function() {
			for (var i in this.undoQueue) {
				this.layer.buf.draw(this.undoQueue[i]);		
			}
			this.layer.buf.bounds = this.undoBounds;
			this.layer.refresh();
		},
		redo: function() {
			for (var i in this.redoQueue) {
				this.layer.buf.draw(this.redoQueue[i]);		
			}
			this.layer.buf.bounds = this.redoBounds;
			this.layer.refresh();
		}
	});
});