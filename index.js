// 'use strict';

// 1. Include Packages
const 
  express = require('express'),
  request = require('request'),
  bodyParser = require('body-parser'),
  async = require("async"),
  apiai = require("apiai"),
  uuid = require('uuid'),
  phone = require('phone'),
  _ = require('lodash'),
  ngrok = require('ngrok');

// 2. Include Configuration
var config = require('./config');

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

// 3. Initialize the application
var app = express();

// 4. Initialize the middleware application
// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
// Firstly you need to add some middleware to parse the post data of the body.
app.use(bodyParser.json());       // to support JSON-encoded bodies
//app.use(bodyParser.urlencoded()); // to support URL-encoded bodies - depricited 
app.use(bodyParser.urlencoded({ extended: true })); // to support URL-encoded bodies

// 5. Initialize the Dialogflow Config
const apiAiService = apiai(config.APIAI_CLIENT_ACCESS_TOKEN, {
    language: "en",
    requestSource: "wa"
});
const sessionIds = new Map();

// 6. WhatsApp Welcome Message Middleware
var whatsAppWelcomeMessage = function (req, res, next) {
  
    if(_.isUndefined(req.params.mobile)){
      return res.json({'error':'mobile umber is required'});
    }
    var pattern = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[789]\d{9}$/;
    if (!pattern.test(req.params.mobile)) {
      return res.json({'error':'Mobile must be 10 digits with no comma, no spaces, no punctuation and there will be no + sign!'});
    }
    var phoneValueFormated = phone(req.params.mobile, 'IND');
    if(_.isUndefined(phoneValueFormated[0])){
      return res.json({'error':'mobile umber is formated properly'});
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
                var tokenJson = _.chain(JSON.parse(results.whatsAppLoginAPI).users)
                              .map(function(o) {
                                return o.token;
                              })
                              .head()
                              .value();

                if (!sessionIds.has('tokenJson')) {
                    sessionIds.set('tokenJson', tokenJson);
                }

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

                var waId = _.chain(results.checkContactByAPI.contacts)
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
                            default: "Name"
                          },
                          {
                            default: "XXXX"
                          },
                          {
                            default: "YYYY"
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
            //return next(error);
            return res.status(500).json(error);
        } else {
            //console.log("Successfully!");
            //console.log(results);
            //return next(null, results);
            return res.status(200).json(results);
        }
    });
}

// 7. Whatsapp Welcome Message Routes
app.get("/whatsapp-welcome-message/:mobile", whatsAppWelcomeMessage);

// 8. Whatsapp Webhook Routes
// Accepts POST requests at /webhook endpoint
app.post('/whatsapp-webhook', (req, res) => {

    if(!_.isUndefined(req.body.statuses)){
        return res.status(200).json(req.body);
    }
    // Parse the request body from the POST
    async.auto({
        getTextMessageByAPI: function(callback) {
            //callback message
            if(!_.isUndefined(req.body.messages[0].text)){
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
            } else { //req.body.messages[0].image or else except text
                var obj = {
                  "result": {
                    "fulfillment": {
                      "speech": "I didn't get that. Only handle text message?",
                      "messages": [
                        {
                          "type": 0,
                          "speech": "Sorry, Only handle text message."
                        }
                      ]
                    }
                  }
                };
                callback(null, obj);
            }
        },
        sendWhatAppMessageByAPI: ['getTextMessageByAPI', function (results, callback) {

                console.log(results.getTextMessageByAPI.result);

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
                            "default": "Name"
                          },
                          {
                            "default": "XXXX"
                          },
                          {
                            "default": "YYYY"
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
                        callback(new Error(error));
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
            return res.status(500).json(error);
        } else {
            //console.log("Successfully!");
            console.log(results);
            //return next(null, results);
            return res.status(200).json(results);
        }
    });
});

// 9. Dialogflow Webhook Routes
// Accepts GET requests at the /webhook endpoint
app.post('/dialogflow-webhook', (req, res) => {
    console.log('dialogflow webhook is listening');
    let body = req.body

    // Retrieving parameters from the request made by the agent
    let action = body.result.action
    let parameters = body.result.parameters
    let city = body.result.parameters['geo-city']; // city is a required param
    // Performing the action
    if (action.length === 0 || (action.length > 0 && action !== 'yahooWeatherForecast')) {
        // Sending back the results to the agent
        return res.status(200).json({
            speech: `undefined action ${action}`,
            displayText: `undefined action ${action}`,
            source: 'weather-detail'
        });
    }

    if (city.length === 0) {
        // Sending back the results to the agent
        return res.status(200).json({
            speech: `Please select a proper city`,
            displayText: `Please select a proper city`,
            source: 'weather-detail'
        });
    }

    var queryString = 'select * from weather.forecast where woeid in (select woeid from geo.places(1) where text=\'geo-city\')';
    var query = _.replace(queryString, /geo-city/g, city);

    var options = {
        method: 'POST',
        url: 'https://query.yahooapis.com/v1/public/yql',
        form: {
            q: query,
            format: 'json'
        }
    };
    request(options, function (error, response, body) {
        if (error) {
            throw new Error(error);
        } else {
            var data = JSON.parse(body);
            if (!error && response.statusCode == 200 || response.statusCode == 201) {
                var location = data.query.results.channel.location;
                var condition = data.query.results.channel.item.condition;
                var temperature = data.query.results.channel.units.temperature;
                return res.status(200).json({
                    speech: 'The current weather in ' + location.city + ',' + location.region + ' is ' + condition.temp + '°' + temperature,
                    displayText: 'The current weather in ' + location.city + ',' + location.region + ' is ' + condition.temp + '°' + temperature,
                    source: 'weather-detail',
                    query: query,
                });
            } else {
                console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
                return res.status(200).json({
                    speech: 'Failed calling Send API, ' + response.statusCode + ', ' + response.statusMessage,
                    displayText: 'Failed calling Send API, ' + response.statusCode + ', ' + response.statusMessage,
                    source: 'weather-detail',
                    query: query,
                });
            }
        }
    });
});

// 10. Start the server
const server = app.listen(process.env.PORT || 3031, () => {
    console.log('Express listening at ', server.address().port);
});

// 11. Start the server with secure tunnel
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
