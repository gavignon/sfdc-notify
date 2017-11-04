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

    -c, --channel                notification channel
```

### Module

```
  var sn = require('sfdc-notify');

  sn({
      'channel': 'email'
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
