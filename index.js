
var express = require("express");
var app = express();
var request = require('request');

var whatsAppBasicOauth = function (req, res, next) {

    var username = "admin",
        password = "XXXXXXXXX";
    var options = {
        method: 'POST',
        url: 'https://XXX.XXX.XXX.XXX:XXXXXX/v1/users/login',
        headers:{       
            authorization: "Basic " + new Buffer(username + ":" + password).toString("base64"),
            'content-type': 'application/json' 
        },
        rejectUnauthorized: false //Error: Error: self signed certificate in certificate chain for disable error
    };

    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        console.log(body);
        if (!error && response.statusCode == 200) {
            console.log("Successfully!");
        } else {
            console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
        }
    });
    return next();
}

app.get("/", whatsAppBasicOauth, function (req, res) {
    res.send("This page is authenticated!")
});

app.listen(3030);
console.log("app running on localhost:3030");
