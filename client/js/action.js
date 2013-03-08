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
		enqueue: function(undo,redo) {
			this.undoQueue.unshift(undo);
			this.redoQueue.push(redo);
		},
		undo: function() {
			var ret = true;
			for (var i in this.undoQueue) {
				ret = this.undoQueue[i]();
			}
			this.layer.buf.bounds = this.undoBounds;
			this.layer.refresh();
			return ret;
		},
		redo: function() {
			var ret = true;
			for (var i in this.redoQueue) {
				ret = this.redoQueue[i]();		
			}
			this.layer.buf.bounds = this.redoBounds;
			this.layer.refresh();
			return ret;
		}
	});
});
