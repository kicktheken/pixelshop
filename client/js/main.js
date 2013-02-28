define([
    "engine",
    "lib/jqueryui",
    "lib/spectrum",
    "lib/keymaster",
    "lib/lzma",
    "config"
],
function Main(Engine) {
    window.googlekey = g.analytics;
    document.onselectstart = function() {return false;};
    $('.buttonset').buttonset();
    $('#undo').button('disable');
    $('#redo').button('disable');
    function initDivs() {
        $("#toolbar").dialog({
            dialogClass: "no-close",
            title:"",
            position: [200,41],
            resizable: false,
            width:456,
            height:55
        });
        $("#colors").dialog({
            dialogClass: "no-close",
            position: [10,100],
            resizable: false,
            width:90,
            minWidth:90,
            height:400
        });
        $("#layers").dialog({
            dialogClass: "no-close",
            containment:".mew",
            position: [800,100],
            resizable: false,
            width:50,
            height:400
        })
        $(".ui-dialog").draggable("option", "containment", "#canvas");
    }
    function initNew() {
        g.ts = function() { return new Date().getTime(); };
        g.INITTIME = g.ts();
        initDivs();
        var canvas = $('#canvas').get(0), context = canvas.getContext('2d');
        function resize() {
            var c = document.createElement("canvas"), ct = c.getContext('2d');
            c.width = 20;
            c.height = 20;
            ct.fillStyle = "#bbb";
            ct.fillRect(0,0,20,20);
            ct.fillStyle = "#ddd";
            ct.fillRect(10,1,9,9);
            ct.fillRect(1,10,9,9);
            
            var pat = context.createPattern(c,"repeat");
            var width = $(window).width(), height = $(window).height();
            canvas.width = width;
            canvas.height = height-41;//Math.max(600,height - 41);

            context.fillStyle = pat;
            context.fillRect(0,0,width,height);
        }
        resize();
        $(window).resize(resize);
        $(".sortable").sortable({
            /*containment: "#layers",*/
            placeholder: "ui-state-highlight",
            axis: "y"
        });
        var $sortable_li = $(".sortable li");
        $sortable_li.mousedown(function(e) {
            $sortable_li.removeClass("ui-selected");
            $(this).addClass("ui-selected");
        });
        var c = $('.preview').get(0), ct = c.getContext('2d');
        ct.fillStyle='black';
        ct.fillRect(0,0,30,30);
        $("#color1").spectrum();
    }

    function init() {
        var $canvas = $('#canvas');

        // default globals
        g.ts = function() { return new Date().getTime(); };
        g.INITTIME = g.ts();
        g.width = $canvas.width();
        g.height = $canvas.height();
        
        var engine = new Engine($canvas), disableClick = false;
        var defaultColors = engine.defaultColors();
        engine.loadWorkspace();
        $(window).bind('beforeunload', function() {
            if (!engine.isSaved()) {
                return "You have unsaved changes.";
            }
        });

        $('#addlayer').click(function() {
            if (engine.addLayer() >= 8) {
                $(this).attr('disabled', true);
            }
        });
        var tabbar = $('#color-tabbar').sortable({
            update: function (e,ui) {
                var i = 1;
                $('#color-tabbar li').each(function(e) {
                    var index = this.id[this.id.length-1];
                    $('#key-color'+index).html(i);
                    colororder[i] = index;
                    i = (i+1)%10;
                });
            },
            activate: function(e,ui) {
                var id = ui.item[0].id;
                $('#'+id+' a').tab('show');
                engine.setColor($('#'+id.substr(3)).spectrum('get'));
            }
        });
        var colororder = [0,1];
        var html = tabbar.html(), ohtml = html;
        for (var i = 2; i != 1; i = (i+1)%10) {
            html += ohtml.replace(/color1/g,"color"+i).replace(/>1/g,">"+i);
            colororder.push(i);
        }
        tabbar.html(html);
 
        $('.colorpicker').spectrum({
            preferredFormat: 'name',
            showInput: true,
            showAlpha: true,
            showInitial: true,
            showButtons: false,
            change: function(color) {
                var rgb = color.toRgb(), css = {};
                if ((rgb.r+rgb.g+rgb.b)/3 < 128) {
                    css["color"] = "#eee";
                } else {
                    css["color"] = "";
                }
                css["background"] = color.toHexString();
                $("#key-"+this.id).css(css);
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

            $('#li-color'+i+' a').on('show', function(e) {
                var children = e.currentTarget.children;
                $("#color-tabbar .key").each(function(i,e) {
                    $(e).css({ "background" : "", "color" : "" });
                });
                var color = $(children[0]).spectrum('get');
                var rgb = color.toRgb(), css = {};
                if ((rgb.r+rgb.g+rgb.b)/3 < 128) {
                    css["color"] = "#eee";
                }
                css["background"] = color.toHexString();
                $(children[2]).css(css);
                engine.setColor(color);
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
        var paintKeys = ['q','w','e','r','t','y','u','i'];
        key(paintKeys.join(','), function(e,h) {
            switch (h.shortcut) {
                case 'q': return paintRadio('draw');
                case 'w': return paintRadio('fill');
                case 'e': return paintRadio('eraser');
                case 'r': return paintRadio('drag');
                case 't': return paintRadio('dropper');
                case 'y': return paintRadio('select');
                case 'u': return paintRadio('brighten');
                case 'i': return paintRadio('darken');
            }
            var i = colororder[h.shortcut];
            $('#li-color'+i+' a').tab('show');
            engine.setColor($('#color'+i).spectrum('get'));
        });
        function paintRadio(id) {
            $('#'+id).button('toggle');
            engine.setMode(id);
        }
        $('.paint-radio').click(function(e) {
            paintRadio(this.id);
        }).each(function(i,e) {
            // TODO: add tooltips
            $(e).tooltip({
                title: this.id+"<div class='light key'>"+paintKeys[i]+"</div>",
                html: true,
                placement:'top',
                container: 'body',
                delay: 500
            });
        });

        function canvasCoords(f,e,$this) {
            var offset = $this.parent().offset();
            var x = e.pageX - offset.left - 23;
            var y = e.pageY - offset.top - 13;
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

        $('#zoomin').click(engine.zoomIn);
        $('#zoomout').click(engine.zoomOut);
        $('#undo').click(engine.undo);
        $('#save').click(engine.export);
        //$('#load').click(engine.loadWorkspace);
        key('⌘+z, ctrl+z', engine.undo);
        key('⌘+shift+z, ctrl+shift+z', engine.redo);

        if (typeof FileReader !== 'undefined') {
            log.info('file api available');
            document.ondragover = function () { return false; };
            document.ondragend = function () { return false; };
            document.ondrop = function(e) {
                e.preventDefault();
                var file = e.dataTransfer.files[0], reader = new FileReader();
                reader.onload = function(e) {
                    reader.onload = null;
                    var image = new Image();
                    image.onload = function() {
                        this.onload = null;
                        engine.load(this);
                    };
                    image.src = e.target.result;
                };
                reader.readAsDataURL(file);
                return false;
            };
        }

        key('enter', function() { $('.searchbox').focus(); });
        log.info((g.ts() - g.INITTIME) + 'ms startup time');
    }
    $(document).ready(initNew);
});
