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
    email.subject = 'Build ' + input.status + ' - Code Coverage [' + input.totalCoverage.toString().replace('.', ',') + '%]';
    // if (input.failures !== undefined) {
    //   email.subject += ': ' + input.failures.length + ' errors';
    // }
    email.templateId = templateId;

    // TODO: Make it dynamically
    let colorCoverage = 'red-coverage';
    if(input.totalCoverage >= VALID_COVERAGE)
      colorCoverage = 'green-coverage';
      if(input.totalCoverage < VALID_COVERAGE && input.totalCoverage >= ERR_COVERAGE)
        colorCoverage = 'orange-coverage';
    email.htmlbody = '<div class="flex-cards"><div class="card coverage ' + colorCoverage + '"><h1>Code Coverage</h1><p>';
    email.htmlbody += input.totalCoverage.toString().replace('.', ',') + '%';

    email.htmlbody += '</p></div><div class="card stats"><table><tr><td class="min"># Component Errors:</td><td class="bold paddingLeft">' + input.stats.numberComponentErrors;

    email.htmlbody += '</td><td class="min"># Classes >= 85%:</td><td class="bold paddingLeft green-coverage-text">' + input.stats.totalSuccessClass;
    email.htmlbody += '</td></tr><tr><td class="min"># Component Deployed:</td><td class="bold paddingLeft">' + input.stats.numberComponentsDeployed;
    email.htmlbody += '</td><td class="min"># Classes >= 75% and < 85%:</td><td class="bold paddingLeft orange-coverage-text">' + input.stats.totalWarningClass;
    email.htmlbody += '</td></tr><tr><td class="min"># Component Total:</td><td class="bold paddingLeft">' + input.stats.numberComponentsTotal;
    email.htmlbody += '</td><td class="min"># Classes < 75%:</td><td class="bold paddingLeft red-coverage-text">' + input.stats.totalErrorsClass;
    email.htmlbody += '</td></tr><tr><td class="min"># Tests Errors:</td><td class="bold paddingLeft red-coverage-text">' + input.stats.numberTestErrors;
    email.htmlbody += '</td><td class="min"># Classes Total:</td><td class="bold paddingLeft">' + input.stats.totalClass;
    email.htmlbody += '</td></tr><tr><td class="min"># Tests Completed:</td><td class="bold paddingLeft green-coverage-text">' + input.stats.numberTestsCompleted;
    email.htmlbody += '</td><td></td><td></td></tr><tr><td class="min"># Tests Total:</td><td class="bold paddingLeft">' + input.stats.numberTestsTotal;

    email.htmlbody += '</td><td></td><td></td></tr></table></div></div>';


    if (input.warnings !== undefined || input.failures !== undefined) {
      if (input.failures !== undefined) {
        // Check if array has only one element
        if (input.failures.length === undefined) {
          let failuresInput = [];
          failuresInput.push(input.failures);
          input.failures = failuresInput;
        }

        email.htmlbody += '<div class="card"><div class="bar red-bar"></div><h1><div class="counter red-bar">' + input.failures.length;

        let plural = '';
        if(input.failures.length > 1)
          plural = 's';
        email.htmlbody += '</div>Failure' + plural + '</h1><div style="padding-left: 15px; padding-top: 5px;">';

        input.failures.forEach(item => {
          email.htmlbody += '<div class="block"><span class="bold">' + item.name + '[' + item.method + ']:';
          email.htmlbody += '</span><br/>' + item.message + '</div>';
        });
        email.htmlbody += '</div></div>';
      }

      if (input.warnings !== undefined) {
        // Check if array has only one element
        if (input.warnings.length === undefined) {
          let failuresWarning = [];
          failuresInput.push(input.warnings);
          input.warnings = failuresWarning;
        }

        email.htmlbody += '<div class="card"><div class="bar orange-bar"></div><h1><div class="counter orange-bar">' + input.warnings.length;

        let plural = '';
        if(input.warnings.length > 1)
          plural = 's';
        email.htmlbody += '</div>Warning' + plural + '</h1><div style="padding-left: 15px; padding-top: 5px;">';

        input.warnings.forEach(item => {
          email.htmlbody += '<div class="block"><span class="bold">' + item.name + '[' + item.method + ']:';
          email.htmlbody += '</span><br/>' + item.message + '</div>';
        });
        email.htmlbody += '</div></div>';
      }
    }

    let coverageToFix = {};
    coverageToFix.warnings = [];
    coverageToFix.errors = [];

    input.coverage.forEach((item, index) => {
      if (item.coverage < ERR_COVERAGE){
        coverageToFix.errors.push({
          coverage: item.coverage.toFixed(2).toString().replace('.', ','),
          name: item.name
        });
      }

      if (item.coverage >= ERR_COVERAGE && item.coverage < VALID_COVERAGE){
        coverageToFix.warnings.push({
          coverage: item.coverage.toFixed(2).toString().replace('.', ','),
          name: item.name
        });
      }
    });

    if(coverageToFix.warnings.length > 1 || coverageToFix.errors.length > 1){
      let numberFix = 0;
      numberFix = coverageToFix.warnings.length + coverageToFix.errors.length;
      email.htmlbody += '<div class="card"><div class="bar blue-bar"></div><h1><div class="counter blue-bar">' + numberFix;
      email.htmlbody += '</div>Code Coverage to Fix</h1><div class="coverage-list"><table><tr>';

      if(coverageToFix.warnings.length > 1){
        email.htmlbody += '<td valign="top"><ul>';
        // Add warning coverage
        coverageToFix.warnings.forEach((item, index) => {
          email.htmlbody += '<li><span class="orange-coverage-text bold">[' + item.coverage.toString().replace('.', ',') + '%]</span> ' + item.name + '</li>';
        });
        email.htmlbody += '</ul></td>';
      }

      if(coverageToFix.errors.length > 1){
        email.htmlbody += '<td valign="top"><ul>';
        // Add error coverage
        coverageToFix.errors.forEach((item, index) => {
          email.htmlbody += '<li><span class="red-coverage-text bold">[' + item.coverage.toString().replace('.', ',') + '%]</span> ' + item.name + '</li>';
        });
        email.htmlbody += '</ul></td>';
      }

      email.htmlbody += '</tr></table></div></div>';
    }

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

    var focusTests = {
      "pretext": "Apex Classes < 85%",
      "color": "warning",
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

      if (item.coverage < 85) {
        if (index > 0)
          focusTests.fields[0].value += '\n';
        focusTests.fields.push({
          "title": item.name,
          "value": item.coverage.toString().replace('.', ',') + '%',
          "short": true
        });
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

    focusTests.pretext = "Tests < 85% (#" + focusTests.fields.length + ")";

    if (focusTests.fields.length > 0)
      messages.push(focusTests);

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
        lineNotCovered = 0,
        totalSuccessClass = 0,
        totalWarningClass = 0,
        totalErrorsClass = 0,
        totalClass = 0;

      if (deployResult.details.runTestResult.codeCoverage.length === undefined) {
        let codeCoverageArray = [];
        codeCoverageArray.push(deployResult.details.runTestResult.codeCoverage);
        deployResult.details.runTestResult.codeCoverage = codeCoverageArray;
      }

      deployResult.details.runTestResult.codeCoverage.forEach(function(item, index) {
        totalClass++;
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

        if (coverageRatio >= VALID_COVERAGE)
          totalSuccessClass++;
        if (coverageRatio < VALID_COVERAGE && coverageRatio >= ERR_COVERAGE)
          totalWarningClass++;
        if (coverageRatio < ERR_COVERAGE)
          totalErrorsClass++;

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

        // Check if array has only one element
        if (deployResult.details.runTestResult.failures.length === undefined) {
          let failuresDeployInput = [];
          failuresDeployInput.push(deployResult.details.runTestResult.failures);
          deployResult.details.runTestResult.failures = failuresDeployInput;
        }

        data.failures = [];
        deployResult.details.runTestResult.failures.forEach(function(item, index) {
          data.failures.push({
            name: item.name,
            message: item.message,
            method: item.methodName
          });
        });

      }

      if (deployResult.status === 'Failed') {
        data.status = 'error';
      } else {
        data.status = 'success';
      }

      data.stats = {};
      data.stats.numberComponentErrors = deployResult.numberComponentErrors;
      data.stats.numberComponentsDeployed = deployResult.numberComponentsDeployed;
      data.stats.numberComponentsTotal = deployResult.numberComponentsTotal;
      data.stats.numberTestErrors = deployResult.numberTestErrors;
      data.stats.numberTestsCompleted = deployResult.numberTestsCompleted;
      data.stats.numberTestsTotal = deployResult.numberTestsTotal;

      data.stats.totalSuccessClass = totalSuccessClass;
      data.stats.totalWarningClass = totalWarningClass;
      data.stats.totalErrorsClass = totalErrorsClass;
      data.stats.totalClass = totalClass;

      this.logger('Deploy result file parsed !');

      resolve(data);

    })
    return promise;
  }
}
