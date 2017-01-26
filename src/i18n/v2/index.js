/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
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

const _ = require('underscore'),
  contains = _.contains,
  extend = _.extend,
  keys = _.keys;

const dictionaries = require('./dictionaries');


class I18nData {

  constructor(locale) {
    this._locale = contains(keys(dictionaries), locale) ? locale : 'en';
    this._dictionary = dictionaries[this._locale];
  }

  data() {
    //return keys(this._dictionary).reduce((res, k) => extend(res, this._dictionary[k]), {});
    return extend({}, this._dictionary);
  }


  translatorFactory(){
    var self = {

      /**
       * Get the value for the given key from the dictionary.
       *
       * @param dictionary A dictionary with String keys and String values.
       * @param key A key. Can contain '.' to indicate key's present in sub-dictionaries.
       *                   For example 'application.name' looks up for the 'application' key
       *                   in the dictionary and, with it's value, looks up for the 'name' key.
       * @param defaultValue A value to return if the key is not in the dictionary.
       * @returns The value from the dictionary.
       */
      getKey : function (dictionary, key, defaultValue) {
        var i,
          parts = key.split('.'),
          value = dictionary;

        for (i = 0; i < parts.length; i = i + 1) {
          value = value[parts[i]];
          if (!value) {
            value = defaultValue;
            break;
          }
        }
        return value;
      },

      /**
       * Creates a translation function given a dictionary of translations
       * and an optional backup dictionary if the key is no present in the
       * first one. The key is returned if not found in the dictionaries.
       * @param translations A translation dictionary.
       * @param defaults A translation dictionary.
       * @returns {Function} A translator.
       */
      createTranslator : function (translations, defaults) {
        defaults = defaults || {};
        var _this = this;
        return function (key) {
          var value = self.getKey(translations, key, null);
          if (value === null) {
            value = _this.getKey(defaults, key, key);
          }
          return value;
        };
      }
    };
    return self;
  }

}

module.exports = I18nData;
