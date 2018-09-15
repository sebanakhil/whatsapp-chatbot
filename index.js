
var express = require("express");
var app = express();
var request = require('request');

var whatsAppBasicOauth = function (req, res, next) {

    async.auto({
        whatsAppLoginAPI: function(callback) {

            var username = "xxxxx",
                password = "xxxxx";
            var options = {
                method: 'POST',
                url: 'https://xxx.xx.xxx.xx:xxxxx/v1/users/login',
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
}

app.get("/", whatsAppBasicOauth, function (req, res) {
    res.send("This page is authenticated!")
});

app.listen(3030);
console.log("app running on localhost:3030");
