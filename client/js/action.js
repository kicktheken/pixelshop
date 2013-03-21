define(function Action() {
	return Class.extend({
		init: function(layer) {
			this.undoQueue = [];
			this.redoQueue = [];
			if (layer) {
				this.layer = layer;
				var b = layer.buf.bounds;
				if (b) {
					this.undoBounds = [b[0],b[1],b[2],b[3]];
				}
				this.redoBounds = null;
			}
		},
		isComplete: function() {
			return !this.layer || !!this.redoBounds;
		},
		complete: function() {
			if (this.layer) {
				var b = this.layer.buf.bounds;
				if (b) {
					this.redoBounds = [b[0],b[1],b[2],b[3]];
				}
			}
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
			if (this.layer) {
				this.layer.buf.bounds = this.undoBounds;
				this.layer.refresh();
			}
			return ret;
		},
		redo: function() {
			var ret = true;
			for (var i in this.redoQueue) {
				ret = this.redoQueue[i]();		
			}
			if (this.layer) {
				this.layer.buf.bounds = this.redoBounds;
				this.layer.refresh();
			}
			return ret;
		}
	});
});
