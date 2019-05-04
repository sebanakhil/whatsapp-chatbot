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

var whatsappWelcomeMessageValidation = async (req, res, next) => {
	// fetch the request data
	const query = req.params; //req.query
	// define the validation schema
	const schema = Joi.object().keys({
		mobile: Joi.string().regex(/^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/).required().label("mobile number is requireds"),
	});
	// validate the request data against the schema
	await Joi.validate(query, schema, (err, value) => {
			if (err) {
				// send a 400 error response if validation fails
				// res.status(400).json({status: "error", message: "Invalid request data", data: data});

				// Joi Error
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
			} else {
				next();
			}
	});
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

                        var options = {
                            method: 'POST',
                            url: 'https://' + process.env.WA_HOST + ':' + process.env.WA_PORT + '/v1/users/login',
                            headers:{       
                                authorization: "Basic " + Buffer.from(process.env.WA_USER + ":" + process.env.WA_PASSWORD).toString("base64"),
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
        
                        var messageType = 'hsm';
                        var obj;
                        if(messageType == 'hsm'){
                            /*
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
                            */
                            
                            //For WhatsApp Version v2.21.6
                            obj = {
                                to: waId,
                                type: "hsm",
                                hsm: {
                                    namespace: "whatsapp:hsm:fintech:wishfin",
                                    element_name: "wishfin_product_thanks_whatsapp_template",
                                    language: {
                                        policy: "fallback",
                                        code: "en"
                                    },           
                                    localizable_params: [
                                        {
                                            default: "Prashant"
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
        let city = body.result.parameters['CityList'];
        logger.errorLog.info(`City List: ${city}`);

        // Performing the action
        if (_.isUndefined(action) || (!_.isUndefined(action) > 0 && action !== 'yahooWeatherForecast')) {
            // Sending back the results to the agent
            return res.status(200).json({
                speech: `undefined action ${action}`,
                displayText: `undefined action ${action}`,
                source: 'weather-detail'
            });
        }

        if (_.isUndefined(city)) { //city.length === 0
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
            if (error || response.statusCode !== 201 || response.statusCode !== 201) {
                logger.errorLog.error('Weather API Execute Failed');
                logger.errorLog.error(`Weather API URL: ${'https://query.yahooapis.com/v1/public/yql'}`);
                logger.errorLog.error(`Weather API Error: ${error}`);
                logger.errorLog.error(`Weather API Response: ${JSON.stringify(response)}`);
                logger.errorLog.error(`Weather API Body: ${JSON.stringify(body)}`);
                return res.status(200).json({
                    speech: `Failed calling Send API, ${response.statusCode}, ${response.statusMessage}`,
                    displayText: `Failed calling Send API, ${response.statusCode}, ${response.statusMessage}`,
                    source: 'weather-detail',
                    query: query,
                });
            }
            logger.errorLog.info(JSON.stringify(body));
            logger.errorLog.info('Successfully sendWhatAppMessageByAPI!');
            var data = JSON.parse(body);
            var location = data.query.results.channel.location;
            var condition = data.query.results.channel.item.condition;
            var temperature = data.query.results.channel.units.temperature;
            return res.status(200).json({
                speech: 'The current weather in ' + location.city + ',' + location.region + ' is ' + condition.temp + '°' + temperature,
                displayText: 'The current weather in ' + location.city + ',' + location.region + ' is ' + condition.temp + '°' + temperature,
                source: 'weather-detail',
                query: query,
            });
        });
    });

};