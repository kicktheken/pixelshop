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
				},
				function() {
					for (var i in redoPixels) {
						layer.buf.draw(redoPixels[i]);
					}
				}
			);
			layer.draw(newp);
			return true;
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
				};
			} else {
				undo = function() {
					layer.buf.clear(oldx,oldy,image.width,image.height);
				};
			}
			var action = actions[index] = new Action(layer);
			actions = actions.slice(0,index+1);
			action.enqueue(undo, function() { layer.load(image); });
			layer.load(image);
			action.complete();
			index++;
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
			action.undo();
			return true;
		},
		redo: function() {
			var action = actions[index];
			if (!action || !action.isComplete()) {
				return false;
			}
			action.redo();
			index++;
			return true;
		},
		canUndo: function() {
			return index > 0 || actions[index] && !actions[index].isComplete();
		},
		canRedo: function() {
			return index < actions.length && actions[index].isComplete();
		}
	});
});
