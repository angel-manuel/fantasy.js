(function () {
    function error(msg) {
        console.error('ERROR:' + msg);
        throw 'ERROR:' + msg;
    }

    function warning(msg) {
        console.warn('WARNING:' + msg);
    }
    
    var global_object = window || this,
        fantasy = {},
        debug = true,
        enviroment,
        canvasname,
        canvas,
        context;
    //canvas - Canvas HTML5 element
    //context - canvas.getContext('2d')
    
    global_object.fantasy = fantasy = {};

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
        xhr.addEventListener('readystatechange', function () {
            switch (xhr.readyState) {
            case 4:
                if (xhr.status === 200) {
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
        var modules = {},
            subs = {},
            base_directory = 'code/';

        function get(modulename) {
            var module = modules[modulename];
            if (module) {
                return module;
            } else {
                error('moduleManager:' + modulename + ' not loaded');
            }
        }

        function set(modulename, module) {
            if (modules[modulename]) {
                warning('moduleManager:' + modulename + ' being overwritten');
            }
            modules[modulename] = module;
        }

        function callback_wrapper(modulename, module) {
            modules[modulename] = module;
            console.log('moduleManager:' + modulename + ' loaded');
            _.each(subs[modulename], function propagate_to_subs(sub) {
                sub(module);
            });
        }

        function use(args, callback) {
            callback = callback || function () {};

            if (!args) {
                warning('moduleManager:use:No args');
                callback();
                return;
            }

            //Array-case
            if (typeof args === 'object' && Array.isArray(args)) {
                if (args.length > 0) {
                    var left = args.length, rets = {};

                    _.each(args, function (arg) {
                        use(arg, function wrapper(ret) {
                            rets[arg] = ret;
                            if (!(--left)) {
                                callback(rets);
                            }
                        });
                    });
                } else {
                    warning('moduleManager:use:No args');
                    callback();
                }
                return;
            } else if (typeof args === 'string') {
                var modulename = args;
                if (modules[modulename]) {
                    callback(modules[modulename]);
                }

                if (subs[modulename]) {
                    subs[modulename].push(callback);
                } else {
                    console.log('moduleManager:Loading ' + modulename);
                    subs[modulename] = [callback];
                    var callback_wrapper_specific = _.partial(callback_wrapper, modulename);

                    var filename = base_directory + modulename + '.js';
                    async_download(filename, function (err, code) {
                        if (err) {
                            error('moduleManager:Couldn\'t download ' + filename);
                            return;
                        }

                        var f = new Function('set', 'use', 'get', 'enviroment', 'retrn', code);
                        var ret = f(set, use, get, enviroment, callback_wrapper_specific);
                    });
                }
            } else {
                error('moduleManager:args has unknown type');
                callback(null);
                return;
            }
        }

        function list() {
            return _.keys(modules);
        }

        set('async_download', async_download);

        return {
            use: use,
            get: get,
            set: set,
            list: list
        };
    }());

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
            if (typeof this.x === 'string') {
                this.pixel_x = this.x.substring(0, this.x.length - 1) * canvas.width / 100;
            } else {
                this.pixel_x = this.x;
            }
            if (typeof this.y === 'string') {
                this.pixel_y = this.y.substring(0, this.y.length - 1) * canvas.height / 100;
            } else {
                this.pixel_y = this.y;
            }
            if (typeof this.width === 'string') {
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
            if(frame_buffer) {
                context.drawImage(frame_buffer, this.pixel_x, this.pixel_y, this.pixel_width, this.pixel_height);
            }
        },
        onclick: function (event) {
            var at = {
                x: event.clientX - this.pixel_x,
                y: event.clientY - this.pixel_y
            };
            return this.handler.onclick(at);
        }
    });

    Display.Add = function display_add(x, y, width, height, depth, handler) {
        var disp = Display.displays.push(new Display(x, y, width, height, depth, handler));
        Display.displays.sort(function depth_order(a, b) {
            if (a.depth < b.depth) {
                return 1;
            } else if (a.depth > b.depth) {
                return -1;
            } else {
                return 0;
            }
        });
        return disp;
    };

    Display.DrawAll = function display_draw_all() {
        _.each(Display.displays, function draw_display(d) {
            d.draw();
        });
    };

    Display.UpdateSizeAll = function display_update_size_all() {
        _.each(Display.displays, function update_display_size(d) {
            d.update_size();
        });
    };

    Display.QuitAll = function display_quit_all() {
        context.save();
        context.fillStyle = "#000000";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.restore();

        Display.displays = [];
    };

    Display.OnClick = function display_onclick(event) {
        var x = event.clientX,
            y = event.clientY;

        for (var i=Display.displays.length; i--;) {
            var display = Display.displays[i];
            if(display.pixel_x < x && x < (display.pixel_x + display.pixel_width) && display.pixel_y < y && y < (display.pixel_y + display.pixel_height)) {
                if(display.onclick(event))
                    break;
            }
        }
    };

    Display.displays = [];
    window.addEventListener('resize', Display.UpdateSizeAll);
    setInterval(Display.UpdateSizeAll, 5000);
    window.addEventListener('click', Display.OnClick);

    var Level = Class.extend({
        init: function(tree, content) {
            this.content = content;
            this.tree = tree;
            this.loaded = false;
        },
        load: function() {
            this.tree.load();
        },
        draw: function(layer_mask) {
            return this.tree.draw(layer_mask);
        },
        update: function(dt) {
            this.tree.update(dt);
        },
        start: function() {
            Display.QuitAll();
            this.stop();
            enviroment.content = this.content;
            enviroment.root = this.tree;

            this.tree.load();

            Level.current = this;
            Level.last_t = Date.now();
            requestAnimationFrame(Level.tick);
            this.loaded = true;
        },
        stop: function() {
            this.loaded = false;
            if(Level.current === this) {
                Display.QuitAll();
                Level.current = false;
                Level.current.unload();
            }
            if(enviroment.root === this.tree) {
                enviroment.root = false;
            }
        },
        getRoot: function () {
            return this.tree;
        },
        getContent: function () {
            return this.content;
        }
    });
    Level.last_t = Date.now();
    Level.tick = function tick() {
        if(Level.current) {
            var t = Date.now();
            var dt = (t - Level.last_t)/1000;
            Level.last_t = t;

            Level.current.update(dt);
            context.save();

            /*context.fillStyle = "#000000";
            context.fillRect(0, 0, canvas.width, canvas.height);*/

            Display.DrawAll();

            context.restore();
            requestAnimationFrame(tick);
        }
    };
    Level.current = false;

    var Transform = Class.extend({
        init: function (args) {
            args = args || {};
            this.x = args.x || 0;
            this.y = args.y || 0;
            this.z = args.z || 0;
            this.rotation = args.rotation || 0;
            this.scale_x = args.scale_x || args.scale || 1;
            this.scale_y = args.scale_y || args.scale || 1;
            this.scale_z = args.scale_z || args.scale || 1;
        },
        combine: function (transform) {
            this.x += transform.x * this.scale_x;
            this.y += transform.y * this.scale_y;
            this.z += transform.z * this.scale_z;

            this.scale_x = this.scale_x * transform.scale_x;
            this.scale_y = this.scale_y * transform.scale_y;
            this.scale_z = this.scale_z * transform.scale_z;

            this.rotation = this.rotation + transform.rotation;
        },
        transformPoint: function(point) {
            var tpoint = _.clone(point);
            tpoint.x -= this.x;
            tpoint.y -= this.y;
            tpoint.z -= this.z;

            var s = Math.sin(this.rotation), c = Math.cos(this.rotation);
            var x = tpoint.x, y = tpoint.y;
            tpoint.x = x*c - y*s;
            tpoint.y = x*s + y*c;

            tpoint.x *= this.scale_x;
            tpoint.y *= this.scale_y;
            tpoint.z *= this.scale_z;

            return tpoint;
        },
        untransformPoint: function(point) {
            var tpoint = _.clone(point);
            var s = Math.sin(-this.rotation), c = Math.cos(-this.rotation);
            var x = point.x, y = point.y;
            tpoint.x = x*c - y*s;
            tpoint.y = x*s + y*c;

            tpoint.x += this.x;
            tpoint.y += this.y;
            tpoint.z += this.z;

            tpoint.x /= this.scale_x;
            tpoint.y /= this.scale_y;
            tpoint.z /= this.scale_z;

            return tpoint;
        },
        toString: function () {
            return JSON.stringify(this);
        },
        fix: function () {
            this.rotation %= 2*Math.PI;
        }
    });
    Transform.Combine = function (A, B) {
        var s = Math.sin(A.rotation),
            c = Math.cos(A.rotation);

        c = 1;
        s = 0;

        var x = B.x*c - B.y*s,
            y = B.x*s + B.y*c;

        x *= A.scale_x;
        y *= B.scale_y;

        x += A.x;
        y += A.y;

        return new Transform({
            x: x,
            y: y,
            z: B.z*A.scale_z + A.z,
            rotation: B.rotation + A.rotation,
            scale_x: B.scale_x * A.scale_x,
            scale_y: B.scale_y * A.scale_y,
            scale_z: B.scale_z * A.scale_z
        });
    };

    var Component = Class.extend({
        //init(args)
        //Obtiene los argumentos del objeto args
        init: function (args) {
            this.loaded = false;
            this.args = args;
            this.redraw = true;
        },
        load: function () {
            this.loaded = true;
        },
        unload: function () {
            this.loaded = false;
        },
        needsDrawing: function () {
            return this.redraw;
        },
        draw: function () {
            this.redraw = false;
        },
        update: function (dt) {},
        //prepare()
        //Anuncia los servicios que el objeto ofrece
        prepare: function (gameobject) {
            this.gameobject = gameobject;
            gameobject.attach('move', _.bind(function() { this.redraw = true; }, this));
        },
        //destroy()
        //Libera los recursos
        destroy: function () {
            delete this.args;
            if(this.gameobject) {
                this.gameobject = undefined;
            }
        }
    });

    var FNode = Class.extend({
        init: function (node_name, enabled, layer, transform) {
            this.enabled = enabled || (typeof enabled === 'undefined');
            this.node_name = node_name;
            this.local_transform = transform || new Transform();
            this.up_transform = new Transform();
            this.transform = this.local_transform;
            this.layer = layer || 0;
            this.components = [];
            this.services = {};
            this.listeners = {};
            this.subnodes = {};
        },
        //attach(eventname, callback)
        //Cuando el evento eventname, callback sera llamado
        attach: function (eventname, callback) {
            if(this.listeners.hasOwnProperty(eventname)) {
                this.listeners[eventname].push(callback);
            } else {
                this.listeners[eventname] = [callback];
            }
        },
        //shot(eventname, args, propagate)
        //Hace saltar el evento eventname, llamando a los callbacks pasandoles args
        //y propagando el evento a los subnodos si propagate es verdadero
        shot: function (eventname, args, propagate) {
            if(this.listeners.hasOwnProperty(eventname)) {
                _.each(this.listeners[eventname], function (callback) {
                    callback(args);
                });
            }

            if(propagate) {
                _.each(this.subnodes, function (subnode) {
                        subnode.shot(eventname, args, propagate);
                    }
                );
            }
        },
        //get(path)
        //path - Array contienendo una ruta en el arbol
        //Devuelve el nodo en path o undefined
        get: function (path) {
            if (path && typeof path === "string") {
                path = path.split('/');
            }

            if (!path || path.length === 0) {
                return this;
            }

            var next = path.shift();
            if (!this.subnodes.hasOwnProperty(next)) {
                return undefined;
            } else {
                return this.subnodes[next].get(path);
            }
        },
        list: function () {
            return _.keys(this.subnodes);
        },
        tree: function () {
            var ret = {};
            _.each(this.subnodes, function (subnode, subnode_name) {
                ret[subnode_name] = subnode.tree();
            });
            return ret;
        },
        //addComponent(component)
        //component - instancia de Component
        //Añade un componente
        addComponent: function (component) {
            if(!this.enabled)
                throw 'Este nodo no esta inicializado';

            component.prepare(this);
            for(var i=0, len=this.components.length; i<len; ++i) {
                if(!this.components[i]) {
                    this.components[i] = component;
                    return i + 1;
                }
            }
            return this.components.push(component);
        },
        //deleteComponent(ref)
        //Borra el componente número ref
        deleteComponent: function (ref) {
            if(this.components[ref - 1]) {
                this.components[ref - 1].destroy();
                return delete this.components[ref - 1];
            } else {
                throw 'ref no es una referencia valida';
            }
        },
        //appendChild(subnode)
        //subnode - Instancia de Node
        //Añade un subnodo
        appendChild: function (subnode) {
            subnode.setUpTransform(this.transform);
            subnode.parent = this;
            this.subnodes[subnode.node_name] = subnode;
            subnode.rebuildTransform();
        },
        //deleteChild(node_name)
        //Borraloader/ el subnode de nombre node_name
        deleteChild: function (node_name) {
            if(this.subnodes[node_name]) {
                var subnode = this.subnodes[node_name];
                delete this.subnodes[node_name];
                subnode.destroy();
            } else {
                throw 'node_name no alude a ningun subnodo';
            }
        },
        //destroy()
        //Destruye este nodo y sus subnodos
        destroy: function () {
            if(!this.parent || !this.parent.deleteChild(this.node_name)) {
                _.each(this.components, function (component) {
                    if(component.load) {
                        component.destroy();
                    }
                });

                _.each(this.subnodes, function (subnode, subnode_name) {
                    this.deleteChild(subnode_name);
                });

                this.parent = undefined;
                this.subnodes = undefined;
                this.components = undefined;
                this.services = undefined;
            }
        },
        //addService(servicename, service)
        //Añade service ofreciendo servicename
        addService: function (servicename, service) {
            this.services[servicename] = service;
        },
        //getService(servicename)
        //Devuelve el servicio servicename
        getService: function (servicename) {
            if(this.services.hasOwnProperty(servicename)) {
                return this.services[servicename];
            }

            if(this.parent) {
                return this.parent.getService(servicename);
            } else {
                return undefined;
            }
        },
        setUpTransform: function(transform) {
            this.up_transform = transform;
            this.rebuildTransform();
        },
        rebuildTransform: function () {
            this.transform = Transform.Combine(this.up_transform, this.local_transform);

            _.each(this.subnodes, function (subnode) {
                subnode.setUpTransform(this.transform);
            }, this);

            this.shot('move', {}, false);
        },
        translate: function (x, y, z) {
            this.local_transform.x += x || 0;
            this.local_transform.y += y || 0;
            this.local_transform.z += z || 0;

            this.rebuildTransform();
        },
        rotate: function (angle) {
            this.local_transform.rotation += angle;

            this.rebuildTransform();
        },
        moveTo: function (x, y, z) {
            var rx = x - this.transform.x,
                ry = y - this.transform.y,
                rz = z - this.transform.z;
            
            this.translate(rx, ry, rz);
        },
        setRotation: function (angle) {
            var rangle = angle - this.transform.rotation;

            this.rotate(rangle);
        },
        load: function () {
            _.each(this.subnodes, function (subnode){
                    subnode.load();
                }
            );

            _.each(this.components, function (component) {
                component.load();
            });
        },
        unload: function () {
            _.each(this.subnodes, function (subnode) {
                    subnode.unload();
                }
            );

            _.each(this.components, function (component) {
                component.unload();
            });
        },
        draw: function (layer_mask) {
            if(!this.enabled)
                return [];

            var draw_list = [];

            if((layer_mask>>this.layer) % 2) {
                _.each(this.components, function (component) {
                    if (component.draw) {
                        var nd = component.needsDrawing || function () { return true; }
                        draw_list.push({
                            gameobject: this.node_name,
                            transform: this.transform,
                            draw: component.draw.bind(component),
                            needsDrawing: nd.bind(component)
                        });
                    }
                }, this);
            }

            _.each(this.subnodes, function (subnode) {
                draw_list = draw_list.concat(subnode.draw(layer_mask));
            }, this);

            return draw_list;
        },
        update: function (dt) {
            if(!this.enabled)
                return;

            _.each(this.subnodes, function (subnode) {
                subnode.update(dt);
            }, this);

            _.each(this.components, function (component) {
                if (component.update) {
                    if(!component.loaded)
                        component.load();

                    component.update(dt);
                }
            });
            
            this.transform.fix();
        },
        listServices: function() {
            return _.keys(this.services);
        },
        listListeners: function() {
            return _.keys(this.listeners);
        },
        lookup: function(path) {
            if(typeof path === "string") {
                path = path.split("/");
                path.reverse();
            }

            if(path.length == 0) {
                return this;
            }

            var next = path.pop(),
                next_sub = this.subnodes[next];

            if(next_sub) {
                return next_sub.lookup(path);
            } else {
                return next_sub;
            }
        }
    });

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

        function resize_canvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        document.body.style.scroll = 'none';
        document.body.style.overflow = 'hidden';
        document.body.style.margin= '0px';
        document.body.style.padding = '0px';
        canvas.style.margin = '0px';
        canvas.style.padding = '0px';
        resize_canvas();
        window.addEventListener('resize', resize_canvas);

        context = canvas.getContext('2d');

        enviroment = {
            canvasname: cnvname,
            canvas: canvas,
            context: context,
            get_xhr: getXMLHttpRequestObject,
            async_download: async_download,
            moduleManager: moduleManager,
            Component: Component,
            Display: Display,
            addDisplay: Display.Add
        };
    };

    fantasy.load = function (levelfile, callback) {
        console.log('Loading level from ' + levelfile);
        async_download(levelfile, function (err,res) {
            if(err) {
                error('load:Couldn\'t load level');
                return;
            }
            var level = JSON.parse(res);
            var root;

            var content = {};
            var oldcnt = enviroment.content;
            enviroment.content = content;

            enviroment.level = level;

            if(level.content) {
                var content_trigger = _.after(_.keys(level.content).length,  load_tree);
                _.each(level.content, function load_asset(cnt, cntname) {
                    moduleManager.use('loader/'+cnt.type, function load_asset_2(loader) {
                        cnt.args.name = cntname;
                        loader(cnt.args, function save_and_trigger(c) {
                            content[cntname] = c;
                            content_trigger(c);
                        });
                    });
                });
            } else {
                load_tree();
            }

            function load_node(nodename, node, callback) {
                var N = new FNode(nodename, true, node.layer, new Transform(node.transform));
                var n_components = 0;
                if(node.components) {
                    n_components = node.components.length;
                }
                var n_subnodes = 0;
                if(node.subnodes) {
                    n_subnodes = _.keys(node.subnodes).length;
                }

                var trigger = _.after(n_subnodes+n_components, _.bind(callback, null, N));

                if(node.subnodes) {
                    _.each(node.subnodes, function load_subnode(subnode, subnodename) {
                        load_node(subnodename, subnode, function add_subnode(S) {
                            N.appendChild(S);
                            trigger();
                        });
                    });
                }

                if(node.components) {
                    _.each(node.components, function load_component(component) {
                        moduleManager.use('component/'+component.type, function load_component_2(C) {
                            N.addComponent(new C(component.args));
                            trigger();
                        });
                    });
                }
            }

            function load_tree() {
                if(level.tree) {
                    load_node('root', {subnodes:level.tree}, function lvl_save(R) {
                        enviroment.content = oldcnt;
                        callback(new Level(R, content));
                    });
                } else {
                    enviroment.content = oldcnt;
                    error('load:level has no tree info');
                    return;
                }
            }
        });
    };

    fantasy.loadAndStart = function(levelfile, callback) {
        callback = callback || function(l) {};

        fantasy.load(levelfile, function(lvl) {
            lvl.start();
            callback(lvl);
        });
    }

    fantasy.getCurrentLevel = function () {
        return Level.current;
    }

    fantasy.getModuleManager = function () {
        return moduleManager;
    }
})();
