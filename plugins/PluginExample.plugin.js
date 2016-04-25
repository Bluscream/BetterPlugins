//META{"name":"PluginExample"}*//

var PluginExample = function () {
	this.getName = function(){ return "Test Plugin"; }
	this.getDescription = function(){ return "Test Plugin Description."; }
	this.getVersion = function(){ return "0.0.1"; }
	this.getAuthor = function(){ return "noVaLue"; }
};


PluginExample.prototype.load = function () {
	console.info("'PluginExample.prototype.load event' was fired.");
	// This calls when the plugin is charged first time
};
PluginExample.prototype.start = function () {
	console.info("'PluginExample.prototype.start' event was fired.");
	// When you activate the plugin it gets called, 
	// also when plugin calls load() first time
};

PluginExample.prototype.onSwitch = function () {
	console.info("'PluginExample.prototype.onSwitch' event was fired.");
	// called when a server or channel is switched
};
PluginExample.prototype.onMessage = function () {
	console.info("'PluginExample.prototype.onMessage' event was fired.");
	// called when a message is received
};
PluginExample.prototype.observer = function (e) {
	console.info("'PluginExample.prototype.observer' event was fired. Event Data:");console.info(e);
	// raw MutationObserver event for each mutation
};

PluginExample.prototype.stop = function () {
	console.info("'PluginExample.prototype.stop' event was fired.");
	// Called on plugin desactivation
};
PluginExample.prototype.unload = function () {
	console.info("'PluginExample.prototype.unload' event was fired.");
	// This should remove every modification you've made on discord (if any)
};


PluginExample.prototype.getSettingsPanel = function () {
	console.info("'PluginExample.prototype.getSettingsPanel' event was fired.");
	return "<h3>Settings Panel</h3>";
};



// To export this object constructor which is required

try{exports.PluginExample = PluginExample;}catch(e){console.warn('PluginExample: Using old BetterDiscord version, not exporting functions.')}

/* For a API like plugin some modifications have to be made 

	1. The main function (class) has to be global

		var MyAwesomePlugin = function () {};

		BECOMES

		MyAwesomePlugin = function () {};

	2. You have to use the prototype object, your functions
		are going to get exported through that object and you'll have to use

		MyAwesomePlugin.prototype.OneofThefunctions();

		INSTEAD you can use.

		MyAwesomePlugin.OneofThefunctions() = function() {
			return this.prototype.OneofThefunctions();
		};

	3. Anytime you use .prototype.namevar or .prototype.namefunc , these get
		created inside the 'prototype' object called by the 'main class' which
		extends object (in our case MyAwesomePlugin).

	4. This kind of function 
			MyAwesomePlugin.OneofThefunctions()

		can be used inside of 
			MyAwesomePlugin = function () {
				MyAwesomePlugin.OneofThefunctions();
			};

		But this is useless, as long you're in the sandbox of nodejs (<script> </script>)

			MyAwesomePlugin = function () {
				this.OneofThefunctions();
			};

			MyAwesomePlugin = function () {
				this.prototype.OneofThefunctions();
			};

		are the same.

		:WARNING:
			'MyAwesomePlugin' different than 'this'
*/
