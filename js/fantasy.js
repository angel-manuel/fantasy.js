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
        var xhr = new XMLHttpRequest();
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
            module: function(args, callback) {
                if(args && args.src) {
                    async_download(args.src, function(err, response) {
                        if(err) {
                            callback(undefined);
                        }

                        var pre_constructor = new Function('enviroment', response);
                        var Constructor = pre_constructor(enviroment);

                        //TODO: Add scheme

                        callback(Constructor);
                    });
                } else {
                    callback(undefined);
                }
            },
            enviroment: function(args, callback) {
                if(args && args.src && args.name) {
                    async_download(args.src, function(err, response) {
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
            eval: function(args, callback) {
                if(args && args.src) {
                    async_download(args.src, function(err, response) {
                        if(err) {
                            callback(undefined);
                        }

                        var ret = eval(response);
                        callback(ret);
                    });
                }
            },
            image: function(args, callback) {
                if(args && args.src) {
                    var img = new Image();
                    img.addEventListener('load', function() {
                        callback(img);
                    });
                    img.src = args.src;
                }
            }
        };

        function load(modulename, description, callback) {
           loaders[description.type || "dummy"](description.args, callback);
        }

        return {
            use: function use(modulename, callback) {
                callback = callback || function(){};

                if(!catalog[modulename]) {
                    callback(false);
                    return;
                }

                if(modules[modulename]) {
                    callback(modules[modulename]);
                    return;
                }

                if(subs[modulename]) {
                    subs[modulename].push(callback);
                    return;
                }

                subs[modulename] = [callback];

                var description = catalog[modulename];

                function wrapper(module) {
                    modules[modulename] = module;

                    console.log('ModuleManager:' + modulename + ' loaded');

                    _.each(subs[modulename], function(sub) {
                        sub(module);
                    });
                }

                if(description.depends && description.depends.length > 0) {
                    var trigger = _.after(description.depends.length, _.bind(load, this, modulename, description, wrapper));
                    _.each(description.depends, function dependency_solve(dependency) {
                        this.use(dependency, trigger);
                    }, this);
                } else {
                    load(modulename, description, wrapper);
                }
            },
            get: function(modulename) {
                return (modulename in modules) ? modules[modulename] : undefined;
            },
            set: function(modulename, module) {
                modules[modulename] = module;
            }
        };
    })();

    //Transform(x, y, rotation)
    //Representa una transformación en el espacio y cada Node tiene una instancia de esta clase
    //TODO: Representar transformaciones no espaciales: opacidad, filtros de color y cualquier caso que soporte canvas

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
        apply: function () {
            enviroment.context.translate(this.x, this.y);
            enviroment.context.rotate(this.rotation);
            enviroment.context.scale(this.scale_x, this.scale_y);
        },
        applyPerspective: function (camera) {
            enviroment.context.translate(camera.x, camera.y);
            var rel_depth = this.z - camera.z;

            enviroment.context.translate((this.x - camera.x)/rel_depth, (this.y - camera.y)/rel_depth);
            enviroment.context.rotate(this.rotation);
            enviroment.context.scale(this.scale_x/rel_depth, this.scale_y/rel_depth);
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

    //Content(src, onload)
    //Clase base para todo dlc

    var Content = Class.extend({
        init: function (src, onload) {
            this.loaded = false;
            this.src = src;
            this.onload = onload;
        },
        load: function () {
            this.loaded = true;
            if(this.onload) {
                this.onload();
            }
        }
    });
    moduleManager.set('content', Content);

    //Abstractor(args)
    //Clase base para todos los abstractores

    var Abstractor = Class.extend({
        init: function (args) {
            this.args = args;
        }
    });
    moduleManager.set('abstractor', Abstractor);

    //Component(enviroment, args)
    //Clase base para todos los componentes

    var Component = Class.extend({
        //init(args)
        //Obtiene los argumentos del objeto args
        init: function (args) {
            this.loaded = false;
            this.args = args;
        },
        load: function () {
            this.loaded = true;
        },
        unload: function () {
            this.loaded = false;
        },
        draw: function () {},
        update: function (dt) {},
        //prepare()
        //Anuncia los servicios que el objeto ofrece
        prepare: function (gameobject) {
            this.gameobject = gameobject;
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
    moduleManager.set('component', Component);

    //Node(node_name, components, transform, subnodes)
    //Basicamente un contenedor de componentes y otros nodos con un transform

    var Node = Class.extend({
        init: function (node_name, enabled, components, layer, transform, subnodes) {
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
            _.each(components, function (component) {
                this.addComponent(component);
            }, this);
            
            var subnode_names = Object.keys(subnodes);
            _.each(subnode_names, function (subnode_name) {
                this.appendChild(subnodes[subnode_name]);
            }, this);
        },
        //attach(eventname, callback)
        //Cuando el evento eventname, callback sera llamado
        attach: function (eventname, callback) {
            if(this.listeners.hasOwnProperty(eventname)) {
                this.listeners.push(callback);
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

            if(component instanceof Component) {
                component.prepare(this);
                for(var i=0, len=this.components.length; i<len; ++i) {
                    if(!this.components[i]) {
                        this.components[i] = component;
                        return i + 1;
                    }
                }
                return this.components.push(component);
            } else {
                throw 'component no es una instancia de Component';
            }
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
            if(subnode instanceof Node) {
                subnode.setUpTransform(this.transform);
                subnode.parent = this;
                this.subnodes[subnode.node_name] = subnode;
            } else {
                throw 'subnode no es una instancia de Node';
            }
        },
        //deleteChild(node_name)
        //Borra el subnode de nombre node_name
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
            this.transform = Transform.Combine(this.up_transform, this.local_transform);

            _.each(this.subnodes, function (subnode) {
                subnode.setUpTransform(this.transform);
            }, this);
        },
        rebuildTransform: function () {
            this.transform = Transform.Combine(this.up_transform, this.local_transform);

            _.each(this.subnodes, function (subnode) {
                subnode.setUpTransform(this.transform);
            }, this);
        },
        translate: function (x, y, z) {
            this.local_transform.x += x;
            this.local_transform.y += y;
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
                rz = z - this.transform.z || 0;
            
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
                        draw_list.push({
                            gameobject: this.node_name,
                            transform: this.transform,
                            draw: component.draw.bind(component)
                        });
                        //component.draw();
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
        }
    });
    Node.FromLevel = function (name, level, callback) {
        var root;

        function find_explicit_deps_in_tree(tree) {
            var deps = [];

            var node_names = Object.keys(tree);

            _.each(tree, function(node) {
                if(node.components) {
                    _.each(node.components, function (component) {
                        deps.push(component.type);
                    });
                }
                if(node.subnodes) {
                    deps = deps.concat(find_explicit_deps_in_tree(node.subnodes));
                }
            });

            return deps;
        }

        function find_explicit_deps() {
            var deps = [];
            if(level.content) {
                if(level.content.download) {
                    _.each(level.content.download, function (dlc) {
                        deps.push(dlc.type);
                    });
                }
                if(level.content.abstraction) {
                    _.each(level.content.abstraction, function (abstraction) {
                        deps.push(abstraction.type);
                    });
                }
            }

            if(level.components) {
                _.each(level.components, function (component) {
                    deps.push(component.type);
                });
            }
            
            var sub = level.tree || level.subnodes;
            if(sub) {
                deps = deps.concat(find_explicit_deps_in_tree(sub));
            }

            return _.uniq(deps);
        }

        //load_step_1(callback)
        //Se encarga de cargar las dependencias explicitas e implicitas

        function load_step_1(callback) {
            var deps = [];

            if(level.depends) {
                deps = deps.concat(level.depends);
            }
            deps = deps.concat(find_explicit_deps());

            if(deps.length > 0) {
                var trigger = _.after(deps.length, load_step_2.bind(null, callback));
                _.each(deps, function (dep) {
                    moduleManager.use(dep, trigger);
                });
            } else {
                load_step_2(callback);
            }
        }

        //load_dlc(dlc, callback)
        //Carga y devuelve un contenido descargarble y llama a callback

        function load_dlc(dlc, callback) {
            console.log('Loading ' + dlc.type + ' from ' + dlc.src);
            var Constructor = moduleManager.get(dlc.type);
            return new Constructor(dlc.src, callback);
        }

        //load_step_2(callback)
        //Carga el contenido descargable

        function load_step_2(callback) {
            if (level.content && level.content.download) {
                var dlc_names = Object.keys(level.content.download);
                var trigger = _.after(dlc_names.length, load_step_3.bind(null, callback));
                _.each(level.content.download, function (dlc, dlc_name) {
                    if(!enviroment.content.hasOwnProperty(dlc_name)) {
                        enviroment.content[dlc_name] = load_dlc(dlc, trigger);
                    } else {
                        trigger();
                    }
                });
            } else {
                load_step_3(callback);
            }
        }

        //load_abstraction(abstraction)
        //Carga y devuelve una abstración

        function load_abstraction(abstraction) {
            console.log('Abstracting into ' + abstraction.type);
            var Constructor = moduleManager.get(abstraction.type);
            return new Constructor(abstraction.args);
        }

        //load_step_3(callback)
        //Carga las diversas abstraciones del contenido descargable

        function load_step_3(callback) {
            if (level.content && level.content.abstraction) {
                _.each(level.content.abstraction, function (abstraction, abstraction_name) {
                    if(!enviroment.content.hasOwnProperty(abstraction_name)) {
                        enviroment.content[abstraction_name] = load_abstraction(abstraction);
                    }
                });
            }
            load_step_4(callback);
        }

        //load_component(component)
        //Carga un componente

        function load_component(component) {
            console.log('Loading component of type ' + component.type);
            var Constructor = moduleManager.get(component.type);
            return new Constructor(component.args);
        }

        //load_node(node_name, node)
        //Carga un node, sus componentes y subnodos

        function load_node(node_name, node) {
            var subnodes = {};
            var components = [];
            
            if (node.components) {
                _.each(node.components, function (component) {
                    components.push(load_component(component));
                });
            }
            var sub = node.tree || node.subnodes;
            if (sub) {
                _.each(sub, function (subnode, subnode_name) {
                    subnodes[subnode_name] = load_node(subnode_name, subnode);
                });
            }
            var realnode = new Node(node_name, node.enabled, components, node.layer, new Transform(node.transform), subnodes);
            return realnode;
        }

        //load_step_4(callback)
        //Carga el arbol de la escena y llama a callback

        function load_step_4(callback) {
            root = load_node(name, level);
            callback(root);
        }

        load_step_1(callback);
        return root;
    };
    moduleManager.set('node', Node);

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
        Node.FromLevel('root', level, callback);
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