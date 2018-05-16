#!/bin/sh

#curl and git install (although you should have git if you have this file)
apt-get install -y curl git

#node install first
curl -sL https://deb.nodesource.com/setup_9.x | bash -
apt-get install -y nodejs

#mongodb install
apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5
echo "deb http://repo.mongodb.org/apt/debian jessie/mongodb-org/3.6 main" | tee /etc/apt/sources.list.d/mongodb-org-3.6.list
apt-get update
apt-get install -y mongodb-org

#make mongod folders
mkdir /data
mkdir /data/db

#make folder writable by user
chmod -R go+w /data/db
