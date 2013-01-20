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
        var colororder = [0,1], layerorder = [0,1];
        var tabbar = $('#layer-tabbar').sortable({
            update: function (e,ui) {
                var i = 1;
                $('#layer-tabbar li').each(function(e) {
                    layerorder[i] = this.id[this.id.length-1];
                    i++;
                });
            }
        });
        $('#addlayer').click(function() {
            if (canvas.addLayer() >= 8) {
                $(this).attr('disabled', true);
            }
        });
        tabbar = $('#color-tabbar').sortable({
            update: function (e,ui) {
                var i = 1;
                $('#color-tabbar li').each(function(e) {
                    colororder[i] = this.id[this.id.length-1];
                    i = (i+1)%10;
                });
            }
        });
        html = tabbar.html(), ohtml = html.replace(' class="active"','');
        for (var i = 2; i != 1; i = (i+1)%10) {
            html += ohtml.replace(/color1/g,"color"+i);
            colororder.push(i);
        }
        tabbar.html(html);

        $('#signin').popover({
            placement: 'bottom',
            title: 'Sign in or Register',
            html: true,
            content: $('.signinform').html(),
            trigger: 'click'
        });
        var defaultColors = 
        $('.colorpicker').spectrum({
            preferredFormat: 'name',
            showInput: true,
            showAlpha: true,
            showButtons: false,
            change: function(color) {
                $("#i"+this.id).css({
                    "border-left-color": color.toHexString()
                });
                log.info([color.toHexString(),this.id]);
            }
        }).each(function(i) {
            var c = defaultColors[i];
            canvas.setColor(i,c);
        });
        //key('⌘+r, ctrl+r', function(){ return false });
        key('1,2,3,4,5,6,7,8,9,0', function(e,h) {
            var i = colororder[h.shortcut];
            $('a[href=#tabcolor'+i+']').tab('show');
        });
        /*var canvas = $('#layer1').get(0), context = canvas.getContext('2d');
        context.fillRect(0,0,100,100);
        canvas = $('#canvas').get(0), context = canvas.getContext('2d');
        context.fillRect(0,0,800,800);*/
    })
});
