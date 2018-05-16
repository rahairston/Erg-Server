const path = require('path');

var userPath = path.join(process.cwd(),'api','models','serverModel');
var routePath = path.join(process.cwd(),'api','routes','serverRoute');

var express = require('express'),
  app = express(),
  port = process.env.PORT || 3000;
  mongoose = require('mongoose'),
  bcrypt = require('bcrypt'),
  SALT_WORK_FACTOR = 10,
  User = require(userPath), //created model loading here
bodyParser = require('body-parser');

// mongoose instance connection url connection
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/workerhealth');

app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.raw({limit: '50mb'}));

var routes = require(routePath); //importing route
routes(app); //register the route

app.listen(port);

console.log('RESTful API server started on: ' + port);
