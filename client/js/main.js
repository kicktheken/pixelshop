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
        var canvas = new Canvas(), defaultColors = canvas.defaultColors();
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
        //key('⌘+r, ctrl+r', function(){ return false });
        key('1,2,3,4,5,6,7,8,9,0', function(e,h) {
            var i = colororder[h.shortcut];
            $('#li-color'+i+' a').tab('show');
            canvas.setColor($('#color'+i).spectrum('get'));
        });

        $('#signin').popover({
            placement: 'bottom',
            title: 'Sign in or Register',
            html: true,
            content: $('.signinform').html(),
            trigger: 'click'
        });
    })
});
