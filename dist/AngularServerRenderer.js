module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var jsdom = __webpack_require__(1);
	var EngineConfig_1 = __webpack_require__(2);
	var dbug = __webpack_require__(3);
	var fs = __webpack_require__(12);
	var es6_promise_1 = __webpack_require__(13);
	var sourceMapSupport = __webpack_require__(14);
	var ResponseFormater_1 = __webpack_require__(15);
	var requesting = __webpack_require__(16);
	var events = __webpack_require__(17);
	var uuid = __webpack_require__(18);
	var Helpers_1 = __webpack_require__(6);
	sourceMapSupport.install({
	    handleUncaughtExceptions: false
	});
	var debug = dbug('angular.js-server');
	var JSDOMEventEmitter = (function (_super) {
	    __extends(JSDOMEventEmitter, _super);
	    function JSDOMEventEmitter() {
	        _super.apply(this, arguments);
	    }
	    return JSDOMEventEmitter;
	}(events.EventEmitter));
	var JSDOM_EVENTS = {
	    JSDOM_ERROR: 'JSDOM_ERROR',
	    JSDOM_URL_ERROR: 'JSDOM_URL_ERROR',
	    JSDOM_CREATED_ERROR: 'JSDOM_CREATED_ERROR',
	    JSDOM_DONE_ERROR: 'JSDOM_DONE_ERROR'
	};
	var AngularServerRenderer = (function () {
	    function AngularServerRenderer(config) {
	        var _this = this;
	        this.externalResources = [];
	        this.addExternalresource = function (url, content) {
	            Helpers_1.default.CheckType(url, ['string', 'regexp']);
	            Helpers_1.default.CheckType(content, 'string');
	            _this.externalResources.push({
	                url: url,
	                content: content
	            });
	        };
	        this.emptyExternalResources = function () {
	            _this.externalResources = [];
	        };
	        this.getExternalResources = function () {
	            return _this.externalResources;
	        };
	        this.getHTML = function (window, timeouts) {
	            debug('Getting HTML.');
	            var AngularDocument = window.angular.element(window.document);
	            var scope = AngularDocument.scope();
	            scope.$apply();
	            for (var i in timeouts) {
	                clearTimeout(timeouts[i]);
	            }
	            var html = window.document.documentElement.outerHTML;
	            if (typeof window.$cacheFactoryProvider !== 'undefined') {
	                debug('$cacheFactoryProvider', window.$cacheFactoryProvider);
	                var cachedData = window.$cacheFactoryProvider.exportAll();
	                var script = "<script type='text/javascript'> " +
	                    "/*No read only needed */" +
	                    "/*Object.defineProperty (window,'$angularServerCache', {value :  " + JSON.stringify(cachedData) + ",writable: false});*/"
	                    + "window.$angularServerCache = " + JSON.stringify(cachedData) + ";</script></head>";
	                debug('inserting the script: ', script);
	                html = html.replace(/<\/head>/i, script);
	            }
	            debug('returned HTML length: ', html.length);
	            return html;
	        };
	        this.middleware = function () {
	            var self = _this;
	            return function (req, res, next) {
	                debug('MiddleWare called with URL ', req.url);
	                if (req.method !== 'GET') {
	                    next();
	                }
	                if (req.xhr === true) {
	                    next();
	                }
	                if (/text\/html/.test(req.get('accept')) !== true) {
	                    next();
	                }
	                var send = res.send.bind(res);
	                res.send = function (body) {
	                    if (typeof body === 'string') {
	                        self.render(body, req.url).then(function (result) {
	                            debug('MiddleWare successfully rendered');
	                            res.location(req.url);
	                            res.status(200);
	                            return send.apply(this, [result.html]);
	                        }, function (result) {
	                            debug('MidleWare error rendering');
	                            res.status(500);
	                            res.location(req.url);
	                            return send.apply(this, [result.html]);
	                        });
	                    }
	                    else {
	                        return send.apply(this, [body]);
	                    }
	                };
	                next();
	            };
	        };
	        this.instanciateJSDOM = function (html, url, uid) {
	            jsdom.debugMode = true;
	            var URL = _this.config.server.getDomain() + ':' + _this.config.server.getPort() + url;
	            debug('SERVER URL = ', URL);
	            var debugVirtualConsole = jsdom.createVirtualConsole();
	            debugVirtualConsole.on("jsdomError", function (error) {
	                AngularServerRenderer.eventEmmiter.emit(JSDOM_EVENTS.JSDOM_ERROR + uid, error);
	                debug('Some serious shit happened', error.detail);
	            });
	            var document = jsdom.jsdom(html, {
	                features: {
	                    FetchExternalResources: ['script'],
	                    ProcessExternalResources: ['script']
	                },
	                resourceLoader: function (resource, callback) {
	                    var pathname = resource.url.pathname;
	                    var externalResource;
	                    for (var i in _this.externalResources) {
	                        externalResource = _this.externalResources[i];
	                        debug('Checking ', pathname, 'with ', externalResource.url);
	                        if ((typeof externalResource.url === 'string' && pathname === externalResource.url) || (typeof externalResource.url === 'regexp' && externalResource.url.test(pathname))) {
	                            return callback(null, externalResource.content);
	                        }
	                    }
	                    var fixedURL = null;
	                    debug('loading external resource  ', resource.url.pathname);
	                    if (resource.url.href.indexOf(_this.config.server.getDomain() + ':' + _this.config.server.getPort()) === 0) {
	                        if (/^(.+)\/.+/.test(url)) {
	                            var regexResult = /^(.+)\/.+/.exec(url);
	                            var fragment = regexResult[1];
	                            if (resource.url.pathname.indexOf(fragment) === 0) {
	                                fixedURL = _this.config.server.getDomain() + ':' + _this.config.server.getPort() + resource.url.pathname.substr(fragment.length);
	                                debug('Url fixed to ', fixedURL);
	                            }
	                        }
	                    }
	                    if (fixedURL === null) {
	                        fixedURL = resource.url.href;
	                    }
	                    requesting(fixedURL, function (err, response, body) {
	                        if (err) {
	                            AngularServerRenderer.eventEmmiter.emit(JSDOM_EVENTS.JSDOM_URL_ERROR + uid, err);
	                            return;
	                        }
	                        if (response.statusCode !== 200) {
	                            AngularServerRenderer.eventEmmiter.emit(JSDOM_EVENTS.JSDOM_URL_ERROR + uid, response);
	                            return;
	                        }
	                        return callback(null, body);
	                    });
	                },
	                url: URL,
	                virtualConsole: _this.config.server.getDebug() ? debugVirtualConsole.sendTo(console, { omitJsdomErrors: true }) : debugVirtualConsole,
	                document: {
	                    referrer: '',
	                    cookie: 'key=value; expires=Wed, Sep 21 2011 12:00:00 GMT; path=/',
	                    cookieDomain: _this.config.server.getDomain()
	                },
	                created: function (error, window) {
	                    if (error) {
	                        debug('Created event caught', error);
	                        AngularServerRenderer.eventEmmiter.emit(JSDOM_EVENTS.JSDOM_CREATED_ERROR + uid, error);
	                    }
	                },
	                done: function (error, window) {
	                    if (error) {
	                        debug('Done event caught', error);
	                        AngularServerRenderer.eventEmmiter.emit(JSDOM_EVENTS.JSDOM_DONE_ERROR + uid, error);
	                    }
	                }
	            });
	            return Object.assign(document.defaultView, {
	                onServer: true,
	                fs: fs,
	                logConfig: _this.config.log.getConfig(),
	                serverDebug: _this.config.server.getDebug(),
	                clientTimeoutValue: 100
	            });
	        };
	        this.clearEventEmitterListeners = function (uid) {
	            AngularServerRenderer.eventEmmiter.removeAllListeners(JSDOM_EVENTS.JSDOM_ERROR + uid);
	            AngularServerRenderer.eventEmmiter.removeAllListeners(JSDOM_EVENTS.JSDOM_CREATED_ERROR + uid);
	            AngularServerRenderer.eventEmmiter.removeAllListeners(JSDOM_EVENTS.JSDOM_DONE_ERROR + uid);
	            AngularServerRenderer.eventEmmiter.removeAllListeners(JSDOM_EVENTS.JSDOM_URL_ERROR + uid);
	        };
	        this.render = function (html, url) {
	            Helpers_1.default.CheckType(url, 'string');
	            Helpers_1.default.CheckType(html, 'string');
	            return new es6_promise_1.Promise(function (resolve, reject) {
	                var shouldRender;
	                shouldRender = _this.config.render.shouldRender(url);
	                if (!shouldRender) {
	                    debug('This Angular URL should not be pre-rendered', url);
	                    resolve(ResponseFormater_1.Response.send(html, ResponseFormater_1.ResponseStatus.RENDER_EXCLUDED));
	                }
	                else {
	                    var cacheUrl_1 = _this.config.cache.getCacheEngine().url(url);
	                    cacheUrl_1.isCached().then(function (isCached) {
	                        debug('Is URL ', url, 'cached?', isCached);
	                        if (isCached === true) {
	                            debug('This URL is cached', url);
	                            cacheUrl_1.getUrl().then(function (res) {
	                                resolve(ResponseFormater_1.Response.send(res, ResponseFormater_1.ResponseStatus.ALREADY_CACHED));
	                            });
	                        }
	                        else {
	                            var rendering_1 = false;
	                            var uid_1 = uuid.v1();
	                            AngularServerRenderer.eventEmmiter.on(JSDOM_EVENTS.JSDOM_ERROR + uid_1, function (error) {
	                                debug('Some JSDOM exception happened', error);
	                                _this.clearEventEmitterListeners(uid_1);
	                                reject(ResponseFormater_1.Response.send(html, ResponseFormater_1.ResponseStatus.JSDOM_ERROR, error));
	                            });
	                            AngularServerRenderer.eventEmmiter.on(JSDOM_EVENTS.JSDOM_CREATED_ERROR + uid_1, function (error) {
	                                _this.clearEventEmitterListeners(uid_1);
	                                reject(ResponseFormater_1.Response.send(html, ResponseFormater_1.ResponseStatus.JSDOM_ERROR, error));
	                            });
	                            AngularServerRenderer.eventEmmiter.on(JSDOM_EVENTS.JSDOM_DONE_ERROR + uid_1, function (error) {
	                                _this.clearEventEmitterListeners(uid_1);
	                                reject(ResponseFormater_1.Response.send(html, ResponseFormater_1.ResponseStatus.JSDOM_ERROR, error));
	                            });
	                            AngularServerRenderer.eventEmmiter.on(JSDOM_EVENTS.JSDOM_URL_ERROR + uid_1, function (error) {
	                                _this.clearEventEmitterListeners(uid_1);
	                                reject(ResponseFormater_1.Response.send(html, ResponseFormater_1.ResponseStatus.JSDOM_URL_ERROR, error));
	                            });
	                            var window_1 = _this.instanciateJSDOM(html, url, uid_1);
	                            var serverTimeout_1 = setTimeout(function () {
	                                if (rendering_1)
	                                    return;
	                                debug('SERVER TIMEOUT ! ! !');
	                                rendering_1 = true;
	                                _this.clearEventEmitterListeners(uid_1);
	                                cacheUrl_1.removeUrl().then(function (res) {
	                                    debug('Remove URL', res);
	                                    reject(ResponseFormater_1.Response.send(html, ResponseFormater_1.ResponseStatus.SERVER_TIMEOUT));
	                                    window_1.close();
	                                }, function (res) {
	                                    reject(ResponseFormater_1.Response.send(html, ResponseFormater_1.ResponseStatus.SERVER_TIMEOUT));
	                                    window_1.close();
	                                });
	                            }, _this.config.server.getTimeout());
	                            window_1.addEventListener('ServerExceptionHandler', function (err, data) {
	                                rendering_1 = true;
	                                _this.clearEventEmitterListeners(uid_1);
	                                cacheUrl_1.removeUrl().then(function () {
	                                    debug('EVENT LISTENER ON ServerExceptionHandler CATCHED', err.details);
	                                    reject(ResponseFormater_1.Response.send(html, ResponseFormater_1.ResponseStatus.ERROR_HANDLER, err));
	                                    window_1.close();
	                                    window_1.dispose();
	                                });
	                            });
	                            window_1.addEventListener('Idle', function () {
	                                debug('Idle event caught');
	                                if (rendering_1)
	                                    return;
	                                rendering_1 = true;
	                                var renderedHtml = _this.getHTML(window_1, [serverTimeout_1]);
	                                _this.clearEventEmitterListeners(uid_1);
	                                cacheUrl_1.cache(renderedHtml).then(function (cacheStatus) {
	                                    debug('caching the url = ', url, cacheStatus);
	                                    resolve(ResponseFormater_1.Response.send(renderedHtml, ResponseFormater_1.ResponseStatus.RENDERED));
	                                    window_1.close();
	                                    window_1.dispose();
	                                }, function (err) {
	                                    debug('Something went wrong with the cache', err);
	                                    resolve(ResponseFormater_1.Response.send(renderedHtml, ResponseFormater_1.ResponseStatus.RENDERED));
	                                    window_1.close();
	                                    window_1.dispose();
	                                });
	                            });
	                            window_1.addEventListener('load', function () {
	                                debug('Application is loaded in JSDOM');
	                            });
	                        }
	                    });
	                }
	            });
	        };
	        this.config = new EngineConfig_1.default(config);
	        debug('AngularServerRenderer initialized with config = ', config);
	    }
	    AngularServerRenderer.eventEmmiter = new JSDOMEventEmitter();
	    return AngularServerRenderer;
	}());
	;
	module.exports = AngularServerRenderer;


/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = require("jsdom");

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var dbug = __webpack_require__(3);
	var debug = dbug('angular.js-server');
	var cache_1 = __webpack_require__(4);
	var log_1 = __webpack_require__(8);
	var render_1 = __webpack_require__(10);
	var server_1 = __webpack_require__(11);
	var EngineConfig = (function () {
	    function EngineConfig(config) {
	        this.cache = new cache_1.default();
	        this.restCache = new cache_1.default();
	        this.server = new server_1.default();
	        this.log = new log_1.default();
	        this.render = new render_1.default();
	        if (config) {
	            this.server.importConfig(config.server);
	            this.render.importConfig(config.render);
	            this.cache.importConfig(config.cache);
	            this.restCache.importConfig(config.restCache);
	            this.log.importConfig(config.log);
	        }
	        this.setConfigInstanciated();
	        this.cache.initialize();
	        this.restCache.initialize();
	        this.log.initialize();
	    }
	    EngineConfig.prototype.setConfigInstanciated = function () {
	        this.cache.setConfigInstanciated(true);
	        this.log.setConfigInstanciated(true);
	    };
	    return EngineConfig;
	}());
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = EngineConfig;


/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = require("debug");

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var simple_url_cache_1 = __webpack_require__(5);
	var Helpers_1 = __webpack_require__(6);
	var path = __webpack_require__(7);
	var dbug = __webpack_require__(3);
	var debug = dbug('angular.js-server');
	var CacheConfig = (function () {
	    function CacheConfig() {
	        this.cacheConfig = {
	            storageConfig: {
	                type: 'file',
	                dir: path.resolve(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'] + '/cache/angular.js-server')
	            },
	            cacheRules: {
	                default: 'never',
	                cacheMaxAge: [],
	                cacheNever: [],
	                cacheAlways: []
	            }
	        };
	        this.configInstanciated = false;
	    }
	    CacheConfig.prototype.importConfig = function (config) {
	        var _this = this;
	        this.setStorageConfig(config.storageConfig);
	        this.setDefault(config.cacheRules.default);
	        config.cacheRules.cacheMaxAge.forEach(function (item) {
	            _this.addMaxAgeRule(item.regex, item.maxAge);
	        });
	        config.cacheRules.cacheAlways.forEach(function (item) {
	            _this.addAlwaysRule(item.regex);
	        });
	        config.cacheRules.cacheNever.forEach(function (item) {
	            _this.addNeverRule(item.regex);
	        });
	    };
	    CacheConfig.prototype.getCacheEngine = function () {
	        return this.cache;
	    };
	    CacheConfig.prototype.setConfigInstanciated = function (bool) {
	        this.configInstanciated = bool;
	    };
	    CacheConfig.prototype.initialize = function () {
	        if (!this.configInstanciated) {
	            return;
	        }
	        this.cache = new simple_url_cache_1.CacheEngine(this.cacheConfig.storageConfig, this.cacheConfig.cacheRules);
	    };
	    CacheConfig.prototype.clearCachedUrl = function (url) {
	        Helpers_1.default.CheckType(url, 'string');
	        return this.cache.url(url).removeUrl();
	    };
	    ;
	    CacheConfig.prototype.clearAllCachedUrl = function () {
	        return this.cache.clearAllCache();
	    };
	    ;
	    CacheConfig.prototype.setStorageConfig = function (config) {
	        this.cacheConfig.storageConfig = config;
	        this.initialize();
	    };
	    ;
	    CacheConfig.prototype.setDefault = function (def) {
	        Helpers_1.default.StringIn(def, ['always', 'never']);
	        this.cacheConfig.cacheRules.default = def;
	        this.initialize();
	    };
	    ;
	    CacheConfig.prototype.addMaxAgeRule = function (rule, maxAge) {
	        this.checkExists(rule);
	        this.cacheConfig.cacheRules.cacheMaxAge.push({ regex: rule, maxAge: maxAge });
	        this.initialize();
	    };
	    ;
	    CacheConfig.prototype.addAlwaysRule = function (rule) {
	        this.checkExists(rule);
	        this.cacheConfig.cacheRules.cacheAlways.push({ regex: rule });
	        this.initialize();
	    };
	    ;
	    CacheConfig.prototype.addNeverRule = function (rule) {
	        this.checkExists(rule);
	        this.cacheConfig.cacheRules.cacheNever.push({ regex: rule });
	        this.initialize();
	    };
	    ;
	    CacheConfig.prototype.removeMaxAgeRule = function (rule) {
	        Helpers_1.default.CheckType(rule, RegExp);
	        var index = null;
	        for (var i in this.cacheConfig.cacheRules.cacheMaxAge) {
	            if (Helpers_1.default.SameRegex(this.cacheConfig.cacheRules.cacheMaxAge[i].regex, rule)) {
	                index = i;
	            }
	        }
	        if (index !== null) {
	            this.cacheConfig.cacheRules.cacheMaxAge.splice(index, 1);
	            this.initialize();
	        }
	    };
	    ;
	    CacheConfig.prototype.removeAlwaysRule = function (rule) {
	        Helpers_1.default.CheckType(rule, RegExp);
	        var index = null;
	        for (var i in this.cacheConfig.cacheRules.cacheAlways) {
	            if (Helpers_1.default.SameRegex(this.cacheConfig.cacheRules.cacheAlways[i].regex, rule)) {
	                index = i;
	            }
	        }
	        if (index !== null) {
	            this.cacheConfig.cacheRules.cacheAlways.splice(index, 1);
	            this.initialize();
	        }
	    };
	    ;
	    CacheConfig.prototype.removeNeverRule = function (rule) {
	        Helpers_1.default.CheckType(rule, RegExp);
	        var index = null;
	        for (var i in this.cacheConfig.cacheRules.cacheNever) {
	            if (Helpers_1.default.SameRegex(this.cacheConfig.cacheRules.cacheNever[i].regex, rule)) {
	                index = i;
	            }
	        }
	        if (index !== null) {
	            this.cacheConfig.cacheRules.cacheNever.splice(index, 1);
	            this.initialize();
	        }
	    };
	    ;
	    CacheConfig.prototype.removeAllMaxAgeRules = function () {
	        this.cacheConfig.cacheRules.cacheMaxAge = [];
	    };
	    ;
	    CacheConfig.prototype.removeAllAlwaysRules = function () {
	        this.cacheConfig.cacheRules.cacheAlways = [];
	    };
	    ;
	    CacheConfig.prototype.removeAllNeverRules = function () {
	        this.cacheConfig.cacheRules.cacheNever = [];
	    };
	    ;
	    CacheConfig.prototype.removeAllRules = function () {
	        this.removeAllAlwaysRules();
	        this.removeAllMaxAgeRules();
	        this.removeAllNeverRules();
	    };
	    ;
	    CacheConfig.prototype.getDefault = function () {
	        return this.cacheConfig.cacheRules.default;
	    };
	    ;
	    CacheConfig.prototype.getMaxAgeRules = function () {
	        return this.cacheConfig.cacheRules.cacheMaxAge;
	    };
	    ;
	    CacheConfig.prototype.getAlwaysRules = function () {
	        return this.cacheConfig.cacheRules.cacheAlways;
	    };
	    ;
	    CacheConfig.prototype.getNeverRules = function () {
	        return this.cacheConfig.cacheRules.cacheNever;
	    };
	    ;
	    CacheConfig.prototype.checkExists = function (rule) {
	        Helpers_1.default.RegexNotIn(rule, this.getRegexes(this.cacheConfig.cacheRules.cacheMaxAge));
	        Helpers_1.default.RegexNotIn(rule, this.getRegexes(this.cacheConfig.cacheRules.cacheNever));
	        Helpers_1.default.RegexNotIn(rule, this.getRegexes(this.cacheConfig.cacheRules.cacheAlways));
	    };
	    CacheConfig.prototype.getRegexes = function (collection) {
	        var reg = [];
	        for (var i in collection) {
	            reg.push(collection[i].regex);
	        }
	        return reg;
	    };
	    return CacheConfig;
	}());
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = CacheConfig;


/***/ },
/* 5 */
/***/ function(module, exports) {

	module.exports = require("simple-url-cache");

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var debug = __webpack_require__(3)('angular.js-server');
	var Helpers = (function () {
	    function Helpers() {
	    }
	    Helpers.Error = function () {
	        var args = [];
	        for (var _i = 0; _i < arguments.length; _i++) {
	            args[_i - 0] = arguments[_i];
	        }
	        throw new Error(args.join(', '));
	    };
	    Helpers.SameRegex = function (r1, r2) {
	        debug('checking if rules are the same', r1, r2);
	        if (r1 instanceof RegExp && r2 instanceof RegExp) {
	            var props = ["global", "multiline", "ignoreCase", "source"];
	            for (var i = 0; i < props.length; i++) {
	                var prop = props[i];
	                if (r1[prop] !== r2[prop]) {
	                    debug('props diff', prop, r1[prop], r2[prop]);
	                    return false;
	                }
	            }
	            return true;
	        }
	        return false;
	    };
	    Helpers.CheckType = function (input, type) {
	        if (typeof input === 'object') {
	            if (typeof type === 'string' && input.constructor !== type) {
	                Helpers.Error('This input is not a valid', type, input, ' type is', input);
	            }
	            else if (typeof type === 'array') {
	                var valid = false;
	                type.forEach(function (item) {
	                    if (input.constructor === item) {
	                        valid = true;
	                    }
	                });
	                if (!valid) {
	                    Helpers.Error(input, 'Doesn\'t match any of these types', type, ' got ', input.constructor);
	                }
	            }
	        }
	        else {
	            if (typeof type === 'string' && typeof input !== type) {
	                Helpers.Error('This input is not a valid', type, input, ' type is', typeof input);
	            }
	            else if (typeof type === 'array') {
	                var valid = false;
	                type.forEach(function (item) {
	                    if (typeof input === item) {
	                        valid = true;
	                    }
	                });
	                if (!valid) {
	                    Helpers.Error(input, 'Doesn\'t match any of these types', type, ' got ', typeof input);
	                }
	            }
	        }
	    };
	    Helpers.StringIn = function (input, validValues) {
	        Helpers.CheckType(input, 'string');
	        if (validValues.length === 0) {
	            return;
	        }
	        var valid = false;
	        validValues.forEach(function (item) {
	            if (item === input) {
	                valid = true;
	            }
	        });
	        if (!valid) {
	            Helpers.Error(input, 'should match', validValues);
	        }
	    };
	    Helpers.RegexNotIn = function (regex, regexes, desc) {
	        if (regexes.length === 0) {
	            return;
	        }
	        Helpers.CheckType(regex, RegExp);
	        regexes.forEach(function (item) {
	            if (Helpers.SameRegex(item, regex)) {
	                Helpers.Error(item, ' Is already defined ', desc);
	            }
	        });
	    };
	    return Helpers;
	}());
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = Helpers;


/***/ },
/* 7 */
/***/ function(module, exports) {

	module.exports = require("path");

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var Helpers_1 = __webpack_require__(6);
	var path = __webpack_require__(7);
	var fs = __webpack_require__(9);
	var dbug = __webpack_require__(3);
	var debug = dbug('angular.js-server');
	var LogConfig = (function () {
	    function LogConfig() {
	        var _this = this;
	        this.logConfig = {
	            dir: path.resolve(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'] + '/log/angular.js-server'),
	            log: { enabled: true, stack: false },
	            error: { enabled: true, stack: false },
	            warn: { enabled: true, stack: false },
	            info: { enabled: true, stack: false },
	            debug: { enabled: true, stack: false },
	            serverLogFile: 'angular-server.log'
	        };
	        this.configInstanciated = false;
	        this.setBasePath = function (path) {
	            Helpers_1.default.CheckType(path, 'string');
	            _this.logConfig.dir = path;
	            _this.initialize();
	        };
	        this.setDefinition = function (log, enabled, stack) {
	            Helpers_1.default.CheckType(log, 'string');
	            Helpers_1.default.CheckType(enabled, 'boolean');
	            _this.logConfig[log].enabled = enabled;
	            _this.logConfig[log].stack = stack ? true : false;
	            _this.initialize();
	        };
	        this.setFileServerName = function (name) {
	            Helpers_1.default.CheckType(name, 'string');
	            _this.logConfig.serverLogFile = name;
	            _this.initialize();
	        };
	        this.getBasePath = function () {
	            return _this.logConfig.dir;
	        };
	        this.getDefinition = function (log) {
	            return _this.logConfig[log];
	        };
	        this.getFileServerName = function () {
	            return _this.logConfig.serverLogFile;
	        };
	        this.getLogPath = function (log) {
	            return path.join(_this.logConfig.dir, log + '.log');
	        };
	        this.getLogServerPath = function () {
	            return path.join(_this.logConfig.dir, _this.logConfig.serverLogFile + '.log');
	        };
	        this.getConfig = function () {
	            return _this.logConfig;
	        };
	        this.log = function () {
	            var args = [];
	            for (var _i = 0; _i < arguments.length; _i++) {
	                args[_i - 0] = arguments[_i];
	            }
	            fs.appendFileSync(_this.getLogServerPath(), args.join(', ') + '\n');
	        };
	    }
	    LogConfig.prototype.importConfig = function (config) {
	        var _this = this;
	        this.setBasePath(config.dir);
	        ['log', 'warn', 'error', 'info', 'debug'].forEach(function (log) {
	            _this.setDefinition(log, config[log].enabled, config[log].stack);
	        });
	        this.setFileServerName(config.serverLogFile);
	    };
	    LogConfig.prototype.setConfigInstanciated = function (bool) {
	        this.configInstanciated = bool;
	    };
	    LogConfig.prototype.initialize = function () {
	        var _this = this;
	        if (!this.configInstanciated) {
	            return;
	        }
	        this.logConfig.dir = path.resolve(path.normalize(this.logConfig.dir));
	        try {
	            fs.mkdirsSync(this.logConfig.dir);
	        }
	        catch (e) {
	            Helpers_1.default.Error("can't create the log dir", this.logConfig.dir, e);
	        }
	        var paths = [];
	        ['warn', 'log', 'debug', 'error', 'info'].forEach(function (item) {
	            if (_this.logConfig[item].enabled) {
	                paths.push(_this.getLogPath(item));
	            }
	        });
	        paths.push(path.resolve(path.join(this.logConfig.dir, 'dev.log')));
	        paths.push(this.getLogServerPath());
	        paths.forEach(function (path) {
	            try {
	                fs.closeSync(fs.openSync(path, 'a'));
	            }
	            catch (e) {
	                Helpers_1.default.Error(e);
	            }
	        });
	    };
	    ;
	    return LogConfig;
	}());
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = LogConfig;


/***/ },
/* 9 */
/***/ function(module, exports) {

	module.exports = require("fs-extra");

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var Helpers_1 = __webpack_require__(6);
	var dbug = __webpack_require__(3);
	var debug = dbug('angular.js-server');
	var RenderConfig = (function () {
	    function RenderConfig() {
	        this.renderConfig = {
	            strategy: 'never',
	            rules: []
	        };
	    }
	    RenderConfig.prototype.importConfig = function (config) {
	        var _this = this;
	        this.setStrategy(config.strategy);
	        config.rules.forEach(function (rule) {
	            _this.addRule(rule);
	        });
	    };
	    RenderConfig.prototype.shouldRender = function (url) {
	        var i, regex;
	        Helpers_1.default.CheckType(url, 'string');
	        debug('shouldRender called with url, renderConfig ', url, this.renderConfig);
	        switch (this.renderConfig.strategy) {
	            case 'never':
	                return false;
	            case 'always':
	                return true;
	            case 'include':
	                for (i in this.renderConfig.rules) {
	                    regex = this.renderConfig.rules[i];
	                    if (regex.test(url)) {
	                        return true;
	                    }
	                }
	                return false;
	            case 'exclude':
	                for (i in this.renderConfig.rules) {
	                    regex = this.renderConfig.rules[i];
	                    if (regex.test(url)) {
	                        return false;
	                    }
	                }
	                return true;
	        }
	    };
	    ;
	    RenderConfig.prototype.setStrategy = function (strategy) {
	        Helpers_1.default.StringIn(strategy, ['include', 'exclude', 'always', 'never']);
	        this.renderConfig.strategy = strategy;
	    };
	    ;
	    RenderConfig.prototype.addRule = function (rule) {
	        Helpers_1.default.CheckType(rule, RegExp);
	        Helpers_1.default.RegexNotIn(rule, this.renderConfig.rules);
	        this.renderConfig.rules.push(rule);
	    };
	    ;
	    RenderConfig.prototype.removeRule = function (rule) {
	        Helpers_1.default.CheckType(rule, RegExp);
	        var index = null;
	        for (var i in this.renderConfig.rules) {
	            if (Helpers_1.default.SameRegex(this.renderConfig.rules[i], rule)) {
	                index = i;
	            }
	        }
	        if (index !== null) {
	            this.renderConfig.rules.splice(index, 1);
	        }
	    };
	    ;
	    RenderConfig.prototype.getStrategy = function () {
	        return this.renderConfig.strategy;
	    };
	    ;
	    RenderConfig.prototype.getRules = function () {
	        return this.renderConfig.rules;
	    };
	    ;
	    RenderConfig.prototype.hasRule = function (rule) {
	        Helpers_1.default.CheckType(rule, RegExp);
	        for (var i in this.renderConfig.rules) {
	            if (Helpers_1.default.SameRegex(this.renderConfig.rules[i], rule)) {
	                return true;
	            }
	        }
	        return false;
	    };
	    ;
	    return RenderConfig;
	}());
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = RenderConfig;


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var Helpers_1 = __webpack_require__(6);
	var dbug = __webpack_require__(3);
	var debug = dbug('angular.js-server');
	var ServerConfig = (function () {
	    function ServerConfig() {
	        var _this = this;
	        this.serverConfig = {
	            domain: 'http://localhost',
	            port: 80,
	            timeout: 10000,
	            debug: true,
	            base: '/'
	        };
	        this.setDomain = function (domain) {
	            Helpers_1.default.CheckType(domain, 'string');
	            _this.serverConfig.domain = domain;
	        };
	        this.setPort = function (port) {
	            Helpers_1.default.CheckType(port, 'number');
	            _this.serverConfig.port = port;
	        };
	        this.setTimeout = function (timeout) {
	            Helpers_1.default.CheckType(timeout, 'number');
	            _this.serverConfig.timeout = timeout;
	        };
	        this.setDebug = function (debug) {
	            Helpers_1.default.CheckType(debug, 'boolean');
	            _this.serverConfig.debug = debug;
	        };
	        this.setBase = function (base) {
	            Helpers_1.default.CheckType(base, 'string');
	            _this.serverConfig.base = base;
	        };
	        this.getDomain = function () {
	            return _this.serverConfig.domain;
	        };
	        this.getPort = function () {
	            return _this.serverConfig.port;
	        };
	        this.getTimeout = function () {
	            return _this.serverConfig.timeout;
	        };
	        this.getDebug = function () {
	            return _this.serverConfig.debug;
	        };
	        this.getBase = function () {
	            return _this.serverConfig.base;
	        };
	    }
	    ServerConfig.prototype.importConfig = function (config) {
	        this.setDomain(config.domain);
	        this.setPort(config.port);
	        this.setTimeout(config.timeout);
	        this.setDebug(config.debug);
	        this.setBase(config.base);
	    };
	    return ServerConfig;
	}());
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = ServerConfig;


/***/ },
/* 12 */
/***/ function(module, exports) {

	module.exports = require("fs");

/***/ },
/* 13 */
/***/ function(module, exports) {

	module.exports = require("es6-promise");

/***/ },
/* 14 */
/***/ function(module, exports) {

	module.exports = require("source-map-support");

/***/ },
/* 15 */
/***/ function(module, exports) {

	"use strict";
	exports.ResponseStatus = {
	    RENDERED: 'RENDERED',
	    RENDER_EXCLUDED: 'RENDER_EXCLUDED',
	    ALREADY_CACHED: 'ALREADY_CACHED',
	    SERVER_TIMEOUT: 'SERVER_TIMEOUT',
	    ERROR_HANDLER: 'ERROR_HANDLER',
	    SERVER_ERROR: 'SERVER_ERROR',
	    JSDOM_ERROR: 'JSDOM_ERROR',
	    JSDOM_URL_ERROR: 'JSDOM_URL_ERROR'
	};
	var ResponseCodes = {
	    RENDERED: 0,
	    RENDER_EXCLUDED: 1,
	    ALREADY_CACHED: 2,
	    SERVER_TIMEOUT: 3,
	    ERROR_HANDLER: 4,
	    SERVER_ERROR: 5,
	    JSDOM_ERROR: 6,
	    JSDOM_URL_ERROR: 7
	};
	var Response = (function () {
	    function Response() {
	    }
	    Response.send = function (html, status, Exception) {
	        if (typeof ResponseCodes[status] === 'undefined') {
	            throw new Error('This status doesn\'t exist ' + status);
	        }
	        var trace = null;
	        if (ResponseCodes[status].stacktrace) {
	            if (typeof Exception === 'Error') {
	                trace = Error['stack'];
	            }
	            else {
	                trace = new Error().stack;
	            }
	        }
	        return {
	            html: html,
	            code: ResponseCodes[status],
	            status: status,
	            trace: trace
	        };
	    };
	    return Response;
	}());
	exports.Response = Response;


/***/ },
/* 16 */
/***/ function(module, exports) {

	module.exports = require("request");

/***/ },
/* 17 */
/***/ function(module, exports) {

	module.exports = require("events");

/***/ },
/* 18 */
/***/ function(module, exports) {

	module.exports = require("node-uuid");

/***/ }
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgODYwZWQ4NTg2N2NkODFmOGRlNGYiLCJ3ZWJwYWNrOi8vLy4vc3JjL0FuZ3VsYXJTZXJ2ZXJSZW5kZXJlci50cyIsIndlYnBhY2s6Ly8vZXh0ZXJuYWwgXCJqc2RvbVwiIiwid2VicGFjazovLy8uL3NyYy9FbmdpbmVDb25maWcudHMiLCJ3ZWJwYWNrOi8vL2V4dGVybmFsIFwiZGVidWdcIiIsIndlYnBhY2s6Ly8vLi9zcmMvY29uZmlnL2NhY2hlLnRzIiwid2VicGFjazovLy9leHRlcm5hbCBcInNpbXBsZS11cmwtY2FjaGVcIiIsIndlYnBhY2s6Ly8vLi9zcmMvSGVscGVycy50cyIsIndlYnBhY2s6Ly8vZXh0ZXJuYWwgXCJwYXRoXCIiLCJ3ZWJwYWNrOi8vLy4vc3JjL2NvbmZpZy9sb2cudHMiLCJ3ZWJwYWNrOi8vL2V4dGVybmFsIFwiZnMtZXh0cmFcIiIsIndlYnBhY2s6Ly8vLi9zcmMvY29uZmlnL3JlbmRlci50cyIsIndlYnBhY2s6Ly8vLi9zcmMvY29uZmlnL3NlcnZlci50cyIsIndlYnBhY2s6Ly8vZXh0ZXJuYWwgXCJmc1wiIiwid2VicGFjazovLy9leHRlcm5hbCBcImVzNi1wcm9taXNlXCIiLCJ3ZWJwYWNrOi8vL2V4dGVybmFsIFwic291cmNlLW1hcC1zdXBwb3J0XCIiLCJ3ZWJwYWNrOi8vLy4vc3JjL1Jlc3BvbnNlRm9ybWF0ZXIudHMiLCJ3ZWJwYWNrOi8vL2V4dGVybmFsIFwicmVxdWVzdFwiIiwid2VicGFjazovLy9leHRlcm5hbCBcImV2ZW50c1wiIiwid2VicGFjazovLy9leHRlcm5hbCBcIm5vZGUtdXVpZFwiIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsdUJBQWU7QUFDZjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFD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O0FBQ0E7Ozs7Ozs7QUN0U0EsbUM7Ozs7OztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRUFBQztBQUNELCtDQUE4QyxjQUFjO0FBQzVEOzs7Ozs7O0FDakNBLG1DOzs7Ozs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxjQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBUztBQUNUO0FBQ0E7QUFDQSxVQUFTO0FBQ1Q7QUFDQTtBQUNBLFVBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsdURBQXNELDhCQUE4QjtBQUNwRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsdURBQXNELGNBQWM7QUFDcEU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHNEQUFxRCxjQUFjO0FBQ25FO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEVBQUM7QUFDRCwrQ0FBOEMsY0FBYztBQUM1RDs7Ozs7OztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEVBQUM7QUFDRCwrQ0FBOEMsY0FBYztBQUM1RDs7Ozs7OztBQzVEQSxnQzs7Ozs7O0FDQUEseUM7Ozs7OztBQ0FBLGdEOzs7Ozs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxFQUFDO0FBQ0Q7Ozs7Ozs7QUM5Q0EscUM7Ozs7OztBQ0FBLG9DOzs7Ozs7QUNBQSx1QyIsImZpbGUiOiJBbmd1bGFyU2VydmVyUmVuZGVyZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0ZXhwb3J0czoge30sXG4gXHRcdFx0aWQ6IG1vZHVsZUlkLFxuIFx0XHRcdGxvYWRlZDogZmFsc2VcbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubG9hZGVkID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXygwKTtcblxuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIHdlYnBhY2svYm9vdHN0cmFwIDg2MGVkODU4NjdjZDgxZjhkZTRmXG4gKiovIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBqc2RvbSA9IHJlcXVpcmUoJ2pzZG9tJyk7XG52YXIgRW5naW5lQ29uZmlnXzEgPSByZXF1aXJlKCcuL0VuZ2luZUNvbmZpZycpO1xudmFyIGRidWcgPSByZXF1aXJlKCdkZWJ1ZycpO1xudmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcbnZhciBlczZfcHJvbWlzZV8xID0gcmVxdWlyZSgnZXM2LXByb21pc2UnKTtcbnZhciBzb3VyY2VNYXBTdXBwb3J0ID0gcmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0Jyk7XG52YXIgUmVzcG9uc2VGb3JtYXRlcl8xID0gcmVxdWlyZSgnLi9SZXNwb25zZUZvcm1hdGVyJyk7XG52YXIgcmVxdWVzdGluZyA9IHJlcXVpcmUoJ3JlcXVlc3QnKTtcbnZhciBldmVudHMgPSByZXF1aXJlKCdldmVudHMnKTtcbnZhciB1dWlkID0gcmVxdWlyZSgnbm9kZS11dWlkJyk7XG52YXIgSGVscGVyc18xID0gcmVxdWlyZSgnLi9IZWxwZXJzJyk7XG5zb3VyY2VNYXBTdXBwb3J0Lmluc3RhbGwoe1xuICAgIGhhbmRsZVVuY2F1Z2h0RXhjZXB0aW9uczogZmFsc2Vcbn0pO1xudmFyIGRlYnVnID0gZGJ1ZygnYW5ndWxhci5qcy1zZXJ2ZXInKTtcbnZhciBKU0RPTUV2ZW50RW1pdHRlciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEpTRE9NRXZlbnRFbWl0dGVyLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEpTRE9NRXZlbnRFbWl0dGVyKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgcmV0dXJuIEpTRE9NRXZlbnRFbWl0dGVyO1xufShldmVudHMuRXZlbnRFbWl0dGVyKSk7XG52YXIgSlNET01fRVZFTlRTID0ge1xuICAgIEpTRE9NX0VSUk9SOiAnSlNET01fRVJST1InLFxuICAgIEpTRE9NX1VSTF9FUlJPUjogJ0pTRE9NX1VSTF9FUlJPUicsXG4gICAgSlNET01fQ1JFQVRFRF9FUlJPUjogJ0pTRE9NX0NSRUFURURfRVJST1InLFxuICAgIEpTRE9NX0RPTkVfRVJST1I6ICdKU0RPTV9ET05FX0VSUk9SJ1xufTtcbnZhciBBbmd1bGFyU2VydmVyUmVuZGVyZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEFuZ3VsYXJTZXJ2ZXJSZW5kZXJlcihjb25maWcpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgdGhpcy5leHRlcm5hbFJlc291cmNlcyA9IFtdO1xuICAgICAgICB0aGlzLmFkZEV4dGVybmFscmVzb3VyY2UgPSBmdW5jdGlvbiAodXJsLCBjb250ZW50KSB7XG4gICAgICAgICAgICBIZWxwZXJzXzEuZGVmYXVsdC5DaGVja1R5cGUodXJsLCBbJ3N0cmluZycsICdyZWdleHAnXSk7XG4gICAgICAgICAgICBIZWxwZXJzXzEuZGVmYXVsdC5DaGVja1R5cGUoY29udGVudCwgJ3N0cmluZycpO1xuICAgICAgICAgICAgX3RoaXMuZXh0ZXJuYWxSZXNvdXJjZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICAgICAgY29udGVudDogY29udGVudFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZW1wdHlFeHRlcm5hbFJlc291cmNlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIF90aGlzLmV4dGVybmFsUmVzb3VyY2VzID0gW107XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZ2V0RXh0ZXJuYWxSZXNvdXJjZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMuZXh0ZXJuYWxSZXNvdXJjZXM7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZ2V0SFRNTCA9IGZ1bmN0aW9uICh3aW5kb3csIHRpbWVvdXRzKSB7XG4gICAgICAgICAgICBkZWJ1ZygnR2V0dGluZyBIVE1MLicpO1xuICAgICAgICAgICAgdmFyIEFuZ3VsYXJEb2N1bWVudCA9IHdpbmRvdy5hbmd1bGFyLmVsZW1lbnQod2luZG93LmRvY3VtZW50KTtcbiAgICAgICAgICAgIHZhciBzY29wZSA9IEFuZ3VsYXJEb2N1bWVudC5zY29wZSgpO1xuICAgICAgICAgICAgc2NvcGUuJGFwcGx5KCk7XG4gICAgICAgICAgICBmb3IgKHZhciBpIGluIHRpbWVvdXRzKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBodG1sID0gd2luZG93LmRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5vdXRlckhUTUw7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHdpbmRvdy4kY2FjaGVGYWN0b3J5UHJvdmlkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZGVidWcoJyRjYWNoZUZhY3RvcnlQcm92aWRlcicsIHdpbmRvdy4kY2FjaGVGYWN0b3J5UHJvdmlkZXIpO1xuICAgICAgICAgICAgICAgIHZhciBjYWNoZWREYXRhID0gd2luZG93LiRjYWNoZUZhY3RvcnlQcm92aWRlci5leHBvcnRBbGwoKTtcbiAgICAgICAgICAgICAgICB2YXIgc2NyaXB0ID0gXCI8c2NyaXB0IHR5cGU9J3RleHQvamF2YXNjcmlwdCc+IFwiICtcbiAgICAgICAgICAgICAgICAgICAgXCIvKk5vIHJlYWQgb25seSBuZWVkZWQgKi9cIiArXG4gICAgICAgICAgICAgICAgICAgIFwiLypPYmplY3QuZGVmaW5lUHJvcGVydHkgKHdpbmRvdywnJGFuZ3VsYXJTZXJ2ZXJDYWNoZScsIHt2YWx1ZSA6ICBcIiArIEpTT04uc3RyaW5naWZ5KGNhY2hlZERhdGEpICsgXCIsd3JpdGFibGU6IGZhbHNlfSk7Ki9cIlxuICAgICAgICAgICAgICAgICAgICArIFwid2luZG93LiRhbmd1bGFyU2VydmVyQ2FjaGUgPSBcIiArIEpTT04uc3RyaW5naWZ5KGNhY2hlZERhdGEpICsgXCI7PC9zY3JpcHQ+PC9oZWFkPlwiO1xuICAgICAgICAgICAgICAgIGRlYnVnKCdpbnNlcnRpbmcgdGhlIHNjcmlwdDogJywgc2NyaXB0KTtcbiAgICAgICAgICAgICAgICBodG1sID0gaHRtbC5yZXBsYWNlKC88XFwvaGVhZD4vaSwgc2NyaXB0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlYnVnKCdyZXR1cm5lZCBIVE1MIGxlbmd0aDogJywgaHRtbC5sZW5ndGgpO1xuICAgICAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMubWlkZGxld2FyZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gX3RoaXM7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgICAgICAgICAgICAgZGVidWcoJ01pZGRsZVdhcmUgY2FsbGVkIHdpdGggVVJMICcsIHJlcS51cmwpO1xuICAgICAgICAgICAgICAgIGlmIChyZXEubWV0aG9kICE9PSAnR0VUJykge1xuICAgICAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZXEueGhyID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKC90ZXh0XFwvaHRtbC8udGVzdChyZXEuZ2V0KCdhY2NlcHQnKSkgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgc2VuZCA9IHJlcy5zZW5kLmJpbmQocmVzKTtcbiAgICAgICAgICAgICAgICByZXMuc2VuZCA9IGZ1bmN0aW9uIChib2R5KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYucmVuZGVyKGJvZHksIHJlcS51cmwpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlYnVnKCdNaWRkbGVXYXJlIHN1Y2Nlc3NmdWxseSByZW5kZXJlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5sb2NhdGlvbihyZXEudXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzKDIwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNlbmQuYXBwbHkodGhpcywgW3Jlc3VsdC5odG1sXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVidWcoJ01pZGxlV2FyZSBlcnJvciByZW5kZXJpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzKDUwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzLmxvY2F0aW9uKHJlcS51cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzZW5kLmFwcGx5KHRoaXMsIFtyZXN1bHQuaHRtbF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2VuZC5hcHBseSh0aGlzLCBbYm9keV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmluc3RhbmNpYXRlSlNET00gPSBmdW5jdGlvbiAoaHRtbCwgdXJsLCB1aWQpIHtcbiAgICAgICAgICAgIGpzZG9tLmRlYnVnTW9kZSA9IHRydWU7XG4gICAgICAgICAgICB2YXIgVVJMID0gX3RoaXMuY29uZmlnLnNlcnZlci5nZXREb21haW4oKSArICc6JyArIF90aGlzLmNvbmZpZy5zZXJ2ZXIuZ2V0UG9ydCgpICsgdXJsO1xuICAgICAgICAgICAgZGVidWcoJ1NFUlZFUiBVUkwgPSAnLCBVUkwpO1xuICAgICAgICAgICAgdmFyIGRlYnVnVmlydHVhbENvbnNvbGUgPSBqc2RvbS5jcmVhdGVWaXJ0dWFsQ29uc29sZSgpO1xuICAgICAgICAgICAgZGVidWdWaXJ0dWFsQ29uc29sZS5vbihcImpzZG9tRXJyb3JcIiwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgQW5ndWxhclNlcnZlclJlbmRlcmVyLmV2ZW50RW1taXRlci5lbWl0KEpTRE9NX0VWRU5UUy5KU0RPTV9FUlJPUiArIHVpZCwgZXJyb3IpO1xuICAgICAgICAgICAgICAgIGRlYnVnKCdTb21lIHNlcmlvdXMgc2hpdCBoYXBwZW5lZCcsIGVycm9yLmRldGFpbCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBkb2N1bWVudCA9IGpzZG9tLmpzZG9tKGh0bWwsIHtcbiAgICAgICAgICAgICAgICBmZWF0dXJlczoge1xuICAgICAgICAgICAgICAgICAgICBGZXRjaEV4dGVybmFsUmVzb3VyY2VzOiBbJ3NjcmlwdCddLFxuICAgICAgICAgICAgICAgICAgICBQcm9jZXNzRXh0ZXJuYWxSZXNvdXJjZXM6IFsnc2NyaXB0J11cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlc291cmNlTG9hZGVyOiBmdW5jdGlvbiAocmVzb3VyY2UsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXRobmFtZSA9IHJlc291cmNlLnVybC5wYXRobmFtZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGV4dGVybmFsUmVzb3VyY2U7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gX3RoaXMuZXh0ZXJuYWxSZXNvdXJjZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVybmFsUmVzb3VyY2UgPSBfdGhpcy5leHRlcm5hbFJlc291cmNlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlYnVnKCdDaGVja2luZyAnLCBwYXRobmFtZSwgJ3dpdGggJywgZXh0ZXJuYWxSZXNvdXJjZS51cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCh0eXBlb2YgZXh0ZXJuYWxSZXNvdXJjZS51cmwgPT09ICdzdHJpbmcnICYmIHBhdGhuYW1lID09PSBleHRlcm5hbFJlc291cmNlLnVybCkgfHwgKHR5cGVvZiBleHRlcm5hbFJlc291cmNlLnVybCA9PT0gJ3JlZ2V4cCcgJiYgZXh0ZXJuYWxSZXNvdXJjZS51cmwudGVzdChwYXRobmFtZSkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIGV4dGVybmFsUmVzb3VyY2UuY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpeGVkVVJMID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgZGVidWcoJ2xvYWRpbmcgZXh0ZXJuYWwgcmVzb3VyY2UgICcsIHJlc291cmNlLnVybC5wYXRobmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNvdXJjZS51cmwuaHJlZi5pbmRleE9mKF90aGlzLmNvbmZpZy5zZXJ2ZXIuZ2V0RG9tYWluKCkgKyAnOicgKyBfdGhpcy5jb25maWcuc2VydmVyLmdldFBvcnQoKSkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgvXiguKylcXC8uKy8udGVzdCh1cmwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlZ2V4UmVzdWx0ID0gL14oLispXFwvLisvLmV4ZWModXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZnJhZ21lbnQgPSByZWdleFJlc3VsdFsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzb3VyY2UudXJsLnBhdGhuYW1lLmluZGV4T2YoZnJhZ21lbnQpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpeGVkVVJMID0gX3RoaXMuY29uZmlnLnNlcnZlci5nZXREb21haW4oKSArICc6JyArIF90aGlzLmNvbmZpZy5zZXJ2ZXIuZ2V0UG9ydCgpICsgcmVzb3VyY2UudXJsLnBhdGhuYW1lLnN1YnN0cihmcmFnbWVudC5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWJ1ZygnVXJsIGZpeGVkIHRvICcsIGZpeGVkVVJMKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpeGVkVVJMID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXhlZFVSTCA9IHJlc291cmNlLnVybC5ocmVmO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3RpbmcoZml4ZWRVUkwsIGZ1bmN0aW9uIChlcnIsIHJlc3BvbnNlLCBib2R5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQW5ndWxhclNlcnZlclJlbmRlcmVyLmV2ZW50RW1taXRlci5lbWl0KEpTRE9NX0VWRU5UUy5KU0RPTV9VUkxfRVJST1IgKyB1aWQsIGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgIT09IDIwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEFuZ3VsYXJTZXJ2ZXJSZW5kZXJlci5ldmVudEVtbWl0ZXIuZW1pdChKU0RPTV9FVkVOVFMuSlNET01fVVJMX0VSUk9SICsgdWlkLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIGJvZHkpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHVybDogVVJMLFxuICAgICAgICAgICAgICAgIHZpcnR1YWxDb25zb2xlOiBfdGhpcy5jb25maWcuc2VydmVyLmdldERlYnVnKCkgPyBkZWJ1Z1ZpcnR1YWxDb25zb2xlLnNlbmRUbyhjb25zb2xlLCB7IG9taXRKc2RvbUVycm9yczogdHJ1ZSB9KSA6IGRlYnVnVmlydHVhbENvbnNvbGUsXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgcmVmZXJyZXI6ICcnLFxuICAgICAgICAgICAgICAgICAgICBjb29raWU6ICdrZXk9dmFsdWU7IGV4cGlyZXM9V2VkLCBTZXAgMjEgMjAxMSAxMjowMDowMCBHTVQ7IHBhdGg9LycsXG4gICAgICAgICAgICAgICAgICAgIGNvb2tpZURvbWFpbjogX3RoaXMuY29uZmlnLnNlcnZlci5nZXREb21haW4oKVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY3JlYXRlZDogZnVuY3Rpb24gKGVycm9yLCB3aW5kb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWJ1ZygnQ3JlYXRlZCBldmVudCBjYXVnaHQnLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBBbmd1bGFyU2VydmVyUmVuZGVyZXIuZXZlbnRFbW1pdGVyLmVtaXQoSlNET01fRVZFTlRTLkpTRE9NX0NSRUFURURfRVJST1IgKyB1aWQsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZG9uZTogZnVuY3Rpb24gKGVycm9yLCB3aW5kb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWJ1ZygnRG9uZSBldmVudCBjYXVnaHQnLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBBbmd1bGFyU2VydmVyUmVuZGVyZXIuZXZlbnRFbW1pdGVyLmVtaXQoSlNET01fRVZFTlRTLkpTRE9NX0RPTkVfRVJST1IgKyB1aWQsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oZG9jdW1lbnQuZGVmYXVsdFZpZXcsIHtcbiAgICAgICAgICAgICAgICBvblNlcnZlcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBmczogZnMsXG4gICAgICAgICAgICAgICAgbG9nQ29uZmlnOiBfdGhpcy5jb25maWcubG9nLmdldENvbmZpZygpLFxuICAgICAgICAgICAgICAgIHNlcnZlckRlYnVnOiBfdGhpcy5jb25maWcuc2VydmVyLmdldERlYnVnKCksXG4gICAgICAgICAgICAgICAgY2xpZW50VGltZW91dFZhbHVlOiAxMDBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmNsZWFyRXZlbnRFbWl0dGVyTGlzdGVuZXJzID0gZnVuY3Rpb24gKHVpZCkge1xuICAgICAgICAgICAgQW5ndWxhclNlcnZlclJlbmRlcmVyLmV2ZW50RW1taXRlci5yZW1vdmVBbGxMaXN0ZW5lcnMoSlNET01fRVZFTlRTLkpTRE9NX0VSUk9SICsgdWlkKTtcbiAgICAgICAgICAgIEFuZ3VsYXJTZXJ2ZXJSZW5kZXJlci5ldmVudEVtbWl0ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKEpTRE9NX0VWRU5UUy5KU0RPTV9DUkVBVEVEX0VSUk9SICsgdWlkKTtcbiAgICAgICAgICAgIEFuZ3VsYXJTZXJ2ZXJSZW5kZXJlci5ldmVudEVtbWl0ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKEpTRE9NX0VWRU5UUy5KU0RPTV9ET05FX0VSUk9SICsgdWlkKTtcbiAgICAgICAgICAgIEFuZ3VsYXJTZXJ2ZXJSZW5kZXJlci5ldmVudEVtbWl0ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKEpTRE9NX0VWRU5UUy5KU0RPTV9VUkxfRVJST1IgKyB1aWQpO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLnJlbmRlciA9IGZ1bmN0aW9uIChodG1sLCB1cmwpIHtcbiAgICAgICAgICAgIEhlbHBlcnNfMS5kZWZhdWx0LkNoZWNrVHlwZSh1cmwsICdzdHJpbmcnKTtcbiAgICAgICAgICAgIEhlbHBlcnNfMS5kZWZhdWx0LkNoZWNrVHlwZShodG1sLCAnc3RyaW5nJyk7XG4gICAgICAgICAgICByZXR1cm4gbmV3IGVzNl9wcm9taXNlXzEuUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHNob3VsZFJlbmRlcjtcbiAgICAgICAgICAgICAgICBzaG91bGRSZW5kZXIgPSBfdGhpcy5jb25maWcucmVuZGVyLnNob3VsZFJlbmRlcih1cmwpO1xuICAgICAgICAgICAgICAgIGlmICghc2hvdWxkUmVuZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlYnVnKCdUaGlzIEFuZ3VsYXIgVVJMIHNob3VsZCBub3QgYmUgcHJlLXJlbmRlcmVkJywgdXJsKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShSZXNwb25zZUZvcm1hdGVyXzEuUmVzcG9uc2Uuc2VuZChodG1sLCBSZXNwb25zZUZvcm1hdGVyXzEuUmVzcG9uc2VTdGF0dXMuUkVOREVSX0VYQ0xVREVEKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2FjaGVVcmxfMSA9IF90aGlzLmNvbmZpZy5jYWNoZS5nZXRDYWNoZUVuZ2luZSgpLnVybCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICBjYWNoZVVybF8xLmlzQ2FjaGVkKCkudGhlbihmdW5jdGlvbiAoaXNDYWNoZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlYnVnKCdJcyBVUkwgJywgdXJsLCAnY2FjaGVkPycsIGlzQ2FjaGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0NhY2hlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlYnVnKCdUaGlzIFVSTCBpcyBjYWNoZWQnLCB1cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhY2hlVXJsXzEuZ2V0VXJsKCkudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoUmVzcG9uc2VGb3JtYXRlcl8xLlJlc3BvbnNlLnNlbmQocmVzLCBSZXNwb25zZUZvcm1hdGVyXzEuUmVzcG9uc2VTdGF0dXMuQUxSRUFEWV9DQUNIRUQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZW5kZXJpbmdfMSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1aWRfMSA9IHV1aWQudjEoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBBbmd1bGFyU2VydmVyUmVuZGVyZXIuZXZlbnRFbW1pdGVyLm9uKEpTRE9NX0VWRU5UUy5KU0RPTV9FUlJPUiArIHVpZF8xLCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVidWcoJ1NvbWUgSlNET00gZXhjZXB0aW9uIGhhcHBlbmVkJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5jbGVhckV2ZW50RW1pdHRlckxpc3RlbmVycyh1aWRfMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChSZXNwb25zZUZvcm1hdGVyXzEuUmVzcG9uc2Uuc2VuZChodG1sLCBSZXNwb25zZUZvcm1hdGVyXzEuUmVzcG9uc2VTdGF0dXMuSlNET01fRVJST1IsIGVycm9yKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQW5ndWxhclNlcnZlclJlbmRlcmVyLmV2ZW50RW1taXRlci5vbihKU0RPTV9FVkVOVFMuSlNET01fQ1JFQVRFRF9FUlJPUiArIHVpZF8xLCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuY2xlYXJFdmVudEVtaXR0ZXJMaXN0ZW5lcnModWlkXzEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoUmVzcG9uc2VGb3JtYXRlcl8xLlJlc3BvbnNlLnNlbmQoaHRtbCwgUmVzcG9uc2VGb3JtYXRlcl8xLlJlc3BvbnNlU3RhdHVzLkpTRE9NX0VSUk9SLCBlcnJvcikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEFuZ3VsYXJTZXJ2ZXJSZW5kZXJlci5ldmVudEVtbWl0ZXIub24oSlNET01fRVZFTlRTLkpTRE9NX0RPTkVfRVJST1IgKyB1aWRfMSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmNsZWFyRXZlbnRFbWl0dGVyTGlzdGVuZXJzKHVpZF8xKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KFJlc3BvbnNlRm9ybWF0ZXJfMS5SZXNwb25zZS5zZW5kKGh0bWwsIFJlc3BvbnNlRm9ybWF0ZXJfMS5SZXNwb25zZVN0YXR1cy5KU0RPTV9FUlJPUiwgZXJyb3IpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBBbmd1bGFyU2VydmVyUmVuZGVyZXIuZXZlbnRFbW1pdGVyLm9uKEpTRE9NX0VWRU5UUy5KU0RPTV9VUkxfRVJST1IgKyB1aWRfMSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmNsZWFyRXZlbnRFbWl0dGVyTGlzdGVuZXJzKHVpZF8xKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KFJlc3BvbnNlRm9ybWF0ZXJfMS5SZXNwb25zZS5zZW5kKGh0bWwsIFJlc3BvbnNlRm9ybWF0ZXJfMS5SZXNwb25zZVN0YXR1cy5KU0RPTV9VUkxfRVJST1IsIGVycm9yKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHdpbmRvd18xID0gX3RoaXMuaW5zdGFuY2lhdGVKU0RPTShodG1sLCB1cmwsIHVpZF8xKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2VydmVyVGltZW91dF8xID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZW5kZXJpbmdfMSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVidWcoJ1NFUlZFUiBUSU1FT1VUICEgISAhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlcmluZ18xID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuY2xlYXJFdmVudEVtaXR0ZXJMaXN0ZW5lcnModWlkXzEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWNoZVVybF8xLnJlbW92ZVVybCgpLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVidWcoJ1JlbW92ZSBVUkwnLCByZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KFJlc3BvbnNlRm9ybWF0ZXJfMS5SZXNwb25zZS5zZW5kKGh0bWwsIFJlc3BvbnNlRm9ybWF0ZXJfMS5SZXNwb25zZVN0YXR1cy5TRVJWRVJfVElNRU9VVCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93XzEuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KFJlc3BvbnNlRm9ybWF0ZXJfMS5SZXNwb25zZS5zZW5kKGh0bWwsIFJlc3BvbnNlRm9ybWF0ZXJfMS5SZXNwb25zZVN0YXR1cy5TRVJWRVJfVElNRU9VVCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93XzEuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgX3RoaXMuY29uZmlnLnNlcnZlci5nZXRUaW1lb3V0KCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvd18xLmFkZEV2ZW50TGlzdGVuZXIoJ1NlcnZlckV4Y2VwdGlvbkhhbmRsZXInLCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlcmluZ18xID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuY2xlYXJFdmVudEVtaXR0ZXJMaXN0ZW5lcnModWlkXzEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWNoZVVybF8xLnJlbW92ZVVybCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVidWcoJ0VWRU5UIExJU1RFTkVSIE9OIFNlcnZlckV4Y2VwdGlvbkhhbmRsZXIgQ0FUQ0hFRCcsIGVyci5kZXRhaWxzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChSZXNwb25zZUZvcm1hdGVyXzEuUmVzcG9uc2Uuc2VuZChodG1sLCBSZXNwb25zZUZvcm1hdGVyXzEuUmVzcG9uc2VTdGF0dXMuRVJST1JfSEFORExFUiwgZXJyKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3dfMS5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93XzEuZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3dfMS5hZGRFdmVudExpc3RlbmVyKCdJZGxlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWJ1ZygnSWRsZSBldmVudCBjYXVnaHQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlbmRlcmluZ18xKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJpbmdfMSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZW5kZXJlZEh0bWwgPSBfdGhpcy5nZXRIVE1MKHdpbmRvd18xLCBbc2VydmVyVGltZW91dF8xXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmNsZWFyRXZlbnRFbWl0dGVyTGlzdGVuZXJzKHVpZF8xKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FjaGVVcmxfMS5jYWNoZShyZW5kZXJlZEh0bWwpLnRoZW4oZnVuY3Rpb24gKGNhY2hlU3RhdHVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWJ1ZygnY2FjaGluZyB0aGUgdXJsID0gJywgdXJsLCBjYWNoZVN0YXR1cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKFJlc3BvbnNlRm9ybWF0ZXJfMS5SZXNwb25zZS5zZW5kKHJlbmRlcmVkSHRtbCwgUmVzcG9uc2VGb3JtYXRlcl8xLlJlc3BvbnNlU3RhdHVzLlJFTkRFUkVEKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3dfMS5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93XzEuZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWJ1ZygnU29tZXRoaW5nIHdlbnQgd3Jvbmcgd2l0aCB0aGUgY2FjaGUnLCBlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShSZXNwb25zZUZvcm1hdGVyXzEuUmVzcG9uc2Uuc2VuZChyZW5kZXJlZEh0bWwsIFJlc3BvbnNlRm9ybWF0ZXJfMS5SZXNwb25zZVN0YXR1cy5SRU5ERVJFRCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93XzEuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvd18xLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93XzEuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVidWcoJ0FwcGxpY2F0aW9uIGlzIGxvYWRlZCBpbiBKU0RPTScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5jb25maWcgPSBuZXcgRW5naW5lQ29uZmlnXzEuZGVmYXVsdChjb25maWcpO1xuICAgICAgICBkZWJ1ZygnQW5ndWxhclNlcnZlclJlbmRlcmVyIGluaXRpYWxpemVkIHdpdGggY29uZmlnID0gJywgY29uZmlnKTtcbiAgICB9XG4gICAgQW5ndWxhclNlcnZlclJlbmRlcmVyLmV2ZW50RW1taXRlciA9IG5ldyBKU0RPTUV2ZW50RW1pdHRlcigpO1xuICAgIHJldHVybiBBbmd1bGFyU2VydmVyUmVuZGVyZXI7XG59KCkpO1xuO1xubW9kdWxlLmV4cG9ydHMgPSBBbmd1bGFyU2VydmVyUmVuZGVyZXI7XG5cblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vc3JjL0FuZ3VsYXJTZXJ2ZXJSZW5kZXJlci50c1xuICoqIG1vZHVsZSBpZCA9IDBcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImpzZG9tXCIpO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogZXh0ZXJuYWwgXCJqc2RvbVwiXG4gKiogbW9kdWxlIGlkID0gMVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgZGJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJyk7XG52YXIgZGVidWcgPSBkYnVnKCdhbmd1bGFyLmpzLXNlcnZlcicpO1xudmFyIGNhY2hlXzEgPSByZXF1aXJlKCcuL2NvbmZpZy9jYWNoZScpO1xudmFyIGxvZ18xID0gcmVxdWlyZSgnLi9jb25maWcvbG9nJyk7XG52YXIgcmVuZGVyXzEgPSByZXF1aXJlKCcuL2NvbmZpZy9yZW5kZXInKTtcbnZhciBzZXJ2ZXJfMSA9IHJlcXVpcmUoJy4vY29uZmlnL3NlcnZlcicpO1xudmFyIEVuZ2luZUNvbmZpZyA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRW5naW5lQ29uZmlnKGNvbmZpZykge1xuICAgICAgICB0aGlzLmNhY2hlID0gbmV3IGNhY2hlXzEuZGVmYXVsdCgpO1xuICAgICAgICB0aGlzLnJlc3RDYWNoZSA9IG5ldyBjYWNoZV8xLmRlZmF1bHQoKTtcbiAgICAgICAgdGhpcy5zZXJ2ZXIgPSBuZXcgc2VydmVyXzEuZGVmYXVsdCgpO1xuICAgICAgICB0aGlzLmxvZyA9IG5ldyBsb2dfMS5kZWZhdWx0KCk7XG4gICAgICAgIHRoaXMucmVuZGVyID0gbmV3IHJlbmRlcl8xLmRlZmF1bHQoKTtcbiAgICAgICAgaWYgKGNvbmZpZykge1xuICAgICAgICAgICAgdGhpcy5zZXJ2ZXIuaW1wb3J0Q29uZmlnKGNvbmZpZy5zZXJ2ZXIpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIuaW1wb3J0Q29uZmlnKGNvbmZpZy5yZW5kZXIpO1xuICAgICAgICAgICAgdGhpcy5jYWNoZS5pbXBvcnRDb25maWcoY29uZmlnLmNhY2hlKTtcbiAgICAgICAgICAgIHRoaXMucmVzdENhY2hlLmltcG9ydENvbmZpZyhjb25maWcucmVzdENhY2hlKTtcbiAgICAgICAgICAgIHRoaXMubG9nLmltcG9ydENvbmZpZyhjb25maWcubG9nKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNldENvbmZpZ0luc3RhbmNpYXRlZCgpO1xuICAgICAgICB0aGlzLmNhY2hlLmluaXRpYWxpemUoKTtcbiAgICAgICAgdGhpcy5yZXN0Q2FjaGUuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB0aGlzLmxvZy5pbml0aWFsaXplKCk7XG4gICAgfVxuICAgIEVuZ2luZUNvbmZpZy5wcm90b3R5cGUuc2V0Q29uZmlnSW5zdGFuY2lhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmNhY2hlLnNldENvbmZpZ0luc3RhbmNpYXRlZCh0cnVlKTtcbiAgICAgICAgdGhpcy5sb2cuc2V0Q29uZmlnSW5zdGFuY2lhdGVkKHRydWUpO1xuICAgIH07XG4gICAgcmV0dXJuIEVuZ2luZUNvbmZpZztcbn0oKSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmRlZmF1bHQgPSBFbmdpbmVDb25maWc7XG5cblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vc3JjL0VuZ2luZUNvbmZpZy50c1xuICoqIG1vZHVsZSBpZCA9IDJcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImRlYnVnXCIpO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogZXh0ZXJuYWwgXCJkZWJ1Z1wiXG4gKiogbW9kdWxlIGlkID0gM1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgc2ltcGxlX3VybF9jYWNoZV8xID0gcmVxdWlyZSgnc2ltcGxlLXVybC1jYWNoZScpO1xudmFyIEhlbHBlcnNfMSA9IHJlcXVpcmUoJy4vLi4vSGVscGVycycpO1xudmFyIHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG52YXIgZGJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJyk7XG52YXIgZGVidWcgPSBkYnVnKCdhbmd1bGFyLmpzLXNlcnZlcicpO1xudmFyIENhY2hlQ29uZmlnID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDYWNoZUNvbmZpZygpIHtcbiAgICAgICAgdGhpcy5jYWNoZUNvbmZpZyA9IHtcbiAgICAgICAgICAgIHN0b3JhZ2VDb25maWc6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnZmlsZScsXG4gICAgICAgICAgICAgICAgZGlyOiBwYXRoLnJlc29sdmUocHJvY2Vzcy5lbnZbKHByb2Nlc3MucGxhdGZvcm0gPT0gJ3dpbjMyJykgPyAnVVNFUlBST0ZJTEUnIDogJ0hPTUUnXSArICcvY2FjaGUvYW5ndWxhci5qcy1zZXJ2ZXInKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhY2hlUnVsZXM6IHtcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiAnbmV2ZXInLFxuICAgICAgICAgICAgICAgIGNhY2hlTWF4QWdlOiBbXSxcbiAgICAgICAgICAgICAgICBjYWNoZU5ldmVyOiBbXSxcbiAgICAgICAgICAgICAgICBjYWNoZUFsd2F5czogW11cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5jb25maWdJbnN0YW5jaWF0ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgQ2FjaGVDb25maWcucHJvdG90eXBlLmltcG9ydENvbmZpZyA9IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgdGhpcy5zZXRTdG9yYWdlQ29uZmlnKGNvbmZpZy5zdG9yYWdlQ29uZmlnKTtcbiAgICAgICAgdGhpcy5zZXREZWZhdWx0KGNvbmZpZy5jYWNoZVJ1bGVzLmRlZmF1bHQpO1xuICAgICAgICBjb25maWcuY2FjaGVSdWxlcy5jYWNoZU1heEFnZS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICBfdGhpcy5hZGRNYXhBZ2VSdWxlKGl0ZW0ucmVnZXgsIGl0ZW0ubWF4QWdlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbmZpZy5jYWNoZVJ1bGVzLmNhY2hlQWx3YXlzLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgIF90aGlzLmFkZEFsd2F5c1J1bGUoaXRlbS5yZWdleCk7XG4gICAgICAgIH0pO1xuICAgICAgICBjb25maWcuY2FjaGVSdWxlcy5jYWNoZU5ldmVyLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgIF90aGlzLmFkZE5ldmVyUnVsZShpdGVtLnJlZ2V4KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBDYWNoZUNvbmZpZy5wcm90b3R5cGUuZ2V0Q2FjaGVFbmdpbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhY2hlO1xuICAgIH07XG4gICAgQ2FjaGVDb25maWcucHJvdG90eXBlLnNldENvbmZpZ0luc3RhbmNpYXRlZCA9IGZ1bmN0aW9uIChib29sKSB7XG4gICAgICAgIHRoaXMuY29uZmlnSW5zdGFuY2lhdGVkID0gYm9vbDtcbiAgICB9O1xuICAgIENhY2hlQ29uZmlnLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXRoaXMuY29uZmlnSW5zdGFuY2lhdGVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jYWNoZSA9IG5ldyBzaW1wbGVfdXJsX2NhY2hlXzEuQ2FjaGVFbmdpbmUodGhpcy5jYWNoZUNvbmZpZy5zdG9yYWdlQ29uZmlnLCB0aGlzLmNhY2hlQ29uZmlnLmNhY2hlUnVsZXMpO1xuICAgIH07XG4gICAgQ2FjaGVDb25maWcucHJvdG90eXBlLmNsZWFyQ2FjaGVkVXJsID0gZnVuY3Rpb24gKHVybCkge1xuICAgICAgICBIZWxwZXJzXzEuZGVmYXVsdC5DaGVja1R5cGUodXJsLCAnc3RyaW5nJyk7XG4gICAgICAgIHJldHVybiB0aGlzLmNhY2hlLnVybCh1cmwpLnJlbW92ZVVybCgpO1xuICAgIH07XG4gICAgO1xuICAgIENhY2hlQ29uZmlnLnByb3RvdHlwZS5jbGVhckFsbENhY2hlZFVybCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FjaGUuY2xlYXJBbGxDYWNoZSgpO1xuICAgIH07XG4gICAgO1xuICAgIENhY2hlQ29uZmlnLnByb3RvdHlwZS5zZXRTdG9yYWdlQ29uZmlnID0gZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICB0aGlzLmNhY2hlQ29uZmlnLnN0b3JhZ2VDb25maWcgPSBjb25maWc7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZSgpO1xuICAgIH07XG4gICAgO1xuICAgIENhY2hlQ29uZmlnLnByb3RvdHlwZS5zZXREZWZhdWx0ID0gZnVuY3Rpb24gKGRlZikge1xuICAgICAgICBIZWxwZXJzXzEuZGVmYXVsdC5TdHJpbmdJbihkZWYsIFsnYWx3YXlzJywgJ25ldmVyJ10pO1xuICAgICAgICB0aGlzLmNhY2hlQ29uZmlnLmNhY2hlUnVsZXMuZGVmYXVsdCA9IGRlZjtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplKCk7XG4gICAgfTtcbiAgICA7XG4gICAgQ2FjaGVDb25maWcucHJvdG90eXBlLmFkZE1heEFnZVJ1bGUgPSBmdW5jdGlvbiAocnVsZSwgbWF4QWdlKSB7XG4gICAgICAgIHRoaXMuY2hlY2tFeGlzdHMocnVsZSk7XG4gICAgICAgIHRoaXMuY2FjaGVDb25maWcuY2FjaGVSdWxlcy5jYWNoZU1heEFnZS5wdXNoKHsgcmVnZXg6IHJ1bGUsIG1heEFnZTogbWF4QWdlIH0pO1xuICAgICAgICB0aGlzLmluaXRpYWxpemUoKTtcbiAgICB9O1xuICAgIDtcbiAgICBDYWNoZUNvbmZpZy5wcm90b3R5cGUuYWRkQWx3YXlzUnVsZSA9IGZ1bmN0aW9uIChydWxlKSB7XG4gICAgICAgIHRoaXMuY2hlY2tFeGlzdHMocnVsZSk7XG4gICAgICAgIHRoaXMuY2FjaGVDb25maWcuY2FjaGVSdWxlcy5jYWNoZUFsd2F5cy5wdXNoKHsgcmVnZXg6IHJ1bGUgfSk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZSgpO1xuICAgIH07XG4gICAgO1xuICAgIENhY2hlQ29uZmlnLnByb3RvdHlwZS5hZGROZXZlclJ1bGUgPSBmdW5jdGlvbiAocnVsZSkge1xuICAgICAgICB0aGlzLmNoZWNrRXhpc3RzKHJ1bGUpO1xuICAgICAgICB0aGlzLmNhY2hlQ29uZmlnLmNhY2hlUnVsZXMuY2FjaGVOZXZlci5wdXNoKHsgcmVnZXg6IHJ1bGUgfSk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZSgpO1xuICAgIH07XG4gICAgO1xuICAgIENhY2hlQ29uZmlnLnByb3RvdHlwZS5yZW1vdmVNYXhBZ2VSdWxlID0gZnVuY3Rpb24gKHJ1bGUpIHtcbiAgICAgICAgSGVscGVyc18xLmRlZmF1bHQuQ2hlY2tUeXBlKHJ1bGUsIFJlZ0V4cCk7XG4gICAgICAgIHZhciBpbmRleCA9IG51bGw7XG4gICAgICAgIGZvciAodmFyIGkgaW4gdGhpcy5jYWNoZUNvbmZpZy5jYWNoZVJ1bGVzLmNhY2hlTWF4QWdlKSB7XG4gICAgICAgICAgICBpZiAoSGVscGVyc18xLmRlZmF1bHQuU2FtZVJlZ2V4KHRoaXMuY2FjaGVDb25maWcuY2FjaGVSdWxlcy5jYWNoZU1heEFnZVtpXS5yZWdleCwgcnVsZSkpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluZGV4ICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLmNhY2hlQ29uZmlnLmNhY2hlUnVsZXMuY2FjaGVNYXhBZ2Uuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICA7XG4gICAgQ2FjaGVDb25maWcucHJvdG90eXBlLnJlbW92ZUFsd2F5c1J1bGUgPSBmdW5jdGlvbiAocnVsZSkge1xuICAgICAgICBIZWxwZXJzXzEuZGVmYXVsdC5DaGVja1R5cGUocnVsZSwgUmVnRXhwKTtcbiAgICAgICAgdmFyIGluZGV4ID0gbnVsbDtcbiAgICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLmNhY2hlQ29uZmlnLmNhY2hlUnVsZXMuY2FjaGVBbHdheXMpIHtcbiAgICAgICAgICAgIGlmIChIZWxwZXJzXzEuZGVmYXVsdC5TYW1lUmVnZXgodGhpcy5jYWNoZUNvbmZpZy5jYWNoZVJ1bGVzLmNhY2hlQWx3YXlzW2ldLnJlZ2V4LCBydWxlKSkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5kZXggIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuY2FjaGVDb25maWcuY2FjaGVSdWxlcy5jYWNoZUFsd2F5cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIDtcbiAgICBDYWNoZUNvbmZpZy5wcm90b3R5cGUucmVtb3ZlTmV2ZXJSdWxlID0gZnVuY3Rpb24gKHJ1bGUpIHtcbiAgICAgICAgSGVscGVyc18xLmRlZmF1bHQuQ2hlY2tUeXBlKHJ1bGUsIFJlZ0V4cCk7XG4gICAgICAgIHZhciBpbmRleCA9IG51bGw7XG4gICAgICAgIGZvciAodmFyIGkgaW4gdGhpcy5jYWNoZUNvbmZpZy5jYWNoZVJ1bGVzLmNhY2hlTmV2ZXIpIHtcbiAgICAgICAgICAgIGlmIChIZWxwZXJzXzEuZGVmYXVsdC5TYW1lUmVnZXgodGhpcy5jYWNoZUNvbmZpZy5jYWNoZVJ1bGVzLmNhY2hlTmV2ZXJbaV0ucmVnZXgsIHJ1bGUpKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpbmRleCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5jYWNoZUNvbmZpZy5jYWNoZVJ1bGVzLmNhY2hlTmV2ZXIuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICA7XG4gICAgQ2FjaGVDb25maWcucHJvdG90eXBlLnJlbW92ZUFsbE1heEFnZVJ1bGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmNhY2hlQ29uZmlnLmNhY2hlUnVsZXMuY2FjaGVNYXhBZ2UgPSBbXTtcbiAgICB9O1xuICAgIDtcbiAgICBDYWNoZUNvbmZpZy5wcm90b3R5cGUucmVtb3ZlQWxsQWx3YXlzUnVsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuY2FjaGVDb25maWcuY2FjaGVSdWxlcy5jYWNoZUFsd2F5cyA9IFtdO1xuICAgIH07XG4gICAgO1xuICAgIENhY2hlQ29uZmlnLnByb3RvdHlwZS5yZW1vdmVBbGxOZXZlclJ1bGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmNhY2hlQ29uZmlnLmNhY2hlUnVsZXMuY2FjaGVOZXZlciA9IFtdO1xuICAgIH07XG4gICAgO1xuICAgIENhY2hlQ29uZmlnLnByb3RvdHlwZS5yZW1vdmVBbGxSdWxlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVBbGxBbHdheXNSdWxlcygpO1xuICAgICAgICB0aGlzLnJlbW92ZUFsbE1heEFnZVJ1bGVzKCk7XG4gICAgICAgIHRoaXMucmVtb3ZlQWxsTmV2ZXJSdWxlcygpO1xuICAgIH07XG4gICAgO1xuICAgIENhY2hlQ29uZmlnLnByb3RvdHlwZS5nZXREZWZhdWx0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWNoZUNvbmZpZy5jYWNoZVJ1bGVzLmRlZmF1bHQ7XG4gICAgfTtcbiAgICA7XG4gICAgQ2FjaGVDb25maWcucHJvdG90eXBlLmdldE1heEFnZVJ1bGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWNoZUNvbmZpZy5jYWNoZVJ1bGVzLmNhY2hlTWF4QWdlO1xuICAgIH07XG4gICAgO1xuICAgIENhY2hlQ29uZmlnLnByb3RvdHlwZS5nZXRBbHdheXNSdWxlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FjaGVDb25maWcuY2FjaGVSdWxlcy5jYWNoZUFsd2F5cztcbiAgICB9O1xuICAgIDtcbiAgICBDYWNoZUNvbmZpZy5wcm90b3R5cGUuZ2V0TmV2ZXJSdWxlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FjaGVDb25maWcuY2FjaGVSdWxlcy5jYWNoZU5ldmVyO1xuICAgIH07XG4gICAgO1xuICAgIENhY2hlQ29uZmlnLnByb3RvdHlwZS5jaGVja0V4aXN0cyA9IGZ1bmN0aW9uIChydWxlKSB7XG4gICAgICAgIEhlbHBlcnNfMS5kZWZhdWx0LlJlZ2V4Tm90SW4ocnVsZSwgdGhpcy5nZXRSZWdleGVzKHRoaXMuY2FjaGVDb25maWcuY2FjaGVSdWxlcy5jYWNoZU1heEFnZSkpO1xuICAgICAgICBIZWxwZXJzXzEuZGVmYXVsdC5SZWdleE5vdEluKHJ1bGUsIHRoaXMuZ2V0UmVnZXhlcyh0aGlzLmNhY2hlQ29uZmlnLmNhY2hlUnVsZXMuY2FjaGVOZXZlcikpO1xuICAgICAgICBIZWxwZXJzXzEuZGVmYXVsdC5SZWdleE5vdEluKHJ1bGUsIHRoaXMuZ2V0UmVnZXhlcyh0aGlzLmNhY2hlQ29uZmlnLmNhY2hlUnVsZXMuY2FjaGVBbHdheXMpKTtcbiAgICB9O1xuICAgIENhY2hlQ29uZmlnLnByb3RvdHlwZS5nZXRSZWdleGVzID0gZnVuY3Rpb24gKGNvbGxlY3Rpb24pIHtcbiAgICAgICAgdmFyIHJlZyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpIGluIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgICAgIHJlZy5wdXNoKGNvbGxlY3Rpb25baV0ucmVnZXgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZWc7XG4gICAgfTtcbiAgICByZXR1cm4gQ2FjaGVDb25maWc7XG59KCkpO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gQ2FjaGVDb25maWc7XG5cblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vc3JjL2NvbmZpZy9jYWNoZS50c1xuICoqIG1vZHVsZSBpZCA9IDRcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInNpbXBsZS11cmwtY2FjaGVcIik7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiBleHRlcm5hbCBcInNpbXBsZS11cmwtY2FjaGVcIlxuICoqIG1vZHVsZSBpZCA9IDVcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIlwidXNlIHN0cmljdFwiO1xudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnYW5ndWxhci5qcy1zZXJ2ZXInKTtcbnZhciBIZWxwZXJzID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBIZWxwZXJzKCkge1xuICAgIH1cbiAgICBIZWxwZXJzLkVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYXJncyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgYXJnc1tfaSAtIDBdID0gYXJndW1lbnRzW19pXTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYXJncy5qb2luKCcsICcpKTtcbiAgICB9O1xuICAgIEhlbHBlcnMuU2FtZVJlZ2V4ID0gZnVuY3Rpb24gKHIxLCByMikge1xuICAgICAgICBkZWJ1ZygnY2hlY2tpbmcgaWYgcnVsZXMgYXJlIHRoZSBzYW1lJywgcjEsIHIyKTtcbiAgICAgICAgaWYgKHIxIGluc3RhbmNlb2YgUmVnRXhwICYmIHIyIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgICAgICB2YXIgcHJvcHMgPSBbXCJnbG9iYWxcIiwgXCJtdWx0aWxpbmVcIiwgXCJpZ25vcmVDYXNlXCIsIFwic291cmNlXCJdO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBwcm9wID0gcHJvcHNbaV07XG4gICAgICAgICAgICAgICAgaWYgKHIxW3Byb3BdICE9PSByMltwcm9wXSkge1xuICAgICAgICAgICAgICAgICAgICBkZWJ1ZygncHJvcHMgZGlmZicsIHByb3AsIHIxW3Byb3BdLCByMltwcm9wXSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBIZWxwZXJzLkNoZWNrVHlwZSA9IGZ1bmN0aW9uIChpbnB1dCwgdHlwZSkge1xuICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyAmJiBpbnB1dC5jb25zdHJ1Y3RvciAhPT0gdHlwZSkge1xuICAgICAgICAgICAgICAgIEhlbHBlcnMuRXJyb3IoJ1RoaXMgaW5wdXQgaXMgbm90IGEgdmFsaWQnLCB0eXBlLCBpbnB1dCwgJyB0eXBlIGlzJywgaW5wdXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIHR5cGUgPT09ICdhcnJheScpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0eXBlLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LmNvbnN0cnVjdG9yID09PSBpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAoIXZhbGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIEhlbHBlcnMuRXJyb3IoaW5wdXQsICdEb2VzblxcJ3QgbWF0Y2ggYW55IG9mIHRoZXNlIHR5cGVzJywgdHlwZSwgJyBnb3QgJywgaW5wdXQuY29uc3RydWN0b3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgJiYgdHlwZW9mIGlucHV0ICE9PSB0eXBlKSB7XG4gICAgICAgICAgICAgICAgSGVscGVycy5FcnJvcignVGhpcyBpbnB1dCBpcyBub3QgYSB2YWxpZCcsIHR5cGUsIGlucHV0LCAnIHR5cGUgaXMnLCB0eXBlb2YgaW5wdXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIHR5cGUgPT09ICdhcnJheScpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0eXBlLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKCF2YWxpZCkge1xuICAgICAgICAgICAgICAgICAgICBIZWxwZXJzLkVycm9yKGlucHV0LCAnRG9lc25cXCd0IG1hdGNoIGFueSBvZiB0aGVzZSB0eXBlcycsIHR5cGUsICcgZ290ICcsIHR5cGVvZiBpbnB1dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBIZWxwZXJzLlN0cmluZ0luID0gZnVuY3Rpb24gKGlucHV0LCB2YWxpZFZhbHVlcykge1xuICAgICAgICBIZWxwZXJzLkNoZWNrVHlwZShpbnB1dCwgJ3N0cmluZycpO1xuICAgICAgICBpZiAodmFsaWRWYWx1ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHZhbGlkID0gZmFsc2U7XG4gICAgICAgIHZhbGlkVmFsdWVzLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgIGlmIChpdGVtID09PSBpbnB1dCkge1xuICAgICAgICAgICAgICAgIHZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghdmFsaWQpIHtcbiAgICAgICAgICAgIEhlbHBlcnMuRXJyb3IoaW5wdXQsICdzaG91bGQgbWF0Y2gnLCB2YWxpZFZhbHVlcyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEhlbHBlcnMuUmVnZXhOb3RJbiA9IGZ1bmN0aW9uIChyZWdleCwgcmVnZXhlcywgZGVzYykge1xuICAgICAgICBpZiAocmVnZXhlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBIZWxwZXJzLkNoZWNrVHlwZShyZWdleCwgUmVnRXhwKTtcbiAgICAgICAgcmVnZXhlcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICBpZiAoSGVscGVycy5TYW1lUmVnZXgoaXRlbSwgcmVnZXgpKSB7XG4gICAgICAgICAgICAgICAgSGVscGVycy5FcnJvcihpdGVtLCAnIElzIGFscmVhZHkgZGVmaW5lZCAnLCBkZXNjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICByZXR1cm4gSGVscGVycztcbn0oKSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmRlZmF1bHQgPSBIZWxwZXJzO1xuXG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL3NyYy9IZWxwZXJzLnRzXG4gKiogbW9kdWxlIGlkID0gNlxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwicGF0aFwiKTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIGV4dGVybmFsIFwicGF0aFwiXG4gKiogbW9kdWxlIGlkID0gN1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgSGVscGVyc18xID0gcmVxdWlyZSgnLi8uLi9IZWxwZXJzJyk7XG52YXIgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbnZhciBmcyA9IHJlcXVpcmUoJ2ZzLWV4dHJhJyk7XG52YXIgZGJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJyk7XG52YXIgZGVidWcgPSBkYnVnKCdhbmd1bGFyLmpzLXNlcnZlcicpO1xudmFyIExvZ0NvbmZpZyA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gTG9nQ29uZmlnKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB0aGlzLmxvZ0NvbmZpZyA9IHtcbiAgICAgICAgICAgIGRpcjogcGF0aC5yZXNvbHZlKHByb2Nlc3MuZW52Wyhwcm9jZXNzLnBsYXRmb3JtID09ICd3aW4zMicpID8gJ1VTRVJQUk9GSUxFJyA6ICdIT01FJ10gKyAnL2xvZy9hbmd1bGFyLmpzLXNlcnZlcicpLFxuICAgICAgICAgICAgbG9nOiB7IGVuYWJsZWQ6IHRydWUsIHN0YWNrOiBmYWxzZSB9LFxuICAgICAgICAgICAgZXJyb3I6IHsgZW5hYmxlZDogdHJ1ZSwgc3RhY2s6IGZhbHNlIH0sXG4gICAgICAgICAgICB3YXJuOiB7IGVuYWJsZWQ6IHRydWUsIHN0YWNrOiBmYWxzZSB9LFxuICAgICAgICAgICAgaW5mbzogeyBlbmFibGVkOiB0cnVlLCBzdGFjazogZmFsc2UgfSxcbiAgICAgICAgICAgIGRlYnVnOiB7IGVuYWJsZWQ6IHRydWUsIHN0YWNrOiBmYWxzZSB9LFxuICAgICAgICAgICAgc2VydmVyTG9nRmlsZTogJ2FuZ3VsYXItc2VydmVyLmxvZydcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5jb25maWdJbnN0YW5jaWF0ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5zZXRCYXNlUGF0aCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgICAgICAgICBIZWxwZXJzXzEuZGVmYXVsdC5DaGVja1R5cGUocGF0aCwgJ3N0cmluZycpO1xuICAgICAgICAgICAgX3RoaXMubG9nQ29uZmlnLmRpciA9IHBhdGg7XG4gICAgICAgICAgICBfdGhpcy5pbml0aWFsaXplKCk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuc2V0RGVmaW5pdGlvbiA9IGZ1bmN0aW9uIChsb2csIGVuYWJsZWQsIHN0YWNrKSB7XG4gICAgICAgICAgICBIZWxwZXJzXzEuZGVmYXVsdC5DaGVja1R5cGUobG9nLCAnc3RyaW5nJyk7XG4gICAgICAgICAgICBIZWxwZXJzXzEuZGVmYXVsdC5DaGVja1R5cGUoZW5hYmxlZCwgJ2Jvb2xlYW4nKTtcbiAgICAgICAgICAgIF90aGlzLmxvZ0NvbmZpZ1tsb2ddLmVuYWJsZWQgPSBlbmFibGVkO1xuICAgICAgICAgICAgX3RoaXMubG9nQ29uZmlnW2xvZ10uc3RhY2sgPSBzdGFjayA/IHRydWUgOiBmYWxzZTtcbiAgICAgICAgICAgIF90aGlzLmluaXRpYWxpemUoKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5zZXRGaWxlU2VydmVyTmFtZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICBIZWxwZXJzXzEuZGVmYXVsdC5DaGVja1R5cGUobmFtZSwgJ3N0cmluZycpO1xuICAgICAgICAgICAgX3RoaXMubG9nQ29uZmlnLnNlcnZlckxvZ0ZpbGUgPSBuYW1lO1xuICAgICAgICAgICAgX3RoaXMuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmdldEJhc2VQYXRoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLmxvZ0NvbmZpZy5kaXI7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZ2V0RGVmaW5pdGlvbiA9IGZ1bmN0aW9uIChsb2cpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpcy5sb2dDb25maWdbbG9nXTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5nZXRGaWxlU2VydmVyTmFtZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpcy5sb2dDb25maWcuc2VydmVyTG9nRmlsZTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5nZXRMb2dQYXRoID0gZnVuY3Rpb24gKGxvZykge1xuICAgICAgICAgICAgcmV0dXJuIHBhdGguam9pbihfdGhpcy5sb2dDb25maWcuZGlyLCBsb2cgKyAnLmxvZycpO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmdldExvZ1NlcnZlclBhdGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gcGF0aC5qb2luKF90aGlzLmxvZ0NvbmZpZy5kaXIsIF90aGlzLmxvZ0NvbmZpZy5zZXJ2ZXJMb2dGaWxlICsgJy5sb2cnKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5nZXRDb25maWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMubG9nQ29uZmlnO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmxvZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgICAgIGFyZ3NbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcy5hcHBlbmRGaWxlU3luYyhfdGhpcy5nZXRMb2dTZXJ2ZXJQYXRoKCksIGFyZ3Muam9pbignLCAnKSArICdcXG4nKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgTG9nQ29uZmlnLnByb3RvdHlwZS5pbXBvcnRDb25maWcgPSBmdW5jdGlvbiAoY29uZmlnKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHRoaXMuc2V0QmFzZVBhdGgoY29uZmlnLmRpcik7XG4gICAgICAgIFsnbG9nJywgJ3dhcm4nLCAnZXJyb3InLCAnaW5mbycsICdkZWJ1ZyddLmZvckVhY2goZnVuY3Rpb24gKGxvZykge1xuICAgICAgICAgICAgX3RoaXMuc2V0RGVmaW5pdGlvbihsb2csIGNvbmZpZ1tsb2ddLmVuYWJsZWQsIGNvbmZpZ1tsb2ddLnN0YWNrKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuc2V0RmlsZVNlcnZlck5hbWUoY29uZmlnLnNlcnZlckxvZ0ZpbGUpO1xuICAgIH07XG4gICAgTG9nQ29uZmlnLnByb3RvdHlwZS5zZXRDb25maWdJbnN0YW5jaWF0ZWQgPSBmdW5jdGlvbiAoYm9vbCkge1xuICAgICAgICB0aGlzLmNvbmZpZ0luc3RhbmNpYXRlZCA9IGJvb2w7XG4gICAgfTtcbiAgICBMb2dDb25maWcucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmICghdGhpcy5jb25maWdJbnN0YW5jaWF0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxvZ0NvbmZpZy5kaXIgPSBwYXRoLnJlc29sdmUocGF0aC5ub3JtYWxpemUodGhpcy5sb2dDb25maWcuZGlyKSk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmcy5ta2RpcnNTeW5jKHRoaXMubG9nQ29uZmlnLmRpcik7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIEhlbHBlcnNfMS5kZWZhdWx0LkVycm9yKFwiY2FuJ3QgY3JlYXRlIHRoZSBsb2cgZGlyXCIsIHRoaXMubG9nQ29uZmlnLmRpciwgZSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhdGhzID0gW107XG4gICAgICAgIFsnd2FybicsICdsb2cnLCAnZGVidWcnLCAnZXJyb3InLCAnaW5mbyddLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgIGlmIChfdGhpcy5sb2dDb25maWdbaXRlbV0uZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIHBhdGhzLnB1c2goX3RoaXMuZ2V0TG9nUGF0aChpdGVtKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBwYXRocy5wdXNoKHBhdGgucmVzb2x2ZShwYXRoLmpvaW4odGhpcy5sb2dDb25maWcuZGlyLCAnZGV2LmxvZycpKSk7XG4gICAgICAgIHBhdGhzLnB1c2godGhpcy5nZXRMb2dTZXJ2ZXJQYXRoKCkpO1xuICAgICAgICBwYXRocy5mb3JFYWNoKGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGZzLmNsb3NlU3luYyhmcy5vcGVuU3luYyhwYXRoLCAnYScpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgSGVscGVyc18xLmRlZmF1bHQuRXJyb3IoZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgO1xuICAgIHJldHVybiBMb2dDb25maWc7XG59KCkpO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gTG9nQ29uZmlnO1xuXG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL3NyYy9jb25maWcvbG9nLnRzXG4gKiogbW9kdWxlIGlkID0gOFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZnMtZXh0cmFcIik7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiBleHRlcm5hbCBcImZzLWV4dHJhXCJcbiAqKiBtb2R1bGUgaWQgPSA5XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBIZWxwZXJzXzEgPSByZXF1aXJlKCcuLy4uL0hlbHBlcnMnKTtcbnZhciBkYnVnID0gcmVxdWlyZSgnZGVidWcnKTtcbnZhciBkZWJ1ZyA9IGRidWcoJ2FuZ3VsYXIuanMtc2VydmVyJyk7XG52YXIgUmVuZGVyQ29uZmlnID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBSZW5kZXJDb25maWcoKSB7XG4gICAgICAgIHRoaXMucmVuZGVyQ29uZmlnID0ge1xuICAgICAgICAgICAgc3RyYXRlZ3k6ICduZXZlcicsXG4gICAgICAgICAgICBydWxlczogW11cbiAgICAgICAgfTtcbiAgICB9XG4gICAgUmVuZGVyQ29uZmlnLnByb3RvdHlwZS5pbXBvcnRDb25maWcgPSBmdW5jdGlvbiAoY29uZmlnKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHRoaXMuc2V0U3RyYXRlZ3koY29uZmlnLnN0cmF0ZWd5KTtcbiAgICAgICAgY29uZmlnLnJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKHJ1bGUpIHtcbiAgICAgICAgICAgIF90aGlzLmFkZFJ1bGUocnVsZSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgUmVuZGVyQ29uZmlnLnByb3RvdHlwZS5zaG91bGRSZW5kZXIgPSBmdW5jdGlvbiAodXJsKSB7XG4gICAgICAgIHZhciBpLCByZWdleDtcbiAgICAgICAgSGVscGVyc18xLmRlZmF1bHQuQ2hlY2tUeXBlKHVybCwgJ3N0cmluZycpO1xuICAgICAgICBkZWJ1Zygnc2hvdWxkUmVuZGVyIGNhbGxlZCB3aXRoIHVybCwgcmVuZGVyQ29uZmlnICcsIHVybCwgdGhpcy5yZW5kZXJDb25maWcpO1xuICAgICAgICBzd2l0Y2ggKHRoaXMucmVuZGVyQ29uZmlnLnN0cmF0ZWd5KSB7XG4gICAgICAgICAgICBjYXNlICduZXZlcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgY2FzZSAnYWx3YXlzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIGNhc2UgJ2luY2x1ZGUnOlxuICAgICAgICAgICAgICAgIGZvciAoaSBpbiB0aGlzLnJlbmRlckNvbmZpZy5ydWxlcykge1xuICAgICAgICAgICAgICAgICAgICByZWdleCA9IHRoaXMucmVuZGVyQ29uZmlnLnJ1bGVzW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVnZXgudGVzdCh1cmwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICBjYXNlICdleGNsdWRlJzpcbiAgICAgICAgICAgICAgICBmb3IgKGkgaW4gdGhpcy5yZW5kZXJDb25maWcucnVsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVnZXggPSB0aGlzLnJlbmRlckNvbmZpZy5ydWxlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlZ2V4LnRlc3QodXJsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfTtcbiAgICA7XG4gICAgUmVuZGVyQ29uZmlnLnByb3RvdHlwZS5zZXRTdHJhdGVneSA9IGZ1bmN0aW9uIChzdHJhdGVneSkge1xuICAgICAgICBIZWxwZXJzXzEuZGVmYXVsdC5TdHJpbmdJbihzdHJhdGVneSwgWydpbmNsdWRlJywgJ2V4Y2x1ZGUnLCAnYWx3YXlzJywgJ25ldmVyJ10pO1xuICAgICAgICB0aGlzLnJlbmRlckNvbmZpZy5zdHJhdGVneSA9IHN0cmF0ZWd5O1xuICAgIH07XG4gICAgO1xuICAgIFJlbmRlckNvbmZpZy5wcm90b3R5cGUuYWRkUnVsZSA9IGZ1bmN0aW9uIChydWxlKSB7XG4gICAgICAgIEhlbHBlcnNfMS5kZWZhdWx0LkNoZWNrVHlwZShydWxlLCBSZWdFeHApO1xuICAgICAgICBIZWxwZXJzXzEuZGVmYXVsdC5SZWdleE5vdEluKHJ1bGUsIHRoaXMucmVuZGVyQ29uZmlnLnJ1bGVzKTtcbiAgICAgICAgdGhpcy5yZW5kZXJDb25maWcucnVsZXMucHVzaChydWxlKTtcbiAgICB9O1xuICAgIDtcbiAgICBSZW5kZXJDb25maWcucHJvdG90eXBlLnJlbW92ZVJ1bGUgPSBmdW5jdGlvbiAocnVsZSkge1xuICAgICAgICBIZWxwZXJzXzEuZGVmYXVsdC5DaGVja1R5cGUocnVsZSwgUmVnRXhwKTtcbiAgICAgICAgdmFyIGluZGV4ID0gbnVsbDtcbiAgICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLnJlbmRlckNvbmZpZy5ydWxlcykge1xuICAgICAgICAgICAgaWYgKEhlbHBlcnNfMS5kZWZhdWx0LlNhbWVSZWdleCh0aGlzLnJlbmRlckNvbmZpZy5ydWxlc1tpXSwgcnVsZSkpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluZGV4ICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLnJlbmRlckNvbmZpZy5ydWxlcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICA7XG4gICAgUmVuZGVyQ29uZmlnLnByb3RvdHlwZS5nZXRTdHJhdGVneSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyQ29uZmlnLnN0cmF0ZWd5O1xuICAgIH07XG4gICAgO1xuICAgIFJlbmRlckNvbmZpZy5wcm90b3R5cGUuZ2V0UnVsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlbmRlckNvbmZpZy5ydWxlcztcbiAgICB9O1xuICAgIDtcbiAgICBSZW5kZXJDb25maWcucHJvdG90eXBlLmhhc1J1bGUgPSBmdW5jdGlvbiAocnVsZSkge1xuICAgICAgICBIZWxwZXJzXzEuZGVmYXVsdC5DaGVja1R5cGUocnVsZSwgUmVnRXhwKTtcbiAgICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLnJlbmRlckNvbmZpZy5ydWxlcykge1xuICAgICAgICAgICAgaWYgKEhlbHBlcnNfMS5kZWZhdWx0LlNhbWVSZWdleCh0aGlzLnJlbmRlckNvbmZpZy5ydWxlc1tpXSwgcnVsZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICA7XG4gICAgcmV0dXJuIFJlbmRlckNvbmZpZztcbn0oKSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmRlZmF1bHQgPSBSZW5kZXJDb25maWc7XG5cblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vc3JjL2NvbmZpZy9yZW5kZXIudHNcbiAqKiBtb2R1bGUgaWQgPSAxMFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgSGVscGVyc18xID0gcmVxdWlyZSgnLi8uLi9IZWxwZXJzJyk7XG52YXIgZGJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJyk7XG52YXIgZGVidWcgPSBkYnVnKCdhbmd1bGFyLmpzLXNlcnZlcicpO1xudmFyIFNlcnZlckNvbmZpZyA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU2VydmVyQ29uZmlnKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB0aGlzLnNlcnZlckNvbmZpZyA9IHtcbiAgICAgICAgICAgIGRvbWFpbjogJ2h0dHA6Ly9sb2NhbGhvc3QnLFxuICAgICAgICAgICAgcG9ydDogODAsXG4gICAgICAgICAgICB0aW1lb3V0OiAxMDAwMCxcbiAgICAgICAgICAgIGRlYnVnOiB0cnVlLFxuICAgICAgICAgICAgYmFzZTogJy8nXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuc2V0RG9tYWluID0gZnVuY3Rpb24gKGRvbWFpbikge1xuICAgICAgICAgICAgSGVscGVyc18xLmRlZmF1bHQuQ2hlY2tUeXBlKGRvbWFpbiwgJ3N0cmluZycpO1xuICAgICAgICAgICAgX3RoaXMuc2VydmVyQ29uZmlnLmRvbWFpbiA9IGRvbWFpbjtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5zZXRQb3J0ID0gZnVuY3Rpb24gKHBvcnQpIHtcbiAgICAgICAgICAgIEhlbHBlcnNfMS5kZWZhdWx0LkNoZWNrVHlwZShwb3J0LCAnbnVtYmVyJyk7XG4gICAgICAgICAgICBfdGhpcy5zZXJ2ZXJDb25maWcucG9ydCA9IHBvcnQ7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuc2V0VGltZW91dCA9IGZ1bmN0aW9uICh0aW1lb3V0KSB7XG4gICAgICAgICAgICBIZWxwZXJzXzEuZGVmYXVsdC5DaGVja1R5cGUodGltZW91dCwgJ251bWJlcicpO1xuICAgICAgICAgICAgX3RoaXMuc2VydmVyQ29uZmlnLnRpbWVvdXQgPSB0aW1lb3V0O1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLnNldERlYnVnID0gZnVuY3Rpb24gKGRlYnVnKSB7XG4gICAgICAgICAgICBIZWxwZXJzXzEuZGVmYXVsdC5DaGVja1R5cGUoZGVidWcsICdib29sZWFuJyk7XG4gICAgICAgICAgICBfdGhpcy5zZXJ2ZXJDb25maWcuZGVidWcgPSBkZWJ1ZztcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5zZXRCYXNlID0gZnVuY3Rpb24gKGJhc2UpIHtcbiAgICAgICAgICAgIEhlbHBlcnNfMS5kZWZhdWx0LkNoZWNrVHlwZShiYXNlLCAnc3RyaW5nJyk7XG4gICAgICAgICAgICBfdGhpcy5zZXJ2ZXJDb25maWcuYmFzZSA9IGJhc2U7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZ2V0RG9tYWluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLnNlcnZlckNvbmZpZy5kb21haW47XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZ2V0UG9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpcy5zZXJ2ZXJDb25maWcucG9ydDtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5nZXRUaW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLnNlcnZlckNvbmZpZy50aW1lb3V0O1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmdldERlYnVnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLnNlcnZlckNvbmZpZy5kZWJ1ZztcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5nZXRCYXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLnNlcnZlckNvbmZpZy5iYXNlO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBTZXJ2ZXJDb25maWcucHJvdG90eXBlLmltcG9ydENvbmZpZyA9IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgdGhpcy5zZXREb21haW4oY29uZmlnLmRvbWFpbik7XG4gICAgICAgIHRoaXMuc2V0UG9ydChjb25maWcucG9ydCk7XG4gICAgICAgIHRoaXMuc2V0VGltZW91dChjb25maWcudGltZW91dCk7XG4gICAgICAgIHRoaXMuc2V0RGVidWcoY29uZmlnLmRlYnVnKTtcbiAgICAgICAgdGhpcy5zZXRCYXNlKGNvbmZpZy5iYXNlKTtcbiAgICB9O1xuICAgIHJldHVybiBTZXJ2ZXJDb25maWc7XG59KCkpO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gU2VydmVyQ29uZmlnO1xuXG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL3NyYy9jb25maWcvc2VydmVyLnRzXG4gKiogbW9kdWxlIGlkID0gMTFcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImZzXCIpO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogZXh0ZXJuYWwgXCJmc1wiXG4gKiogbW9kdWxlIGlkID0gMTJcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImVzNi1wcm9taXNlXCIpO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogZXh0ZXJuYWwgXCJlczYtcHJvbWlzZVwiXG4gKiogbW9kdWxlIGlkID0gMTNcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInNvdXJjZS1tYXAtc3VwcG9ydFwiKTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIGV4dGVybmFsIFwic291cmNlLW1hcC1zdXBwb3J0XCJcbiAqKiBtb2R1bGUgaWQgPSAxNFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwiXCJ1c2Ugc3RyaWN0XCI7XG5leHBvcnRzLlJlc3BvbnNlU3RhdHVzID0ge1xuICAgIFJFTkRFUkVEOiAnUkVOREVSRUQnLFxuICAgIFJFTkRFUl9FWENMVURFRDogJ1JFTkRFUl9FWENMVURFRCcsXG4gICAgQUxSRUFEWV9DQUNIRUQ6ICdBTFJFQURZX0NBQ0hFRCcsXG4gICAgU0VSVkVSX1RJTUVPVVQ6ICdTRVJWRVJfVElNRU9VVCcsXG4gICAgRVJST1JfSEFORExFUjogJ0VSUk9SX0hBTkRMRVInLFxuICAgIFNFUlZFUl9FUlJPUjogJ1NFUlZFUl9FUlJPUicsXG4gICAgSlNET01fRVJST1I6ICdKU0RPTV9FUlJPUicsXG4gICAgSlNET01fVVJMX0VSUk9SOiAnSlNET01fVVJMX0VSUk9SJ1xufTtcbnZhciBSZXNwb25zZUNvZGVzID0ge1xuICAgIFJFTkRFUkVEOiAwLFxuICAgIFJFTkRFUl9FWENMVURFRDogMSxcbiAgICBBTFJFQURZX0NBQ0hFRDogMixcbiAgICBTRVJWRVJfVElNRU9VVDogMyxcbiAgICBFUlJPUl9IQU5ETEVSOiA0LFxuICAgIFNFUlZFUl9FUlJPUjogNSxcbiAgICBKU0RPTV9FUlJPUjogNixcbiAgICBKU0RPTV9VUkxfRVJST1I6IDdcbn07XG52YXIgUmVzcG9uc2UgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFJlc3BvbnNlKCkge1xuICAgIH1cbiAgICBSZXNwb25zZS5zZW5kID0gZnVuY3Rpb24gKGh0bWwsIHN0YXR1cywgRXhjZXB0aW9uKSB7XG4gICAgICAgIGlmICh0eXBlb2YgUmVzcG9uc2VDb2Rlc1tzdGF0dXNdID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGlzIHN0YXR1cyBkb2VzblxcJ3QgZXhpc3QgJyArIHN0YXR1cyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRyYWNlID0gbnVsbDtcbiAgICAgICAgaWYgKFJlc3BvbnNlQ29kZXNbc3RhdHVzXS5zdGFja3RyYWNlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIEV4Y2VwdGlvbiA9PT0gJ0Vycm9yJykge1xuICAgICAgICAgICAgICAgIHRyYWNlID0gRXJyb3JbJ3N0YWNrJ107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0cmFjZSA9IG5ldyBFcnJvcigpLnN0YWNrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBodG1sOiBodG1sLFxuICAgICAgICAgICAgY29kZTogUmVzcG9uc2VDb2Rlc1tzdGF0dXNdLFxuICAgICAgICAgICAgc3RhdHVzOiBzdGF0dXMsXG4gICAgICAgICAgICB0cmFjZTogdHJhY2VcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIHJldHVybiBSZXNwb25zZTtcbn0oKSk7XG5leHBvcnRzLlJlc3BvbnNlID0gUmVzcG9uc2U7XG5cblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vc3JjL1Jlc3BvbnNlRm9ybWF0ZXIudHNcbiAqKiBtb2R1bGUgaWQgPSAxNVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwicmVxdWVzdFwiKTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIGV4dGVybmFsIFwicmVxdWVzdFwiXG4gKiogbW9kdWxlIGlkID0gMTZcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImV2ZW50c1wiKTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIGV4dGVybmFsIFwiZXZlbnRzXCJcbiAqKiBtb2R1bGUgaWQgPSAxN1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwibm9kZS11dWlkXCIpO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogZXh0ZXJuYWwgXCJub2RlLXV1aWRcIlxuICoqIG1vZHVsZSBpZCA9IDE4XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iXSwic291cmNlUm9vdCI6IiJ9