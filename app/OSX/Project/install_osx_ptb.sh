#!/bin/bash
# As there is no Linux support, this script assumes OS X as the host system.

cwd=$(pwd)

if [ -e "$cwd/index_ptb.js" ] 
then
    if [ ! -e "/usr/local/bin/node" ]
    then 
	wget https://nodejs.org/dist/v4.4.2/node-v4.4.2.pkg
	sudo installer -pkg node-v4.4.2.pkg -target / 
    fi
    if [ ! -e "/usr/local/bin/node" ]
    then 
	open 'https://nodejs.org/en/'
	exit 1
    else
	/usr/local/bin/node "$cwd/index_ptb.js"
	exit 0
    fi
fi
exit 1