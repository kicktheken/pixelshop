define([
    "engine",
    "lib/jqueryui",
    "lib/bootstrap",
    "lib/spectrum",
    "lib/keymaster"
],
function Main(Engine) {
    $(document).ready(function() {
        g.ts = function() { return new Date().getTime(); };
        g.INITTIME = g.ts();
        var $canvas = $('#canvas'), disableClick = false;

        // default globals
        g.width = $canvas.width();
        g.height = $canvas.height();
        g.defaultOffset = function(width,height) {
            return {x: width/8, y: height/8 };
        }

        var engine = new Engine($canvas);
        var defaultColors = engine.defaultColors();
        $('#addlayer').click(function() {
            if (engine.addLayer() >= 8) {
                $(this).attr('disabled', true);
            }
        });
        var tabbar = $('#color-tabbar').sortable({
            update: function (e,ui) {
                var i = 1;
                $('#color-tabbar li').each(function(e) {
                    colororder[i] = this.id[this.id.length-1];
                    i = (i+1)%10;
                });
            }
        });
        var colororder = [0,1];
        var html = tabbar.html(), ohtml = html;
        for (var i = 2; i != 1; i = (i+1)%10) {
            html += ohtml.replace(/color1/g,"color"+i);
            colororder.push(i);
        }
        tabbar.html(html);
 
        $('.colorpicker').spectrum({
            preferredFormat: 'name',
            showInput: true,
            showAlpha: true,
            showButtons: false,
            change: function(color) {
                $("#i"+this.id).css({
                    "border-left-color": color.toHexString()
                });
                engine.setColor(color);
            },
            show: function() {
                $('#li-'+this.id+' a').tab('show');
                engine.setColor($('#color'+i).spectrum('get'));
                disableClick = true;
            },
            hide: function() {
                disableClick = false;
            }
        }).each(function(i) {
            var c = defaultColors[i];
            i = (i+1)%10;
            $('#color'+i).spectrum('set', c);
            $("#icolor"+i).css({
                "border-left-color": c
            });
            $('#li-color'+i+' a').click(function(e) {
                engine.setColor($('#color'+i).spectrum('get'));
            });
        });
        engine.setColor($('#color1').spectrum('get'));
        $('#li-color1 a').tab('show');

        //key('⌘+r, ctrl+r', function(){ return false });
        key('1,2,3,4,5,6,7,8,9,0', function(e,h) {
            var i = colororder[h.shortcut];
            $('#li-color'+i+' a').tab('show');
            engine.setColor($('#color'+i).spectrum('get'));
        });

        function canvasCoords(f,e,$this) {
            var offset = $this.parent().offset();
            var x = e.pageX - offset.left;
            var y = e.pageY - offset.top;
            if (withinBounds(x,y,0,0,g.width,g.height)) {
                f(x,y);
            }
        }
        document.onselectstart = function() {return false;};
        if ('ontouchstart' in window) {
            $canvas.bind('touchmove', function(e) {
                e.preventDefault();
                e = e.orginalEvent.touches[0];
                canvasCoords(engine.cursorMove,e,$canvas);
            }).bind('touchstart', function(e) {
                e.preventDefault();
                e = e.orginalEvent.touches[0];
                canvasCoords(engine.cursorStart,e,$canvas);
            }).bind('touchend', function(e) {
                engine.cursorEnd();
            });            
        } else {
            $canvas.mousemove(function(e) {
                canvasCoords(engine.cursorMove,e,$canvas);
            }).mousedown(function(e) {
                if (!disableClick) {
                    canvasCoords(engine.cursorStart,e,$canvas);
                }
            });
            document.addEventListener('mouseup', engine.cursorEnd);
        }

        $('#signin').popover({
            placement: 'bottom',
            title: 'Sign in or Register',
            html: true,
            content: $('.signinform').html(),
            trigger: 'click'
        });
        log.info((g.ts() - g.INITTIME) + 'ms startup time');
    })
});
