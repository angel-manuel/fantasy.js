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

        var xhr = new XMLHttpRequest();
        
        xhr.open('GET', 'catalog.json', false);
        xhr.send(null);
        var catalog = JSON.parse(xhr.responseText);

        xhr = null;

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

            function wrapper(module) {
                modules[modulename] = module;

                console.log('ModuleManager:' + modulename + ' loaded');

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

        return {
            use: use,
            get: get,
            set: set
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

        moduleManager.use({
            type: 'level',
            args: level
        }, callback);
    };
})();