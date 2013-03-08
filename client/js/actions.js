define(["action","pixel"], function Actions(Action,Pixel) {
	var _this, actions, index;
	return Class.extend({
		init: function() {
			if (typeof _this !== 'undefined') {
				throw "Actions is a singleton and cannot be initialized more than once";
			}
			_this = this;
			g['Actions'] = this;
			actions = [];
			index = 0;
		},
		draw: function(layer,color,x,y) {
			var oldp = layer.buf.pixel(x,y);
			var newp = layer.buf.pixel(x,y,color);
			if (!newp.diff(oldp)) {
				return false;
			}
			var undoPixels = [oldp], redoPixels = [newp];
			var action = actions[index];
			if (!action || action.isComplete()) {
				action = actions[index] = new Action(layer);
				actions = actions.slice(0,index+1);
			} else if (action.pixel) {
				var line = action.pixel.line(newp);
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
		actionWrapper: function(layer,undo,redo) {
			var action = actions[index] = new Action(layer);
			actions = actions.slice(0,index+1);
			action.enqueue(undo,redo);
			redo();
			action.complete();
			index++;
		},
		dragSelect: function(layer,selected) {
			var v = {}, r = {}, undo,redo;
			v.done = r.done = true;
			v.width = r.width = selected.width;
			v.height = r.height = selected.height;
			v.x = selected.src.x;
			v.y = selected.src.y;
			if (selected.data) {
				v.data = selected.data;
			} else {
				v.data = layer.buf.context.getImageData(v.x,v.y,v.width,v.height);
				selected.data = v.data;
			}
			r.data = v.data;
			r.x = selected.x;
			r.y = selected.y;
			var restore = layer.buf.context.getImageData(r.x,r.y,r.width,r.height);
			r.index = v.index = layer.index;
			undo = function() {
				layer.buf.context.putImageData(restore,r.x,r.y);
				layer.buf.clear(v.x,v.y,v.width,v.height);
				return v;
			};
			redo = function() {
				layer.buf.context.putImageData(restore,r.x,r.y);
				layer.buf.clear(v.x,v.y,v.width,v.height);
				return r;
			};
			_this.actionWrapper(layer,undo,redo);
		},
		load: function(layer,image) {
			var oldx = layer.buf.offset.x - image.width/2;
			var oldy = layer.buf.offset.y - image.height/2;
			var undo;
			if (layer.buf.bounds) {
				var olddata = layer.buf.getData(image.width,image.height);
				undo = function() {
					layer.buf.clear(oldx,oldy,image.width,image.height);
					layer.buf.loadData(olddata,oldx,oldy);
					return true;
				};
			} else {
				undo = function() {
					layer.buf.clear(oldx,oldy,image.width,image.height);
					return true;
				};
			}
			_this.actionWrapper(layer,undo,function() {
				layer.load(image);
				return true;
			});
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
