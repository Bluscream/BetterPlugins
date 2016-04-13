/* BetterDiscord Loader & App Entry
 * Version: 0.4.1
 * Author: Jiiks | http://jiiks.net, noVaLue
 * Date: 08/04/2016
 * Last Update: 08/04/2016
 * https://github.com/Jiiks/BetterDiscordApp
 */
 'use strict';

var _fs = require("fs");

var _repo = "Jiiks";

//Variables
var _hash = null;
var _updater = null;

var _cacheExpired = false;

var _os = process.platform;
var _proc_user = process.env.USERPROFILE;
var _proc_appdata = process.env.APPDATA || _proc_user + "/AppData/Roaming";

var _dataPath = _os == "win32" ? _proc_appdata : _os == 'darwin' ? process.env.HOME + '/Library/Preferences' : '/var/local';
	_dataPath += "/BetterDiscord";

var _eCacheFile = _dataPath + "/emotes.json";
var _pluginsPath = _dataPath + "/plugins";
var _themesPath = _dataPath + "/themes";

var _self, _this, _ipc, _utils;
var BetterDiscordLoader = function (self, ipc, utils) {
	_ipc = ipc;
	_self = self;
	_utils = utils;
	_this = this;
};

BetterDiscordLoader.prototype.Init = function () {
	_utils.CreateDirPath(_dataPath);
	_utils.CreateDirPath(_pluginsPath);
	_utils.CreateDirPath(_themesPath);
};

BetterDiscordLoader.prototype.Load = function(updaterData) {
	_updater = updaterData;
	_cacheExpired = _utils.CheckCacheFile(_eCacheFile, 24);

	_utils.execJs('var themesupport2 = true');
	_utils.execJs('var bdplugins = {};');
	_utils.execJs('var bdthemes = {};');
    _utils.execJs('var version = "'+ _self.version + '"');

 	_utils.execJs("var betterDiscordIPC = require('electron').ipcRenderer;");
 	_utils.execJs("if(betterDiscordIPC.listenerCount('async-message-main') == 0) \
 		betterDiscordIPC.on('async-message-main', function(event, arg) { console.log(arg); }); ");
 	_utils.execJs("if(betterDiscordIPC.listenerCount('async-message-loadJS') == 0) \
 		betterDiscordIPC.on('async-message-loadJS', function(event, libPath) { \
 		var name = require.resolve(libPath);  \
		if(require.cache.hasOwnProperty(name)) delete require.cache[name]; \
		var pluginInclude = require(libPath); \
		var libEntries = Object.keys(pluginInclude); \
		if(libEntries.length > 0) { \
			try {\
				var pluginInst = new pluginInclude[libEntries[0]](); \
				pluginInst.unload(); \
		 		bdplugins[pluginInst.getName()] = {'plugin': pluginInst, 'enabled': false}; \
	 		}catch(ex) { console.error('['+libPath+'] '+ ex)}\
	 	}  }); ");
 	_utils.execJs("if(betterDiscordIPC.listenerCount('async-message-loadCSS') == 0) \
 		betterDiscordIPC.on('async-message-loadCSS', function(event, styleObj) { \
 			bdthemes[styleObj.name] = styleObj; \
		}); ");

	_utils.execJs('var e = document.getElementById("BDSTATUS"); if(e) e.parentNode.removeChild(e); var loadingNode = document.createElement("DIV"); loadingNode.id="BDSTATUS";');
	_utils.execJs('loadingNode.innerHTML = \' <div style="height:20px;width:100%;background:#282B30;"><div style="padding-right:10px; float:right"> <span id="bd-status" style="line-height:20px;color:#E8E8E8;">BetterDiscord - Loading Libraries : </span><progress id="bd-pbar" value="0" max="100"></progress></div></div> \'');
	_utils.execJs('var flex = document.getElementsByClassName("flex-vertical flex-spacer")[0]; flex.appendChild(loadingNode);');

	this.IPCAsyncMessageInit();
};

BetterDiscordLoader.prototype.LoadPlugin = function(fileName) {
	var filePath = _pluginsPath + "/" +fileName;
	if(_utils.DirExists(filePath)) return;
	
	var pluginExt = '.plugin.js';
	var pluginExtPos = fileName.lastIndexOf(pluginExt);
	if(pluginExt.length + pluginExtPos !=  fileName.length) return;

	_utils.SecureTryCatch('BetterDiscordLoader->loadPlugin', function() {
		_self.SendWebEvent('async-message-loadJS', filePath);
	});
		
};

BetterDiscordLoader.prototype.LoadTheme = function(fileName) {
	if(_utils.DirExists(_themesPath + "/" + fileName)) return;

	var styleExt = '.theme.css';
	var styleExtPos = fileName.lastIndexOf(styleExt);
	if(styleExt.length + styleExtPos !=  fileName.length) return;

	_utils.SecureTryCatch('BetterDiscordLoader->loadPlugin', function() {
		var theme = _utils.LoadFile(_themesPath +'/' + fileName);
        var split = theme.split('\n');

        var meta = split[0];
        if (meta.indexOf('META') < 0) return;
        
        var themeVar = meta.substring(meta.lastIndexOf('//META') + 6, meta.lastIndexOf('*/'));
        var parse = JSON.parse(themeVar);
        var themeName = parse['name'];
        var themeAuthor = parse['author'];
		var themeDescription = parse['description'];
		var themeVersion = parse['version'];

  		split.splice(0, 1);
        theme = split.join('');

        var myRegExp = /url\s*\((.*?)\)/gi;
        var matches = theme.match(myRegExp);
        
        for(var id in matches) {
        	var entry = matches[id];
        	var myRegXP = /url\s*\((.*?)\)/gi;
        	var groups = myRegXP.exec(entry);
        	
        	if(groups != null) {
            	var stripmatch = groups[1].replace(/[\"\']/g, '');
            	if(stripmatch.indexOf('local://') == 0) {
            		var fileBase = fileName.replace(styleExt, '');
            		var fileRes = stripmatch.replace('local://', fileBase + '.assets/');
            		var resPath = _themesPath + '/' + fileRes;
            		if(_utils.FileExists(resPath)) {
	            		var fileBase64 = _utils.LoadFileBase64(resPath);

	            		var extPos = resPath.lastIndexOf(".");
	            		var dataType = "image/jpeg";
	            		if(extPos > 0 && extPos < resPath.length-1) {
	            			var ext = resPath.substring(extPos + 1);
	            			if(ext == "gif") dataType = "image/gif";
	            			else if(ext == "png") dataType = "image/png";
	            		}

	            		theme = theme.replace(entry, "url('data:"+dataType+";base64,"+fileBase64+"')");
	            	}
            	}
            }
        }

        var styleObj = {"enabled": false, "name": themeName, "css": escape(theme), "description":  themeDescription, "author": themeAuthor, "version": themeVersion};
        _self.SendWebEvent('async-message-loadCSS', styleObj);
    });
};

BetterDiscordLoader.prototype.IPCAsyncMessageInit = function() {
	_utils.updateLoading("Loading Resources", 0, 100);
    this.IpcAsyncMessage('async-message-boot', 'load-jQuery');
};

BetterDiscordLoader.prototype.GetIPCNextEvent = function(arg) {
	var loadUs = {
		'load-jQuery': {
			'number': 1,
			'type': 'javascript',
			'elemId': 'BDjQueryJS',
			'resource': 'jQuery',
			'domain': 'ajax.googleapis.com',
			'url': '//ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min.js',
			'message': 'load-jQueryUI',
		},
		'load-jQueryUI': {
			'number': 2,
			'type': 'javascript',
			'elemId': 'BDjQueryCookieJS',
			'resource': 'jQueryUI',
			'domain': 'cdnjs.cloudflare.com',
			'url': '//cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.min.js',
			'message': 'load-plugins',
		},
		'load-plugins': {
			'number': 3,
			'type': 'plugins',
			'resource': 'Plugins',
			'localpath': _pluginsPath,
			'message': 'load-themes',
		},
		'load-themes': {
			'number': 4,
			'type': 'themes',
			'resource': 'Themes',
			'localpath': _themesPath,
			'message': 'load-mainCSS',
		},
		'load-mainCSS': {
			'number': 5,
			'type': 'css',
			'elemId': 'BDMainCSS',
			'resource': 'Main CSS',
			'domain': _updater.CDN,
			'url': '//' + _updater.CDN + '/' + _updater.REPO + '/BetterDiscordApp/' + _updater.HASH + '/css/main.min.css',
			'message': 'load-mainJS',
		},
		'load-mainJS': {
			'number': 6,
			'type': 'javascript',
			'elemId': 'BDMainJS',
			'resource': 'Main JS',
			'domain': _updater.CDN,
			'url': '//' + _updater.CDN + '/' + _updater.REPO + '/BetterDiscordApp/' + _updater.HASH + '/js/main.min.js',
			'message': 'load-publicServers',
		},
		'load-publicServers': {
			'number': 7,
			'type': 'json',
			'resource': 'Public Servers',
			'domain': _updater.CDN,
			'url': '/' + _updater.REPO + '/BetterDiscordApp/' + _updater.HASH + '/data/serverlist.json',
			'message': 'load-emoteData-twitchGlobal',
			'cacheable': false,
			'variable': 'publicServers'
		},
		'load-emoteData-twitchGlobal': {
			'number': 8,
			'type': 'emotedata',
			'resource': 'Twitch Global Emotedata',
			'domain': 'twitchemotes.com',
			'url': '/api_cache/v2/global.json',
			'message': 'load-emoteData-twitchSub',
			'variable': 'emotesTwitch',
			'localpath': _dataPath + "/emotes_twitch_global.json",
			'encoding': "utf8",
			'https': true,
			'cacheable': true,
			'specialparser': 0
		},
		'load-emoteData-twitchSub': {
			'number': 9,
			'type': 'emotedata',
			'resource': 'Twitch Subscriber Emotedata',
			'domain': 'twitchemotes.com',
			'url': '/api_cache/v2/subscriber.json',
			'message': 'load-emoteData-ffz',
			'cacheable': true,
			'variable': 'subEmotesTwitch',
			'localpath': _dataPath + "/emotes_twitch_subscriber.json",
			'encoding': "utf8",
			'https': true,
			'specialparser': 1
		},
		'load-emoteData-ffz': {
			'number': 10,
			'type': 'emotedata',
			'resource': 'FrankerFaceZ Emotedata',
			'domain': _updater.CDN,
			'url': '/' + _updater.REPO + '/BetterDiscordApp/' + _updater.HASH + '/data/emotedata_ffz.json',
			'message': 'load-emoteData-bttv',
			'cacheable': true,
			'variable': 'emotesFfz',
			'localpath': _dataPath + "/emotes_ffz.json",
			'encoding': "utf8",
			'https': true,
			'specialparser': 2
		},
		'load-emoteData-bttv': {
			'number': 11,
			'type': 'emotedata',
			'resource': 'BTTV Emotedata',
			'domain': 'api.betterttv.net',
			'url': '/emotes',
			'message': 'load-emoteData-bttv-2',
			'cacheable': true,
			'variable': 'emotesBTTV',
			'localpath': _dataPath + "/emotes_bttv.json",
			'encoding': "utf8",
			'https': true,
			'specialparser': 3
		},
		'load-emoteData-bttv-2': {
			'number': 12,
			'type': 'emotedata',
			'resource': 'BTTV Emotedata',
			'domain': _updater.CDN,
			'url': '/' + _updater.REPO + '/BetterDiscordApp/' + _updater.HASH + '/data/emotedata_bttv.json',
			'message': 'start-bd',
			'cacheable': true,
			'variable': 'emotesBTTV2',
			'localpath': _dataPath + "/emotes_bttv_2.json",
			'encoding': "utf8",
			'https': true,
			'specialparser': 4
		}
	};

	loadUs.count = function () {
	    var count = 0;
	    for(var prop in this)
	        if(this.hasOwnProperty(prop) && this[prop].hasOwnProperty('number')) count++;
	    return count;
	}

	if(loadUs.hasOwnProperty(arg))
		return {'count': loadUs.count(), 'task': loadUs[arg]};
	return null;
};

BetterDiscordLoader.prototype.IpcAsyncMessage = function(event, arg) {
	var ipcTask = this.GetIPCNextEvent(arg);

	if(ipcTask) {
		var loadMe = ipcTask.task;
		_utils.updateLoading("Loading Resources (" + loadMe.resource + ")", loadMe.number / ipcTask.count * 100, 100);

		if(loadMe.type == 'plugins') {
			_utils.LoadDir(loadMe.localpath, _this.LoadPlugin);
			_utils.sendIcpAsync(loadMe.message);
		}else if(loadMe.type == 'themes') {
			_utils.LoadDir(loadMe.localpath, _this.LoadTheme);
			_utils.sendIcpAsync(loadMe.message);
		}else if(loadMe.type == 'javascript') {
			_utils.injectJavaScriptSync(loadMe);
		}else if(loadMe.type == 'css') {
			_utils.injectStylesheetSync(loadMe);
		}else if(loadMe.type == 'json') {
			_utils.DownloadHTTPS(loadMe.domain, loadMe.url, function(data) {
				_utils.execJs('var ' + loadMe.variable + ' = ' + data + ';');
				_utils.sendIcpAsync(loadMe.message);
			});
		}else if(loadMe.type == 'emotedata') {
			var exists = _utils.FileExists(loadMe.localpath);

			if(exists && !_cacheExpired && loadMe.cacheable) {
				_this.injectEmoteData(loadMe, _utils.LoadFile(loadMe.localpath, loadMe.encoding));
			} else {
				if(loadMe.https) {
					_utils.DownloadHTTPS(loadMe.domain, loadMe.url, function(data) {
						var parsedEmoteData = _this.parseEmoteData(loadMe, data);
						_this.saveEmoteData(loadMe, parsedEmoteData);
						_this.injectEmoteData(loadMe, parsedEmoteData);
					});

				} else {
					_utils.DownloadHTTP(loadMe.url, function(data) {
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
		_utils.execJs('var mainCore = new Core(); mainCore.init();');
		//_utils.execJs('$("#BDSTATUS").remove();');
    }
};


BetterDiscordLoader.prototype.parseEmoteData = function(loadMe, emoteData) {
	var returnData = {};
		
	_utils.SecureTryCatch('BetterDiscordLoader->parseEmoteData(Transform emotes lists to files)', function() {
		switch(loadMe.specialparser) {
	        case 0: //Twitch Global Emotes
	        	emoteData = JSON.parse(emoteData);

	        	var TwitchGlobal = {'emotes':{}};
		    	var emotes = emoteData.emotes;
	        	for(var emote in emotes)
	        		TwitchGlobal.emotes[emote] = {'image_id':emotes[emote].image_id};
		        
	        	returnData = JSON.stringify(TwitchGlobal);
	        	break;
	        case 1: //Twitch Subscriber Emotes
		        emoteData = JSON.parse(emoteData);

	        	var TwitchSub = {};
		        var channels = emoteData["channels"];
		        for(var channel in channels) {
		        	var emotes = channels[channel]["emotes"];
		        	for(var i = 0 ; i < emotes.length ; i++) {
		        		var code = emotes[i]["code"];
		        		var id = emotes[i]["image_id"];
		        		TwitchSub[code] = id;
		        	}
		        }
		        returnData = JSON.stringify(TwitchSub);
		        break;
	        case 2: //FFZ Emotes
		        returnData = emoteData;
		        break;
	        case 3: //BTTV Emotes
	        	emoteData = JSON.parse(emoteData);

	        	var BTTV = {};
	        	for(var emote in emoteData.emotes) {
	        		emote = emoteData.emotes[emote];
	        		var url = emote.url;
	        		var code = emote.regex;

	        		BTTV[code] = url;
	        	}
	        	returnData = JSON.stringify(BTTV);
		        break;
	        case 4: 
		        returnData = emoteData;
		        break;
	    }
    });
    return returnData;
};

BetterDiscordLoader.prototype.saveEmoteData = function(loadMe, emoteData) {
	if(emoteData.length > 5)
		_utils.WriteFile(loadMe.localpath, emoteData, loadMe.encoding);
};

BetterDiscordLoader.prototype.injectEmoteData = function(loadMe, emoteData) {
	_utils.execJs('var ' + loadMe.variable + ' = ' + emoteData + ';');
	_utils.sendIcpAsync(loadMe.message);
};

exports.BetterDiscordLoader = BetterDiscordLoader;
