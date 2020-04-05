'use strict';

const request = require('request'),
    async = require("async"),
	_ = require('lodash');

const logger = require('../lib/logger');
const Joi = require('@hapi/joi');
const apiai = require("apiai");
const uuid = require('uuid');
const apiAiService = apiai(process.env.APIAI_CLIENT_ACCESS_TOKEN, {
    language: "en",
    requestSource: "wa"
});
const qs = require('querystring');

var whatsappWelcomeMessageValidation = async (req, res, next) => {
	// fetch the request data
	const query = req.params; //req.query
	// define the validation schema
	const schema = Joi.object().keys({
		mobile: Joi.string().regex(/^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/).required().label("mobile number is requireds"),
	});
    // validate the request data against the schema
    try {
        const value  = await schema.validateAsync({ mobile: req.params.mobile });
        next();
    } catch (err) {
        // send a 400 error response if validation fails
	    // res.status(400).json({status: "error", message: "Invalid request data", data: data});
        const JoiError = {
            status: 'failed',
            error: {
                original: err._object,
                // fetch only message and type from each error
                details: _.map(err.details, ({message, type}) => ({
                    message: message.replace(/['"]/g, ''),
                    type
                }))
            }
        };
        // Send back the JSON error response
        res.status(422).json(JoiError);
    }
};

module.exports = function (app, sessionIds) {
	app.get("/whatsapp-welcome-message/:mobile",
			whatsappWelcomeMessageValidation, //Middleware
			function (req, res, next) {
                async.auto({
                    whatsAppLoginAPI: function(callback) {
        
                        if (sessionIds.has('accessToken') && sessionIds.has('accessTokenExpiry')
                            && sessionIds.get('accessTokenExpiry') > Math.round(new Date().getTime() / 1000)) {
                            logger.errorLog.info('WhatsApp AccessToken already Saved!');
                            return callback(null, { "accessToken" : sessionIds.get('accessToken') });
                        }

                        let username = process.env.WA_USERNAME,
                            password = process.env.WA_PASSWORD;
                        let encodedData = "" ;
                        if (typeof Buffer.from === "function") {
                            // Node 5.10+
                            encodedData = Buffer.from(username + ":" + password).toString('base64')
                        } else {
                            // older Node versions, now deprecated
                            encodedData = new Buffer(username + ":" + password).toString("base64")
                        }

                        let url = 'https://' + process.env.WA_HOST + ':' + process.env.WA_PORT + '/v1/users/login';
                        var options = {
                            method: 'POST',
                            url: url,
                            headers:{       
                                authorization: "Basic " + encodedData,
                                'content-type': 'application/json' 
                            },
                            rejectUnauthorized: false //Error: Error: self signed certificate in certificate chain
                        };
                        request(options, function (error, response, body) {
                            if (error || response.statusCode !== 200) {
                                logger.errorLog.error('WhatsApp API Execute Failed');
                                logger.errorLog.error(`WhatsApp API URL: ${'https://' + process.env.WA_HOST + ':' + process.env.WA_PORT + '/v1/users/login'}`);
                                logger.errorLog.error(`WhatsApp API Error: ${error}`);
                                logger.errorLog.error(`WhatsApp API Response: ${JSON.stringify(response)}`);
                                logger.errorLog.error(`WhatsApp API Body: ${JSON.stringify(body)}`);
                                //logger.errorLog.error(JSON.stringify(response));
                                //callback(new Error("WhatsApp API Execute Failed", response.statusCode, response.statusMessage, body.error));
                                return callback(error || {statusCode: response.statusCode});
                            }
                            logger.errorLog.info(JSON.stringify(body));
                            var accessToken = _.chain(JSON.parse(body).users)
                                        .map(function(o) {
                                        return o.token;
                                        })
                                        .head()
                                        .value();
                            logger.errorLog.info(accessToken);
                            var accessTokenExpiry = _.chain(JSON.parse(body).users)
                                        .map(function(o) {
                                        return o.expires_after;
                                        })
                                        .head()
                                        .value();                                        
                            logger.errorLog.info(accessTokenExpiry);
                            //callback(null, JSON.parse(body));
                            logger.errorLog.info('WhatsApp API Execute Successfully!');
                            sessionIds.set('accessToken', accessToken);
                            var tokenExpireTimeStamp = Math.round(new Date(accessTokenExpiry).getTime() / 1000);
                            logger.errorLog.info(tokenExpireTimeStamp); //7 Days Persist   
                            sessionIds.set('accessTokenExpiry', tokenExpireTimeStamp);
                            logger.errorLog.info('WhatsApp API accessToken Save and tokenExpire time is 7 Days!');
                            callback(null, body);
                        });
                    },
                    checkContactByAPI: ['whatsAppLoginAPI', function (results, callback) {
                        var options = {
                            method: 'POST',
                            url: 'https://' + process.env.WA_HOST + ':' + process.env.WA_PORT + '/v1/contacts',
                            headers:{       
                                authorization: "Bearer " + sessionIds.get('accessToken'),
                                'content-type': 'application/json' 
                            },
                            body: { blocking: 'wait', contacts: [ '+91' + req.params.mobile ] },
                            json: true,
                            rejectUnauthorized: false //Error: Error: self signed certificate in certificate chain
                        };
                        request(options, function (error, response, body) {
                            if (error || response.statusCode !== 200) {
                                logger.errorLog.error('WhatsApp Check Contact API Execute Failed');
                                logger.errorLog.error(`WhatsApp Check Contact API URL: ${'https://' + process.env.WA_HOST + ':' + process.env.WA_PORT + '/v1/contacts'}`);
                                logger.errorLog.error(`WhatsApp Check Contact API Error: ${error}`);
                                logger.errorLog.error(`WhatsApp Check Contact API Response: ${JSON.stringify(response)}`);
                                logger.errorLog.error(`WhatsApp Check Contact API Body: ${JSON.stringify(body)}`);
                                return callback(error || {statusCode: response.statusCode});
                            }
                            //callback(null, JSON.parse(body));
                            logger.errorLog.info('WhatsApp Check Contact API Execute Successfully!');
                            callback(null, body);
                        });
                    }],
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
                            logger.errorLog.info('Google Dialogflow API Execute Successfully!');
                            callback(null, response);
                        });
                        request.on('error', function(error) {
                            //console.log(error);
                            logger.errorLog.error('Google Dialogflow API Execute Failed');
                            callback(new Error(error));
                        });
                        request.end();
                    }],
                    sendWhatAppMessageByAPI: ['getEvenMessageByAPI', function (results, callback) {
                        //Dialog Message
                        logger.errorLog.info(results.getEvenMessageByAPI.result.fulfillment.messages[0].speech);
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
        
                        var messageType = 'no-hsm';
                        var obj;
                        if(messageType == 'hsm'){
                            if(process.env.WA_VERSION == 'v2.18.16'){ //Old Version which is lower 2.21.4
                                //OLD HSM
                                obj = {
                                    "to": waId,
                                    "type": "hsm",
                                    "hsm": {
                                        "namespace": process.env.WA_HSM_NAMESPACE,
                                        "element_name": process.env.WA_HSM_ELEMENT_NAME,
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
                            } else { //2.21.4 - New HSM
                                //NEW HSM
                                obj = {
                                    "to": waId,
                                    "type": "hsm",
                                    "hsm": {
                                        "namespace": process.env.WA_HSM_NAMESPACE,
                                        "element_name": process.env.WA_HSM_ELEMENT_NAME,
                                        "language": {
                                            "policy": "deterministic",
                                            "code": "en",
                                        },
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
                            }
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
                            url: 'https://' + process.env.WA_HOST + ':' + process.env.WA_PORT + '/v1/messages',
                            headers:{
                                authorization: "Bearer " + sessionIds.get('accessToken'),
                                'content-type': 'application/json'
                            },
                            body: obj,
                            json: true,
                            rejectUnauthorized: false //Error: Error: self signed certificate in certificate chain
                        };
                        request(options, function (error, response, body) {
                            if (error || response.statusCode !== 201) {
                                logger.errorLog.error('WhatsApp Message API Execute Failed');
                                logger.errorLog.error(`WhatsApp Message API URL: ${'https://' + process.env.WA_HOST + ':' + process.env.WA_PORT + '/v1/messages'}`);
                                logger.errorLog.error(`WhatsApp Message API Error: ${error}`);
                                logger.errorLog.error(`WhatsApp Message API Response: ${JSON.stringify(response)}`);
                                logger.errorLog.error(`WhatsApp Message API Body: ${JSON.stringify(body)}`);
                                //logger.errorLog.error(JSON.stringify(response));
                                //callback(new Error("WhatsApp API Execute Failed", response.statusCode, response.statusMessage, body.error));
                                return callback(error || {statusCode: response.statusCode});
                            }
                            logger.errorLog.info(JSON.stringify(body));
                            logger.errorLog.info('Successfully sendWhatAppMessageByAPI!');
                            callback(null, body);
                        });
                    }],
                }, function(error, results) {
                    if (error) {
                        logger.errorLog.error("Error!");
                        return res.status(500).json(error);
                    } else {
                        logger.errorLog.info("Successfully!");
                        return res.status(200).json(results);
                    }
                }
            );
        }
    );
    
    // Whatsapp Webhook Routes
    // Accepts POST requests at /webhook endpoint
    app.post('/whatsapp-webhook', (req, res) => {

        if(!_.isUndefined(req.body.statuses)){
            return res.status(200).json(req.body);
        }
        // Parse the request body from the POST
        async.auto({
            getTextMessageByAPI: function(callback) {
                //callback message
                if(_.isUndefined(req.body.messages[0].text)){ //req.body.messages[0].image or else except text
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
                    return callback(null, obj);
                }
                var request = apiAiService.textRequest(req.body.messages[0].text.body, {sessionId: sessionIds.get('senderID')});
                    request.on('response', function(response) {
                        //console.log(response);
                        logger.errorLog.info('Google Dialogflow API Execute Successfully!');
                        callback(null, response);
                    });
                    request.on('error', function(error) {
                        //console.log(error);
                        logger.errorLog.error('Google Dialogflow API Execute Failed');
                        callback(new Error(error));
                    });
                    request.end();
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
                        url: 'https://' + process.env.WA_HOST + ':' + process.env.WA_PORT + '/v1/messages',
                        headers:{
                            authorization: "Bearer " + sessionIds.get('accessToken'),
                            'content-type': 'application/json'
                        },
                        body: obj,
                        json: true,
                        rejectUnauthorized: false //Error: Error: self signed certificate in certificate chain
                    };
                    request(options, function (error, response, body) {
                        if (error || response.statusCode !== 201) {
                            logger.errorLog.error('WhatsApp Message API Execute Failed');
                            logger.errorLog.error(`WhatsApp Message API URL: ${'https://' + process.env.WA_HOST + ':' + process.env.WA_PORT + '/v1/messages'}`);
                            logger.errorLog.error(`WhatsApp Message API Error: ${error}`);
                            logger.errorLog.error(`WhatsApp Message API Response: ${JSON.stringify(response)}`);
                            logger.errorLog.error(`WhatsApp Message API Body: ${JSON.stringify(body)}`);
                            //logger.errorLog.error(JSON.stringify(response));
                            //callback(new Error("WhatsApp API Execute Failed", response.statusCode, response.statusMessage, body.error));
                            return callback(error || {statusCode: response.statusCode});
                        }
                        logger.errorLog.info(JSON.stringify(body));
                        logger.errorLog.info('Successfully sendWhatAppMessageByAPI!');
                        callback(null, body);
                    });
                }
            ],
        }, function(error, results) {
            if (error) {
                logger.errorLog.error("Error!");
                return res.status(500).json(error);
            } else {
                logger.errorLog.info("Successfully!");
                return res.status(200).json(results);
            }
        });
    });

    // Dialogflow Webhook Routes
    // Accepts GET requests at the /webhook endpoint
    app.post('/dialogflow-webhook', (req, res) => {
        logger.errorLog.info('dialogflow webhook is listening');
        let body = req.body
        logger.errorLog.info(JSON.stringify(body));

        // Retrieving parameters from the request made by the agent
        let action = body.result.action
        let parameters = body.result.parameters
        //let city = body.result.parameters['geo-city']; // city is a required param
        //geo-city not support complete city in india and other country too, so create custom parameter CityList and "Errors in 'CityList' entity: The number of synonyms is greater then 200." resolving too.
        let city = body.result.parameters['geo-city'];
        logger.errorLog.info(`City List: ${city}`);

        // "yahooWeatherForecast" surly change according Google dialogflow due to change the Whether API "Open Weather Maps API"
        // Performing the action
        if (_.isUndefined(action) || (!_.isUndefined(action) > 0 && action !== 'yahooWeatherForecast')) {
            // Sending back the results to the agent
            return res.status(200).json({
                speech: `undefined action ${action}`,
                displayText: `undefined action ${action}`,
                source: 'weather-detail'
            });
        }

        if (_.isEmpty(city)) { //city.length === 0
            // Sending back the results to the agent
            return res.status(200).json({
                speech: `Please select a proper city`,
                displayText: `Please select a proper city`,
                source: 'weather-detail'
            });
        }

        const url = process.env.WEATHER_MAP_API + '?' + qs.stringify({ q: city, units: 'metric', APPID: process.env.WEATHER_MAP_APP_ID });
        var options = {
            method: 'GET',
            url: url,
            headers:{},
            rejectUnauthorized: false //Error: Error: self signed certificate in certificate chain
        };
        request(options, function (error, response, body) {
            if (error || response.statusCode !== 200) {
                logger.errorLog.error('Open Weather Maps API Execute Failed');
                logger.errorLog.error(`Open Weather Maps API URL: ${url}`);
                logger.errorLog.error(`Open Weather Maps API Error: ${error}`);
                logger.errorLog.error(`Open Weather Maps API Response: ${JSON.stringify(response)}`);
                logger.errorLog.error(`Open Weather Maps API Body: ${JSON.stringify(body)}`);
                return res.status(200).json({
                    speech: `Failed calling Send API, ${response.statusCode}, ${response.statusMessage}`,
                    displayText: `Failed calling Send API, ${response.statusCode}, ${response.statusMessage}`,
                    source: 'weather-detail',
                    url: url
                });
            }
            logger.errorLog.info(JSON.stringify(body));
            logger.errorLog.info('Open Weather Maps API work successfully!');

            const celcius = JSON.parse(body).main.temp;
            return res.status(200).json({
                speech: `The current weather in ${JSON.parse(body).name} is ${celcius} in celcius` ,
                displayText: `The current weather in ${JSON.parse(body).name} is ${celcius} in celcius` ,
                source: 'weather-detail',
                url: url
            });
        });
    });
};