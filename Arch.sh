#!/bin/sh

#curl and git install (although you should have git if you have this file)
pacman -S --noconfirm curl git

#install all relevant packages at once
pacman -S --noconfirm nodejs npm mongodb

#make mongod folders
mkdir /data
mkdir /data/db

#make folder writable by user
chmod -R go+w /data/db

