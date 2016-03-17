//META{"name":"BDMenuFix"}*//

var _fs = require("fs");

var BDMenuFix = function() {
	this.load = function() {
		this.loadInterval = setInterval(this.autoLoadBD, 1000);
	};

	this.unload = function() {
		clearInterval(this.loadInterval);
	};

	this.start = function() {};
	this.stop = function() {};

	this.onSwitch = function() {};
	this.onMessage = function() {};

	this.getSettingsPanel = function() { return ""; };

	this.getName = function() {
		return "BetterDiscord Menu";
	};

	this.getDescription = function() {
		return "Fix menu on setTimeout fail";
	};

	this.getAuthor = function() {
		return "noVaLue";
	};

	this.getVersion = function() {
		return "Version 0.0.1";
	};
};

BDMenuFix.prototype.loadInterval = null;

BDMenuFix.prototype.autoLoadBD = function() {
    if ($(".modal-inner").first().is(":visible")) {
        if(!$(".btn.btn-settings").data("pref") && $("#bd-settings-new").length == 0) {
            panel.hide();
            var tabBar = $(".tab-bar.SIDE").first();

            $(".tab-bar.SIDE .tab-bar-item").click(function () {
                $(".form .settings-right .settings-inner").first().show();
	        $("#bd-settings-new").removeClass("selected");
	        panel.hide();
            });
    
            tabBar.append(settingsButton);
            $(".form .settings-right .settings-inner").last().after(panel);
	    $("#bd-settings-new").removeClass("selected");
            $(".btn.btn-settings").data("pref", true);
        }
    }else {
        $(".btn.btn-settings").data("pref", false);
    }
}