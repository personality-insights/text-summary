# Text Summary for Personality Insights

![last-release](https://img.shields.io/github/tag/personality-insights/text-summary.svg)
[![npm-version](https://img.shields.io/npm/v/personality-text-summary.svg)](https://www.npmjs.com/package/personality-text-summary)
[![npm-license](https://img.shields.io/npm/l/personality-text-summary.svg)](https://www.npmjs.com/package/personality-text-summary)
[![npm-downloads](https://img.shields.io/npm/dm/personality-text-summary.svg)](https://www.npmjs.com/package/personality-text-summary)

Generate a text summary for a specified personality profile (v2 or v3).

## Installation

```sh
$ npm install personality-text-summary
```
## Usage

```JavaScript
  var PersonalityTextSummaries = require('personality-text-summary');

  // locale is one of {'en', 'es', 'ja'}.  version refers to which version of Watson Personality Insights to use, v2 or v3.
  var v3EnglishTextSummaries = new PersonalityTextSummaries({ locale: 'en', version: 'v3' });

  // retrieve the summary for a specified personality profile (json)
  var textSummary  = v3EnglishTextSummaries.getSummary(myV3EnPersonalityProfile);
  console.log('The summary for the provided profile is ' + textSummary);

  ```

## License

This library is licensed under Apache 2.0. Full license text is
available in [LICENSE](LICENSE).

## Changelog

__01-01-2017__
 * Added v3 summary
