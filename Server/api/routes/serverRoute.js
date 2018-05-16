'use strict';
const path = require('path');
module.exports = function(app) {
  var controllerPath = path.join('..', 'controllers', 'serverController');
  var users = require(controllerPath);

  // Routes
  app.route('/')
  	.get(users.hello);

  app.route('/data')
  	.post(users.handleData);

  app.route('/register')
    .post(users.register);

  app.route('/login')
    .post(users.login);

  app.route('/history')
    .get(users.userHistory);

  app.route('/join')
    .post(users.joinSupervisor)

  app.route('/leave')
    .post(users.leaveSupervisor)

  app.route('/supervisors')
    .get(users.getSupervisors)

  app.route('/profile')
    .get(users.getProfile)
    .post(users.updateProfile);

  //Supervisor routes  
  app.route('/users')
    .get(users.getSupervisorUsers);  
   
  app.route('/remove')
    .delete(users.removeUserFromList);

  app.route('/risk')
    .get(users.averageRisk)

  //if we end up using a file upload
  app.route('/file')
    .post(users.upload);
};
