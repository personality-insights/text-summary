# Text Summary for Personality Insights

![last-release](https://img.shields.io/github/tag/personality-insights/text-summary.svg)
[![npm-version](https://img.shields.io/npm/v/personality-text-summary.svg)](https://www.npmjs.com/package/personality-text-summary)
[![npm-license](https://img.shields.io/npm/l/personality-text-summary.svg)](https://www.npmjs.com/package/personality-text-summary)
[![npm-downloads](https://img.shields.io/npm/dm/personality-text-summary.svg)](https://www.npmjs.com/package/personality-text-summary)

Generate a text description from a given personality profile.

## Getting Started

1. **Include the script** in your page
```
<script src="path/to/personality-text-summary.standalone.min.js"></script>
```
2. **Generate the text description** from a profile.
```
textSummary = new TextSummary('en');
summaryText = textSummary.getSummary(profile);
```
3. Print it somewhere!

See the complete [example code][example_code] or [try it live][live_example]


## API Methods

Public methods:
* `constructor :: (Locale) -> TextSummary` - Returns a TextSummary instance.
* `getSummary :: (Profile) -> String` - Returns a text summary for the given profile.

Where:
* `Locale` is one of the [available locales](#available-locales).
* `Profile` is a IBM Watson Personality Insights profile which is basically the service JSON output, parsed into a JavaScript `Object`.


## Available Locales

At the moment the available locales are:
  - `en`
  - `es`


## Build from source

You can run `gulp` command to build the component. Binaries will be deployed to `bin` folder.

[example_code]: https://github.com/ibm-silvergate/personality-text-summary/blob/master/examples/example.html
[live_example]: https://rawgit.com/ibm-silvergate/personality-text-summary/master/examples/example.html
