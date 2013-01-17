// Avoid `console` errors in browsers that lack a console.
if (!(window.console && console.log)) {
    (function() {
        var noop = function() {};
        var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'markTimeline', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn'];
        var length = methods.length;
        var console = window.console = {};
        while (length--) {
            console[methods[length]] = noop;
        }
    }());
}

var Logger = function(level) {
    this.level = level;
    this.callback = function(){};
};

Logger.prototype.info = function() {};
Logger.prototype.debug = function() {};
Logger.prototype.error = function() {};
Logger.prototype.setCallback = function() {};

//>>excludeStart("prodHost", pragmas.prodHost);
Logger.prototype.info = function(message, cb) {
    if (this.level === "info") {
        console.log(message);
    } else if (this.level === "debug") {
        var error = new Error();
        if (!error.stack) {
            console.log(message);
            this.level = "info";
            return;
        }
        var snippet = error.stack.replace(/.*\n.*\n/m,'').match(/[\w-]+\.\w+:\d+:\d+/)[0];
        console.log(snippet + ":\t" + message);
    }
    if (cb) {
        this.callback(message);
    }
};

Logger.prototype.debug = function(message, cb) {
    if (this.level === "debug") {
        var error = new Error();
        if (!error.stack) {
            console.log(message);
            this.level = "info";
            return;
        }
        var snippet = error.stack.replace(/.*\n.*\n/m,'').match(/[\w-]+\.\w+:\d+:\d+/)[0];
        console.log(snippet + ":\t" + message);
    }
    if (cb) {
        this.callback(message);
    }
};

Logger.prototype.error = function(message, stacktrace) {
    console.error(message);
    if (stacktrace !== undefined && stacktrace === true) {
        var trace = printStackTrace();
        console.error(trace.join('\n\n'));
        console.error('-----------------------------');
    }
};

Logger.prototype.setCallback = function(callback) {
    if (typeof callback === "function") {
        this.callback = callback;
    }
};
//>>excludeEnd("prodHost");

log = new Logger("info");

