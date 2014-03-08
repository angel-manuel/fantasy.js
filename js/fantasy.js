(function (){
    "use strict";

    function error(msg) {
        console.error('ERROR:'+msg);
        throw 'ERROR:'+msg;
    }

    function warning(msg) {
        console.warn('WARNING:'+msg);
    }
    
    var global_object = window || this;

    var fantasy;
    global_object.fantasy = fantasy = {};

    var debug = true;

    var canvasname, canvas, context;
    //canvas - Canvas HTML5 element
    //context - canvas.getContext('2d')

    var enviroment;
    var root;
    var content;

    var tick_interval = false;

    //getXMLHttpRequestObject()
    //Metodo multiplataforma para obtener un xhr

    function getXMLHttpRequestObject() {
        var ref = null;
        if (window.XMLHttpRequest) {
            ref = new XMLHttpRequest();
        } else if (window.ActiveXObject) { // Older IE.
            ref = new ActiveXObject("MSXML2.XMLHTTP.3.0");
        }
        return ref;
    }

    function async_download(url, callback) {
        var xhr = getXMLHttpRequestObject();
        xhr.addEventListener('readystatechange', function() {
            switch(xhr.readyState) {
                case 4:
                    if(xhr.status == 200) {
                        callback(null, xhr.responseText);
                    } else {
                        callback(xhr.status, xhr.responseText);
                    }
                    break;
            }
        });
        xhr.open('GET', url, true);
        xhr.send(null);
    }

    //moduleManager
    //Descarga dinamicamente mediante xhr el codigo necesitado para cada modulo
    //y sus dependencias. Automáticamente evalua ese código

    var moduleManager = (function moduleManager() {
        var modules = {};
        var subs = {};
        var base_directory = 'code/';

        function get(modulename) {
            var module = modules[modulename];
            if(module) {
                return module;
            } else {
                error('moduleManager:'+modulename+' not loaded');
            }
        }

        function set(modulename, module) {
            if(modules[modulename]) {
                warning('moduleManager:'+modulename+'being overwritten');
            }
            modules[modulename] = module;
        }

        function use(args, callback) {
            callback = callback || function(){};

            if(!args) {
                warn('moduleManager:use:No args');
                callback();
                return;
            }

            //Array-case
            if(typeof args === 'object' && Array.isArray(args)) {
                if(args.length > 0) {
                    var left = args.length;
                    var rets = [];

                    _.each(args, function(args) {
                        use(args, function wrapper(ret) {
                            rets.push(ret);
                            if(!--left) {
                                callback(rets);
                            }
                        });
                    });
                } else {
                    warn('moduleManager:use:No args');
                    callback();
                }
                return;
            } else if(typeof args === 'string') {
                var modulename = args;
                var filename = base_directory+modulename+'.js';
                async_download(filename, function (err, code){
                    if(err) {
                        error('moduleManager:Couldn\'t download '+filename);
                        return;
                    }

                    var f = new Function('set', 'use', 'get', code);
                    var ret = f(set, use, get);

                    callback(ret);
                });
            } else {
                error('moduleManager:args has unknown type');
                return;
            }
        }

        return {
            use: use,
            get: get,
            set: set,
            setProgressCallback: setProgressCallback
        };
    })();
    moduleManager.set('async_download', async_download);

    fantasy.init = function (cnvname) {
        console.log('Initializing...');
        if (cnvname) {
            canvasname = cnvname;
            canvas = document.getElementById(canvasname);
        } else {
            canvas = document.createElement('canvas');
            canvas.id = 'canvas';
            canvasname = 'canvas';
            document.appendchild(canvas);
        }

        context = canvas.getContext('2d');
        content = {};

        enviroment = {
            canvasname: cnvname,
            canvas: canvas,
            context: context,
            content: content,
            get_xhr: getXMLHttpRequestObject,
            async_download: async_download,
            moduleManager: moduleManager
        };
    };
    fantasy.load = function (levelfile, callback) {
        console.log('Loading level from ' + levelfile);
        var xhr = getXMLHttpRequestObject();
        xhr.open('GET', levelfile, false);
        xhr.send(null);
        var level = JSON.parse(xhr.responseText);

        enviroment.content = content;
        enviroment.level = level;

        moduleManager.setProgressCallback(function progress(completed, total) {
            var ctx = enviroment.context;
            var cnv = enviroment.canvas;

            ctx.save();

            ctx.fillStyle = "#f80";
            ctx.fillRect(0, 0, cnv.width, cnv.height);

            ctx.fillStyle = "black";
            ctx.font = "12pt sans-serif";
            ctx.fillText(Math.round(100*completed/total) + '%', cnv.width/4, cnv.height/2 - 25);
            ctx.fillRect(cnv.width/4 - 2, cnv.height/2 - 17, cnv.width/2 + 4, 24);

            ctx.fillStyle = "green";
            ctx.fillRect(cnv.width/4, cnv.height/2 - 15, (completed/total)*cnv.width/2, 20);

            ctx.restore();
        });

        moduleManager.use({
            type: 'level',
            args: level
        }, callback);
    };
})();