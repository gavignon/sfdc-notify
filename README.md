# sfdc-notify
Notify people on every channel after a deployment

## Getting Started

Works in Unix like system. Windows is not tested.

### Installing

```
npm install -g sfdc-notify
```

## Usage

### Command Line

```
$ sn -h

  Usage: sn [options]

  generate data dictionary from a Salesforce Org

  Options:

  -V, --version                      output the version number
  -c, --channel [channel]            channel of notification [slack/email]
  -f, --filepath [filepath]          path of the deploy result file
  -e, --email [email]                email or list of email to send to
  -uc, --usernameCI [usernameCI]     username that will post in slack
  -ec, --emailCI [emailCI]           sender email
  -u, --username [username]          email displayed user name
  -k, --sendgridKey [sendgridKey]    sendgrid api key
  -t, --templateId [templateId]      sendgrid template id
  -d, --details [details]            true to display all code coverage in slack
  -s, --slackWebhook [slackWebhook]  slack webhook URL
  -h, --help                         output usage information
```

### Module

```
  var sn = require('sfdc-notify');

  sn({
      'channel': 'email',
      'filepath': 'path/to/deployResult.json',
      'email': ['email@user.com'],
      'usernameCI': 'Continuous Integration User',
      'emailCI': 'emailci@user.com',
      'username': 'Firstname Lastname',
      'sendgridKey': 'Sengrid Api Key',
      'templateId': 'template id',
      'details': false
      }, console.log);
```

## Built With

- [commander](https://github.com/tj/commander.js/) - The complete solution for node.js command-line interfaces, inspired by Ruby's commander.
- [@sendgrid/mail](https://github.com/sendgrid/sendgrid-nodejs) - This library allows you to quickly and easily use the SendGrid Web API v3 via Node.js.
- [slack-node](https://github.com/clonn/slack-node-sdk) - Slack Node SDK, full support for Webhook and the Slack API, continuously updated.


## Versioning

[SemVer](http://semver.org/) is used for versioning.

## Authors

- **Gil Avignon** - _Initial work_ - [gavignon](https://github.com/gavignon)

## License

This project is licensed under the MIT License - see the <LICENSE.md> file for details
