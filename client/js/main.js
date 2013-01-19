define([
    "lib/jqueryui",
    "lib/bootstrap",
    "lib/spectrum",
    "lib/keymaster"
],
function Main(Engine) {
    log.info("main start");

    var tabbar = $('#layer-tabbar').sortable({
        update: function (e,ui) {
            $('#layer-tabbar li').each(function(e) {
                log.info(this.id);
            });
            console.log([e,ui]);
        }
    });
    var html = tabbar.html(), ohtml = html.replace(' class="active"','');
    for (var i = 2; i <= 8; i++) {
        var tab = ohtml;
        if (i % 2 === 0) tab = tab.replace(/open/g,"close");
        html += tab.replace(/(ayer( )?)1/g,"$1"+i);
    }
    tabbar.html(html);
    
    tabbar = $('#color-tabbar').sortable({
        update: function (e,ui) {
            console.log([e,ui]);
        }
    });
    html = tabbar.html(), ohtml = html.replace(' class="active"','');
    for (var i = 2; i <= 10; i++) {
        html += ohtml.replace(/color1/g,"color"+i);
    }
    tabbar.html(html);

    $('#signin').popover({
        placement: 'bottom',
        title: 'Sign in or Register',
        html: true,
        content: $('.signinform').html(),
        trigger: 'click'
    });
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
    });
    //key('⌘+r, ctrl+r', function(){ return false });
    key('1,2,3,4,5,6,7,8,9,0', function(e,h) {
        var key = (h.shortcut == 0) ? 10 : h.shortcut;
        $('a[href=#tabcolor'+key+']').tab('show');
    });
    var canvas = $('#layer1').get(0), context = canvas.getContext('2d');
    context.fillRect(0,0,100,100);
    canvas = $('#canvas').get(0), context = canvas.getContext('2d');
    context.fillRect(0,0,800,800);
});
