/* BetterDiscord Boot Interface
 * Version: 0.4.1
 * Author: Jiiks | http://jiiks.net, noVaLue
 * Date: 08/04/2016
 * Last Update: 08/04/2016
 * https://github.com/Jiiks/BetterDiscordApp
 */
'use strict';

var _ipc = require('electron').ipcMain;
var _fs = require("fs");


var _BDLoaderPath = __dirname + '/BDLoader.js';
var _BDUtilsPath = __dirname + '/BDUtils.js';
var _BDUpdaterPath = __dirname + '/../updater.json';
var _BDUCachePath = __dirname + '/../update_cache.json';

var _updater = require(_BDUpdaterPath);
var _utilities = require(_BDUtilsPath);

var _self, _this;
var _utils, _mainWindow, _cacheExpired = true;

var _old_updater = {
	'CDN': '',
	'REPO': 'Jiiks',
	'HASH': '',
	'VER': ''
};

function BetterDiscord(mainWindow) {
	_mainWindow = mainWindow;
	_utils = new _utilities.Utils(mainWindow);

	if(!BetterDiscord.instance)
		BetterDiscord.instance = new BetterDiscordBoot();
	
	_self = BetterDiscord.instance;
    _self.HandleEvents();
};

BetterDiscord.instance = null;

var BetterDiscordBoot = function() {
	this.updater = _updater;
	this.BootStrapStart();
};

BetterDiscordBoot.prototype.bootInterval = null;
BetterDiscordBoot.prototype.lastModif = null;

BetterDiscordBoot.prototype.eventPoll = {};
BetterDiscordBoot.prototype.eventInterval = null;
BetterDiscordBoot.prototype.BDStartUp = false;
BetterDiscordBoot.prototype.BDReBoot = false;

BetterDiscordBoot.prototype.BootStrapStart = function() {
	_ipc.on('async-message-boot', function(event, arg) { _self.IpcAsyncMessage(event, arg); });

	this.bootInterval = setInterval(this.HotLoadCheck, 2000);
	this.eventInterval = setInterval(this.DispatchEvents, 1000);
};

BetterDiscordBoot.prototype.BootStrapStop = function() {
	clearInterval(this.bootInterval);
	clearInterval(this.eventInterval);
};

BetterDiscordBoot.prototype.HandleEvents = function () {
	_mainWindow.webContents.on("dom-ready", function() { _self.RecordEvent("dom-ready"); });
	_mainWindow.webContents.on("new-window", function() { _self.RecordEvent("new-window"); });
	_mainWindow.webContents.on("did-fail-load", function() { _self.RecordEvent("did-fail-load"); });
	_mainWindow.webContents.on("crashed", function() { _self.RecordEvent("crashed"); });
	_mainWindow.on("focus", function() { _self.RecordEvent("focus"); });
	_mainWindow.on("blur", function() { _self.RecordEvent("blur"); });
	_mainWindow.on("close", function() { _self.RecordEvent("close"); });
};

BetterDiscordBoot.prototype.SendWebEvent = function(event, arg) {
	return _mainWindow.webContents.send(event, arg);
};

BetterDiscordBoot.prototype.EventTriggered = function (event) {
	if(_self.eventPoll.hasOwnProperty(event) && 
		_self.eventPoll[event] > 0) {
		_self.eventPoll[event] = 0;
		return true;
	}
	return false;
}

BetterDiscordBoot.prototype.HotLoadCheck = function() {
	if(_cacheExpired) {
		_utils.jsLog('Checking for updates ...');
		_self.CheckVersion(function() {
			if(_self.updater.version < _updater.version) {
				_utils.jsLog('New version '+ _updater.version + ' > ' + _self.updater.version);
				_utils.jsLog('Updating ...');

				_self.Update();
			}
		});
	}else {
		var modifyTime = _utils.GetModifyTime(_BDLoaderPath);

		if(_self.lastModif == null || _self.lastModif.getTime() < modifyTime.getTime()) {
			if(_self.lastModif == null)
				_self.RecordEvent("boot");
			else
				_self.RecordEvent("reboot");
			_self.lastModif = modifyTime;
		}
	}
	
	_cacheExpired = _utils.CheckCacheFile(_BDUCachePath, 1);
};

BetterDiscordBoot.prototype.DispatchEvents = function() {
	if(_self.BDStartUp && _self.EventTriggered("dom-ready")) {
		_utils.SecureTryCatch('BetterDiscordBoot->DispatchEvents(Loader->Load())', function() {
			_this.Load(_old_updater);
		});
	}

	if(_self.EventTriggered("boot")) {
		_utils.SecureTryCatch('Booting BetterDiscord', function() {
			if(_utils.FileExists(_BDLoaderPath)) {
				var BD = require(_BDLoaderPath);
				_this = new BD.BetterDiscordLoader(_self, _ipc, _utils);
				_this.Init();
				_self.BDStartUp = true;
			}
		});
	}

	if(_self.EventTriggered("reboot")) {
		_utils.SecureTryCatch('Booting BetterDiscord rebooting', function() {
			if(_utils.FileExists(_BDUtilsPath)) {
				_self.RemoveInclude(_BDUtilsPath);

				_utils = require(_BDUtilsPath);
				_utils = new _utils.Utils(_mainWindow);
			}

			if(_utils.FileExists(_BDLoaderPath)) {
				_self.RemoveInclude(_BDLoaderPath);

				var BD = require(_BDLoaderPath);
				_this = new BD.BetterDiscordLoader(_self, _ipc, _utils);
				_this.Init();
				_this.Load(_old_updater);
			}
		});
	}
};

BetterDiscordBoot.prototype.RemoveInclude = function(libPath) {
	var name = require.resolve(libPath);
	if(require.cache.hasOwnProperty(name))
		delete require.cache[name];
};

BetterDiscordBoot.prototype.RecordEvent = function(event) {
	if(this.eventPoll.hasOwnProperty(event))
		this.eventPoll[event] = this.eventPoll[event] + 1; 
	else
		this.eventPoll[event] = 1;
};

BetterDiscordBoot.prototype.IpcAsyncMessage = function(event, arg) {
	_utils.SecureTryCatch('BetterDiscordBoot->IpcAsyncMessage', function() {
		_this.IpcAsyncMessage(event, arg);
	});
};

BetterDiscordBoot.prototype.CheckVersion = function(callback) {
	var repoAPIHost = "api.github.com";
	var repoAPIPathHash = "/repos/" + _old_updater.REPO + "/BetterDiscordApp/commits/master";
	_utils.DownloadHTTPS(repoAPIHost, repoAPIPathHash, function(data) {
		_utils.SecureTryCatch('BetterDiscordLoader->CheckVersion(Get version hash)', function() {
			var tmpRawObj = JSON.parse(data);
			if(tmpRawObj.hasOwnProperty('sha')) {
				_old_updater.HASH = tmpRawObj.sha;
				_self.CheckUpdater(callback);
			}
		});
	});
};

BetterDiscordBoot.prototype.CheckUpdater = function(callback) {
	var repoRAWHost = "raw.githubusercontent.com";
	var repoRAWPathUpdater = "/"+_old_updater.REPO+"/BetterDiscordApp/"+_old_updater.HASH+"/data/updater.json";
	_utils.DownloadHTTPS(repoRAWHost, repoRAWPathUpdater, function(data) {
		_utils.SecureTryCatch('BetterDiscordLoader->CheckVersion(Get update info)', function() {
			var tmpRawObj = JSON.parse(data);
			if(tmpRawObj.hasOwnProperty('CDN')) {
				_old_updater.CDN = tmpRawObj.CDN;
				_old_updater.VER = tmpRawObj.LatestVersion;
				_self.CheckBootUpdater(callback);
			}
		});
	});
};

BetterDiscordBoot.prototype.CheckBootUpdater = function(callback) {
	var repoRAWHost = "raw.githubusercontent.com";
	var repoRAWPathUpdater = "/"+_updater.repo+"/BetterPlugins/master/app/BDP/BetterDiscord/updater.json";
	_utils.DownloadHTTPS(repoRAWHost, repoRAWPathUpdater, function(data) {
		_utils.SecureTryCatch('BetterDiscordLoader->CheckBootUpdater(Get update info)', function() {
			var tmpRawObj = JSON.parse(data);
			if(tmpRawObj.hasOwnProperty('repo')) {
				_updater = tmpRawObj;
				callback();
			}
		});
	});
};

BetterDiscordBoot.prototype.Update = function() {
	var repoRAWHost = "raw.githubusercontent.com";
	var repoRAWPath = "/"+_updater.repo+"/BetterPlugins/master/app/BDP/BetterDiscord/";

	var taskManager = new _utils.TaskManager();
	for(var idx in _updater.files) {
		var file = _updater.files[idx];
		
		var filePath = __dirname + '/../' + file.path;

		
		var task = new _utils.CreateTask('ReplaceFile', '__answer__', filePath);
		taskManager.AddTask(task);

		_utils.DownloadHTTPS(repoRAWHost, repoRAWPath + file.path, task.SetAnswer);
	}

	taskManager.RunTasks(function(successful) {
		if(successful) {
			this.updater = _updater;
			_mainWindow.reload();
		}else
			_utils.jsLog('One of the tasks failed, trying to update next hour ...');
	});


};

exports.BetterDiscord = BetterDiscord;