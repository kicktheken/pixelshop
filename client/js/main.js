define([
    "lib/jqueryui",
    "lib/bootstrap",
    "lib/spectrum"
],
function Main() {
    log.info("main start");

    var tabbar = $('#layer-tabbar').sortable({
        update: function (e,ui) {
            $('#layer-tabbar li').each(function(e) {
                log.info(this.id);
                //log.info(e);
                //var $this = $(this);
                //log.info($this);
                //log.info($this.attr('id'));
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
            log.info([color,this.id]);
        }
    });
    document.onkeydown = function(e) {
        var key = e.keyCode - 48;
        if (key >= 0 && key <= 9) {
            if (key === 0) key = 10;
            log.info(key);
            $('a[href=#tabcolor'+key+']').tab('show');
        }
    };
    var canvas = $('#layer1').get(0), context = canvas.getContext('2d');
    context.fillRect(0,0,100,100);
    canvas = $('#canvas').get(0), context = canvas.getContext('2d');
    context.fillRect(0,0,800,800);
});
