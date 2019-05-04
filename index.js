'use strict';

// 1. Include Packages
const 
  express = require('express'),
  bodyParser = require('body-parser'),
  cors = require('cors'),
  path = require('path'); 

// it automa/tically loads the environment variables defined in .env
require('dotenv').config();
const TUNNEL = process.env.TUNNEL || false ;
const sessionIds = new Map();

// 3. Initialize the application
const app = express();

// 4. Initialize the middleware application
// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// Firstly you need to add some middleware to parse the post data of the body.
app.use(bodyParser.json());       // to support JSON-encoded bodies
//app.use(bodyParser.json({
//    type: "*/*"
//}));
app.use(bodyParser.json({type: 'application/vnd.api+json'}));
//app.use(bodyParser.urlencoded()); // to support URL-encoded bodies - depricited 
app.use(bodyParser.urlencoded({ extended: true })); // to support URL-encoded bodies

/*
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json({
    type:'application/vnd.onem2m-ntfy+json'
}));
*/

//CORS middleware
app.use(cors({
    "origin": process.env.CORS_ALLOW_ORIGIN || '*', // this work well to configure origin url in the server
    "methods": ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'], // to works well with web app, OPTIONS is required
    "preflightContinue": false,
    "optionsSuccessStatus": 204,
    "allowedHeaders": ['Content-Type', 'Authorization'] // allow json and token in the headers
}));

// Error Handling middleware
app.use(function(err, req, res, next) {
    console.dir(err);
    if(err) {
        // Your Error Status code and message here.
        res.status(500).send('Something broke!');
    }
    // Send Some valid Response
});

// 7. Routes
// viewed at http://localhost:3333/ Added for AWS Load Balancer Health Check
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, './public', 'index.html'));
});

// Create a Funds Routes (accessed at POST http://127.0.0.1:3333/v1/funds)
require('./routes/bots')(app, sessionIds);
//OR
//var routes = require('./bots');
//routes(app, sessionIds);

// Start the server with secure tunnel for LOCAL only
const startNgrok = async function(a, b) {
    if (TUNNEL) {
        const ngrok = require('ngrok');
        const url = await ngrok.connect({
            proto: 'http', // http|tcp|tls, defaults to http
            addr: process.env.PORT, // port or network address, defaultst to 80
            //auth: 'user:pwd', // http basic authentication for tunnel
            //subdomain: 'alex', // reserved tunnel name https://alex.ngrok.io
            //authtoken: '12345', // your authtoken from ngrok.com
            //region: 'us', // one of ngrok regions (us, eu, au, ap), defaults to us
            //configPath: '~/git/project/ngrok.yml' // custom path for ngrok config file
            //binPath: default => default.replace('/bin', '.unpacked/bin'); // custom binary path, eg for prod in electron
        });
        console.log(`Tunnel Created -> ${url}`);
        console.log(`Tunnel Inspector ->  http://127.0.0.1:${process.env.PORT}`);
        console.log(`Web Interface ->  http://127.0.0.1:4040`);
    }
}

// 8. Start the server with secure tunnel
//https://medium.com/@amarjotsingh90/create-secure-tunnel-to-node-js-application-with-ngork-e4806b21bef0
//https://blog.stvmlbrn.com/2018/02/07/allow-public-access-to-localhost-with-ngrok.html
const server = app.listen(process.env.PORT, () => {
  if (TUNNEL) { // open a tunnel
    startNgrok();
  } else { // start normally
    console.log(`Server is listinging on ${process.env.PORT}`)
  }
});

//SIGTERM is the signals that tells a process to gracefully terminate. It is the signal that’s sent from process managers like upstart or supervisord and many others.
process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    console.log('Closing http server.');
    server.close(() => {
        console.log('Http server closed.');
        knex.destroy(err => {
            console.log('knex connection closed.');
            process.exit(err ? 1 : 0)
        })
    });
});