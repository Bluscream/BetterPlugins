/* BetterDiscordApp Entry
 * Version: 2.1
 * Author: Jiiks | http://jiiks.net
 * Date: 27/08/2015 - 15:51
 * Last Update: 10/02/2015 - 02:05 GMT
 * https://github.com/Jiiks/BetterDiscordApp
 */
'use strict';
//Imports
var _fs = require("fs");
var _config = require("./config.json");
var _utils = require("./utils");
var _ipc = require('ipc');


//Beta flag
var _beta = false;
    
var _repo = "Jiiks";
var _branch = _beta ? "beta" : "master";

//Local flag
var _local = false;
var _localServer = "http://localhost";

//Variables
var _mainWindow;
var _hash = null;
var _updater = null;

var _userDefault = { "cache": null };
var _userConfig = _userDefault;
var _cacheExpired = false;
var _cacheDays = 0;

var _os = process.platform;
var _dataPath = _os == "win32" ? process.env.APPDATA : _os == 'darwin' ? process.env.HOME + '/Library/Preferences' : '/var/local';
    _dataPath += "/BetterDiscord";

var _userFile = _dataPath + "/user.json";

//IDE
/*_config = {
    "Core": {
        "Version": "0.2.5"
    }
};*/

var _this;
var BetterDiscord = function(mainWindow) {
	this.mainWindow = mainWindow;
	this.version = _config.Core.Version;
	this.utils = new _utils.Utils(mainWindow);
    
    // Useless but maybe used by outside scope functions
    _this = this;
    _utils = this.utils;
    _mainWindow = this.mainWindow;

	this.HandleEvents();
};

BetterDiscord.prototype.BDStartUp = false;
BetterDiscord.prototype.eventPoll = {};
BetterDiscord.prototype.eventInterval = null;

BetterDiscord.prototype.RecordEvent = function(event) {
	if(this.eventPoll.hasOwnProperty(event)) {
		this.eventPoll[event] = this.eventPoll[event] + 1; 
	}else {
		this.eventPoll[event] = 1;
	}
};

BetterDiscord.prototype.HandleEvents = function () {
	_mainWindow.webContents.on("dom-ready", function() { _this.RecordEvent("dom-ready"); });
    _mainWindow.webContents.on("new-window", function() { _this.RecordEvent("new-window"); });
    _mainWindow.webContents.on("did-fail-load", function() { _this.RecordEvent("did-fail-load"); });
    _mainWindow.webContents.on("crashed", function() { _this.RecordEvent("crashed"); });
    _mainWindow.on("focus", function() { _this.RecordEvent("focus"); });
    _mainWindow.on("blur", function() { _this.RecordEvent("blur"); });
    _mainWindow.on("close", function() { _this.RecordEvent("close"); });
};

BetterDiscord.prototype.SecureTryCatch = function(callback) {
    try {
        callback();
    }catch(ex) {
        _utils.jsLog('BD STC: ' + ex, 'error');
    }
};

BetterDiscord.prototype.init = function() {
    this.createDirPath(_dataPath);
    this.createDirPath(_dataPath + "/plugins");
    this.createDirPath(_dataPath + "/themes");
    this.checkCacheFile(_userFile);
    this.checkVersion();
};

BetterDiscord.prototype.createDirPath = function(path) {
    if (!_fs.existsSync(path))
        _fs.mkdirSync(path);
};

BetterDiscord.prototype.checkCacheFile = function(path) {
    if(_fs.existsSync(path)) {
        this.SecureTryCatch(function() {
            _userConfig = JSON.parse(_fs.readFileSync(path));
        });
    }

    //Userfile doesn't exist
    if(_userConfig.cache == null) {
        _userConfig.cache = new Date();
    } else {
        var currentDate = new Date();
        var cacheDate = new Date(_userConfig.cache);
        //Check if cache is expired
        if(Math.abs(currentDate.getDate() - cacheDate.getDate()) > _cacheDays) {
            _userConfig.cache = currentDate;
            _cacheExpired = true;
        }
    }

    //Write new cache date if expired
    if(_cacheExpired) {
        _fs.writeFileSync(path, JSON.stringify(_userConfig));
    }
};

BetterDiscord.prototype.checkVersion = function() {
    var repoAPIHost = "api.github.com";
    var repoAPIPathHash = "/repos/" + _repo + "/BetterDiscordApp/commits/" + _branch;
    _utils.download(repoAPIHost, repoAPIPathHash, function(data) {
        _this.SecureTryCatch(function() {
            var tmpRawObj = JSON.parse(data);
            _hash = tmpRawObj.sha;
            _this.checkUpdater();
        });
    });
};

BetterDiscord.prototype.checkUpdater = function() {
    var repoRAWHost = "raw.githubusercontent.com";
    var repoRAWPathUpdater = "/" + _repo + "/BetterDiscordApp/" + _hash + "/data/updater.json";
    _utils.download(repoRAWHost, repoRAWPathUpdater, function(data) {
        _this.SecureTryCatch(function() {
            var tmpRawObj = JSON.parse(data);
            _updater = tmpRawObj;
            _this.start();
        });
    });
};

BetterDiscord.prototype.DispatchEvents = function() {
    if(_this.eventPoll.hasOwnProperty("dom-ready") && 
        _this.eventPoll["dom-ready"] > 0) {
        _this.load();
        _this.eventPoll["dom-ready"] = 0;
    }
};

BetterDiscord.prototype.start = function() {
    this.eventInterval = setInterval(this.DispatchEvents, 3000);
};

BetterDiscord.prototype.stop = function() {
    clearInterval(this.eventInterval);
};

BetterDiscord.prototype.load = function() {
    _mainWindow.webContents.executeJavaScript('var themesupport2 = true');

    this.loadPlugins();
    this.loadThemes();

    this.alertNewVersion();

    _utils.execJs('var loadingNode = document.createElement("DIV");');
    _utils.execJs('loadingNode.innerHTML = \' <div style="height:30px;width:100%;background:#282B30;"><div style="padding-right:10px; float:right"> <span id="bd-status" style="line-height:30px;color:#E8E8E8;">BetterDiscord - Loading Libraries : </span><progress id="bd-pbar" value="10" max="100"></progress></div></div> \'');
    _utils.execJs('var flex = document.getElementsByClassName("flex-vertical flex-spacer")[0]; flex.appendChild(loadingNode);');

    this.IPCAsyncMessageInit();
};

BetterDiscord.prototype.loadPlugins = function() {
    _mainWindow.webContents.executeJavaScript('var bdplugins = {};');

    _fs.readdir(_dataPath + "/plugins", function(err, files) {
        if(err) return;

        files.forEach(function(fileName) {
            var pluginContent = _fs.readFileSync(_dataPath + "/plugins/" + fileName, 'utf8');
            var meta = pluginContent.split('\n')[0];
            if (meta.indexOf('META') < 0) {
                _utils.jsLog('BetterDiscord: ERROR[Plugin META not found in file: ' + fileName + ']', 'warn');
                return;
            }
            var pluginVar = meta.substring(meta.lastIndexOf('//META') + 6, meta.lastIndexOf('*\//'));
            _this.SecureTryCatch(function() {
                var parse = JSON.parse(pluginVar);
                var pluginName = parse['name'];
                _mainWindow.webContents.executeJavaScript(pluginContent);
                _mainWindow.webContents.executeJavaScript('(function() { var plugin = new ' + pluginName + '(); bdplugins[plugin.getName()] = { "plugin": plugin, "enabled": false } })();')

                _utils.jsLog('BetterDiscord: Loading Plugin: ' + pluginName, 'log');
            });
        });
    });
};

BetterDiscord.prototype.loadThemes = function() {
    _fs.readdir(_dataPath + '/themes/', function(err, files) {
        if (err) return;

        _mainWindow.webContents.executeJavaScript('var bdthemes = {};');
        files.forEach(function(fileName) {
            var theme = _fs.readFileSync(_dataPath + '/themes/' + fileName, 'utf8');
            var split = theme.split('\n');
            var meta = split[0];
            if (meta.indexOf('META') < 0) {
                _utils.jsLog('BetterDiscord: ERROR[Theme META not found in file: ' + fileName + ']', 'warn');
                return;
            }
            var themeVar = meta.substring(meta.lastIndexOf('//META') + 6, meta.lastIndexOf('*\//'));
            _this.SecureTryCatch(function() {
                var parse = JSON.parse(themeVar);
                var themeName = parse['name'];
                var themeAuthor = parse['author'];
                var themeDescription = parse['description'];
                var themeVersion = parse['version'];

                /*split.splice(0, 1);
                theme = split.join('\n');
                theme = theme.replace(/(\r\n|\n|\r)/gm, '');*/
                _mainWindow.webContents.executeJavaScript('(function() { bdthemes["' + themeName + '"] = { "enabled": false, "name": "' + themeName + '", "css": "' + escape(theme) + '", "description": "' + themeDescription + '", "author":"' + themeAuthor + '", "version":"' + themeVersion + '"  } })();');

                _utils.jsLog('BetterDiscord: Loading Theme: ' + themeName, 'log');
            });
        });
    });
};

BetterDiscord.prototype.alertNewVersion = function() {
    if(_updater.LatestVersion > this.version) {
        _utils.execJs('alert("An update for BetterDiscord is available(v'+ _updater.LatestVersion +')! Download the latest !")');
    }
};

BetterDiscord.prototype.IPCAsyncMessageInit = function() {
    _utils.execJs("var betterDiscordIPC = require('ipc');");
    
    if(!_this.BDStartUp) {
    	_ipc.on('asynchronous-message', function(event, arg) { _this.ipcAsyncMessage(event, arg); });
        _this.BDStartUp = true;  
    }
    
    //Inject version
    _utils.execJs('var version = "'+this.version+'"');
    //Inject cdn
    _utils.execJs('var bdcdn = "' + _updater.CDN + '";');
    //Load jQuery
    _utils.updateLoading("Loading Resources(jQuery)", 0, 100);
    _utils.injectJavaScriptSync("//ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min.js", "load-jQueryUI");
};


var loadCount = 0;
BetterDiscord.prototype.ipcAsyncMessage = function(event, arg) {
    var libCount = 9;

    var loadUs = {
        'load-jQueryUI': {
            'type': 'javascript',
            'resource': 'jQueryUI',
            'domain': 'cdnjs.cloudflare.com',
            'url': '//cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.min.js',
            'localurl': null,
            'message': 'load-mainCSS',
            'cacheable': false,
            'variable': null
        },
        'load-mainCSS': {
            'type': 'css',
            'resource': 'Main CSS',
            'domain': _updater.CDN,
            'url': '//' + _updater.CDN + '/' + _repo + '/BetterDiscordApp/' + _hash + '/css/main.min.css',
            'localurl': _localServer + '/BetterDiscordApp/css/main.css',
            'message': 'load-mainJS',
            'cacheable': false,
            'variable': null
        },
        'load-mainJS': {
            'type': 'javascript',
            'resource': 'Main JS',
            'domain': _updater.CDN,
            'url': '//' + _updater.CDN + '/' + _repo + '/BetterDiscordApp/' + _hash + '/js/main.min.js',
            'localurl': _localServer + '/BetterDiscordApp/js/main.js',
            'message': 'load-publicServers',
            'cacheable': false,
            'variable': null
        },
        'load-publicServers': {
            'type': 'json',
            'resource': 'Public Servers',
            'domain': _updater.CDN,
            'url': '/' + _repo + '/BetterDiscordApp/' + _hash + '/data/serverlist.json',
            'localurl': null,
            'message': 'load-emoteData-twitchGlobal',
            'cacheable': false,
            'variable': 'publicServers'
        },
        'load-emoteData-twitchGlobal': {
            'type': 'emotedata',
            'resource': 'Twitch Global Emotedata',
            'domain': 'twitchemotes.com',
            'url': '/api_cache/v2/global.json',
            'localurl': null,
            'message': 'load-emoteData-twitchSub',
            'cacheable': true,
            'variable': 'emotesTwitch',
            'localpath': _dataPath + "/emotes_twitch_global.json",
            'encoding': "utf8",
            'https': true,
            'parse': true,
            'specialparser': 0
        },
        'load-emoteData-twitchSub': {
            'type': 'emotedata',
            'resource': 'Twitch Subscriber Emotedata',
            'domain': 'twitchemotes.com',
            'url': '/api_cache/v2/subscriber.json',
            'localurl': null,
            'message': 'load-emoteData-ffz',
            'cacheable': true,
            'variable': 'subEmotesTwitch',
            'localpath': _dataPath + "/emotes_twitch_subscriber.json",
            'encoding': "utf8",
            'https': true,
            'parse': true,
            'specialparser': 1
        },
        'load-emoteData-ffz': {
            'type': 'emotedata',
            'resource': 'FrankerFaceZ Emotedata',
            'domain': _updater.CDN,
            'url': '/' + _repo + '/BetterDiscordApp/' + _hash + '/data/emotedata_ffz.json',
            'localurl': null,
            'message': 'load-emoteData-bttv',
            'cacheable': true,
            'variable': 'emotesFfz',
            'localpath': _dataPath + "/emotes_ffz.json",
            'encoding': "utf8",
            'https': true,
            'parse': true,
            'specialparser': 2
        },
        'load-emoteData-bttv': {
            'type': 'emotedata',
            'resource': 'BTTV Emotedata',
            'domain': 'api.betterttv.net',
            'url': '/emotes',
            'localurl': null,
            'message': 'load-emoteData-bttv-2',
            'cacheable': true,
            'variable': 'emotesBTTV',
            'localpath': _dataPath + "/emotes_bttv.json",
            'encoding': "utf8",
            'https': true,
            'parse': false,
            'specialparser': 3
        },
        'load-emoteData-bttv-2': {
            'type': 'emotedata',
            'resource': 'BTTV Emotedata',
            'domain': _updater.CDN,
            'url': '/' + _repo + '/BetterDiscordApp/' + _hash + '/data/emotedata_bttv.json',
            'localurl': null,
            'message': 'start-bd',
            'cacheable': true,
            'variable': 'emotesBTTV2',
            'localpath': _dataPath + "/emotes_bttv_2.json",
            'encoding': "utf8",
            'https': true,
            'parse': false,
            'specialparser': 4
        }
    };

    if(loadUs.hasOwnProperty(arg)) {
        loadCount++;
        var loadMe = loadUs[arg];
        
        _utils.updateLoading("Loading Resources (" + loadMe.resource + ")", loadCount / libCount * 100, 100);

        var url = loadMe.url;
        if(_local && loadMe.localurl != null) {
            url = loadMe.localurl;
        }

        if(loadMe.type == 'javascript') {
            _utils.injectJavaScriptSync(url, loadMe.message);
        }else if(loadMe.type == 'css') {
            _utils.injectStylesheetSync(url, loadMe.message);
        }else if(loadMe.type == 'json') {
            _utils.download(loadMe.domain, loadMe.url, function(data) {
                _utils.execJs('var ' + loadMe.variable + ' = ' + data + ';');
                _utils.sendIcpAsync(loadMe.message);
            });
        }else if(loadMe.type == 'emotedata') {

            var exists = _fs.existsSync(loadMe.localpath);

            if(exists && !_cacheExpired && loadMe.cacheable) {
                _this.injectEmoteData(loadMe, _fs.readFileSync(loadMe.localpath, loadMe.encoding));
            } else {
                if(loadMe.https) {
                    _utils.download(loadMe.domain, loadMe.url, function(data) {
                        var parsedEmoteData = _this.parseEmoteData(loadMe, data);
                        _this.saveEmoteData(loadMe, parsedEmoteData);
                        _this.injectEmoteData(loadMe, parsedEmoteData);
                    });

                } else {
                    _utils.downloadHttp(loadMe.url, function(data) {
                        var parsedEmoteData = _this.parseEmoteData(loadMe, data);
                        _this.saveEmoteData(loadMe, parsedEmoteData);
                        _this.injectEmoteData(loadMe, parsedEmoteData);
                    });
                }
            }


        }
    }

    if(arg == "start-bd") {
        _utils.updateLoading("Starting Up", 100, 100);
        _utils.execJs('var mainCore; var startBda = function() { mainCore = new Core(); mainCore.init(); }; startBda();');

        //Remove loading node
        setTimeout(function() {
            _utils.execJs('$("#bd-status").parent().parent().hide();');
        }, 2000);
    }
};

BetterDiscord.prototype.parseEmoteData = function(loadMe, emoteData) {
    var returnData;

    switch(loadMe.specialparser) {

        case 0: //Twitch Global Emotes
            returnData = emoteData.replace(/\$/g, "\\$").replace(/'/g, "\\'").replace(/"/g, "\\\"");
            break;
        case 1: //Twitch Subscriber Emotes
            returnData = {};
            emoteData = JSON.parse(emoteData);
            var channels = emoteData["channels"];
            for(var channel in channels) {
                var emotes = channels[channel]["emotes"];
                for(var i = 0 ; i < emotes.length ; i++) {
                    var code = emotes[i]["code"];
                    var id = emotes[i]["image_id"];
                    returnData[code] = id;
                }
            }

            returnData = JSON.stringify(returnData);
            break;
        case 2: //FFZ Emotes
            returnData = emoteData;
            break;
        case 3: //BTTV Emotes
            returnData = {};
            _this.SecureTryCatch(function() {
                emoteData = JSON.parse(emoteData);

                for(var emote in emoteData.emotes) {
                    emote = emoteData.emotes[emote];
                    var url = emote.url;
                    var code = emote.regex;

                    returnData[code] = url;
                }
            });
            
            returnData = JSON.stringify(returnData);
            break;
        case 4: 
            returnData = emoteData;
            break;

    }

    return returnData;
};

BetterDiscord.prototype.saveEmoteData = function(loadMe, emoteData) {
    _fs.writeFileSync(loadMe.localpath, emoteData, loadMe.encoding);
};

BetterDiscord.prototype.injectEmoteData = function(loadMe, emoteData) {
    if(loadMe.parse) {
        _utils.execJs('var ' + loadMe.variable + ' = JSON.parse(\'' + emoteData + '\');');
    } else {
        _utils.execJs('var ' + loadMe.variable + ' = ' + emoteData + ';');
    }

    _utils.sendIcpAsync(loadMe.message);
};

exports.BetterDiscord = BetterDiscord;
