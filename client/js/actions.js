define(["action"], function Actions(Action) {
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
			var action = actions[index];
			if (!action || action.isComplete()) {
				action = actions[index] = new Action(layer);
				actions = actions.slice(0,index+1);
			}
			action.enqueue(
				function() { layer.buf.draw(oldp); },
				function() { layer.buf.draw(newp); }
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
