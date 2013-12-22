(function (){
    "use strict";
    
    var global_object = window || this;

    var fantasy;
    global_object.fantasy = fantasy = {};

    var debug = true;

    var loaded = false;

    var canvasname, canvas, context;
    //canvas - Canvas HTML5 element
    //context - canvas.getContext('2d')

    var enviroment;
    var root;
    var displays;
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
            dummy: function(args, callback) {
                callback(undefined);
            },
            enviroment: function(args, callback) {
                if(args && args.src && args.name) {
                    async_download(args.src, function (err, response) {
                        if(err) {
                            callback(undefined);
                        }

                        var pre_constructor = new Function('enviroment', response);
                        var Service = pre_constructor(enviroment);

                        //TODO: Add scheme

                        enviroment[args.name] = Service;
                        callback(Service);
                    });
                } else {
                    callback(undefined);
                }
            },
            loader: function(args, callback) {
                if(args && args.src && args.name) {
                    async_download(args.src, function (err, response) {
                        if(err) {
                            callback(undefined);
                        }

                        var pre_constructor = new Function('enviroment', response);
                        var Loader = pre_constructor(enviroment);

                        //TODO: Add scheme

                        loaders[args.name] = Loader;
                        callback(Loader);
                    });
                } else {
                    callback(undefined);
                }
            },
            content: function(args, callback) {
                if(args && args.obj && args.name) {
                    args.obj.name = args.obj.name || args.name;
                    use(args.obj, function(obj) {
                        enviroment.content[args.name] = obj;
                        callback(obj);
                    });
                } else {
                    callback(undefined);
                }
            },
            eval: function(args, callback) {
                if(args && args.src) {
                    async_download(args.src, function (err, response) {
                        if(err) {
                            callback(undefined);
                        }

                        var ret = eval(response);
                        callback(ret);
                    });
                } else {
                    callback(undefined);
                }
            }
        };

        //Copying loaders to modules
        _.each(_.keys(loaders), function(loadername) {
            modules[loadername] = loaders[loadername];
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

    //resize_canvas()
    //Ajusta el tamaño del canvas al de la pantalla

    function resize_canvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        if(loaded) {
            _.each(displays, function (display) {
                display.update_size();
            });
        }
    }

    var Display = Class.extend({
        init: function (x, y, width, height, depth, handler) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.depth = depth;
            this.handler = handler;
            this.update_size();
        },
        update_size: function () {
            if(typeof this.x === 'string') {
                this.pixel_x = this.x.substring(0, this.x.length - 1) * canvas.width / 100;
            } else {
                this.pixel_x = this.x;
            }
            if(typeof this.y === 'string') {
                this.pixel_y = this.y.substring(0, this.y.length - 1) * canvas.height / 100;
            } else {
                this.pixel_y = this.y;
            }
            if(typeof this.width === 'string') {
                this.pixel_width = this.width.substring(0, this.width.length - 1) * canvas.width / 100;
            } else {
                this.pixel_width = this.width;
            }
            if(typeof this.height === 'string') {
                this.pixel_height = this.height.substring(0, this.height.length - 1) * canvas.height / 100;
            } else {
                this.pixel_height = this.height;
            }
            this.handler.resize(this.pixel_width, this.pixel_height);
        },
        draw: function () {
            var frame_buffer = this.handler.getFrameBuffer();
            context.drawImage(frame_buffer, this.pixel_x, this.pixel_y, this.pixel_width, this.pixel_height);
        },
        onclick: function (event) {
            var at = {
                x: event.clientX - this.pixel_x,
                y: event.clientY - this.pixel_y
            };
            return this.handler.onclick(at);
        }
    });

    function add_display(x, y, width, height, depth, handler) {
        var disp = displays.push(new Display(x, y, width, height, depth, handler));
        displays.sort(function depth_order(a, b) {
            if(a.depth < b.depth) {
                return 1;
            } else if(a.depth > b.depth) {
                return -1;
            } else {
                return 0;
            }
        });
        return disp;
    }

    //onclick(event)
    //Captura el evento de click y lo delega

    function onclick(event) {
        var x = event.clientX,
            y = event.clientY;

        for(var i=displays.length; i--;) {
            var display = displays[i];
            if(display.pixel_x < x && x < (display.pixel_x + display.pixel_width) && display.pixel_y < y && y < (display.pixel_y + display.pixel_height)) {
                if(display.onclick(event))
                    break;
            }
        }
    }

    //tick(dt)
    //Loop principal del juego, actualiza y dibuja el arbol

    function tick(dt) {
        enviroment.root.update(dt);
        context.save();

        context.fillStyle = "#000000";
        context.fillRect(0, 0, canvas.width, canvas.height);

        _.each(displays, function (display) {
            display.draw();
        });

        context.restore();
    }

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
        var fullscreen = false;
        if (fullscreen) {
            //TODO: Creo que esperaremos hasta que la API fullscreen este estandarizada
        } else {
            document.body.style.scroll = 'none';
            document.body.style.overflow = 'hidden';
            document.body.style.margin= '0px';
            document.body.style.padding = '0px';
            canvas.style.margin = '0px';
            canvas.style.padding = '0px';
            resize_canvas();
            window.addEventListener('resize', resize_canvas);
        }

        context = canvas.getContext('2d');
        content = {};

        enviroment = {
            canvasname: cnvname,
            canvas: canvas,
            context: context,
            content: content,
            get_xhr: getXMLHttpRequestObject,
            moduleManager: moduleManager,
            addDisplay: add_display
        };
    };
    fantasy.load = function (levelfile, callback) {
        loaded = false;
        console.log('Loading level from ' + levelfile);
        var xhr = getXMLHttpRequestObject();
        xhr.open('GET', levelfile, false);
        xhr.send(null);
        var level = JSON.parse(xhr.responseText);

        displays = [];
        enviroment.content = content;
        enviroment.level = level;

        moduleManager.use({
            type: 'level',
            args: level
        }, callback);
    };
    fantasy.start = function (root) {
        fantasy.stop();

        enviroment.root = root;
        enviroment.root.load();

        window.addEventListener('click', onclick.bind(this));

        tick_interval = setInterval(tick.bind(this, 1 / 45), 1000 / 45);
        loaded = true;
    };
    fantasy.stop = function () {
        loaded = false;
        if(tick_interval) {
            clearInterval(tick_interval);
            tick_interval = false;
        }
        if(enviroment.root) {
            enviroment.root.unload();
            enviroment.root = root = false;
        }
    };
    fantasy.root = function () {
        return enviroment.root;
    };
})();