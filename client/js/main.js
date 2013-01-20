define([
    "canvas",
    "lib/jqueryui",
    "lib/bootstrap",
    "lib/spectrum",
    "lib/keymaster"
],
function Main(Canvas) {
    $(document).ready(function() {
        log.info("main start");
        var $canvas = $('#canvas');
        var canvas = new Canvas($canvas);
        var defaultColors = canvas.defaultColors();
        $('#addlayer').click(function() {
            if (canvas.addLayer() >= 8) {
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
        var html = tabbar.html(), ohtml = html.replace(' class="active"','');
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
            }
        }).each(function(i) {
            var c = defaultColors[i];
            i = (i+1)%10;
            $('#color'+i).spectrum('set', c);
            $("#icolor"+i).css({
                "border-left-color": c
            });
            $('#li-color'+i+' a').click(function(e) {
                canvas.setColor($('#color'+i).spectrum('get'));
            });
        });
        canvas.setColor($('#color1').spectrum('get'));
        //key('⌘+r, ctrl+r', function(){ return false });
        key('1,2,3,4,5,6,7,8,9,0', function(e,h) {
            var i = colororder[h.shortcut];
            $('#li-color'+i+' a').tab('show');
            canvas.setColor($('#color'+i).spectrum('get'));
        });

        function canvasCoords(f,e,$this) {
            var offset = $this.parent().offset();
            var x = e.pageX - offset.left - 1;
            var y = e.pageY - offset.top - 1;
            if (withinBounds(x,y,0,0,$this.width(),$this.height())) {
                f(x,y);
            }
        }
        document.onselectstart = function() {return false;};
        if ('ontouchstart' in window) {
            $canvas.bind('touchmove', function(e) {
                e.preventDefault();
                e = e.orginalEvent.touches[0];
                canvasCoords(canvas.cursorMove,e,$canvas);
            });
            $canvas.bind('touchstart', function(e) {
                e.preventDefault();
                e = e.orginalEvent.touches[0];
                canvasCoords(canvas.cursorStart,e,$canvas);
            });
            $canvas.bind('touchend', function(e) {
                canvas.cursorEnd();
            });            
        } else {
            $canvas.mousemove(function(e) {
                canvasCoords(canvas.cursorMove,e,$canvas);
            });
            $canvas.mousedown(function(e) {
                canvasCoords(canvas.cursorStart,e,$canvas);
            });
            $canvas.mouseup(function(e) {
                canvas.cursorEnd();
            });
        }

        $('#signin').popover({
            placement: 'bottom',
            title: 'Sign in or Register',
            html: true,
            content: $('.signinform').html(),
            trigger: 'click'
        });
    })
});
