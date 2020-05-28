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
1. Link your WhatApp webhook in the WhatsApp Admin Panel `https://<ngrok_url>/whatsapp-webhook`<br/>
   ![Whatsapp Callback URL](https://github.com/prashant7july/whatsapp-chatbot/blob/v1.0.0/whatsapp_business_webhook.png)<br/>
   ![Chatbot in Mobile Application Development](https://github.com/prashant7july/whatsapp-chatbot/blob/v1.0.0/Escalation-of-Chatbot-in-Mobile-Application-Development-1.png)<br/>
   ![whatsapp-dialogflow](https://github.com/prashant7july/whatsapp-chatbot/blob/v1.0.0/whatsapp-dialogflow.jpg)

## Run Server

You talk to the server through API as: *curl -X GET http://127.0.0.1:3031/whatsapp-welcome-message/:mobilenumber*

## Question

1. **How do you link Whatsapp and Dialogflow?**<br/>
   ![WhatsApp & Dialogflow](https://github.com/prashant7july/whatsapp-chatbot/blob/master/Dialogflow_v1_v2.pdf)
   [draw.io for whatsapp & Dialogflow](https://app.diagrams.net/#G1dWe0jJBDCNm7Brl77E0CrSPKzKEP4qWX)

1. **Do you install some kind of WhatsApp emulator on a computer?**<br/>
   There is no any Emulator used. I was developed just a backend in express.js REST API {{url}}/whatsapp-welcome-message/:mobile
was to hit either in curl or through Postman collection. This will start whatsapp chatbot in your mobile whatsapp.

1. **I don't understand the WhatsApp part from the instructions.?**<br/>


1. **How many services used in whatsapp chatbot?**<br/>
   I am using 3 different service -
   1) WhatsApp Business API (paid service)
   2) Dialogflow for AI (NLP) (free service)
   3) Openweather(yahoo deprecated) API for weather forecast (free service)

## OpenWeatherMap API - Access Current Weather Data For One Location

## openweathermap API Signup Process

To use openweathermap API, you need to create an account in their site.

1. Go to [openweathermap](https://openweathermap.org/) and signup yourself.
1. Then you will get an API key.


API key:
1. Your API key is XXXXXXXXXXXXXXXXXXXXXX
1. Within the next couple of hours, it will be activated and ready to use
1. You can later create more API keys on your account page
1. Please, always use your API key in each API call

Endpoint:
1. Please, use the endpoint api.openweathermap.org for your API calls
1. Example of API call:

`http://api.openweathermap.org/data/2.5/weather?appid=YOUR API KEY&q=Delhi`
OR
`curl -X GET 'http://api.openweathermap.org/data/2.5/weather?q=Delhi&units=metric&APPID=xxxxxxxxxxxxxx'`
```
{
    "coord": {
        "lon": 77.22,
        "lat": 28.67
    },
    "weather": [
        {
            "id": 721,
            "main": "Haze",
            "description": "haze",
            "icon": "50d"
        }
    ],
    "base": "stations",
    "main": {
        "temp": 304.15, //main.temp Temperature. Unit Default: Kelvin, Metric: Celsius, Imperial: Fahrenheit.
        "feels_like": 302.79,
        "temp_min": 304.15,
        "temp_max": 304.15,
        "pressure": 1012,
        "humidity": 25
    },
    "visibility": 3000,
    "wind": {
        "speed": 1.5,
        "deg": 230
    },
    "clouds": {
        "all": 68
    },
    "dt": 1584955076,
    "sys": {
        "type": 1,
        "id": 9165,
        "country": "IN",
        "sunrise": 1584924681,
        "sunset": 1584968630
    },
    "timezone": 19800,
    "id": 1273294,
    "name": "Delhi",
    "cod": 200
}
```

## Temperature is available in Fahrenheit, Celsius and Kelvin units.

1. For temperature in Fahrenheit use units=imperial
1. For temperature in Celsius use units=metric
1. Temperature in Kelvin is used by default, no need to use units parameter in API call

1. `curl -X GET 'http://api.openweathermap.org/data/2.5/weather?q=Delhi&units=metric&APPID=xxxxxxxxxxxxxxxxxxx'`
```
{
    "coord": {
        "lon": 77.22,
        "lat": 28.67
    },
    "weather": [
        {
            "id": 721,
            "main": "Haze",
            "description": "haze",
            "icon": "50d"
        }
    ],
    "base": "stations",
    "main": {
        "temp": 31,
        "feels_like": 28.87,
        "temp_min": 31,
        "temp_max": 31,
        "pressure": 1012,
        "humidity": 25
    },
    "visibility": 3000,
    "wind": {
        "speed": 2.6,
        "deg": 270
    },
    "clouds": {
        "all": 40
    },
    "dt": 1584955632,
    "sys": {
        "type": 1,
        "id": 9165,
        "country": "IN",
        "sunrise": 1584924681,
        "sunset": 1584968630
    },
    "timezone": 19800,
    "id": 1273294,
    "name": "Delhi",
    "cod": 200
}
```

## Useful links:
- API documentation https://openweathermap.org/api
- Details of your plan https://openweathermap.org/price
- Please, note that 16-days daily forecast and History API are not available for Free subscribers

## Contact n Donation

Please contact Prashant Shekher (prashant7july \<at\> gmail \<dot\> com) for more information. If this project help you reduce time to develop, you can give me a cup of coffee :)

![Contact n Donation](https://github.com/prashant7july/whatsapp-chatbot/blob/v1.0.0/qrcode.jpg)