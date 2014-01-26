(function (){
    "use strict";
    
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

        var xhr = getXMLHttpRequestObject();
        
        xhr.open('GET', 'catalog.json', false);
        xhr.send(null);
        var catalog = JSON.parse(xhr.responseText);

        xhr = null;

        var progress_completed = 0;
        var progress_total = 0;
        var progress_callback = function(){};

        var loaders = {
            dummy: function dummy_loader(args, callback) {
                callback(undefined);
            },
            enviroment: function enviroment_loader(args, callback) {
                if(args && args.src && args.name) {
                    async_download(args.src, function (err, response) {
                        if(err) {
                            throw err;
                        }

                        var pre_constructor = new Function('enviroment', response);
                        var service = pre_constructor(enviroment);

                        enviroment[args.name] = service;
                        callback(service);
                    });
                } else {
                    throw 'enviroment_loader: Not enough args';
                }
            },
            loader: function loader_loader(args, callback) {
                if(args && args.src && args.name) {
                    async_download(args.src, function (err, response) {
                        if(err) {
                            throw err;
                        }

                        var pre_constructor = new Function('enviroment', response);
                        var loader = pre_constructor(enviroment);

                        loaders[args.name] = loader;
                        callback(loader);
                    });
                } else {
                    throw 'loader_loader: Not enough args';
                }
            },
            eval: function eval_loader(args, callback) {
                if(args && args.src) {
                    async_download(args.src, function (err, response) {
                        if(err) {
                            throw err;
                        }

                        var ret = eval(response);
                        callback(ret);
                    });
                } else {
                    throw 'eval_loader: Not enough args';
                }
            }
        };

        //Copying loaders to modules
        _.each(loaders, function(loader, loadername) {
            modules[loadername] = loader;
        });

        function load(modulename, description, callback) {
            var loader = loaders[description.type || "dummy"];
            description.args.name = description.args.name || modulename;
            if(loader) {
                loader(description.args, callback);
            } else {
                use(description.type, function load_exotic_module(loader) {
                    loader(description.args, callback);
                });
            }
        }

        function get_random_name() {
            var name = "random_" + Math.floor(Math.random()*100000);
            while(subs[name] || modules[name]) {
                name = "random_" + Math.floor(Math.random()*100000);
            }
            return name;
        }

        function use(args, callback) {
            callback = callback || function(){};

            if(!args) {
                callback();
                return;
            }

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
                    callback();
                }
                return;
            }

            var description;
            var modulename;

            switch(typeof args) {
                case 'string':
                    modulename = args;
                    if(!catalog[modulename]) {
                        callback(false);
                        return;
                    }

                    if(modules[modulename]) {
                        callback(modules[modulename]);
                        return;
                    }

                    description = catalog[modulename];

                    break;
                case 'object':
                    description = args;
                    modulename = args.name || get_random_name();
                    break;
            }

            if(subs[modulename]) {
                subs[modulename].push(callback);
                return;
            }

            subs[modulename] = [callback];
            console.log('ModuleManager: loading ' + modulename);
            progress_total = progress_total + 1;
            progress_callback(progress_completed, progress_total);

            function wrapper(module) {
                modules[modulename] = module;

                console.log('ModuleManager:' + modulename + ' loaded');
                progress_completed = progress_completed + 1;
                progress_callback(progress_completed, progress_total);

                _.each(subs[modulename], function alert_sub(sub) {
                    sub(module);
                });
            }

            if(description.depends && description.depends.length > 0) {
                var trigger = _.after(description.depends.length, _.bind(load, undefined, modulename, description, wrapper));
                _.each(description.depends, function dependency_solve(dependency) {
                    use(dependency, trigger);
                });
            } else {
                load(modulename, description, wrapper);
            }
        }

        function get(modulename) {
            return (modulename in modules) ? modules[modulename] : undefined;
        }

        function set(modulename, module) {
            modules[modulename] = module;
        }

        function setProgressCallback(p_callback) {
            progress_callback = p_callback;
            resetProgress();
        }

        function resetProgress() {
            progress_completed = 0;
            progress_total = 0;
        }

        return {
            use: use,
            get: get,
            set: set,
            setProgressCallback: setProgressCallback
        };
    })();

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
            ctx.fillRect(cnv.width/4, cnv.height/2 - 15, 3*cnv.width/4, cnv.height/2 + 15);

            ctx.fillStyle = "green";
            ctx.fillRect(cnv.width/4 + 1, cnv.height/2 - 13, (cnv.width/4 + 1)+(completed/total)*(cnv.width/2 - 2), cnv.height + 13);

            ctx.restore();
        });

        moduleManager.use({
            type: 'level',
            args: level
        }, callback);
    };
})();