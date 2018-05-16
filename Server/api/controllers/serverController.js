//import { resolve } from 'url';

'use strict';
var fs = require('fs'); //file-system handling
const { exec } = require('child_process'); //running the matlab algorithm
const path = require('path'); //OS independent pathing
const scriptPath = path.join(process.cwd(), 'MATLAB', 'risk.m');

const HEADER = "time,AccelerometerX,AccelerometerY,AccelerometerZ,LinearX,LinearY,LinearZ,GyroX,GyroY,GyroZ\n";

var mongoose = require('mongoose'),
  User = mongoose.model('User');

//from https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
//Generates random text value for tokens
//CHANGES: function name for logical reasons, token size for security purposes
function getToken() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 10; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

/**
 * Promise function for getting users so the API
 * call will not return empty due to asynchronicity
 * @param {*} _id the users id
 * @param {*} token the users token
 */
function getUsers(_id, token) {
  return new Promise(function(resolve, reject) {
    User.findById(_id,
    function(err,supervisor) {
      if (err) throw err;

      if (supervisor === null) {
        resolve([]);
      } else {
        //check token
        if (token !== supervisor.token) {
          resolve([]);
        }

        resolve(supervisor.Users);
      }
    });
  });
}

/**
 * 
 * @param userId the user id for folder pathing purposes
 * @param type the type of file manipulation
 * 1 is registration
 * 2 is login (if there are multiple logins, then we don't add header again)
 * 3 is removing the algorithm run file so old data is not re-run
 */
function fileHandler(userId, type) {
  var today = new Date();
  var dateString = `${today.getMonth() + 1}-${today.getDate()}-${today.getFullYear()}`;
  var folder = path.join(process.cwd(), 'users', `${userId}`);
  switch (type) {
    case 1: { //registration making folder and files
      fs.mkdirSync(folder);
      fs.appendFileSync(path.join(folder,`${dateString}.csv`), HEADER); //daily csv
      fs.appendFileSync(path.join(folder,`${dateString}-risk.txt`), ''); //daily risk
      fs.appendFileSync(path.join(folder,'algorithm.csv'), HEADER); //algorithm run csv
      break;
    } case 2: { //login making new daily file
      fs.appendFileSync(path.join(folder,`${dateString}-risk.txt`), ''); //daily risk (no if check because we don't write any header)
      if (!fs.existsSync(path.join(folder,`${dateString}.csv`))) {
        //write file header if the file doesn't exist
        fs.appendFileSync(path.join(folder,`${dateString}.csv`), HEADER);
      }
      break;
    } case 3: { //make new csv AFTER running algorithm on it
      try {
        fs.unlinkSync(path.join(folder,'algorithm.csv'));
        fs.appendFileSync(path.join(folder,'algorithm.csv'), HEADER);
      } catch (err) {
        console.log(err);
      } 
      break;
    } default:;
  }
}

/**
 * Updates the users average risk asynchronously since we
 * don't need to return the average risk immediatley
 * @param {*} user the user
 * @param {*} liftD lift duration risk
 * @param {*} pushD push duration risk
 * @param {*} liftF lift frequency risk
 * @param {*} pushF push frequency risk
 */
function updateRisk(user, liftD, pushD, liftF, pushF) {
  var avg = (parseInt(liftD) + parseInt(pushD) + parseInt(liftF) + parseInt(pushF));
  avg = ((avg / 4.0) + user.averageRisk) / 2.0
  user.save();
}

exports.hello = function(req, res) {
  res.send('hi');
};

/**
 * Function for registering a new user
 * Need (in req.body) a:
 * username (string)
 * password (string)
 * isSupervisor (boolean)
 * @param req http request (from client)
 * @param res http response (from server)
 */
exports.register = function(req, res) {
  User.findOne({username: req.body.username},
  function(err, user) {
    if (err) throw err;

    if (user === null) {
      //initialize user
      var newUser = new User(req.body);
      newUser.token = getToken();
      newUser.save(function(err, user) {
        if(err) {
            res.send(err);
        } else {
          fileHandler(user._id, 1);
          var data = {
            _id: user._id,
            token: user.token,
            isSupervisor: user.isSupervisor
          };
          res.send(data);
        }
      });
    } else {
      res.send("Username already exists!");
    }
  });
};

/**
 * Function for logging
 * Need (in req.body) a:
 * username (string)
 * password (string)
 * @param req http request (from client)
 * @param res http response (from server)
 */
exports.login = function(req, res) {
  User.findOne({username: req.body.username},
  function(err, user) {
    if (err) throw err;

    if (user === null || user === undefined) {
      res.send("No user found with that username.");
    } else {
      user.comparePassword(req.body.password).then(function() {
        var newToken = getToken();
        user.set({token: newToken});
        user.save(function (err, updatedUser) {
          if (err) throw err;
          fileHandler(user._id, 2);
          var data = {
            _id: updatedUser._id,
            token: updatedUser.token,
            isSupervisor: updatedUser.isSupervisor
          };
          res.send(data);
        });
      }, function(failure) {
        res.send("Incorrect Password");
      });
    }
  });
};

/**
 * Function for receiving a sensor data from user and running the
 * matlab script on it. Responds with script output.
 * Need (in req.body) a:
 * _id (string)
 * token (string)
 * ALL SENSOR DATA AND A TIMESTAMP (could change to a file)
 * @param req http request (from client)
 * @param res http response (from server)
 */
exports.handleData = function(req, res) {
  User.findById(req.body._id,
  function(err,user) {
    if (err) throw err;

    if (user === null || user === undefined) {
      res.send("Bad id");
    } else {
      //Check token
      if (req.body.token !== user.token) {
        res.send("Incorrect token");
        return;
      }

      //add to todays file
      var today = new Date();
      var folder = path.join(process.cwd(), 'users', `${user._id}`);
      var dateString = `${today.getMonth() + 1}-${today.getDate()}-${today.getFullYear()}`;
      var algorithmPath = path.join(folder,`algorithm.csv`);
      fs.appendFileSync(path.join(folder,`${dateString}.csv`), req.body.data);
      fs.appendFileSync(algorithmPath, req.body.data);

      //runs matlab script. set file_name path to algorithm beforehand
      exec(`matlab -nodisplay -nosplash -nodesktop -nojvm -r \"samplingRate=${req.body.rate};shift_in_sec=${req.body.time};file_name=\'${algorithmPath}\';run(\'${scriptPath}\');exit;\"`, 
      (err, stdout, stderr) => {
        if (err) {
          //node couldn't execute the command
          console.log(stderr);
          res.send("There was an error");
          return;
        }

        //grab risk value
        var splitted = stdout.match(/\S+/g);

        var liftD = splitted[splitted.length - 4];
        var liftF = splitted[splitted.length - 3];
        var pushD = splitted[splitted.length - 2];
        var pushF = splitted[splitted.length - 1];

        //getting timestamp for value
        var time = `${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`

        //add it to risk folder
        fs.appendFileSync(path.join(folder,`${dateString}-risk.txt`), `${time} ${liftD} ${pushD} ${liftF} ${pushF}\n`);

        //reset algorithm csv after running
        fileHandler(user._id, 3)

        var data = {
          time: time,
          durLift: liftD,
          durPush: pushD,
          freqLift: liftF,
          freqPush: pushF
        };

        updateRisk(user, liftD, pushD, liftF, pushF);

        //send value back to user
        res.send(data);
      });
      
    }
  });
};

/**
 * Function for grabbing old user data
 * Need (in req.headers) a:
 * _id (string)
 * token (string)
 * @param req http request (from client)
 * @param res http response (from server)
 */
exports.userHistory = function(req, res) {
  User.findById(req.headers._id,
  function(err,user) {
    if (err) throw err;

    if (user === null || user === undefined) {
      res.send("Bad id");
    } else {
      //Check token
      if (req.headers.token !== user.token) {
        res.send("Incorrect token");
        return;
      }

      var date = req.headers.date;
      var folder = path.join(process.cwd(), 'users', `${user._id}`);
      var file = path.join(folder,`${date}-risk.txt`);
      if(fs.existsSync(file)) {
        //send back data in array
        var splittedArr = fs.readFileSync(file).toString().match(/\S+/g);
        var timeArr = [];
        var liftDArr = [];
        var pushDArr = [];
        var liftFArr = [];
        var pushFArr = [];
        
        //if file is empty, returns null
        if (splittedArr !== null && splittedArr !== undefined) {
          for (var i = 0; i < splittedArr.length; i += 5) {
            timeArr.push(splittedArr[i]);
            liftDArr.push(splittedArr[i+1]);
            pushDArr.push(splittedArr[i+2]);
            liftFArr.push(splittedArr[i+3]);
            pushFArr.push(splittedArr[i+4]);
          }
        }

        var data = {
          times: timeArr,
          durLift: liftDArr,
          durPush: pushDArr,
          freqLift: liftFArr,
          freqPush: pushFArr
        };

        res.send(data);
      } else {
        //TODO: return all risk data as far back as...?
        res.send('No file found with that date');
      }
    }
  });
};

/**
 * Function for a user joining a supervisor
 * Need (in req.body) a:
 * _id (string)
 * token (string)
 * supervisor (string)
 * @param req http request (from client)
 * @param res http response (from server)
 */
exports.joinSupervisor = function(req, res) {
  User.findById(req.body._id,
  function(err,user) {
    if (err) throw err;

    if (user === null || user === undefined) {
      res.send("Bad id");
    } else {
      //Check token
      if (req.body.token !== user.token) {
        res.send("Incorrect token");
        return;
      }
      User.findOne({username: req.body.supervisor, isSupervisor: true},
      function(err, supervisor) {
        if (supervisor === null) {
          res.send("No Supervisor by this name found")
        } else {
          supervisor.Users.push(user.username)
          supervisor.save(function(err, user) {
            if(err) {
                res.send(err);
            } else {
              var data = {
                status: 200
              };
              res.send(data);
            }
          });
        }
      });
    }
  });
};

/**
 * Function for a user leaving a supervisor
 * Need (in req.body) a:
 * _id (string)
 * token (string)
 * supervisor (string)
 * @param req http request (from client)
 * @param res http response (from server)
 */
exports.leaveSupervisor = function(req, res) {
  User.findOne({_id: req.body._id, token: req.body.token},
  function(err, user) {
    if (user === null || user === undefined) {
      res.send("Bad id")
    } else {
      //find the supervisor they want to leave
      User.findOne({username: req.body.supervisor, isSupervisor: true},
      function(err, supervisor) {
        if (user === null) {
          res.send("No Supervisor by this name found")
        } else {
          var index = supervisor.Users.indexOf(user._id);
          if (index < 0) { //if not in supervisor list, then we don't throw error, we just say ok
              var data = {
              status: 200
            };
            res.send(data);
            return;
          }
          supervisor.Users.splice(index, 1);
          supervisor.save(function(err, user) {
            if(err) {
                res.send(err);
            } else {
              var data = {
                status: 200
              };
              res.send(data);
            }
          });
        }
      });
    }
  });
};

/**
 * Function for listing supervisors
 * No necessary req parameters. This route 
 * is visible without any credentials
 * @param req http request (from client)
 * @param res http response (from server)
 */
exports.getSupervisors = function(req, res) {
  User.find({ isSupervisor: true},
  function(err, supervisors) {
    if (err) throw err;

    if (supervisors == null || user === undefined) {
      res.send("No supervisors found");
    } else {
      var supArr = [];

      supervisors.forEach(function(supervisor) {
        supArr.push(supervisor.username);
      });

      var data = {
        supervisors: supArr
      };

      res.send(data);
    }
  });
};

/**
 * Get the users profile of name, age, height, and weight
 * @param {*} req a get request, so params are in headers
 * @param {*} res 
 */
exports.getProfile = function(req, res) {
  User.findOne({_id: req.headers._id, token: req.headers.token },
  function(err, user) {
    if (user === null || user === undefined) {
      res.send("Bad id or token");
    } else { //supervisor searching for their user average risk
      var data = {
        name: user.name,
        height: user.height,
        weight: user.weight,
        age: user.age,
        risk: user.averageRisk
      };

      res.send(data);
    }
  });
};

/**
 * updates user profile. req will have what ever is in
 * the boxes on app, so these will never be empty 
 * (unless they do not edit on first viewing, even then
 * they will be sent as a default number/string)
 * @param {*} req 
 * @param {*} res 
 */
exports.updateProfile = function(req, res) {
  User.findOne({_id: req.body._id, token: req.body.token },
  function(err, user) {
    if (user === null || user === undefined) {
      res.send("No Supervisor by this name found")
    } else { //supervisor searching for their user average risk
      user.set({
        name: req.body.name,
        height: req.body.height,
        weight: req.body.weight,
        age: req.body.age
      });
      user.save(function (err, updatedUser) {
        if (err) return handleError(err);
        res.send({status: 200});
      });
    }
  });
};


/**
 * Function for a supervisor viewing their users
 * Need (in req.headers) a:
 * _id (string)
 * token (string)
 * @param req http request (from client)
 * @param res http response (from server)
 */
exports.getSupervisorUsers = function(req, res) {
  /* switched to a promise so the users functions 
   * can be called from multiple functions AND run 
   * synchronously (in other words, will not send empty 
   * array before completion)
   */
  getUsers(req.headers._id, req.headers.token).then(function(array) {
    var data = {
      users: array
    };
  
    res.send(data);
  });
};

/**
 * Function for a supervisor removing a user from their list
 * Need (in req.body) a:
 * _id (string)
 * token (string)
 * user (string)
 * @param req http request (from client)
 * @param res http response (from server)
 */
exports.removeUserFromList = function(req,res) {
  User.findOne({_id: req.body._id, token: req.body.token, isSupervisor: true},
  function(err, supervisor) {
    if (supervisor === null || supervisor === undefined) {
      res.send("No Supervisor by this name found")
    } else {
      User.findOne({username: req.body.user},
      function(err, user) {
        if (user === null) {
          res.send("No User by this name found in your supervisor list")
        } else {
          var index = supervisor.Users.indexOf(user._id);
          supervisor.Users.splice(index, 1);
          supervisor.save(function(err, user) {
            if(err) {
                res.send(err);
            } else {
              var data = {
                status: 200
              };
              res.send(data);
            }
          });
        }
      });
    }
  });
};

/**
 * Return the average risk of the user
 * Used for supervisors since users can just call get profile
 * @param {*} req use headers._id and token
 * @param {*} res 
 */
exports.averageRisk = function(req, res) {
  User.findOne({_id: req.headers._id, token: req.headers.token, isSupervisor: true },
    function(err, supervisor) {
      if (supervisor === null || supervisor === undefined) {
        res.send("No Supervisor by this name found")
      } else {
        User.findOne({username: req.headers.user},
        function(err, user) {
          if (user === null) {
            res.send("No User by this name found in your supervisor list")
          } else {
            res.send(user.averageRisk);
          }
        });
      }
    });
};

/**
 * Testing file uploads. Put id/token in headers
 * req.body is the file
 * @param {*} req 
 * @param {*} res 
 */
exports.upload = function(req, res) {
  console.log(req.body);
  res.send('received')
};