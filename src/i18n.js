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


/**
 * Creates translators
 *
 * @author Ary Pablo Batista <batarypa@ar.ibm.com>
 */
var translatorFactory = (function () {
    'use strict';

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
            console.log(format('Pending translation for: %s', key));
            value = _this.getKey(defaults, key, key);
          }
          return value;
        };
      }
    };

    return self;

  }()),


/**
 * Provide files according to user's locale
 *
 * @author Ary Pablo Batista <batarypa@ar.ibm.com>
 */
  i18nProvider = (function () {
    'use strict';

    var DEFAULT_LOCALE = 'en',
        I18N_DIR = './i18n',
        self = {
          dictionaries: {
            'en': require('./i18n/en'),
            'es': require('./i18n/es')
          }
        };


    /**
     * Returns all the locale options.
     * for 'es-AR'['traits_es-AR.json', 'traits_es.json', 'traits.json']
     *
     * @param locale A locale (format: ll-CC)
     * @returns {Array} An array of the possible names for dictionary file.
     */
    self.getLocaleOptions = function (locale) {
      var
        localeParts = locale.split('-'),
        options = [];

      options.push(locale.replace('-', '_'));
      if (localeParts.length === 2) {
        options.push(localeParts[0]);
      }

      options.push(DEFAULT_LOCALE);

      return options;
    };

    /**
     * Get the appropiate dictionary file for user's locale.
     */
    self.getDictionary = function (locale) {
      var locales = self.getLocaleOptions(locale),
          dict;


      for (var i = 0; i < locales.length; i++) {
        if (self.dictionaries[locales[i]]) {
          return self.dictionaries[locales[i]];
        }
      }

      throw new Error('Could not obtain any dictionary for locale "' + locale + '"');
    };

    return self;

  }());

module.exports = {
  i18nProvider : i18nProvider,
  getDictionary : i18nProvider.getDictionary,
  translatorFactory : translatorFactory
};
