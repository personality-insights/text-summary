/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const pick = require('lodash.pick');
const I18nDataV2 = require('./i18n/v2');
const PersonalityProfileV2 = require('./profiles/v2/index');
const TextSummaryImpl = require('./text-summary');

const DEFAULT_OPTIONS = {
  locale: 'en',
  version: 'v2'
};

class TextSummary extends TextSummaryImpl {

  constructor(options) {
    const _options = Object.assign({}, DEFAULT_OPTIONS, pick(options, ['locale']));
    super(_options, I18nDataV2, PersonalityProfileV2);
  }

  defaultOptions() {
    return DEFAULT_OPTIONS;
  }
}

module.exports = TextSummary;
