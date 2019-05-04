# WHATSAPP CHATBOT API SETUP

## WhatsApp and Dialogflow configuration in .env (Create file .env in root directory)
```
# .env used for config which is in .gitignore
# WHATAPP CHATBOT Notification Server
PORT=3334

# WhatsApp Business Detail for PL HDFC Instance
WA_HOST=10.0.20.99
WA_PORT=11002
WA_USER=admin
WA_PASSWORD=Welcome!1

# Dialogflow ACCESS TOEKN  
APIAI_CLIENT_ACCESS_TOKEN=7112d644ff7c42f6bde91c8955507bce
```

## Install node.js and npm (Optional)

If you don’t have node.js (and npm) installed already, do so by going to http://nodejs.org (npm is included by default with a standard node.js installation). Be sure to download the latest stable version.

Once you’ve installed node.js the easiest way to confirm that its working is by going to a terminal or command prompt and simply typing:
* $ node --version

Assuming its working, you should simply get an output of “0.10.24” or whatever version you actually have installed.

## Install node dependencies in Local

So, assuming that all of the above was successful, you’re now ready to boot up the api and take it for a spin! First you need to install all of the project’s dependencies (explained in more detail in the next section) and launch the server:

* $ npm install (install both "dependencies" & "devDependencies") for local server only
* $ npm install --prod will only install "dependencies" for Production or Stage server Only due to stage is the true copy of production

## Local Setup First Time

* .env.dist.local convert as .env
* $ npm install (install both "dependencies" & "devDependencies")
* $ [sudo] npm install pm2 -g (Only First Time)
* $ pm2 start process.json --env development

## Other Local Setup (Least Required)

* $ NODE_ENV=production pm2 start index.js --name "whatsappchatbot" --watch 
* NOTE: (PM2 restart if file change like here winston log create file here, so find the command which ignore the file- DON'T USE).
* OR
* pm2 start npm -- start (for ngrok)
* OR
* $ node index.js
* OR
* $ npm start (for ngrok)
* OR
* $ TUNNEL=true node index.js
* OR
* $ export TUNNEL=true
* $ node index.js
* $ set TUNNEL=true && nodemon index.js (In window OS)

## Production(Stage) Setup

* .env.dist.prod convert as .env
* $ npm install --prod (Install only "dependencies" in package.json)
* $ [sudo] npm install pm2 -g (Only first time)
* $ pm2 start process.json --env production

## PM2 Command for Production 

Now that we've told sudo where to find the npm command we can install PM2 and since it's a command line tool we need to install it globally using the -g option.
* $ [sudo] npm install pm2 -g

Verify that PM2 is installed.
* $ pm2 -v

Show all running apps and their status
* $ pm2 list

Show more details about an app
* $ pm2 show ftmicroapi

View logs for one of your apps
* $ pm2 logs ftmicroapi then ctrl+c to exit log view.
* OR
* $ pm2 logs

Stop your node app.
* $ pm2 stop ftmicroapi
OR
* $ pm2 stop 0

monitor
* $ pm2 monit

pm2 delete process in development/production
* $ pm2 delete all

Startup a node process using PM2. The flags are optional but the --watch flag automatically restarts your app when a file changes in the current directory or its subdirectories.

* $ pm2 start index.js --name "whatsappchatbot" --no-autorestarts

NOTE: Don't Use $ NODE_ENV=production pm2 start index.js --name "whatsappchatbot" --watch

Change the log path during start
* pm2 start index.js -o /var/log/whatsappchatbotoutput.log -e /var/log/whatsappchatboterror.log

Log file access path in stage
* $ cd .pm2/logs
* $ vi whatsappchatbot-error.log
* $ vi whatsappchatbot-out.log

Zero-Downtime Deployments, So Reload Your App
* $ pm2 reload whatsappchatbot

# WHATSAPP CHATBOT

Quickly set up a webhook for your Dialogflow agent and WhatsApp.

![Weather Bot](https://github.com/prashant7july/whatsapp-chatbot/blob/master/weatherbot.jpg)

## Quick start

1. Clone the repo `git clone https://github.com/prashant7july/whatsapp-chatbot.git`
1. Navigate into directory: `cd whatsapp-chatbot`
1. Launch the project `npm install`
1. Launch the project `npm start`
1. Expose the webhook to test your agent with ngrok `ngrok http 3031` and test in `http://localhost:4040/inspect/http`
1. Link your agent to your webhook in the Dialogflow Console `https://<ngrok_url>/dialogflow-webhook`
1. Link your WhatApp webhook in the WhatsApp Admin Panel `https://<ngrok_url>/whatsapp-webhook`

## Run Server

You talk to the server through API as: *curl -X GET http://127.0.0.1:3031/whatsapp-welcome-message/:mobilenumber*

## Contact

Please contact Prashant Shekher (prashant7july \<at\> gmail \<dot\> com) for more information
