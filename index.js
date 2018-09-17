// 'use strict';

// Imports dependencies and set up http server
const 
  request = require('request'),
  express = require('express'),
  bodyParser = require('body-parser'),
  app = express(),
  async = require("async");

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// Firstly you need to add some middleware to parse the post data of the body.
app.use(bodyParser.json());       // to support JSON-encoded bodies
//app.use(bodyParser.urlencoded()); // to support URL-encoded bodies - depricited 
app.use(bodyParser.urlencoded({ extended: true })); // to support URL-encoded bodies
var whatsAppWelcomeMessage = function (req, res, next) {
  
    async.auto({
        whatsAppLoginAPI: function(callback) {
            
            
            var username = "admin",
                password = "Welcome!1";
            var options = {
                method: 'POST',
                url: 'https://172.16.245.87:11002/v1/users/login',
                headers:{       
                    authorization: "Basic " + new Buffer(username + ":" + password).toString("base64"),
                    'content-type': 'application/json' 
                },
                rejectUnauthorized: false //Error: Error: self signed certificate in certificate chain
            };

            request(options, function (error, response, body) {
                //console.log(error, response, body);
                if (error) {
                    //throw new Error(error);
                    //if (error) callback(error);
                    if (error) callback(new Error(error));
                } else {
                    if (!error && response.statusCode == 200) {
                        console.log("Successfully!");
                        callback(null, JSON.parse(body));
                    } else {
                        console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
                        callback(new Error("Failed calling Send API", response.statusCode, response.statusMessage, body.error));
                    }
                }
            });
            
        },
        checkContactByAPI: ['whatsAppLoginAPI', function (results, callback) {
                var stringData = JSON.stringify(results)
                var jsonData = JSON.parse(stringData);
                console.log(jsonData.whatsAppLoginAPI.users[0].token);
                console.log("Mobile: "+req.body.mobile);
                callback(null, '2');
                //OR
                /*
                var username = "admin",
                password = "Welcome!1";
                var options = {
                    method: 'POST',
                    url: 'https://172.16.245.87:11002/v1/contacts',
                    headers:{       
                        authorization: "Bearer " + jsonData.whatsAppLoginAPI.users[0].token,
                        'content-type': 'application/json' 
                    },
                    body: { blocking: 'wait', contacts: [ '+919716004560' ] },
                    json: true,
                    rejectUnauthorized: false //Error: Error: self signed certificate in certificate chain
                };
                request(options, function (error, response, body) {
                    //console.log(error, response, body);
                    if (error) {
                        if (error) callback(new Error(error));
                    } else {
                        if (!error && response.statusCode == 200) {
                            console.log("Successfully checkContactByAPI!");
                            callback(null, body);
                        } else {
                            console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
                            callback(new Error("Failed calling Send API", response.statusCode, response.statusMessage, body.error));
                        }
                    }
                });
                */
            }
        ],
    }, function(error, results) {
        if (error) {
            console.log("Error!");
            console.log(error);
            return next(error);
        } else {
            console.log("Successfully!");
            console.log(results);
            return next(null, results);
        }
    });
    
    
    /*
    async.auto({
        whatsAppLoginAPI: function(callback) {

            var username = "admin",
                password = "Welcome!1";
            var options = {
                method: 'POST',
                url: 'https://172.16.245.87:11002/v1/users/login',
                headers:{       
                    authorization: "Basic " + new Buffer(username + ":" + password).toString("base64"),
                    'content-type': 'application/json' 
                },
                rejectUnauthorized: false //Error: Error: self signed certificate in certificate chain
            };

            request(options, function (error, response, body) {
                //console.log(error, response, body);
                if (error) {
                    //throw new Error(error);
                    //if (error) callback(error);
                    if (error) callback(new Error(error));
                } else {
                    if (!error && response.statusCode == 200) {
                        console.log("Successfully whatsAppLoginAPI!");
                        callback(null, JSON.parse(body));
                    } else {
                        console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
                        callback(new Error("Failed calling Send API", response.statusCode, response.statusMessage, body.error));
                    }
                }
            });

        },
        checkContactByAPI: ['whatsAppLoginAPI', function (results, callback) {
                var stringData = JSON.stringify(results)
                var jsonData = JSON.parse(stringData);
                console.log(jsonData.whatsAppLoginAPI.users[0].token);
                //callback(null, '2');
                //OR
                
                var username = "admin",
                password = "Welcome!1";
                var options = {
                    method: 'POST',
                    url: 'https://172.16.245.87:11002/v1/contacts',
                    headers:{       
                        authorization: "Bearer " + jsonData.whatsAppLoginAPI.users[0].token,
                        'content-type': 'application/json' 
                    },
                    body: { blocking: 'wait', contacts: [ '+919716004560' ] },
                    json: true,
                    rejectUnauthorized: false //Error: Error: self signed certificate in certificate chain
                };
                request(options, function (error, response, body) {
                    //console.log(error, response, body);
                    if (error) {
                        if (error) callback(new Error(error));
                    } else {
                        if (!error && response.statusCode == 200) {
                            console.log("Successfully checkContactByAPI!");
                            callback(null, body);
                        } else {
                            console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
                            callback(new Error("Failed calling Send API", response.statusCode, response.statusMessage, body.error));
                        }
                    }
                });
            }
        ],
    }, function(error, results) {
        if (error) {
            console.log("Error!");
            console.log(error);
            return next(error);
        } else {
            console.log("Successfully!");
            console.log(results);
            return next(null, results);
        }
    });
    */
    
  
}

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// assuming POST:   moblie=9716004560           <-- URL encoding
//
// or       POST: {"moblie":"9716004560"}       <-- JSON encoding
app. post("/whatsapp-welcome-message", whatsAppWelcomeMessage, function (req, res) {
    res.send("This page is authenticated!")
});

// Accepts POST requests at /webhook endpoint
app.post('/whatsapp-webhook', (req, res) => {  
  // Parse the request body from the POST
  let body = req.body;
});

// Accepts GET requests at the /webhook endpoint
app.get('/whatsapp-webhook', (req, res) => {
  console.log('whatsapp webhook is not listening')
});

// listen for requests :)
var listener = app.listen(process.env.PORT || 3030, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
