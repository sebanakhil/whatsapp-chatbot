// 'use strict';

// Imports dependencies and set up http server
const 
  express = require('express'),
  request = require('request'),
  bodyParser = require('body-parser'),
  async = require("async"),
  apiai = require("apiai"),
  uuid = require('uuid'),
  app = express(),
  config = require('./config'),  
  phone = require('phone'),
  _ = require('lodash');

const ngrok = require('ngrok');

// Messenger API parameters
if (!config.WA_SERVER_URL) {
    throw new Error('missing WA_SERVER_URL');
}
if (!config.WA_USER_NAME) {
    throw new Error('missing WA_USER_NAME');
}
if (!config.WA_PASSWORD_NAME) {
    throw new Error('missing WA_PASSWORD_NAME');
}
if (!config.APIAI_CLIENT_ACCESS_TOKEN) {
    throw new Error('missing APIAI_CLIENT_ACCESS_TOKEN');
}

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// Firstly you need to add some middleware to parse the post data of the body.
app.use(bodyParser.json());       // to support JSON-encoded bodies
//app.use(bodyParser.urlencoded()); // to support URL-encoded bodies - depricited 
app.use(bodyParser.urlencoded({ extended: true })); // to support URL-encoded bodies

//Dialogflow Config
const apiAiService = apiai(config.APIAI_CLIENT_ACCESS_TOKEN, {
    language: "en",
    requestSource: "wa"
});
const sessionIds = new Map();

var whatsAppWelcomeMessage = function (req, res, next) {
  
    if(_.isUndefined(req.body.mobile)){
        res.json({'error':'mobile umber is required'});
    }

    var pattern = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[789]\d{9}$/;
    if (!pattern.test(req.body.mobile)) {
      return res.json({'error':'Mobile must be 10 digits with no comma, no spaces, no punctuation and there will be no + sign!'});
    }

    phoneValueFormated = phone(req.body.mobile, 'IND');
    if(_.isUndefined(phoneValueFormated[0])){
        res.json({'error':'mobile umber is formated properly'});
    }

    async.auto({
        whatsAppLoginAPI: function(callback) {

            var username = config.WA_USER_NAME,
                password = config.WA_PASSWORD_NAME;
            var options = {
                method: 'POST',
                url: config.WA_SERVER_URL + '/v1/users/login',
                headers:{       
                    authorization: "Basic " + new Buffer(username + ":" + password).toString("base64"),
                    'content-type': 'application/json' 
                },
                rejectUnauthorized: false //Error: Error: self signed certificate in certificate chain
            };

            request(options, function (error, response, body) {
                if (error) {
                    if (error) callback(new Error(error));
                } else {
                    if (!error && response.statusCode == 200) {
                        console.log("Successfully whatsAppLoginAPI!");
                        callback(null, body);
                    } else {
                        console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
                        callback(new Error("Failed calling Send API", response.statusCode, response.statusMessage, body.error));
                    }
                }
            });

        },
        checkContactByAPI: ['whatsAppLoginAPI', function (results, callback) {

                //console.log(typeof JSON.parse(results.whatsAppLoginAPI).users);
                tokenJson = _.chain(JSON.parse(results.whatsAppLoginAPI).users)
                              .map(function(o) {
                                return o.token;
                              })
                              .head()
                              .value();

                if (!sessionIds.has('tokenJson')) {
                    sessionIds.set('tokenJson', tokenJson);
                }

                var username = config.WA_USER_NAME,
                    password = config.WA_PASSWORD_NAME;
                var options = {
                    method: 'POST',
                    url: config.WA_SERVER_URL + '/v1/contacts',
                    headers:{       
                        authorization: "Bearer " + tokenJson,
                        'content-type': 'application/json' 
                    },
                    body: { blocking: 'wait', contacts: [ phoneValueFormated[0] ] },
                    json: true,
                    rejectUnauthorized: false //Error: Error: self signed certificate in certificate chain
                };
                request(options, function (error, response, body) {
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
        getEvenMessageByAPI: ['checkContactByAPI', function (results, callback) {

                let event = { type: "WELCOME" };
                let eventArg = {
                    "name": event.type
                    //"data": event.data
                }
                if (!sessionIds.has('senderID')) {
                    sessionIds.set('senderID', uuid.v1());
                }
                var request = apiAiService.eventRequest(eventArg, {sessionId: sessionIds.get('senderID')});
                request.on('response', function(response) {
                    //console.log(response);
                    callback(null, response);
                });
                request.on('error', function(error) {
                    //console.log(error);
                    callback(new Error(error));
                });
                request.end();
            }
        ],
        sendWhatAppMessageByAPI: ['getEvenMessageByAPI', function (results, callback) {
                //Dialog Message
                //console.log(results.getEvenMessageByAPI.result.fulfillment.messages[0].speech);
                const testMessage = results.getEvenMessageByAPI.result.fulfillment.messages[0].speech;

                waId = _.chain(results.checkContactByAPI.contacts)
                              .map(function(o) {
                                return o.wa_id;
                              })
                              .head()
                              .value();

                if (!sessionIds.has('waId')) {
                    sessionIds.set('waId', waId);
                }

                var messageType = 'non-hsm';
                var obj;
                if(messageType == 'hsm'){
                    obj = {
                      to: waId,
                      type: "hsm",
                      hsm: { 
                        namespace: "whatsapp:hsm:fintech:wishfin",
                        element_name: "wishfin_product_thanks_whatsapp_template", 
                        fallback: "en", 
                        fallback_lc: "US", 
                        localizable_params: [ 
                          {
                            default: "Himanshu"
                          },
                          {
                            default: "Personal Loan"
                          },
                          {
                            default: "Personal Loan"
                          } 
                        
                        ]
                      }
                    };
                } else {
                    obj = {
                      recipient_type: "individual", //"individual" OR "group"
                      to: waId, //"whatsapp_id" OR "whatsapp_group_id"
                      type: "text", //"audio" OR "document" OR "hsm" OR "image" OR "text"
                      text: {
                        body: testMessage
                      }
                    }
                }

                var options = {
                    method: 'POST',
                    url: config.WA_SERVER_URL + '/v1/messages',
                    headers:{
                        authorization: "Bearer " + sessionIds.get('tokenJson'),
                        'content-type': 'application/json'
                    },
                    body: obj,
                    json: true,
                    rejectUnauthorized: false //Error: Error: self signed certificate in certificate chain
                };
                request(options, function (error, response, body) {
                    //console.log(error, response, body);
                    if (error) {
                        if (error) callback(new Error(error));
                    } else {
                        if (!error && response.statusCode == 200 || response.statusCode == 201) {
                            console.log("Successfully sendWhatAppMessageByAPI!");
                            //console.log(body)
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
            //console.log("Successfully!");
            //console.log(results);
            return next(null, results);
        }
    });
}

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// assuming POST:   moblie=9716004560           <-- URL encoding
//
// or       POST: {"moblie":"9716004560"}       <-- JSON encoding
app.post("/whatsapp-welcome-message", whatsAppWelcomeMessage, function (req, res) {
    res.send("This page is authenticated!")
});

// Accepts POST requests at /webhook endpoint
app.post('/whatsapp-webhook', (req, res) => {  
  // Parse the request body from the POST
  if(req.body.statuses === undefined){
    console.log(sessionIds.get('tokenJson'));
    console.log(sessionIds.get('waId'));
    console.log(sessionIds.get('senderID'));
    console.log(req.body.messages[0].text.body);
    
    async.auto({
        getTextMessageByAPI: function(callback) {

            var request = apiAiService.textRequest(req.body.messages[0].text.body, {sessionId: sessionIds.get('senderID')});
            request.on('response', function(response) {
                //console.log(response);
                callback(null, response);
            });
            request.on('error', function(error) {
                //console.log(error);
                callback(new Error(error));
            });
            request.end();

        },
        sendWhatAppMessageByAPI: ['getTextMessageByAPI', function (results, callback) {
                //Dialog Message
                //console.log(results.getTextMessageByAPI.result.fulfillment.messages[0].speech);
                const testMessage = results.getTextMessageByAPI.result.fulfillment.messages[0].speech;             
                //callback(null, '2');
                //OR
                var messageType = 'non-hsm';
                var obj;
                if(messageType == 'hsm'){
                    //NEW HSM
                    obj = {
                      "to": sessionIds.get('waId'),
                      "type": "hsm",
                      "hsm": {
                        "namespace": "whatsapp:hsm:fintech:wishfin",
                        "element_name": "wishfin_product_thanks_whatsapp_template",
                        "fallback": "en",
                        "fallback_lc": "US",
                        "localizable_params": [
                          {
                            "default": "Mari"
                          },
                          {
                            "default": "Personal Loan"
                          },
                          {
                            "default": "Personal Loan"
                          }
                        ]
                      }
                    };
                } else {
                    obj = {
                      recipient_type: "individual", //"individual" OR "group"
                      to: sessionIds.get('waId'), //"whatsapp_id" OR "whatsapp_group_id"
                      type: "text", //"audio" OR "document" OR "hsm" OR "image" OR "text"
                      text: {
                        body: testMessage
                      }
                    };
                }
                var options = {
                    method: 'POST',
                    url: config.WA_SERVER_URL + '/v1/messages',
                    headers:{
                        authorization: "Bearer " + sessionIds.get('tokenJson'),
                        'content-type': 'application/json'
                    },
                    body: obj,
                    json: true,
                    rejectUnauthorized: false //Error: Error: self signed certificate in certificate chain
                };
                request(options, function (error, response, body) {
                    //console.log(error, response, body);
                    if (error) {
                        if (error) callback(new Error(error));
                    } else {
                        if (!error && response.statusCode == 200 || response.statusCode == 201) {
                            console.log("Successfully sendWhatAppMessageByAPI!");
                            //console.log(body)
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
            //return next(error);
        } else {
            //console.log("Successfully!");
            console.log(results);
            //return next(null, results);
        }
    });
    
  }
});

// Accepts GET requests at the /webhook endpoint
app.get('/dialogflow-webhook', (req, res) => {
  console.log('dialogflow webhook is not listening')
});

const server = app.listen(process.env.PORT || 3031, () => {
    console.log('Express listening at ', server.address().port);
});

//https://medium.com/@amarjotsingh90/create-secure-tunnel-to-node-js-application-with-ngork-e4806b21bef0
ngrok.connect({
    proto : 'http',
    addr : 3031,
}, (err, url) => {
    if (err) {
        console.error('Error while connecting Ngrok',err);
        return new Error('Ngrok Failed');
    } else {
        console.log('Tunnel Created -> ', url);
        console.log('Tunnel Inspector ->  http://127.0.0.1:3031');
    }
});