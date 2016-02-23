# BetterPlugins
This is a collection of plugins and resources for Discord.

**[AvatarHover] avatar.js**

This plugin displays any avatar in a slightly bigger frame when Ctrl or Ctrl+Shift is pressed during 'hover' action.
These settings can be changed under Plugin Settings in BetterDiscord Plugins list.

![Settings Page](http://link)


**[CSSLocalResources] csslocalresources.js**

As BetterDiscord won't allow to add themes through BdAPI, I used 'a hook' from BD plugin and linked with my plugin. In order to use it you need to have 2 files. What matters is to have the name of the theme the same in both files.

One file has to have the META which is used by BetterDiscord to identify a theme. The other has a slightly different META Tag.

The plugin does what BetterDiscord Theme Module does. Loads a theme and adds the feature to **use local files for images**.

**[PluginBatman.css contents]**
>> //META{"name":"**Batman**","description":"What i would...","author":"ItsMe","version":"1.0.1"}*//

**[PluginBatman_local.css contents]** the file can have any name as long as you know which is which
>> /\*TEAM{"name":"**Batman**"}\*/

>>	#twitchcord-button {
>>		background-image: url(local://KappaHD.png);
>>	};

**Dir structure:**

%appdata%/BetterDiscord//
>> images

>> plugins

>> themes
