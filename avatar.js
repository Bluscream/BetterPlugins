//META{"name":"AvatarHover"}*//

var AvatarHover  = function() {
	this.load = function() {
		this.appendContainer();

		var that = this;
		$(window).keydown(function(event) {
			if(event.which == 17) that.show = true;
			if(event.which == 16) that.large = true;
		});

		$(window).keyup(function(event) {
			if(event.which == 17) that.show = false;
			if(event.which == 16) that.large = false;
		});

		$(window).blur(function() {
			that.show = false;
			that.large = false;
		});
	};
	this.unload = function() {
		this.removeContainer();
	};

	this.start = function() {
	    this.running = true;
		this.run();
	};

	this.stop = function() {
		this.running = false;
	};

	this.onSwitch = function() {
		this.run();
	};

	this.onMessage = function() {
		this.run();
	};

	this.getName = function() {
		return "AvatarHover";
	};

	this.getDescription = function() {
		return "When hovering Avatar show it on default size";
	};

	this.getAuthor = function() {
		return "noVaLue";
	};

	this.getVersion = function() {
		return "Version 0.0.1";
	};
};

AvatarHover.prototype.running = false;
AvatarHover.prototype.show = false;
AvatarHover.prototype.large = false;

AvatarHover.prototype.run = function() {
	if(this.running) this.init();
};

AvatarHover.prototype.appendContainer = function () {
	var elem = $("<div id='AvatarHover'>");
	elem.css({
		"display:":"none", "background-size": "cover",
		"border-radius": "4px", 
		"border": "1px solid black",
		"position":"absolute", 
		"zIndex":"99999"
	});
	$("body").append(elem);
};

AvatarHover.prototype.removeContainer = function () {
	$("#AvatarHover").remove();
};

AvatarHover.prototype.init = function() {
	var that = this;

	$("div.avatar-large,div.avatar-small").each(function(id, elem) {
		if($(this).data("customShowAvatar"))
			return;

		$(this).data("customShowAvatar", true);

		$(this).mouseenter(function() {
			if(that.running && that.show) {
				that.setAvatarSize($(this));

				$("#AvatarHover").css({
					"display":"block", 
					"background-image": $(this).css("background-image")
				});
			}
		});

		$(this).mouseleave(function() {
			if(that.running)
				$("#AvatarHover").css({"display":"none"});
		});
	});
};

AvatarHover.prototype.setAvatarSize = function(self) {
	var newWidth = this.large ? 256 : 128, newHeight = this.large ? 256 : 128;

	var offset = self.offset();
	var width = self.width();
	var height = self.height();

	var windowHeight = $(window).height();

	var AvatarX = offset.left + (width - newWidth)/2;
	var AvatarY = windowHeight-height < offset.top + newHeight ? offset.top - newHeight : offset.top + height;

	$("#AvatarHover").css({
		"top": AvatarY + "px",
		"left": AvatarX + "px",
		"width": newWidth + "px",
		"height": newHeight + "px"
	});
};