var Slack = require('slack-node');
const fs = require('fs');
const Parser = require('./lib/parser.js');
const sendgrid = require('sendgrid').mail;

module.exports = (config, logger) => {

  if (typeof config.channel === 'undefined' || config.channel === null) {
    throw new Error('Not enough config options');
  } else if (config.channel != 'slack' && config.channel !== 'email') {
    throw new Error('Type must be \'slack\' or \'email\'');
  } else if (config.channel === 'slack' && (config.slackWebhook === 'undefined' || config.slackWebhook === null)) {
    throw new Error('Slack Webhook URL must be defined for the type \'slack\'');
  }

  const promise = new Promise((resolve, reject) => {

    const parser = new Parser(config, logger);
    parser.execute().then(result => {
      if (config.channel === 'slack') {

        logger('Sending Slack message...');

        slack = new Slack();
        slack.setWebhook(config.slackWebhook);
        let data = parser.generateSlackMessages(result, config.notifDetails);

        if (data.length > 0) {
          slack.webhook({
              attachments: data,
              text: '*Code Coverage [' + result.totalCoverage.toString().replace('.', ',') + '%] [' + config.environment + ']*'
            },
            function(err, response) {
              logger('Slack message sent !');
              resolve();
            });
        } else {
          logger('No message sent (empty) !');
          resolve();
        }

      }

      if (config.channel === 'email') {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(config.sendgridKey);
        sgMail.setSubstitutionWrappers('{{', '}}');

        let data = parser.generateEmailCoverage(result, config.templateId);

        logger('Sending mail...');
        const msg = {
          to: config.email,
          from: config.usernameCI +' <' + config.emailCI + '>',
          subject: data.subject,
          text: data.body,
          html: data.htmlbody,
          templateId: data.templateId,
          substitutions: {
            environment: config.environment,
            username: config.username,
          }
        };
        sgMail.send(msg, (error, result) => {
          if (error) {
            reject('Error sending the email.');
          } else {
            logger('Email sent !');
            resolve();
          }
        });
      }

    }).catch(reject);
  }).catch((err) => {
    console.log(err);
  });
  return promise;
};
