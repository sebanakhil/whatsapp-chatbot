# WHATSAPP CHATBOT

Quickly set up a webhook for your Dialogflow agent and WhatsApp.

## Quick start

1. Clone the repo `git clone https://github.com/prashant7july/whatsapp-chatbot.git ./`
1. Launch the project `npm install`
1. Launch the project `npm start`
1. Expose the webhook to test your agent with ngrok `ngrok http 3031` and test in `http://localhost:4040/inspect/http`
1. Link your agent to your webhook in the Dialogflow console `https://<ngrok_url>/dialogflow-webhook`
1. Link your whatApp API to your webhook in the WhatsApp Admin Panel `https://<ngrok_url>/whatsapp-webhook`
