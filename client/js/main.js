define([
    "lib/jqueryui",
    "lib/bootstrap",
    "lib/spectrum"
],
function() {
    return function() {
        log.info("main start");
        $('#tabsort').sortable({
            stop: function (e,ui) {
                console.log([e,ui]);
            }
        });
        $('#signin').popover({
            placement: 'bottom',
            title: 'Sign in or Register',
            html: true,
            content: $('.signinform').html(),
            trigger: 'click'
        });
        $('.list-left').sortable({
            stop: function (e,ui) {
                console.log([e,ui]);
            }
        });
        $('.colorpicker').spectrum({
            preferredFormat: 'name',
            showInput: true,
            showAlpha: true,
            showButtons: false
        });
        var canvas = $('#layer1').get(0), context = canvas.getContext('2d');
        context.fillRect(0,0,100,100);
        canvas = $('#canvas').get(0), context = canvas.getContext('2d');
        context.fillRect(0,0,800,800);
    };
});
