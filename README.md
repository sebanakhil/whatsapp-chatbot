# WHATSAPP CHATBOT API SETUP

## WhatsApp and Dialogflow configuration in .env (Create file .env in root directory)
```
# .env used for config which is in .gitignore
# WHATAPP CHATBOT Notification Server
PORT=3334

# WhatsApp Business Detail
WA_VERSION=2.21.4
WA_HOST=120.0.0.1
WA_PORT=8080
WA_USERNAME=xxxxxx
WA_PASSWORD=xxxxxxx
# WhatsApp Highly Structured Message
WA_HSM_NAMESPACE=whatsapp:hsm:xxxxx:xxxxx
WA_HSM_ELEMENT_NAME=hsm_template

# Dialogflow ACCESS TOEKN
APIAI_CLIENT_ACCESS_TOKEN=xxxxxxxxxxxxx

# Open Weather Maps API
WEATHER_MAP_API=http://api.openweathermap.org/data/2.5/weather
WEATHER_MAP_APP_ID=xxxxxxxxxxxx
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
## Step 1:

* $ node index.js
```
Server is listinging on 3334
```

## Step 2:

* $ ./ngrok http 3334
```
ngrok by @inconshreveable

Session Status                online
Session Expires               7 hours, 59 minutes
Update                        update available (version 2.3.35, Ctrl-U to update)
Version                       2.3.25
Region                        United States (us)
Web Interface                 http://127.0.0.1:4040
Forwarding                    http://29697eb2.ngrok.io -> http://localhost:3334
Forwarding                    https://29697eb2.ngrok.io -> http://localhost:3334

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

## Step 3:

* For ngrok, in Address bar - https://localhost:4040

## Step 4:

* In Address bar - https://172.16.245.60:11004
* Webhook URL: Link your WhatApp Webhooks URL in the WhatsApp Admin Panel `https://<ngrok_url>/whatsapp-webhook`<br/>
* Example: https://29697eb2.ngrok.io/whatsapp-webhook

## Step 5:

* In Dialogflow `https://dialogflow.cloud.google.com/#/login`, select fulfillment and set Webhook URL*
* Link your agent to your webhook in the Dialogflow Console `https://<ngrok_url>/dialogflow-webhook`
* Example: https://29697eb2.ngrok.io/dialogflow-webhook

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
