define(["action","pixel"], function Actions(Action,Pixel) {
	var _this, actions, index, canvas, context;
	return Class.extend({
		init: function() {
			if (typeof _this !== 'undefined') {
				throw "Actions is a singleton and cannot be initialized more than once";
			}
			_this = this;
			g['Actions'] = this;
			actions = [];
			index = 0;
			canvas = document.createElement("canvas");
			context = canvas.getContext('2d');
		},
		draw: function(layer,color,x,y,drawing) {
			var oldp = layer.buf.pixel(x,y);
			var newp = layer.buf.pixel(x,y,color);
			if (!newp.diffColor(oldp)) {
				return false;
			}
			var undoPixels = [oldp], redoPixels = [newp];
			var action = actions[index];
			if (!action || action.isComplete()) {
				action = actions[index] = new Action(layer);
				actions = actions.slice(0,index+1);
			} else if (action.pixel || typeof drawing !== 'boolean') {
				var line;
				if (typeof drawing !== 'boolean') {
					line = newp.line(drawing);
				} else {
					line = action.pixel.line(newp);
				}
				for (var i in line) {
					var px = line[i][0], py = line[i][1];
					var prevp = new Pixel(layer.buf.context,px,py);
					undoPixels.push(prevp);
					var nextp = new Pixel(color,px,py);
					redoPixels.push(nextp);
					layer.draw(nextp);
				}
			}
			action.pixel = newp;
			action.enqueue(
				function() {
					for (var i in undoPixels) {
						layer.buf.draw(undoPixels[i]);
					}
					return true;
				},
				function() {
					for (var i in redoPixels) {
						layer.buf.draw(redoPixels[i]);
					}
					return true;
				}
			);
			layer.draw(newp);
			return true;
		},
		actionWrapper: function(undo,redo,layer) {
			var action = actions[index] = new Action(layer);
			actions = actions.slice(0,index+1);
			action.enqueue(undo,redo);
			redo();
			action.complete();
			index++;
			g.Engine._updateDo();
		},
		fill: function(layer,color,x,y) {
			var oldp = layer.buf.pixel(x,y);
			var newp = layer.buf.pixel(x,y,color);
			if (!newp.diffColor(oldp) || !layer.buf.isValid(newp) || layer.buf.queue) {
				return false;
			}
			var map;
			var undo = function() {
				if (layer.buf.queue) {
					return false;
				}
				layer.buf.fillMap(oldp,map);
				layer.refresh();
				return true;
			};
			var redo = function() {
				map = layer.buf.fill(newp);
				layer.refresh();
				return true;
			};
			_this.actionWrapper(undo,redo,layer);
		},
		dragSelect: function(layer,selected) {
			var v = {}, r = {}, undo,redo;
			v.done = r.done = true;
			v.width = r.width = selected.width;
			v.height = r.height = selected.height;
			v.x = selected.src.x;
			v.y = selected.src.y;
			v.data = layer.buf.context.getImageData(v.x,v.y,v.width,v.height);
			if (selected.data) {
				r.data = selected.data;
			}
			r.x = selected.x;
			r.y = selected.y;
			var restore = layer.buf.context.getImageData(r.x,r.y,r.width,r.height);
			r.index = v.index = layer.index;
			undo = function() {
				layer.buf.context.putImageData(restore,r.x,r.y);
				canvas.width = v.width;
				canvas.height = v.height;
				context.putImageData(v.data,0,0);
				layer.buf.context.drawImage(canvas,v.x,v.y);
				if (r.data) {
					context.putImageData(r.data,0,0);
				}
				layer.buf.context.drawImage(canvas,v.x,v.y);
				layer.refresh();
				return true;
			};
			redo = function() {
				layer.buf.context.putImageData(restore,r.x,r.y);
				layer.buf.context.putImageData(v.data,v.x,v.y);
				layer.refresh();
				return r;
			};
			_this.actionWrapper(undo,redo,layer);
		},
		move: function(layer,offset) {
			var newOffset = layer.buf.getOffset();
			var undo = function() {
				layer.buf.setOffset(offset);
				return true;
			};
			var redo = function() {
				layer.buf.setOffset(newOffset);
				return true;
			};
			_this.actionWrapper(undo,redo);
		},
		cut: function(layer,clipboard) {
			var c = {};
			c.x = clipboard.x;
			c.y = clipboard.y;
			c.width = clipboard.width;
			c.height = clipboard.height;
			c.data = layer.buf.context.getImageData(c.x,c.y,c.width,c.height);
			c.index = layer.index;
			c.done = true;
			var undo = function() {
				layer.buf.context.putImageData(c.data,c.x,c.y);
				layer.refresh();
				return true;
			};
			var redo = function() {
				layer.buf.clear(c.x,c.y,c.width,c.height);
				layer.refresh();
				return true;
			};
			_this.actionWrapper(undo,redo,layer);
		},
		paste: function(layer,clipboard) {
			var c = {};
			c.x = ++clipboard.x; // add 1,1 offset to make paste more noticeable
			c.y = ++clipboard.y;
			c.width = clipboard.width;
			c.height = clipboard.height;
			c.data = clipboard.data;
			var restore = layer.buf.context.getImageData(c.x,c.y,c.width,c.height);
			c.index = layer.index;
			c.done = true;
			var undo = function() {
				layer.buf.context.putImageData(restore,c.x,c.y);
				return true;
			};
			var redo = function() {
				return c;
			};
			_this.actionWrapper(undo,redo,layer);
		},
		clear: function(layer) {
			var data;
			var undo = function() {
				layer.buf.putData(data);
				layer.refresh();
				data = null;
				return true;
			};
			var redo = function() {
				data = layer.buf.getData();
				layer.buf.clear();
				layer.refresh();
				return true;
			};
			_this.actionWrapper(undo,redo,layer);
		},
		endDraw: function() {
			if (actions[index]) {
				actions[index].complete();
				index++;
			}
		},
		undo: function() {
			var action = actions[index];
			if (action && !action.isComplete()) {
				// middraw situation
				action.complete();
			} else if (index > 0) {
				index--;
				action = actions[index];
			} else {
				return false;
			}
			return action.undo();
		},
		redo: function() {
			var action = actions[index];
			if (!action || !action.isComplete()) {
				return false;
			}
			index++;
			return action.redo();
		},
		canUndo: function() {
			return index > 0 || actions[index] && !actions[index].isComplete();
		},
		canRedo: function() {
			return index < actions.length && actions[index].isComplete();
		}
	});
});
