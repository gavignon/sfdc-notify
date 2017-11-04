const fs = require('fs');
const VALID_COVERAGE = 85;
const ERR_COVERAGE = 75;

module.exports = class Parser {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  sortByProperty(property, order) {
    return function(a, b) {
      var val = 1;
      var sortStatus = 0;
      if (order === 'asc')
        val = -1;
      if (a[property] < b[property]) {
        sortStatus = -val;
      } else if (a[property] > b[property]) {
        sortStatus = val;
      }

      return sortStatus;
    };
  }

  sortByTwoProperty(prop1, prop2, order1, order2) {
    return function(a, b) {
      var val1 = 1;
      var val2 = 1;
      if (order1 === 'asc')
        val1 = -1;
        if (order2 === 'asc')
          val2 = -1;
      if (a[prop1] === undefined) {
        return val1;
      } else if (b[prop1] === undefined) {
        return -val1;
      } else if (a[prop1] === b[prop1]) {
        var sortStatus = 0;
        if (a[prop2].toString().toLowerCase() < b[prop2].toString().toLowerCase()) {
          sortStatus = -val2;
        } else if (String(a[prop2]).toString().toLowerCase() > b[prop2].toString().toLowerCase()) {
          sortStatus = val2;
        }
      } else {
        if (a[prop1] < b[prop1]) {
          sortStatus = -val1;
        } else {
          sortStatus = val1;
        }
      };
      return sortStatus;
    };
  }

  parseInt(number) {
    var str = number.toLocaleString('en-US');
    str = str.replace(/,/g, ' ');
    str = str.replace(/\./, ',');
    return str;
  }

  generateEmailCoverage(input, templateId) {

    let email = {};
    email.subject = 'Code Coverage (' + input.totalCoverage.toString().replace('.', ',') + '%) - Tests results ';
    if (input.failures !== undefined) {
      email.subject += ': ' + input.failures.length + ' errors';
    }
    email.templateId = templateId;
    email.htmlbody = 'Tests executed in ' + parseInt(input.totalTime) + 'ms';
    let coverageList = '<ul>';
    let information = '<b>Warnings:</b><br/>' + input.warnings === undefined ? '' : input.warnings + '<br/><br/><b>Failures:</b><br/>' + input.failures === undefined ? '' : input.failures;

    input.coverage.forEach((item, index) => {
      let color = '';
      if (item.coverage >= VALID_COVERAGE)
        color = 'green';
      if (item.coverage < ERR_COVERAGE)
        color = 'red';
      if (item.coverage >= ERR_COVERAGE && item.coverage < VALID_COVERAGE)
        color = 'orange';

      coverageList += '<li><span style="font-weight:bold;color:' + color + ';">[' + item.coverage.toString().replace('.', ',') + '%]</span> ' + item.name + '</li>';
    });

    coverageList += '</ul>';


    if (input.failures !== undefined || input.failures !== undefined) {
      if (input.warnings !== undefined) {
        email.htmlbody += '<h3>Warnings:</h3><ul>';
        input.warnings.forEach(item => {
          email.htmlbody += '<li>- <b>' + item.name + '</b> : <br/> ' + item.message + '</li>';
        });
        email.htmlbody += '</ul>';
      }

      if (input.failures !== undefined) {
        email.htmlbody += '<h3>Failures:</h3><ul>';
        input.failures.forEach(item => {
          email.htmlbody += '<li>- <b>' + item.name + '</b> [' + item.method + '] :<br/> ' + item.message + '</li>';
        });
        email.htmlbody += '</ul>';
      }

    }

    email.htmlbody += '<h3>Code Coverage:</h3>' + coverageList;


    return email;
  }

  generateSlackMessages(input, details) {
    let messages = [];

    var testGreen = {
      "pretext": "",
      "color": "good",
      "fields": [{
        "value": "",
        "short": false
      }]
    }
    var testOrange = {
      "pretext": "",
      "color": "warning",
      "fields": [{
        "value": "",
        "short": false
      }]
    }
    var testRed = {
      "pretext": "",
      "color": "danger",
      "fields": [{
        "value": "",
        "short": false
      }]
    }

    input.coverage.forEach((item, index) => {
      if (item.coverage >= 85) {
        if (index > 0)
          testGreen.fields[0].value += '\n';
        testGreen.fields[0].value += '- [' + item.coverage.toString().replace('.', ',') + '%] ' + item.name;
      }

      if (item.coverage >= 75 && item.coverage < 85) {
        if (index > 0)
          testOrange.fields[0].value += '\n';
        testOrange.fields[0].value += '- [' + item.coverage.toString().replace('.', ',') + '%] ' + item.name;
      }

      if (item.coverage < 75) {
        if (index > 0)
          testRed.fields[0].value += '\n';
        testRed.fields[0].value += '- [' + item.coverage.toString().replace('.', ',') + '%] ' + item.name;
      }

    });

    // Set all coverages
    if (details) {
      if (testGreen.fields[0].value !== "")
        messages.push(testGreen);
      if (testOrange.fields[0].value !== "")
        messages.push(testOrange);
      if (testRed.fields[0].value !== "")
        messages.push(testRed);
    }
    if (input.warnings) {
      let warnObj = {
        "pretext": "Warnings",
        "color": "warning",
        "fields": []
      }
      input.warnings.forEach(item => {
        warnObj.fields.push({
          "title": item.name,
          "value": item.message,
          "short": true
        });
      });
      messages.push(warnObj);
    }
    if (input.failures) {
      let failObj = {
        "pretext": "Failures",
        "color": "danger",
        "fields": []
      }

      input.failures.forEach(item => {
        failObj.fields.push({
          "title": item.name,
          "value": item.method + ' : ' + item.message,
          "short": true
        });
      });
      messages.push(failObj);
    }

    return messages;

  }

  execute() {
    var _this = this;

    const promise = new Promise((resolve, reject) => {

      let deployResult;
      let data = {};
      data.coverage = [];

      try {
        deployResult = JSON.parse(fs.readFileSync(this.config.filepath));
      } catch (e) {
        return reject(this.config.filepath + ' do not exist');
      }

      this.logger('Parsing deploy result file...');

      let totalLine = 0,
        lineNotCovered = 0;

      if (deployResult.details.runTestResult.codeCoverage.length === undefined) {
        let codeCoverageArray = [];
        codeCoverageArray.push(deployResult.details.runTestResult.codeCoverage);
        deployResult.details.runTestResult.codeCoverage = codeCoverageArray;
      }

      deployResult.details.runTestResult.codeCoverage.forEach(function(item, index) {
        totalLine += +item.numLocations;
        lineNotCovered += +item.numLocationsNotCovered;

        let denominator = (parseInt(item.numLocationsNotCovered) + parseInt(item.numLocations));
        let coverageRatio = '';
        if (denominator > 0) {
          coverageRatio = (parseInt(item.numLocations) - parseInt(item.numLocationsNotCovered)) / parseInt(item.numLocations);
          coverageRatio = (Math.round(coverageRatio * 100 * 100) / 100);
        } else {
          coverageRatio = 0;
        }

        let time = 0;
        if (item.time > 0)
          time = item.time;

        data.coverage.push({
          coverage: coverageRatio,
          name: item.name,
          time: time
        });
      });

      data.coverage.sort(_this.sortByTwoProperty('coverage', 'name', 'asc', 'desc'));

      let coverage = ((totalLine > 0 ? (totalLine - lineNotCovered) / totalLine : 0) * 100).toFixed(2);
      data.totalCoverage = coverage;
      data.totalTime = deployResult.details.runTestResult.totalTime;

      if (deployResult.details.runTestResult.codeCoverageWarnings) {
        data.warnings = [];

        deployResult.details.runTestResult.failures.forEach(function(item, index) {
          data.warnings.push({
            name: item.name,
            message: item.message
          });
        });
      }
      if (deployResult.details.runTestResult.failures) {
        data.failures = [];
        deployResult.details.runTestResult.failures.forEach(function(item, index) {
          data.failures.push({
            name: item.name,
            message: item.message,
            method: item.methodName
          });
        });

      }

      this.logger('Deploy result file parsed !');

      resolve(data);

    })
    return promise;
  }
}
