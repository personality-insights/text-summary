!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.TextSummary=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
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

"use strict";

var format = _dereq_("./format"),
    i18n = _dereq_("./i18n");

/**
 * Provides a Text Summary for profiles.
 */
module.exports = function (lang) {

  var self = {},
      dictionary = i18n.getDictionary(lang),
      tphrase = i18n.translatorFactory.createTranslator(dictionary.phrases); // i18n for phrases

  // Download all static data.
  self.circumplexData = dictionary.traits;
  self.facetsData = dictionary.facets;
  self.valuesData = dictionary.values;
  self.needsData = dictionary.needs;

  function compareByRelevance(o1, o2) {
    var result = 0;

    if (Math.abs(0.5 - o1.percentage) > Math.abs(0.5 - o2.percentage)) {
      result = -1; // A trait with 1% is more interesting than one with 60%.
    }

    if (Math.abs(0.5 - o1.percentage) < Math.abs(0.5 - o2.percentage)) {
      result = 1;
    }

    return result;
  }

  function compareByValue(o1, o2) {
    var result = 0;

    if (Math.abs(o1.percentage) > Math.abs(o2.percentage)) {
      result = -1; // 100 % has precedence over 99%
    }

    if (Math.abs(o1.percentage) < Math.abs(o2.percentage)) {
      result = 1;
    }

    return result;
  }

  function getCircumplexAdjective(p1, p2, order) {
    // Sort the personality traits in the order the JSON file stored it.
    var ordered = [p1, p2].sort(function (o1, o2) {
      var i1 = "EANOC".indexOf(o1.id.charAt(0)),
          i2 = "EANOC".indexOf(o2.id.charAt(0));

      return i1 < i2 ? -1 : 1;
    }),

    // Assemble the identifier as the JSON file stored it.
    identifier = ordered[0].id.concat(ordered[0].percentage > 0.5 ? "_plus_" : "_minus_").concat(ordered[1].id).concat(ordered[1].percentage > 0.5 ? "_plus" : "_minus"),
        traitMult = self.circumplexData[identifier][0],
        sentence = "%s";

    if (traitMult.perceived_negatively) {
      switch (order) {
        case 0:
          sentence = tphrase("a bit %s");
          break;
        case 1:
          sentence = tphrase("somewhat %s");
          break;
        case 2:
          sentence = tphrase("can be perceived as %s");
          break;
      }
    }

    return format(sentence, traitMult.word);
  }

  function getFacetInfo(f) {
    var data = self.facetsData[f.id.replace("_", "-").replace(" ", "-")],
        t,
        d;

    if (f.percentage > 0.5) {
      t = data.HighTerm.toLowerCase();
      d = data.HighDescription.toLowerCase();
    } else {
      t = data.LowTerm.toLowerCase();
      d = data.LowDescription.toLowerCase();
    }

    return {
      name: f.id,
      term: t,
      description: d
    };
  }

  function intervalFor(p) {
    // The MIN handles the special case for 100%.
    return Math.min(Math.floor(p * 4), 3);
  }

  function getInfoForValue(v) {
    var data = self.valuesData[v.id.replace(/[_ ]/g, "-")][0],
        d = v.percentage > 0.5 ? data.HighDescription : data.LowDescription;

    return {
      name: v.id,
      term: data.Term.toLowerCase(),
      description: d
    };
  }

  function getWordsForNeed(n) {
    // Assemble the identifier as the JSON file stored it.
    var traitMult = self.needsData[n.id];
    return traitMult;
  }

  function assembleTraits(personalityTree) {
    var sentences = [],
        big5elements = [],
        relevantBig5,
        adj,
        adj1,
        adj2,
        adj3;

    // Sort the Big 5 based on how extreme the number is.
    personalityTree.children[0].children.forEach(function (p) {
      big5elements.push({
        id: p.id,
        percentage: p.percentage
      });
    });
    big5elements.sort(compareByRelevance);

    // Remove everything between 32% and 68%, as it's inside the common people.
    relevantBig5 = big5elements.filter(function (item) {
      return Math.abs(0.5 - item.percentage) > 0.18;
    });
    if (relevantBig5.length < 2) {
      // Even if no Big 5 attribute is interesting, you get 1 adjective.
      relevantBig5 = [big5elements[0], big5elements[1]];
    }

    switch (relevantBig5.length) {
      case 2:
        // Report 1 adjective.
        adj = getCircumplexAdjective(relevantBig5[0], relevantBig5[1], 0);
        sentences.push(format(tphrase("You are %s"), adj) + ".");
        break;
      case 3:
        // Report 2 adjectives.
        adj1 = getCircumplexAdjective(relevantBig5[0], relevantBig5[1], 0);
        adj2 = getCircumplexAdjective(relevantBig5[1], relevantBig5[2], 1);
        sentences.push(format(tphrase("You are %s and %s"), adj1, adj2) + ".");
        break;
      case 4:
      case 5:
        // Report 3 adjectives.
        adj1 = getCircumplexAdjective(relevantBig5[0], relevantBig5[1], 0);
        adj2 = getCircumplexAdjective(relevantBig5[1], relevantBig5[2], 1);
        adj3 = getCircumplexAdjective(relevantBig5[2], relevantBig5[3], 2);
        sentences.push(format(tphrase("You are %s, %s and %s"), adj1, adj2, adj3) + ".");
        break;
    }

    return sentences;
  }

  function assembleFacets(personalityTree) {
    var sentences = [],
        facetElements = [],
        info,
        i;

    // Assemble the full list of facets and sort them based on how extreme
    // is the number.
    personalityTree.children[0].children.forEach(function (p) {
      p.children.forEach(function (f) {
        facetElements.push({
          id: f.id,
          percentage: f.percentage,
          parent: p
        });
      });
    });
    facetElements.sort(compareByRelevance);

    // Assemble an adjective and description for the two most important facets.
    info = getFacetInfo(facetElements[0]);
    sentences.push(format(tphrase("You are %s"), info.term) + ": " + info.description + ".");
    info = getFacetInfo(facetElements[1]);
    sentences.push(format(tphrase("You are %s"), info.term) + ": " + info.description + ".");

    // If all the facets correspond to the same feature, continue until a
    // different parent feature is found.
    i = 2;
    if (facetElements[0].parent === facetElements[1].parent) {
      while (facetElements[0].parent === facetElements[i].parent) {
        i += 1;
      }
    }
    info = getFacetInfo(facetElements[i]);
    sentences.push(format(tphrase("And you are %s"), info.term) + ": " + info.description + ".");

    return sentences;
  }

  /**
   * Assemble the list of values and sort them based on relevance.
   */
  function assembleValues(valuesTree) {
    var sentences = [],
        valuesList = [],
        sameQI,
        info1,
        info2,
        sentence,
        valuesInfo,
        i,
        term1,
        term2;

    valuesTree.children[0].children.forEach(function (p) {
      valuesList.push({
        id: p.id,
        percentage: p.percentage
      });
    });
    valuesList.sort(compareByRelevance);

    // Are the two most relevant in the same quartile interval? (e.g. 0%-25%)
    sameQI = intervalFor(valuesList[0].percentage) === intervalFor(valuesList[1].percentage);

    // Get all the text and data required.
    info1 = getInfoForValue(valuesList[0]);
    info2 = getInfoForValue(valuesList[1]);

    if (sameQI) {
      // Assemble the first 'both' sentence.
      term1 = info1.term;
      term2 = info2.term;
      switch (intervalFor(valuesList[0].percentage)) {
        case 0:
          sentence = format(tphrase("You are relatively unconcerned with both %s and %s"), term1, term2) + ".";
          break;
        case 1:
          sentence = format(tphrase("You don't find either %s or %s to be particularly motivating for you"), term1, term2) + ".";
          break;
        case 2:
          sentence = format(tphrase("You value both %s and %s a bit"), term1, term2) + ".";
          break;
        case 3:
          sentence = format(tphrase("You consider both %s and %s to guide a large part of what you do"), term1, term2) + ".";
          break;
      }
      sentences.push(sentence);

      // Assemble the final strings in the correct format.
      sentences.push(info1.description + ".");
      sentences.push(format(tphrase("And %s"), info2.description.toLowerCase()) + ".");
    } else {
      valuesInfo = [info1, info2];
      for (i = 0; i < valuesInfo.length; i += 1) {
        // Process it this way because the code is the same.
        switch (intervalFor(valuesList[i].percentage)) {
          case 0:
            sentence = format(tphrase("You are relatively unconcerned with %s"), valuesInfo[i].term);
            break;
          case 1:
            sentence = format(tphrase("You don't find %s to be particularly motivating for you"), valuesInfo[i].term);
            break;
          case 2:
            sentence = format(tphrase("You value %s a bit more"), valuesInfo[i].term);
            break;
          case 3:
            sentence = format(tphrase("You consider %s to guide a large part of what you do"), valuesInfo[i].term);
            break;
        }
        sentence = sentence.concat(": ").concat(valuesInfo[i].description.toLowerCase()).concat(".");
        sentences.push(sentence);
      }
    }

    return sentences;
  }

  /**
   * Assemble the list of needs and sort them based on value.
   */
  function assembleNeeds(needsTree) {
    var sentences = [],
        needsList = [],
        word,
        sentence;

    needsTree.children[0].children.forEach(function (p) {
      needsList.push({
        id: p.id,
        percentage: p.percentage
      });
    });
    needsList.sort(compareByValue);

    // Get the words required.
    word = getWordsForNeed(needsList[0])[0];

    // Form the right sentence for the single need.
    switch (intervalFor(needsList[0].percentage)) {
      case 0:
        sentence = tphrase("Experiences that make you feel high %s are generally unappealing to you");
        break;
      case 1:
        sentence = tphrase("Experiences that give a sense of %s hold some appeal to you");
        break;
      case 2:
        sentence = tphrase("You are motivated to seek out experiences that provide a strong feeling of %s");
        break;
      case 3:
        sentence = tphrase("Your choices are driven by a desire for %s");
        break;
    }
    sentence = format(sentence, word).concat(".");
    sentences.push(sentence);

    return sentences;
  }

  /**
   * Given a TraitTree returns a text
   * summary describing the result.
   *
   * @param tree A TraitTree.
   * @return An array of strings representing the
   *         paragraphs of the text summary.
   */
  function assemble(tree) {
    return [assembleTraits(tree.children[0]), assembleFacets(tree.children[0]), assembleNeeds(tree.children[1]), assembleValues(tree.children[2])];
  }

  /**
   * Given a TraitTree returns a text
   * summary describing the result.
   *
   * @param tree A TraitTree.
   * @return A String containing the text summary.
   */
  function getSummary(profile) {
    return assemble(profile.tree).map(function (paragraph) {
      return paragraph.join(" ");
    }).join("\n");
  }

  /* Text-Summary API */
  self.assembleTraits = assembleTraits;
  self.assembleFacets = assembleFacets;
  self.assembleNeeds = assembleNeeds;
  self.assembleValues = assembleValues;
  self.assemble = assemble;
  self.getSummary = getSummary;

  return self;
};

},{"./format":2,"./i18n":3}],2:[function(_dereq_,module,exports){
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
 * Given a template string to format and serveral strings
 * to fill the template, it returns the formatted string.
 * @param template This is a string containing zero, one or
 *                 more occurrences of "%s".
 * @param ...strings
 * @returns The formattted template.
 */
"use strict";

function format(subject) {
  "use strict";

  var replaces = Array.prototype.slice.apply(arguments, [1, arguments.length]),
      parts = null,
      output,
      i;

  if (subject.match(/%s/g) === null && replaces.length > 0 || replaces.length !== subject.match(/%s/g).length) {
    throw "Format error: The string count to replace do not matches the argument count. Subject: " + subject + ". Replaces: " + replaces;
  }

  output = subject;
  for (i = 1; i < arguments.length; i += 1) {
    parts = output.split("%s");
    output = parts[0] + arguments[i] + parts.slice(1, parts.length).join("%s");
  }

  return output;
}

module.exports = format;

},{}],3:[function(_dereq_,module,exports){
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

"use strict";

var format = _dereq_("./format");

/**
 * Creates translators
 *
 * @author Ary Pablo Batista <batarypa@ar.ibm.com>
 */
var translatorFactory = (function () {
  "use strict";

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
    getKey: function getKey(dictionary, key, defaultValue) {
      var i,
          parts = key.split("."),
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
    createTranslator: function createTranslator(translations, defaults) {
      defaults = defaults || {};
      var _this = this;
      return function (key) {
        var value = self.getKey(translations, key, null);
        if (value === null) {
          console.log(format("Pending translation for: %s", key));
          value = _this.getKey(defaults, key, key);
        }
        return value;
      };
    }
  };

  return self;
})(),

/**
 * Provide files according to user's locale
 *
 * @author Ary Pablo Batista <batarypa@ar.ibm.com>
 */
i18nProvider = (function () {
  "use strict";

  var DEFAULT_LOCALE = "en",
      I18N_DIR = "./i18n",
      self = {
    dictionaries: {
      en: _dereq_("./i18n/en"),
      es: _dereq_("./i18n/es")
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
    var localeParts = locale.split("-"),
        options = [];

    options.push(locale.replace("-", "_"));
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

    throw new Error("Could not obtain any dictionary for locale \"" + locale + "\"");
  };

  return self;
})();

module.exports = {
  i18nProvider: i18nProvider,
  getDictionary: i18nProvider.getDictionary,
  translatorFactory: translatorFactory
};

},{"./format":2,"./i18n/en":4,"./i18n/es":5}],4:[function(_dereq_,module,exports){
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

"use strict";

module.exports = {
    facets: {
        Friendliness: {
            Big5: "Extraversion",
            LowTerm: "Reserved",
            HighTerm: "Outgoing",
            LowDescription: "You are a private person and don't let many people in",
            HighDescription: "You make friends easily and feel comfortable around other people"
        },
        Gregariousness: {
            Big5: "Extraversion",
            LowTerm: "Independent",
            HighTerm: "Sociable",
            LowDescription: "You have a strong desire to have time to yourself",
            HighDescription: "You enjoy being in the company of others"
        },
        Assertiveness: {
            Big5: "Extraversion",
            LowTerm: "Demure",
            HighTerm: "Assertive",
            LowDescription: "You prefer to listen than to talk, especially in group situations",
            HighDescription: "You tend to speak up and take charge of situations, and you are comfortable leading groups"
        },
        "Activity-level": {
            Big5: "Extraversion",
            LowTerm: "Laid-back",
            HighTerm: "Energetic",
            LowDescription: "You appreciate a relaxed pace in life",
            HighDescription: "You enjoy a fast-paced, busy schedule with many activities"
        },
        "Excitement-seeking": {
            Big5: "Extraversion",
            LowTerm: "Calm-seeking",
            HighTerm: "Excitement-seeking",
            LowDescription: "You prefer activities that are quiet, calm, and safe",
            HighDescription: "You are excited by taking risks and feel bored without lots of action going on"
        },
        Cheerfulness: {
            Big5: "Extraversion",
            LowTerm: "Solemn",
            HighTerm: "Cheerful",
            LowDescription: "You are generally serious and do not joke much",
            HighDescription: "You are a joyful person and share that joy with the world"
        },
        Trust: {
            Big5: "Agreeableness",
            LowTerm: "Cautious of others",
            HighTerm: "Trusting of others",
            LowDescription: "You are wary of other people's intentions and do not trust easily",
            HighDescription: "You believe the best in others and trust people easily"
        },
        Cooperation: {
            Big5: "Agreeableness",
            LowTerm: "Contrary",
            HighTerm: "Accommodating",
            LowDescription: "You do not shy away from contradicting others",
            HighDescription: "You are easy to please and try to avoid confrontation"
        },
        Altruism: {
            Big5: "Agreeableness",
            LowTerm: "Self-focused",
            HighTerm: "Altruistic",
            LowDescription: "You are more concerned with taking care of yourself than taking time for others",
            HighDescription: "You feel fulfilled when helping others, and will go out of your way to do so"
        },
        Morality: {
            Big5: "Agreeableness",
            LowTerm: "Compromising",
            HighTerm: "Uncompromising",
            LowDescription: "You are comfortable using every trick in the book to get what you want",
            HighDescription: "You think it is wrong to take advantage of others to get ahead"
        },
        Modesty: {
            Big5: "Agreeableness",
            LowTerm: "Proud",
            HighTerm: "Modest",
            LowDescription: "You hold yourself in high regard, satisfied with who you are",
            HighDescription: "You are uncomfortable being the center of attention"
        },
        Sympathy: {
            Big5: "Agreeableness",
            LowTerm: "Hardened",
            HighTerm: "Empathetic",
            LowDescription: "You think that people should generally rely more on themselves than on other people",
            HighDescription: "You feel what others feel and are compassionate towards them"
        },
        "Self-efficacy": {
            Big5: "Conscientiousness",
            LowTerm: "Self-doubting",
            HighTerm: "Self-assured",
            LowDescription: "You frequently doubt your ability to achieve your goals",
            HighDescription: "You feel you have the ability to succeed in the tasks you set out to do"
        },
        Orderliness: {
            Big5: "Conscientiousness",
            LowTerm: "Unstructured",
            HighTerm: "Organized",
            LowDescription: "You do not make a lot of time for organization in your daily life",
            HighDescription: "You feel a strong need for structure in your life"
        },
        Dutifulness: {
            Big5: "Conscientiousness",
            LowTerm: "Carefree",
            HighTerm: "Dutiful",
            LowDescription: "You do what you want, disregarding rules and obligations",
            HighDescription: "You take rules and obligations seriously, even when they're inconvenient"
        },
        "Achievement-striving": {
            Big5: "Conscientiousness",
            LowTerm: "Content",
            HighTerm: "Driven",
            LowDescription: "You are content with your level of accomplishment and do not feel the need to set ambitious goals",
            HighDescription: "You have high goals for yourself and work hard to achieve them"
        },
        "Self-discipline": {
            Big5: "Conscientiousness",
            LowTerm: "Intermittent",
            HighTerm: "Persistent",
            LowDescription: "You have a hard time sticking with difficult tasks for a long period of time",
            HighDescription: "You can tackle and stick with tough tasks"
        },
        Cautiousness: {
            Big5: "Conscientiousness",
            LowTerm: "Bold",
            HighTerm: "Deliberate",
            LowDescription: "You would rather take action immediately than spend time deliberating making a decision",
            HighDescription: "You carefully think through decisions before making them"
        },
        Anxiety: {
            Big5: "Neuroticism",
            LowTerm: "Self-assured",
            HighTerm: "Prone to worry",
            LowDescription: "You tend to feel calm and self-assured",
            HighDescription: "You tend to worry about things that might happen"
        },
        Anger: {
            Big5: "Neuroticism",
            LowTerm: "Mild-tempered",
            HighTerm: "Fiery",
            LowDescription: "It takes a lot to get you angry",
            HighDescription: "You have a fiery temper, especially when things do not go your way"
        },
        Depression: {
            Big5: "Neuroticism",
            LowTerm: "Content",
            HighTerm: "Melancholy",
            LowDescription: "You are generally comfortable with yourself as you are",
            HighDescription: "You think quite often about the things you are unhappy about"
        },
        "Self-consciousness": {
            Big5: "Neuroticism",
            LowTerm: "Confident",
            HighTerm: "Self-conscious",
            LowDescription: "You are hard to embarrass and are self-confident most of the time",
            HighDescription: "You are sensitive about what others might be thinking about you"
        },
        Immoderation: {
            Big5: "Neuroticism",
            LowTerm: "Self-controlled",
            HighTerm: "Hedonistic",
            LowDescription: "You have control over your desires, which are not particularly intense",
            HighDescription: "You feel your desires strongly and are easily tempted by them"
        },
        Vulnerability: {
            Big5: "Neuroticism",
            LowTerm: "Calm under pressure",
            HighTerm: "Susceptible to stress",
            LowDescription: "You handle unexpected events calmly and effectively",
            HighDescription: "You are easily overwhelmed in stressful situations"
        },
        Imagination: {
            Big5: "Openness",
            LowTerm: "Down-to-earth",
            HighTerm: "Imaginative",
            LowDescription: "You prefer facts over fantasy",
            HighDescription: "You have a wild imagination"
        },
        "Artistic-interests": {
            Big5: "Openness",
            LowTerm: "Unconcerned with art",
            HighTerm: "Appreciative of art",
            LowDescription: "You are less concerned with artistic or creative activities than most people who participated in our surveys",
            HighDescription: "You enjoy beauty and seek out creative experiences"
        },
        Emotionality: {
            Big5: "Openness",
            LowTerm: "Dispassionate",
            HighTerm: "Emotionally aware",
            LowDescription: "You do not frequently think about or openly express your emotions",
            HighDescription: "You are aware of your feelings and how to express them"
        },
        Adventurousness: {
            Big5: "Openness",
            LowTerm: "Consistent",
            HighTerm: "Adventurous",
            LowDescription: "You enjoy familiar routines and prefer not to deviate from them",
            HighDescription: "You are eager to experience new things"
        },
        Intellect: {
            Big5: "Openness",
            LowTerm: "Concrete",
            HighTerm: "Philosophical",
            LowDescription: "You prefer dealing with the world as it is, rarely considering abstract ideas",
            HighDescription: "You are open to and intrigued by new ideas and love to explore them"
        },
        Liberalism: {
            Big5: "Openness",
            LowTerm: "Respectful of authority",
            HighTerm: "Authority-challenging",
            LowDescription: "You prefer following with tradition in order to maintain a sense of stability",
            HighDescription: "You prefer to challenge authority and traditional values to help bring about positive changes"
        }
    },
    needs: {
        Challenge: ["prestige", "competition", "glory"],
        Closeness: ["belongingness", "nostalgia", "intimacy"],
        Curiosity: ["discovery", "mastery", "gaining knowledge"],
        Excitement: ["revelry", "anticipation", "exhiliration"],
        Harmony: ["well-being", "courtesy", "politeness"],
        Ideal: ["sophistication", "spirituality", "superiority", "fulfillment"],
        Liberty: ["modernity", "expanding possibility", "escape", "spontaneity", "novelty"],
        Love: ["connectedness", "affinity"],
        Practicality: ["efficiency", "practicality", "high value", "convenience"],
        "Self-expression": ["self-expression", "personal empowerment", "personal strength"],
        Stability: ["stability", "authenticity", "trustworthiness"],
        Structure: ["organization", "straightforwardness", "clarity", "reliability"]
    },
    phrases: {
        "You are %s": "You are %s",
        "You are %s and %s": "You are %s and %s",
        "You are %s, %s and %s": "You are %s, %s and %s",
        "And you are %s": "And you are %s",
        "You are relatively unconcerned with %s": "You are relatively unconcerned with %s",
        "You are relatively unconcerned with both %s and %s": "You are relatively unconcerned with both %s and %s",
        "You don't find %s to be particularly motivating for you": "You don't find %s to be particularly motivating for you",
        "You don't find either %s or %s to be particularly motivating for you": "You don't find either %s or %s to be particularly motivating for you",
        "You value both %s a bit": "You value both %s a bit",
        "You value both %s and %s a bit": "You value both %s and %s a bit",
        "You consider %s to guide a large part of what you do": "You consider %s to guide a large part of what you do",
        "You consider both %s and %s to guide a large part of what you do": "You consider both %s and %s to guide a large part of what you do",
        "And %s": "And %s",
        "Experiences that make you feel high %s are generally unappealing to you": "Experiences that make you feel high %s are generally unappealing to you",
        "Experiences that give a sense of %s hold some appeal to you": "Experiences that give a sense of %s hold some appeal to you",
        "You are motivated to seek out experiences that provide a strong feeling of %s": "You are motivated to seek out experiences that provide a strong feeling of %s",
        "Your choices are driven by a desire for %s": "Your choices are driven by a desire for %s",
        "a bit %s": "a bit %s",
        "somewhat %s": "somewhat %s",
        "can be perceived as %s": "can be perceived as %s"
    },
    traits: {
        Agreeableness_minus_Conscientiousness_minus: [{
            perceived_negatively: true,
            word: "inconsiderate"
        }, {
            perceived_negatively: true,
            word: "impolite"
        }, {
            perceived_negatively: true,
            word: "distrustful"
        }, {
            perceived_negatively: true,
            word: "uncooperative"
        }, {
            perceived_negatively: true,
            word: "thoughtless"
        }],
        Agreeableness_minus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "strict"
        }, {
            perceived_negatively: false,
            word: "rigid"
        }, {
            perceived_negatively: true,
            word: "stern"
        }],
        Agreeableness_minus_Extraversion_minus: [{
            perceived_negatively: true,
            word: "cynical"
        }, {
            perceived_negatively: true,
            word: "wary of others"
        }, {
            perceived_negatively: true,
            word: "seclusive"
        }, {
            perceived_negatively: true,
            word: "detached"
        }, {
            perceived_negatively: true,
            word: "impersonal"
        }, {
            perceived_negatively: true,
            word: "glum"
        }],
        Agreeableness_minus_Extraversion_plus: [{
            perceived_negatively: true,
            word: "bullheaded"
        }, {
            perceived_negatively: true,
            word: "abrupt"
        }, {
            perceived_negatively: true,
            word: "crude"
        }, {
            perceived_negatively: true,
            word: "combative"
        }, {
            perceived_negatively: true,
            word: "rough"
        }, {
            perceived_negatively: false,
            word: "sly"
        }, {
            perceived_negatively: true,
            word: "manipulative"
        }, {
            perceived_negatively: true,
            word: "gruff"
        }, {
            perceived_negatively: true,
            word: "devious"
        }],
        Agreeableness_minus_Neuroticism_minus: [{
            perceived_negatively: true,
            word: "insensitive"
        }, {
            perceived_negatively: true,
            word: "unaffectionate"
        }, {
            perceived_negatively: true,
            word: "passionless"
        }, {
            perceived_negatively: true,
            word: "unemotional"
        }],
        Agreeableness_minus_Neuroticism_plus: [{
            perceived_negatively: true,
            word: "critical"
        }, {
            perceived_negatively: true,
            word: "selfish"
        }, {
            perceived_negatively: true,
            word: "ill-tempered"
        }, {
            perceived_negatively: true,
            word: "antagonistic"
        }, {
            perceived_negatively: true,
            word: "grumpy"
        }, {
            perceived_negatively: true,
            word: "bitter"
        }, {
            perceived_negatively: true,
            word: "disagreeable"
        }, {
            perceived_negatively: true,
            word: "demanding"
        }],
        Agreeableness_minus_Openness_minus: [{
            perceived_negatively: true,
            word: "coarse"
        }, {
            perceived_negatively: true,
            word: "tactless"
        }, {
            perceived_negatively: true,
            word: "curt"
        }, {
            perceived_negatively: true,
            word: "narrow-minded"
        }, {
            perceived_negatively: true,
            word: "callous"
        }, {
            perceived_negatively: true,
            word: "ruthless"
        }, {
            perceived_negatively: true,
            word: "uncharitable"
        }, {
            perceived_negatively: true,
            word: "vindictive"
        }],
        Agreeableness_minus_Openness_plus: [{
            perceived_negatively: false,
            word: "shrewd"
        }, {
            perceived_negatively: false,
            word: "eccentric"
        }, {
            perceived_negatively: false,
            word: "individualistic"
        }],
        Agreeableness_plus_Conscientiousness_minus: [{
            perceived_negatively: false,
            word: "unpretentious"
        }, {
            perceived_negatively: false,
            word: "self-effacing"
        }],
        Agreeableness_plus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "helpful"
        }, {
            perceived_negatively: false,
            word: "cooperative"
        }, {
            perceived_negatively: false,
            word: "considerate"
        }, {
            perceived_negatively: false,
            word: "respectful"
        }, {
            perceived_negatively: false,
            word: "polite"
        }, {
            perceived_negatively: false,
            word: "reasonable"
        }, {
            perceived_negatively: false,
            word: "courteous"
        }, {
            perceived_negatively: false,
            word: "thoughtful"
        }, {
            perceived_negatively: false,
            word: "loyal"
        }, {
            perceived_negatively: false,
            word: "moral"
        }],
        Agreeableness_plus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "soft-hearted"
        }, {
            perceived_negatively: false,
            word: "agreeable"
        }, {
            perceived_negatively: false,
            word: "obliging"
        }, {
            perceived_negatively: false,
            word: "humble"
        }, {
            perceived_negatively: true,
            word: "lenient"
        }],
        Agreeableness_plus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "effervescent"
        }, {
            perceived_negatively: false,
            word: "happy"
        }, {
            perceived_negatively: false,
            word: "friendly"
        }, {
            perceived_negatively: false,
            word: "merry"
        }, {
            perceived_negatively: false,
            word: "jovial"
        }, {
            perceived_negatively: false,
            word: "humorous"
        }],
        Agreeableness_plus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "generous"
        }, {
            perceived_negatively: false,
            word: "pleasant"
        }, {
            perceived_negatively: false,
            word: "tolerant"
        }, {
            perceived_negatively: false,
            word: "peaceful"
        }, {
            perceived_negatively: false,
            word: "flexible"
        }, {
            perceived_negatively: false,
            word: "easy-going"
        }, {
            perceived_negatively: false,
            word: "fair"
        }, {
            perceived_negatively: false,
            word: "charitable"
        }, {
            perceived_negatively: false,
            word: "trustful"
        }],
        Agreeableness_plus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "sentimental"
        }, {
            perceived_negatively: false,
            word: "affectionate"
        }, {
            perceived_negatively: false,
            word: "sensitive"
        }, {
            perceived_negatively: false,
            word: "soft"
        }, {
            perceived_negatively: false,
            word: "passionate"
        }, {
            perceived_negatively: false,
            word: "romantic"
        }],
        Agreeableness_plus_Openness_minus: [{
            perceived_negatively: true,
            word: "dependent"
        }, {
            perceived_negatively: true,
            word: "simple"
        }],
        Agreeableness_plus_Openness_plus: [{
            perceived_negatively: false,
            word: "genial"
        }, {
            perceived_negatively: false,
            word: "tactful"
        }, {
            perceived_negatively: false,
            word: "diplomatic"
        }, {
            perceived_negatively: false,
            word: "deep"
        }, {
            perceived_negatively: false,
            word: "idealistic"
        }],
        Conscientiousness_minus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "rash"
        }, {
            perceived_negatively: true,
            word: "uncooperative"
        }, {
            perceived_negatively: true,
            word: "unreliable"
        }, {
            perceived_negatively: true,
            word: "distrustful"
        }, {
            perceived_negatively: true,
            word: "thoughtless"
        }],
        Conscientiousness_minus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "unpretentious"
        }, {
            perceived_negatively: false,
            word: "self-effacing"
        }],
        Conscientiousness_minus_Extraversion_minus: [{
            perceived_negatively: true,
            word: "indecisive"
        }, {
            perceived_negatively: true,
            word: "aimless"
        }, {
            perceived_negatively: false,
            word: "wishy-washy"
        }, {
            perceived_negatively: false,
            word: "noncommittal"
        }, {
            perceived_negatively: true,
            word: "unambitious"
        }],
        Conscientiousness_minus_Extraversion_plus: [{
            perceived_negatively: true,
            word: "unruly"
        }, {
            perceived_negatively: false,
            word: "boisterous"
        }, {
            perceived_negatively: true,
            word: "reckless"
        }, {
            perceived_negatively: true,
            word: "devil-may-care"
        }, {
            perceived_negatively: false,
            word: "demonstrative"
        }],
        Conscientiousness_minus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "informal"
        }, {
            perceived_negatively: false,
            word: "low-key"
        }],
        Conscientiousness_minus_Neuroticism_plus: [{
            perceived_negatively: true,
            word: "scatterbrained"
        }, {
            perceived_negatively: true,
            word: "inconsistent"
        }, {
            perceived_negatively: true,
            word: "erratic"
        }, {
            perceived_negatively: true,
            word: "forgetful"
        }, {
            perceived_negatively: true,
            word: "impulsive"
        }, {
            perceived_negatively: true,
            word: "frivolous"
        }],
        Conscientiousness_minus_Openness_minus: [{
            perceived_negatively: false,
            word: "foolhardy"
        }, {
            perceived_negatively: true,
            word: "illogical"
        }, {
            perceived_negatively: true,
            word: "immature"
        }, {
            perceived_negatively: true,
            word: "haphazard"
        }, {
            perceived_negatively: false,
            word: "lax"
        }, {
            perceived_negatively: true,
            word: "flippant"
        }],
        Conscientiousness_minus_Openness_plus: [{
            perceived_negatively: false,
            word: "unconventional"
        }, {
            perceived_negatively: false,
            word: "quirky"
        }],
        Conscientiousness_plus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "stern"
        }, {
            perceived_negatively: false,
            word: "strict"
        }, {
            perceived_negatively: false,
            word: "rigid"
        }],
        Conscientiousness_plus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "dependable"
        }, {
            perceived_negatively: false,
            word: "responsible"
        }, {
            perceived_negatively: false,
            word: "reliable"
        }, {
            perceived_negatively: false,
            word: "mannerly"
        }, {
            perceived_negatively: false,
            word: "considerate"
        }],
        Conscientiousness_plus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "cautious"
        }, {
            perceived_negatively: false,
            word: "confident"
        }, {
            perceived_negatively: false,
            word: "punctual"
        }, {
            perceived_negatively: false,
            word: "formal"
        }, {
            perceived_negatively: false,
            word: "thrifty"
        }, {
            perceived_negatively: false,
            word: "principled"
        }],
        Conscientiousness_plus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "ambitious"
        }, {
            perceived_negatively: false,
            word: "alert"
        }, {
            perceived_negatively: false,
            word: "firm"
        }, {
            perceived_negatively: false,
            word: "purposeful"
        }, {
            perceived_negatively: false,
            word: "competitive"
        }],
        Conscientiousness_plus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "thorough"
        }, {
            perceived_negatively: false,
            word: "steady"
        }, {
            perceived_negatively: false,
            word: "consistent"
        }, {
            perceived_negatively: false,
            word: "self-disciplined"
        }, {
            perceived_negatively: false,
            word: "logical"
        }, {
            perceived_negatively: false,
            word: "decisive"
        }, {
            perceived_negatively: false,
            word: "controlled"
        }, {
            perceived_negatively: false,
            word: "concise"
        }],
        Conscientiousness_plus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "particular"
        }, {
            perceived_negatively: true,
            word: "high-strung"
        }],
        Conscientiousness_plus_Openness_minus: [{
            perceived_negatively: false,
            word: "traditional"
        }, {
            perceived_negatively: false,
            word: "conventional"
        }],
        Conscientiousness_plus_Openness_plus: [{
            perceived_negatively: false,
            word: "sophisticated"
        }, {
            perceived_negatively: false,
            word: "perfectionistic"
        }, {
            perceived_negatively: false,
            word: "industrious"
        }, {
            perceived_negatively: false,
            word: "dignified"
        }, {
            perceived_negatively: false,
            word: "refined"
        }, {
            perceived_negatively: false,
            word: "cultured"
        }, {
            perceived_negatively: false,
            word: "foresighted"
        }],
        Extraversion_minus_Agreeableness_minus: [{
            perceived_negatively: false,
            word: "skeptical"
        }, {
            perceived_negatively: false,
            word: "wary of others"
        }, {
            perceived_negatively: true,
            word: "seclusive"
        }, {
            perceived_negatively: true,
            word: "uncommunicative"
        }, {
            perceived_negatively: true,
            word: "unsociable"
        }, {
            perceived_negatively: true,
            word: "glum"
        }, {
            perceived_negatively: true,
            word: "detached"
        }, {
            perceived_negatively: false,
            word: "aloof"
        }],
        Extraversion_minus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "unaggressive"
        }, {
            perceived_negatively: false,
            word: "humble"
        }, {
            perceived_negatively: false,
            word: "submissive"
        }, {
            perceived_negatively: false,
            word: "timid"
        }, {
            perceived_negatively: false,
            word: "compliant"
        }, {
            perceived_negatively: false,
            word: "naïve"
        }],
        Extraversion_minus_Conscientiousness_minus: [{
            perceived_negatively: true,
            word: "indirect"
        }, {
            perceived_negatively: true,
            word: "unenergetic"
        }, {
            perceived_negatively: true,
            word: "sluggish"
        }, {
            perceived_negatively: true,
            word: "nonpersistent"
        }, {
            perceived_negatively: true,
            word: "vague"
        }],
        Extraversion_minus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "restrained"
        }, {
            perceived_negatively: false,
            word: "serious"
        }, {
            perceived_negatively: false,
            word: "discreet"
        }, {
            perceived_negatively: false,
            word: "cautious"
        }, {
            perceived_negatively: false,
            word: "principled"
        }],
        Extraversion_minus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "tranquil"
        }, {
            perceived_negatively: false,
            word: "sedate"
        }, {
            perceived_negatively: false,
            word: "placid"
        }, {
            perceived_negatively: false,
            word: "impartial"
        }, {
            perceived_negatively: false,
            word: "unassuming"
        }, {
            perceived_negatively: false,
            word: "acquiescent"
        }],
        Extraversion_minus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "guarded"
        }, {
            perceived_negatively: false,
            word: "pessimistic"
        }, {
            perceived_negatively: false,
            word: "secretive"
        }, {
            perceived_negatively: true,
            word: "cowardly"
        }, {
            perceived_negatively: false,
            word: "secretive"
        }],
        Extraversion_minus_Openness_minus: [{
            perceived_negatively: false,
            word: "somber"
        }, {
            perceived_negatively: true,
            word: "meek"
        }, {
            perceived_negatively: true,
            word: "unadventurous"
        }, {
            perceived_negatively: false,
            word: "passive"
        }, {
            perceived_negatively: true,
            word: "apathetic"
        }, {
            perceived_negatively: false,
            word: "docile"
        }],
        Extraversion_minus_Openness_plus: [{
            perceived_negatively: false,
            word: "inner-directed"
        }, {
            perceived_negatively: false,
            word: "introspective"
        }, {
            perceived_negatively: false,
            word: "meditative"
        }, {
            perceived_negatively: false,
            word: "contemplating"
        }, {
            perceived_negatively: false,
            word: "self-examining"
        }],
        Extraversion_plus_Agreeableness_minus: [{
            perceived_negatively: false,
            word: "opinionated"
        }, {
            perceived_negatively: true,
            word: "forceful"
        }, {
            perceived_negatively: true,
            word: "domineering"
        }, {
            perceived_negatively: true,
            word: "boastful"
        }, {
            perceived_negatively: true,
            word: "bossy"
        }, {
            perceived_negatively: false,
            word: "dominant"
        }, {
            perceived_negatively: false,
            word: "cunning"
        }],
        Extraversion_plus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "social"
        }, {
            perceived_negatively: false,
            word: "energetic"
        }, {
            perceived_negatively: false,
            word: "enthusiastic"
        }, {
            perceived_negatively: false,
            word: "communicative"
        }, {
            perceived_negatively: false,
            word: "vibrant"
        }, {
            perceived_negatively: false,
            word: "spirited"
        }, {
            perceived_negatively: false,
            word: "magnetic"
        }, {
            perceived_negatively: false,
            word: "zestful"
        }],
        Extraversion_plus_Conscientiousness_minus: [{
            perceived_negatively: false,
            word: "boisterous"
        }, {
            perceived_negatively: false,
            word: "mischievous"
        }, {
            perceived_negatively: false,
            word: "exhibitionistic"
        }, {
            perceived_negatively: false,
            word: "gregarious"
        }, {
            perceived_negatively: false,
            word: "demonstrative"
        }],
        Extraversion_plus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "active"
        }, {
            perceived_negatively: false,
            word: "competitive"
        }, {
            perceived_negatively: false,
            word: "persistent"
        }, {
            perceived_negatively: false,
            word: "ambitious"
        }, {
            perceived_negatively: false,
            word: "purposeful"
        }],
        Extraversion_plus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "confident"
        }, {
            perceived_negatively: false,
            word: "bold"
        }, {
            perceived_negatively: false,
            word: "assured"
        }, {
            perceived_negatively: false,
            word: "uninhibited"
        }, {
            perceived_negatively: false,
            word: "courageous"
        }, {
            perceived_negatively: false,
            word: "brave"
        }, {
            perceived_negatively: false,
            word: "self-satisfied"
        }, {
            perceived_negatively: false,
            word: "vigorous"
        }, {
            perceived_negatively: false,
            word: "strong"
        }],
        Extraversion_plus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "explosive"
        }, {
            perceived_negatively: true,
            word: "wordy"
        }, {
            perceived_negatively: false,
            word: "extravagant"
        }, {
            perceived_negatively: true,
            word: "volatile"
        }, {
            perceived_negatively: false,
            word: "flirtatious"
        }],
        Extraversion_plus_Openness_minus: [{
            perceived_negatively: true,
            word: "verbose"
        }, {
            perceived_negatively: true,
            word: "unscrupulous"
        }, {
            perceived_negatively: true,
            word: "pompous"
        }],
        Extraversion_plus_Openness_plus: [{
            perceived_negatively: false,
            word: "expressive"
        }, {
            perceived_negatively: false,
            word: "candid"
        }, {
            perceived_negatively: false,
            word: "dramatic"
        }, {
            perceived_negatively: false,
            word: "spontaneous"
        }, {
            perceived_negatively: false,
            word: "witty"
        }, {
            perceived_negatively: false,
            word: "opportunistic"
        }, {
            perceived_negatively: false,
            word: "independent"
        }],
        Neuroticism_minus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "unemotional"
        }, {
            perceived_negatively: true,
            word: "insensitive"
        }, {
            perceived_negatively: true,
            word: "unaffectionate"
        }, {
            perceived_negatively: true,
            word: "passionless"
        }],
        Neuroticism_minus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "patient"
        }, {
            perceived_negatively: false,
            word: "relaxed"
        }, {
            perceived_negatively: false,
            word: "undemanding"
        }, {
            perceived_negatively: false,
            word: "down-to-earth"
        }, {
            perceived_negatively: false,
            word: "optimistic"
        }, {
            perceived_negatively: false,
            word: "conceitless"
        }, {
            perceived_negatively: false,
            word: "uncritical"
        }, {
            perceived_negatively: false,
            word: "unpretentious"
        }],
        Neuroticism_minus_Conscientiousness_minus: [{
            perceived_negatively: false,
            word: "informal"
        }, {
            perceived_negatively: false,
            word: "low-key"
        }],
        Neuroticism_minus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "rational"
        }, {
            perceived_negatively: false,
            word: "objective"
        }, {
            perceived_negatively: false,
            word: "steady"
        }, {
            perceived_negatively: false,
            word: "logical"
        }, {
            perceived_negatively: false,
            word: "decisive"
        }, {
            perceived_negatively: false,
            word: "poised"
        }, {
            perceived_negatively: false,
            word: "concise"
        }, {
            perceived_negatively: false,
            word: "thorough"
        }, {
            perceived_negatively: false,
            word: "economical"
        }, {
            perceived_negatively: false,
            word: "self-disciplined"
        }],
        Neuroticism_minus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "unassuming"
        }, {
            perceived_negatively: true,
            word: "unexcitable"
        }, {
            perceived_negatively: false,
            word: "placid"
        }, {
            perceived_negatively: false,
            word: "tranquil"
        }],
        Neuroticism_minus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "unselfconscious"
        }, {
            perceived_negatively: false,
            word: "weariless"
        }, {
            perceived_negatively: false,
            word: "indefatigable"
        }],
        Neuroticism_minus_Openness_minus: [{
            perceived_negatively: false,
            word: "imperturbable"
        }, {
            perceived_negatively: true,
            word: "insensitive"
        }],
        Neuroticism_minus_Openness_plus: [{
            perceived_negatively: false,
            word: "heartfelt"
        }, {
            perceived_negatively: false,
            word: "versatile"
        }, {
            perceived_negatively: false,
            word: "creative"
        }, {
            perceived_negatively: false,
            word: "intellectual"
        }, {
            perceived_negatively: false,
            word: "insightful"
        }],
        Neuroticism_plus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "temperamental"
        }, {
            perceived_negatively: true,
            word: "irritable"
        }, {
            perceived_negatively: true,
            word: "quarrelsome"
        }, {
            perceived_negatively: true,
            word: "impatient"
        }, {
            perceived_negatively: true,
            word: "grumpy"
        }, {
            perceived_negatively: true,
            word: "crabby"
        }, {
            perceived_negatively: true,
            word: "cranky"
        }],
        Neuroticism_plus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "emotional"
        }, {
            perceived_negatively: true,
            word: "gullible"
        }, {
            perceived_negatively: false,
            word: "affectionate"
        }, {
            perceived_negatively: false,
            word: "sensitive"
        }, {
            perceived_negatively: false,
            word: "soft"
        }],
        Neuroticism_plus_Conscientiousness_minus: [{
            perceived_negatively: true,
            word: "compulsive"
        }, {
            perceived_negatively: true,
            word: "nosey"
        }, {
            perceived_negatively: true,
            word: "self-indulgent"
        }, {
            perceived_negatively: true,
            word: "forgetful"
        }, {
            perceived_negatively: true,
            word: "impulsive"
        }],
        Neuroticism_plus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "particular"
        }, {
            perceived_negatively: true,
            word: "high-strung"
        }],
        Neuroticism_plus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "guarded"
        }, {
            perceived_negatively: true,
            word: "fretful"
        }, {
            perceived_negatively: true,
            word: "insecure"
        }, {
            perceived_negatively: true,
            word: "pessimistic"
        }, {
            perceived_negatively: false,
            word: "secretive"
        }, {
            perceived_negatively: true,
            word: "fearful"
        }, {
            perceived_negatively: true,
            word: "negativistic"
        }, {
            perceived_negatively: false,
            word: "self-critical"
        }],
        Neuroticism_plus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "excitable"
        }, {
            perceived_negatively: true,
            word: "wordy"
        }, {
            perceived_negatively: false,
            word: "flirtatious"
        }, {
            perceived_negatively: true,
            word: "explosive"
        }, {
            perceived_negatively: false,
            word: "extravagant"
        }, {
            perceived_negatively: true,
            word: "volatile"
        }],
        Neuroticism_plus_Openness_minus: [{
            perceived_negatively: false,
            word: "easily rattled"
        }, {
            perceived_negatively: false,
            word: "easily irked"
        }, {
            perceived_negatively: false,
            word: "apprehensive"
        }],
        Neuroticism_plus_Openness_plus: [{
            perceived_negatively: false,
            word: "excitable"
        }, {
            perceived_negatively: false,
            word: "passionate"
        }, {
            perceived_negatively: false,
            word: "sensual"
        }],
        Openness_minus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "coarse"
        }, {
            perceived_negatively: true,
            word: "tactless"
        }, {
            perceived_negatively: true,
            word: "curt"
        }, {
            perceived_negatively: true,
            word: "narrow-minded"
        }, {
            perceived_negatively: true,
            word: "callous"
        }],
        Openness_minus_Agreeableness_plus: [{
            perceived_negatively: true,
            word: "simple"
        }, {
            perceived_negatively: true,
            word: "dependent"
        }],
        Openness_minus_Conscientiousness_minus: [{
            perceived_negatively: true,
            word: "shortsighted"
        }, {
            perceived_negatively: false,
            word: "foolhardy"
        }, {
            perceived_negatively: true,
            word: "illogical"
        }, {
            perceived_negatively: true,
            word: "immature"
        }, {
            perceived_negatively: true,
            word: "haphazard"
        }, {
            perceived_negatively: false,
            word: "lax"
        }, {
            perceived_negatively: true,
            word: "flippant"
        }],
        Openness_minus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "conventional"
        }, {
            perceived_negatively: false,
            word: "traditional"
        }],
        Openness_minus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "predictable"
        }, {
            perceived_negatively: true,
            word: "unimaginative"
        }, {
            perceived_negatively: false,
            word: "somber"
        }, {
            perceived_negatively: true,
            word: "apathetic"
        }, {
            perceived_negatively: true,
            word: "unadventurous"
        }],
        Openness_minus_Extraversion_plus: [{
            perceived_negatively: true,
            word: "verbose"
        }, {
            perceived_negatively: true,
            word: "unscrupulous"
        }, {
            perceived_negatively: true,
            word: "pompous"
        }],
        Openness_minus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "imperturbable"
        }, {
            perceived_negatively: true,
            word: "insensitive"
        }],
        Openness_minus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "easily rattled"
        }, {
            perceived_negatively: false,
            word: "easily irked"
        }, {
            perceived_negatively: false,
            word: "apprehensive"
        }],
        Openness_plus_Agreeableness_minus: [{
            perceived_negatively: false,
            word: "shrewd"
        }, {
            perceived_negatively: false,
            word: "eccentric"
        }, {
            perceived_negatively: false,
            word: "individualistic"
        }],
        Openness_plus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "idealistic"
        }, {
            perceived_negatively: false,
            word: "diplomatic"
        }, {
            perceived_negatively: false,
            word: "deep"
        }, {
            perceived_negatively: false,
            word: "tactful"
        }, {
            perceived_negatively: false,
            word: "genial"
        }],
        Openness_plus_Conscientiousness_minus: [{
            perceived_negatively: false,
            word: "unconventional"
        }, {
            perceived_negatively: false,
            word: "quirky"
        }],
        Openness_plus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "analytical"
        }, {
            perceived_negatively: false,
            word: "perceptive"
        }, {
            perceived_negatively: false,
            word: "informative"
        }, {
            perceived_negatively: false,
            word: "articulate"
        }, {
            perceived_negatively: false,
            word: "dignified"
        }, {
            perceived_negatively: false,
            word: "cultured"
        }],
        Openness_plus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "introspective"
        }, {
            perceived_negatively: false,
            word: "meditative"
        }, {
            perceived_negatively: false,
            word: "contemplating"
        }, {
            perceived_negatively: false,
            word: "self-examining"
        }, {
            perceived_negatively: false,
            word: "inner-directed"
        }],
        Openness_plus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "worldly"
        }, {
            perceived_negatively: false,
            word: "theatrical"
        }, {
            perceived_negatively: false,
            word: "eloquent"
        }, {
            perceived_negatively: false,
            word: "inquisitive"
        }, {
            perceived_negatively: false,
            word: "intense"
        }],
        Openness_plus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "creative"
        }, {
            perceived_negatively: false,
            word: "intellectual"
        }, {
            perceived_negatively: false,
            word: "insightful"
        }, {
            perceived_negatively: false,
            word: "versatile"
        }, {
            perceived_negatively: false,
            word: "inventive"
        }],
        Openness_plus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "passionate"
        }, {
            perceived_negatively: false,
            word: "excitable"
        }, {
            perceived_negatively: false,
            word: "sensual"
        }]
    },
    values: {
        Hedonism: [{
            Term: "Taking pleasure in life",
            LowDescription: "You prefer activities with a purpose greater than just personal enjoyment",
            HighDescription: "You are highly motivated to enjoy life to its fullest"
        }],
        "Self-transcendence": [{
            Term: "Helping others",
            LowDescription: "You think people can handle their own business without interference",
            HighDescription: "You think it is important to take care of the people around you"
        }, {
            Term: "Fairness",
            LowDescription: "You believe that people create their own opportunities",
            HighDescription: "You believe in social justice and equality for all"
        }, {
            Term: "Social justice",
            LowDescription: "You believe that people create their own opportunities",
            HighDescription: "You believe in social justice and equality for all"
        }, {
            Term: "Equality",
            LowDescription: "You believe that people create their own opportunities",
            HighDescription: "You believe in social justice and equality for all"
        }, {
            Term: "Community service",
            LowDescription: "You think people can handle their own business without interference",
            HighDescription: "You think it is important to take care of the people around you"
        }],
        Conservation: [{
            Term: "Tradition",
            LowDescription: "You care more about making your own path than following what others have done",
            HighDescription: "You highly respect the groups you belong to and follow their guidance"
        }, {
            Term: "Harmony",
            LowDescription: "You decide what is right based on your beliefs, not what other people think",
            HighDescription: "You know rules are there for a reason, and you try never to break them"
        }, {
            Term: "Humility",
            LowDescription: "You decide what is right based on your beliefs, not what other people think",
            HighDescription: "You see worth in deferring to others"
        }, {
            Term: "Social norms",
            LowDescription: "You decide what is right based on your beliefs, not what other people think",
            HighDescription: "You know rules are there for a reason, and you try never to break them"
        }, {
            Term: "Security",
            LowDescription: "You believe that security is worth sacrificing to achieve other goals",
            HighDescription: "You believe that safety and security are important things to safeguard"
        }, {
            Term: "Safety",
            LowDescription: "You believe that safety is worth sacrificing to achieve other goals",
            HighDescription: "You believe that safety and security are important things to safeguard"
        }],
        "Openness-to-change": [{
            Term: "Independence",
            LowDescription: "You welcome when others direct your activities for you",
            HighDescription: "You like to set your own goals to decide how to best achieve them"
        }, {
            Term: "Excitement",
            LowDescription: "You would rather stick with things you already know you like than risk trying something new and risky",
            HighDescription: "You are eager to search out new and exciting experiences"
        }, {
            Term: "Creativity",
            LowDescription: "You would rather stick with things you already know you like than risk trying something new and risky",
            HighDescription: "You are eager to search out new and exciting experiences"
        }, {
            Term: "Curiosity",
            LowDescription: "You would rather stick with things you already know you like than risk trying something new and risky",
            HighDescription: "You are eager to search out new and exciting experiences"
        }, {
            Term: "Self-direction",
            LowDescription: "You welcome when others direct your activities for you",
            HighDescription: "You like to set your own goals to decide how to best achieve them"
        }, {
            Term: "Freedom",
            LowDescription: "You welcome when others direct your activities for you",
            HighDescription: "You like to set your own goals to decide how to best achieve them"
        }],
        "Self-enhancement": [{
            Term: "Achieving success",
            LowDescription: "You make decisions with little regard for how they show off your talents",
            HighDescription: "You seek out opportunities to improve yourself and demonstrate that you are a capable person"
        }, {
            Term: "Gaining social status",
            LowDescription: "You are comfortable with your social status and don't feel a strong need to improve it",
            HighDescription: "You put substantial effort into improving your status and public image"
        }, {
            Term: "Ambition",
            LowDescription: "You are comfortable with your social status and don't feel a strong need to improve it",
            HighDescription: "You feel it is important to push forward towards goals"
        }, {
            Term: "High achievement",
            LowDescription: "You make decisions with little regard for how they show off your talents",
            HighDescription: "You seek out opportunities to improve yourself and demonstrate that you are a capable person"
        }]
    }
};

},{}],5:[function(_dereq_,module,exports){
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

"use strict";

module.exports = {
    facets: {
        "Artistic-interests": {
            HighTerm: "Una persona que aprecia el arte",
            Big5: "Apertura a experiencias",
            HighDescription: "Disfruta de la belleza y busca experiencias creativas",
            LowDescription: "Le interesan menos las actividades artísticas o creativas que la mayoría de las personas que participaron de nuestras encuestas",
            LowTerm: "Una persona desinteresada por el arte"
        },
        Dutifulness: {
            HighTerm: "Una persona que cumple con su deber",
            Big5: "Responsabilidad",
            HighDescription: "Toma las reglas y las obligaciones seriamente, aún cuando son inconvenientes",
            LowDescription: "Hace lo que quiere sin importar las reglas y las obligaciones",
            LowTerm: "Despreocupado"
        },
        Cooperation: {
            HighTerm: "Acomodaticio",
            Big5: "Afabilidad",
            HighDescription: "Es fácil de complacer e intenta evitar posibles confrontaciones",
            LowDescription: "No te importa contradecir a los demás",
            LowTerm: "Contrario"
        },
        "Self-consciousness": {
            HighTerm: "Consciente de sí mismo",
            Big5: "Rango emocional",
            HighDescription: "Es sensible a lo que las demás personas podrían estar pensando acerca de usted",
            LowDescription: "Es difícil de avergonzar y confía en sí mismo la mayor parte del tiempo",
            LowTerm: "Confiado"
        },
        Orderliness: {
            HighTerm: "Organizado",
            Big5: "Responsabilidad",
            HighDescription: "Siente una fuerte necesidad de mantener una vida estructurada",
            LowDescription: "No le dedica mucho tiempo a organizarse en su vida diaria",
            LowTerm: "Desestructurado"
        },
        Sympathy: {
            HighTerm: "Empático",
            Big5: "Afabilidad",
            HighDescription: "Siente lo que otros sienten y es compasivo con ellos",
            LowDescription: "Cree que las personas deberían confiar más en sí mismos que en otras personas",
            LowTerm: "Una persona de gran fortaleza"
        },
        "Activity-level": {
            HighTerm: "Energético",
            Big5: "Extraversión",
            HighDescription: "Disfruta llevar un ritmo de vida acelerado, una agenda ocupada con muchas actividades",
            LowDescription: "Aprecia llevar un ritmo de vida relajado",
            LowTerm: "Relajado"
        },
        "Self-efficacy": {
            HighTerm: "Seguro de sí mismo",
            Big5: "Responsabilidad",
            HighDescription: "Siente que tiene la habilidad de triunfar en las tareas que se propone realizar",
            LowDescription: "Frecuentemente duda acerca de su habilidad para alcanzar sus metas",
            LowTerm: "Inseguro de sí misma"
        },
        "Self-discipline": {
            HighTerm: "Persistente",
            Big5: "Responsabilidad",
            HighDescription: "Puede hacer frente y llevar a cabo tareas difíciles",
            LowDescription: "Le da trabajo llevar adelante tareas difíciles por un largo periodo de tiempo",
            LowTerm: "Intermitente"
        },
        Altruism: {
            HighTerm: "Altruista",
            Big5: "Afabilidad",
            HighDescription: "Se siente realizado ayudando a otros y dejará sus cosas de lado para hacerlo",
            LowDescription: "Está más enfocado en cuidar de usted mismo que en dedicar tiempo a otras personas",
            LowTerm: "Individualista"
        },
        Cautiousness: {
            HighTerm: "Prudente",
            Big5: "Responsabilidad",
            HighDescription: "Piensa cuidadosamente acerca de sus decisiones antes de tomarlas",
            LowDescription: "Prefiere tomar acción inmediatamente antes que invertir tiempo deliberando qué decisión tomar",
            LowTerm: "Audaz"
        },
        Morality: {
            HighTerm: "Intransigente",
            Big5: "Afabilidad",
            HighDescription: "Piensa que está mal tomar ventaja de los demás para avanzar",
            LowDescription: "Utiliza cualquier medio posible para conseguir lo que quiere y está cómodo con ello",
            LowTerm: "Una persona comprometida"
        },
        Anxiety: {
            HighTerm: "Propenso a preocuparse",
            Big5: "Rango emocional",
            HighDescription: "Tiende a preocuparse acerca de las cosas que podrían pasar",
            LowDescription: "Tiende a sentirse tranquilo y a confiar en sí mismo",
            LowTerm: "Seguro de sí mismo"
        },
        Emotionality: {
            HighTerm: "Emocionalmente consciente",
            Big5: "Apertura a experiencias",
            HighDescription: "Es consciente de sus sentimientos y de cómo expresarlos",
            LowDescription: "No piensa frecuentemente acerca de sus emociones ni las expresa abiertamente",
            LowTerm: "Desapasionado"
        },
        Vulnerability: {
            HighTerm: "Susceptible al estrés",
            Big5: "Rango emocional",
            HighDescription: "Se abruma fácilmente en situaciones de estrés",
            LowDescription: "Maneja eventos inesperados con calma y efectivamente",
            LowTerm: "Una persona que mantiene la calma bajo presión"
        },
        Immoderation: {
            HighTerm: "Hedonista",
            Big5: "Rango emocional",
            HighDescription: "Siente fuertemente sus deseos y es fácilmente tentado por ellos",
            LowDescription: "Controla sus deseos, los cuales no son particularmente intensos",
            LowTerm: "Sereno"
        },
        Friendliness: {
            HighTerm: "Extrovertido",
            Big5: "Extraversión",
            HighDescription: "Hace amigos fácilmente y se siente cómodo estando con otras personas",
            LowDescription: "Es una persona reservada y no deja a muchas personas entrar",
            LowTerm: "Reservado"
        },
        "Achievement-striving": {
            HighTerm: "Una persona motivada",
            Big5: "Responsabilidad",
            HighDescription: "Se propone grandes metas y trabaja duro para alcanzarlas",
            LowDescription: "Está conforme con sus logros y no siente la necesidad de ponerse metas más ambiciosas",
            LowTerm: "Una persona satisfecha"
        },
        Modesty: {
            HighTerm: "Modesto",
            Big5: "Afabilidad",
            HighDescription: "Se siente cómodo siendo el centro de atención",
            LowDescription: "Se tiene una estima alta, se encuentra satisfecho con quién es",
            LowTerm: "Orgulloso"
        },
        "Excitement-seeking": {
            HighTerm: "Una persona que busca la emoción",
            Big5: "Extraversión",
            HighDescription: "Le emociona tomar riesgos y se aburre si no se ve envuelto en mucha acción",
            LowDescription: "Prefiere las actividades tranquilas, pacíficas y seguras",
            LowTerm: "Una persona que busca la calma"
        },
        Assertiveness: {
            HighTerm: "Asertivo",
            Big5: "Extraversión",
            HighDescription: "Tiende a expresarse y a hacerse cargo de las situaciones, y se encuentra cómodo liderando grupos",
            LowDescription: "Prefiere escuchar antes que hablar, especialmente en situaciones de grupo",
            LowTerm: "Callado"
        },
        Adventurousness: {
            HighTerm: "Audaz",
            Big5: "Apertura a experiencias",
            HighDescription: "Está deseoso de tener nuevas experiencias",
            LowDescription: "Disfruta de las rutinas familiares y prefiere no desviarse de ellas",
            LowTerm: "Consistente"
        },
        Gregariousness: {
            HighTerm: "Sociable",
            Big5: "Extraversión",
            HighDescription: "Disfruta estando en compañía de otros",
            LowDescription: "Tiene un fuerte deseo de tener tiempo para usted mismo",
            LowTerm: "Independiente"
        },
        Cheerfulness: {
            HighTerm: "Alegre",
            Big5: "Extraversión",
            HighDescription: "Es una persona alegre y comparte esa alegría con el mundo",
            LowDescription: "Generalmente es serio y no hace muchas bromas",
            LowTerm: "Solemne"
        },
        Imagination: {
            HighTerm: "Imaginativo",
            Big5: "Apertura a experiencias",
            HighDescription: "Su imaginación vuela libre",
            LowDescription: "Prefiere hechos antes que la fantasía",
            LowTerm: "Una persona con los pies en la tierra"
        },
        Depression: {
            HighTerm: "Melancólico",
            Big5: "Rango emocional",
            HighDescription: "Piensa bastante seguido en las cosas con las que está disconforme",
            LowDescription: "Generalmente se acepta a usted mismo tal cual es",
            LowTerm: "Una persona satisfecha"
        },
        Anger: {
            HighTerm: "Intenso",
            Big5: "Rango emocional",
            HighDescription: "Tiene un temperamento fuerte, especialmente cuando las cosas no funcionan como espera",
            LowDescription: "Es difícil hacerle enojar",
            LowTerm: "Apacible"
        },
        Trust: {
            HighTerm: "Una persona que confía en los demás",
            Big5: "Afabilidad",
            HighDescription: "Cree lo mejor de los demás y confía fácilmente en las personas",
            LowDescription: "Se cuida de las intenciones de los demás y no confía fácilmente",
            LowTerm: "Cuidadoso con los demás"
        },
        Intellect: {
            HighTerm: "Filosófico",
            Big5: "Apertura a experiencias",
            HighDescription: "Está abierto a nuevas ideas, le intrigan y ama explorarlas",
            LowDescription: "Prefiere lidiar con el mundo tal cual es, raramente considerando ideas abstractas",
            LowTerm: "Concreto"
        },
        Liberalism: {
            HighTerm: "Desafiante ante la autoridad",
            Big5: "Apertura a experiencias",
            HighDescription: "Prefiere desafiar a la autoridad y  a los valores tradicionales para lograr cambios positivos",
            LowDescription: "Prefiere seguir tradiciones para mantener una sensación de estabilidad",
            LowTerm: "Respetuoso de la autoridad"
        }
    },
    needs: {
        Stability: ["estabilidad", "autenticidad", "integridad"],
        Practicality: ["eficiencia", "practicidad", "valor agregado", "conveniencia"],
        Love: ["afinidad", "conexión"],
        "Self-expression": ["auto-expresión", "empoderamiento personal", "fortaleza personal"],
        Challenge: ["prestigio", "competencia", "gloria"],
        Closeness: ["pertenencia", "nostalgia", "intimidad"],
        Liberty: ["modernidad", "expansión de posibilidades", "poder escapar", "espontaneidad", "novedad"],
        Excitement: ["regocijo", "anticipación", "cebración"],
        Ideal: ["sofisticación", "espiritualidad", "superioridad", "realización"],
        Harmony: ["bienestar", "cortesía", "civilidad"],
        Curiosity: ["descubrimiento", "maestría", "adquisición de conocimiento"],
        Structure: ["organización", "franqueza", "claridad", "confiabilidad"]
    },
    phrases: {
        "You are %s": "Usted es %s",
        "You are %s and %s": "Usted es %s y %s",
        "You are %s, %s and %s": "Usted es %s, %s y %s",
        "And you are %s": "Y usted es %s",
        "You are relatively unconcerned with %s": "Usted es relativamente indiferente con %s",
        "You are relatively unconcerned with both %s and %s": "Usted es relativamente indiferente con %s y %s",
        "You don't find %s to be particularly motivating for you": "Usted no encuentra a %s particularmente motivante para usted",
        "You don't find either %s or %s to be particularly motivating for you": "Usted no encuentra a %s o %s particularmente motivantes para usted",
        "You value both %s a bit": "Usted valora a %s un poco",
        "You value both %s and %s a bit": "Usted valora a %s y %s un poco",
        "You consider %s to guide a large part of what you do": "Usted considera que %s lo guia en gran parte de lo que hace",
        "You consider both %s and %s to guide a large part of what you do": "Usted considera que %s y %s lo guian en gran parte de lo que hace",
        "And %s": "Y %s",
        "Experiences that make you feel high %s are generally unappealing to you": "No le agradan las experiencias que le dan una gran sensación de %s",
        "Experiences that give a sense of %s hold some appeal to you": "Le agradan las experiencias que le dan una sensación de %s",
        "You are motivated to seek out experiences that provide a strong feeling of %s": "Está motivado a buscar experiencias que lo provean de una fuerte sensación de %s",
        "Your choices are driven by a desire for %s": "Sus elecciones están determinadas por un deseo de %s",
        "a bit %s": "un poco %s",
        "somewhat %s": "algo %s",
        "can be perceived as %s": "puede ser percibido como %s"
    },
    traits: {
        Agreeableness_minus_Conscientiousness_minus: [{
            perceived_negatively: true,
            word: "desconsiderado"
        }, {
            perceived_negatively: true,
            word: "descortés"
        }, {
            perceived_negatively: true,
            word: "desconfiado"
        }, {
            perceived_negatively: true,
            word: "poco cooperativo"
        }, {
            perceived_negatively: true,
            word: "irreflexivo"
        }],
        Agreeableness_minus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "estricto"
        }, {
            perceived_negatively: false,
            word: "rígido"
        }, {
            perceived_negatively: true,
            word: "duro"
        }],
        Agreeableness_minus_Extraversion_minus: [{
            perceived_negatively: true,
            word: "cínico"
        }, {
            perceived_negatively: true,
            word: "cauto con los demás"
        }, {
            perceived_negatively: true,
            word: "solitario"
        }, {
            perceived_negatively: true,
            word: "desapegado"
        }, {
            perceived_negatively: true,
            word: "impersonal"
        }, {
            perceived_negatively: true,
            word: "sombrío"
        }],
        Agreeableness_minus_Extraversion_plus: [{
            perceived_negatively: true,
            word: "obstinado"
        }, {
            perceived_negatively: true,
            word: "abrupto"
        }, {
            perceived_negatively: true,
            word: "crudo"
        }, {
            perceived_negatively: true,
            word: "combativo"
        }, {
            perceived_negatively: true,
            word: "duro"
        }, {
            perceived_negatively: false,
            word: "astuto"
        }, {
            perceived_negatively: true,
            word: "manipulador"
        }, {
            perceived_negatively: true,
            word: "hosco"
        }, {
            perceived_negatively: true,
            word: "taimado"
        }],
        Agreeableness_minus_Neuroticism_minus: [{
            perceived_negatively: true,
            word: "insensible"
        }, {
            perceived_negatively: true,
            word: "poco afectuoso"
        }, {
            perceived_negatively: true,
            word: "desapasionado"
        }, {
            perceived_negatively: true,
            word: "una persona sin emociones"
        }],
        Agreeableness_minus_Neuroticism_plus: [{
            perceived_negatively: true,
            word: "crítico"
        }, {
            perceived_negatively: true,
            word: "egoísta"
        }, {
            perceived_negatively: true,
            word: "de mal genio"
        }, {
            perceived_negatively: true,
            word: "antagonista"
        }, {
            perceived_negatively: true,
            word: "gruñón"
        }, {
            perceived_negatively: true,
            word: "amargado"
        }, {
            perceived_negatively: true,
            word: "desagradable"
        }, {
            perceived_negatively: true,
            word: "exigente"
        }],
        Agreeableness_minus_Openness_minus: [{
            perceived_negatively: true,
            word: "tosco"
        }, {
            perceived_negatively: true,
            word: "una persona sin tacto"
        }, {
            perceived_negatively: true,
            word: "brusco"
        }, {
            perceived_negatively: true,
            word: "cerrado"
        }, {
            perceived_negatively: true,
            word: "áspero"
        }, {
            perceived_negatively: true,
            word: "implacable"
        }, {
            perceived_negatively: true,
            word: "poco caritativo"
        }, {
            perceived_negatively: true,
            word: "vengativo"
        }],
        Agreeableness_minus_Openness_plus: [{
            perceived_negatively: false,
            word: "perspicaz"
        }, {
            perceived_negatively: false,
            word: "excéntrico"
        }, {
            perceived_negatively: false,
            word: "individualista"
        }],
        Agreeableness_plus_Conscientiousness_minus: [{
            perceived_negatively: false,
            word: "sobrio"
        }, {
            perceived_negatively: false,
            word: "modesto"
        }],
        Agreeableness_plus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "servicial"
        }, {
            perceived_negatively: false,
            word: "cooperativo"
        }, {
            perceived_negatively: false,
            word: "considerado"
        }, {
            perceived_negatively: false,
            word: "respetuoso"
        }, {
            perceived_negatively: false,
            word: "cortés"
        }, {
            perceived_negatively: false,
            word: "sensato"
        }, {
            perceived_negatively: false,
            word: "atento"
        }, {
            perceived_negatively: false,
            word: "considerado"
        }, {
            perceived_negatively: false,
            word: "leal"
        }, {
            perceived_negatively: false,
            word: "moral"
        }],
        Agreeableness_plus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "conmovible"
        }, {
            perceived_negatively: false,
            word: "agradable"
        }, {
            perceived_negatively: false,
            word: "servicial"
        }, {
            perceived_negatively: false,
            word: "humilde"
        }, {
            perceived_negatively: true,
            word: "indulgente"
        }],
        Agreeableness_plus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "efervescente"
        }, {
            perceived_negatively: false,
            word: "alegre"
        }, {
            perceived_negatively: false,
            word: "amistoso"
        }, {
            perceived_negatively: false,
            word: "alegre"
        }, {
            perceived_negatively: false,
            word: "jovial"
        }, {
            perceived_negatively: false,
            word: "jocoso"
        }],
        Agreeableness_plus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "generoso"
        }, {
            perceived_negatively: false,
            word: "agradable"
        }, {
            perceived_negatively: false,
            word: "tolerante"
        }, {
            perceived_negatively: false,
            word: "pacífico"
        }, {
            perceived_negatively: false,
            word: "flexible"
        }, {
            perceived_negatively: false,
            word: "fácil de tratar"
        }, {
            perceived_negatively: false,
            word: "justo"
        }, {
            perceived_negatively: false,
            word: "caritativo"
        }, {
            perceived_negatively: false,
            word: "confiable"
        }],
        Agreeableness_plus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "sentimental"
        }, {
            perceived_negatively: false,
            word: "cariñoso"
        }, {
            perceived_negatively: false,
            word: "sensible"
        }, {
            perceived_negatively: false,
            word: "tierno"
        }, {
            perceived_negatively: false,
            word: "apasionado"
        }, {
            perceived_negatively: false,
            word: "romántico"
        }],
        Agreeableness_plus_Openness_minus: [{
            perceived_negatively: true,
            word: "dependiente"
        }, {
            perceived_negatively: true,
            word: "simple"
        }],
        Agreeableness_plus_Openness_plus: [{
            perceived_negatively: false,
            word: "amistoso"
        }, {
            perceived_negatively: false,
            word: "una persona con tacto"
        }, {
            perceived_negatively: false,
            word: "diplomático"
        }, {
            perceived_negatively: false,
            word: "profundo"
        }, {
            perceived_negatively: false,
            word: "idealista"
        }],
        Conscientiousness_minus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "arrebatado"
        }, {
            perceived_negatively: true,
            word: "poco cooperativo"
        }, {
            perceived_negatively: true,
            word: "poco fiable"
        }, {
            perceived_negatively: true,
            word: "desconfiado"
        }, {
            perceived_negatively: true,
            word: "irreflexivo"
        }],
        Conscientiousness_minus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "poco pretencioso"
        }, {
            perceived_negatively: false,
            word: "modesto"
        }],
        Conscientiousness_minus_Extraversion_minus: [{
            perceived_negatively: true,
            word: "indeciso"
        }, {
            perceived_negatively: true,
            word: "una persona sin propósito"
        }, {
            perceived_negatively: false,
            word: "una persona sin carácter"
        }, {
            perceived_negatively: false,
            word: "una persona sin compromiso"
        }, {
            perceived_negatively: true,
            word: "poco ambicioso"
        }],
        Conscientiousness_minus_Extraversion_plus: [{
            perceived_negatively: true,
            word: "revoltoso"
        }, {
            perceived_negatively: false,
            word: "bullicioso"
        }, {
            perceived_negatively: true,
            word: "temerario"
        }, {
            perceived_negatively: true,
            word: "tumultuoso"
        }, {
            perceived_negatively: false,
            word: "demostrativo"
        }],
        Conscientiousness_minus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "informal"
        }, {
            perceived_negatively: false,
            word: "de bajo perfil"
        }],
        Conscientiousness_minus_Neuroticism_plus: [{
            perceived_negatively: true,
            word: "atolondrado"
        }, {
            perceived_negatively: true,
            word: "inconsistente"
        }, {
            perceived_negatively: true,
            word: "errático"
        }, {
            perceived_negatively: true,
            word: "olvidadizo"
        }, {
            perceived_negatively: true,
            word: "impulsivo"
        }, {
            perceived_negatively: true,
            word: "frívolo"
        }],
        Conscientiousness_minus_Openness_minus: [{
            perceived_negatively: false,
            word: "temerario"
        }, {
            perceived_negatively: true,
            word: "ilógico"
        }, {
            perceived_negatively: true,
            word: "inmaduro"
        }, {
            perceived_negatively: true,
            word: "azaroso"
        }, {
            perceived_negatively: false,
            word: "laxo"
        }, {
            perceived_negatively: true,
            word: "indisciplinado"
        }],
        Conscientiousness_minus_Openness_plus: [{
            perceived_negatively: false,
            word: "poco convencional"
        }, {
            perceived_negatively: false,
            word: "peculiar"
        }],
        Conscientiousness_plus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "inflexible"
        }, {
            perceived_negatively: false,
            word: "estricto"
        }, {
            perceived_negatively: false,
            word: "rígido"
        }],
        Conscientiousness_plus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "confiable"
        }, {
            perceived_negatively: false,
            word: "responsable"
        }, {
            perceived_negatively: false,
            word: "seguro"
        }, {
            perceived_negatively: false,
            word: "educado"
        }, {
            perceived_negatively: false,
            word: "considerado"
        }],
        Conscientiousness_plus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "cauto"
        }, {
            perceived_negatively: false,
            word: "seguro"
        }, {
            perceived_negatively: false,
            word: "exacto"
        }, {
            perceived_negatively: false,
            word: "formal"
        }, {
            perceived_negatively: false,
            word: "ahorrativo"
        }, {
            perceived_negatively: false,
            word: "principista"
        }],
        Conscientiousness_plus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "ambicioso"
        }, {
            perceived_negatively: false,
            word: "alerta"
        }, {
            perceived_negatively: false,
            word: "firme"
        }, {
            perceived_negatively: false,
            word: "decidido"
        }, {
            perceived_negatively: false,
            word: "competitivo"
        }],
        Conscientiousness_plus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "minucioso"
        }, {
            perceived_negatively: false,
            word: "estable"
        }, {
            perceived_negatively: false,
            word: "consistente"
        }, {
            perceived_negatively: false,
            word: "disciplinado"
        }, {
            perceived_negatively: false,
            word: "lógico"
        }, {
            perceived_negatively: false,
            word: "decidido"
        }, {
            perceived_negatively: false,
            word: "controlado"
        }, {
            perceived_negatively: false,
            word: "conciso"
        }],
        Conscientiousness_plus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "detallista"
        }, {
            perceived_negatively: true,
            word: "excitable"
        }],
        Conscientiousness_plus_Openness_minus: [{
            perceived_negatively: false,
            word: "tradicional"
        }, {
            perceived_negatively: false,
            word: "convencional"
        }],
        Conscientiousness_plus_Openness_plus: [{
            perceived_negatively: false,
            word: "sofisticado"
        }, {
            perceived_negatively: false,
            word: "perfeccionista"
        }, {
            perceived_negatively: false,
            word: "industrioso"
        }, {
            perceived_negatively: false,
            word: "digno"
        }, {
            perceived_negatively: false,
            word: "refinado"
        }, {
            perceived_negatively: false,
            word: "culto"
        }, {
            perceived_negatively: false,
            word: "previsor"
        }],
        Extraversion_minus_Agreeableness_minus: [{
            perceived_negatively: false,
            word: "escéptico"
        }, {
            perceived_negatively: false,
            word: "cauto con los demás"
        }, {
            perceived_negatively: true,
            word: "solitario"
        }, {
            perceived_negatively: true,
            word: "poco comunicativo"
        }, {
            perceived_negatively: true,
            word: "antisocial"
        }, {
            perceived_negatively: true,
            word: "sombrío"
        }, {
            perceived_negatively: true,
            word: "desinteresado"
        }, {
            perceived_negatively: false,
            word: "apartado"
        }],
        Extraversion_minus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "pacífico"
        }, {
            perceived_negatively: false,
            word: "humilde"
        }, {
            perceived_negatively: false,
            word: "sumiso"
        }, {
            perceived_negatively: false,
            word: "tímido"
        }, {
            perceived_negatively: false,
            word: "obediente"
        }, {
            perceived_negatively: false,
            word: "ingenuo"
        }],
        Extraversion_minus_Conscientiousness_minus: [{
            perceived_negatively: true,
            word: "indirecto"
        }, {
            perceived_negatively: true,
            word: "débil"
        }, {
            perceived_negatively: true,
            word: "perezoso"
        }, {
            perceived_negatively: true,
            word: "poco persistente"
        }, {
            perceived_negatively: true,
            word: "vago"
        }],
        Extraversion_minus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "moderado"
        }, {
            perceived_negatively: false,
            word: "serio"
        }, {
            perceived_negatively: false,
            word: "discreto"
        }, {
            perceived_negatively: false,
            word: "cauteloso"
        }, {
            perceived_negatively: false,
            word: "principista"
        }],
        Extraversion_minus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "tranquilo"
        }, {
            perceived_negatively: false,
            word: "sosegado"
        }, {
            perceived_negatively: false,
            word: "plácido"
        }, {
            perceived_negatively: false,
            word: "imparcial"
        }, {
            perceived_negatively: false,
            word: "modesto"
        }, {
            perceived_negatively: false,
            word: "condescendiente"
        }],
        Extraversion_minus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "desconfiado"
        }, {
            perceived_negatively: false,
            word: "pesimista"
        }, {
            perceived_negatively: false,
            word: "reservado"
        }, {
            perceived_negatively: true,
            word: "cobarde"
        }, {
            perceived_negatively: false,
            word: "callado"
        }],
        Extraversion_minus_Openness_minus: [{
            perceived_negatively: false,
            word: "sombrío"
        }, {
            perceived_negatively: true,
            word: "manso"
        }, {
            perceived_negatively: true,
            word: "poco aventurero"
        }, {
            perceived_negatively: false,
            word: "pasivo"
        }, {
            perceived_negatively: true,
            word: "apático"
        }, {
            perceived_negatively: false,
            word: "dócil"
        }],
        Extraversion_minus_Openness_plus: [{
            perceived_negatively: false,
            word: "una persona guiada por su propia consciencia y valores"
        }, {
            perceived_negatively: false,
            word: "introspectivo"
        }, {
            perceived_negatively: false,
            word: "pensativo"
        }, {
            perceived_negatively: false,
            word: "contemplativo"
        }, {
            perceived_negatively: false,
            word: "introspectivo"
        }],
        Extraversion_plus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "terco"
        }, {
            perceived_negatively: true,
            word: "vigoroso"
        }, {
            perceived_negatively: true,
            word: "dominador"
        }, {
            perceived_negatively: true,
            word: "presumido"
        }, {
            perceived_negatively: true,
            word: "mandón"
        }, {
            perceived_negatively: false,
            word: "dominante"
        }, {
            perceived_negatively: false,
            word: "astuto"
        }],
        Extraversion_plus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "social"
        }, {
            perceived_negatively: false,
            word: "enérgico"
        }, {
            perceived_negatively: false,
            word: "entusiasta"
        }, {
            perceived_negatively: false,
            word: "comunicativo"
        }, {
            perceived_negatively: false,
            word: "vibrante"
        }, {
            perceived_negatively: false,
            word: "espirituoso"
        }, {
            perceived_negatively: false,
            word: "magnético"
        }, {
            perceived_negatively: false,
            word: "entusiasta"
        }],
        Extraversion_plus_Conscientiousness_minus: [{
            perceived_negatively: false,
            word: "bullicioso"
        }, {
            perceived_negatively: false,
            word: "travieso"
        }, {
            perceived_negatively: false,
            word: "exhibicionista"
        }, {
            perceived_negatively: false,
            word: "gregario"
        }, {
            perceived_negatively: false,
            word: "demostrativo"
        }],
        Extraversion_plus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "activo"
        }, {
            perceived_negatively: false,
            word: "competitivo"
        }, {
            perceived_negatively: false,
            word: "persistente"
        }, {
            perceived_negatively: false,
            word: "ambicioso"
        }, {
            perceived_negatively: false,
            word: "decidido"
        }],
        Extraversion_plus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "confiado"
        }, {
            perceived_negatively: false,
            word: "audaz"
        }, {
            perceived_negatively: false,
            word: "seguro"
        }, {
            perceived_negatively: false,
            word: "desinhibido"
        }, {
            perceived_negatively: false,
            word: "valiente"
        }, {
            perceived_negatively: false,
            word: "valiente"
        }, {
            perceived_negatively: false,
            word: "una persona satisfecha de si misma"
        }, {
            perceived_negatively: false,
            word: "vigoroso"
        }, {
            perceived_negatively: false,
            word: "fuerte"
        }],
        Extraversion_plus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "explosivo"
        }, {
            perceived_negatively: true,
            word: "verborrágico"
        }, {
            perceived_negatively: false,
            word: "extravagante"
        }, {
            perceived_negatively: true,
            word: "volátil"
        }, {
            perceived_negatively: false,
            word: "coqueto"
        }],
        Extraversion_plus_Openness_minus: [{
            perceived_negatively: true,
            word: "verborrágico"
        }, {
            perceived_negatively: true,
            word: "inescrupuloso"
        }, {
            perceived_negatively: true,
            word: "pomposo"
        }],
        Extraversion_plus_Openness_plus: [{
            perceived_negatively: false,
            word: "expresivo"
        }, {
            perceived_negatively: false,
            word: "cándido"
        }, {
            perceived_negatively: false,
            word: "dramático"
        }, {
            perceived_negatively: false,
            word: "espontáneo"
        }, {
            perceived_negatively: false,
            word: "ingenioso"
        }, {
            perceived_negatively: false,
            word: "oportunista"
        }, {
            perceived_negatively: false,
            word: "independiente"
        }],
        Neuroticism_minus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "poco emocional"
        }, {
            perceived_negatively: true,
            word: "insensible"
        }, {
            perceived_negatively: true,
            word: "poco cariñoso"
        }, {
            perceived_negatively: true,
            word: "desapasionado"
        }],
        Neuroticism_minus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "paciente"
        }, {
            perceived_negatively: false,
            word: "relajado"
        }, {
            perceived_negatively: false,
            word: "poco exigente"
        }, {
            perceived_negatively: false,
            word: "realista"
        }, {
            perceived_negatively: false,
            word: "optimista"
        }, {
            perceived_negatively: false,
            word: "modesto"
        }, {
            perceived_negatively: false,
            word: "poco crítico"
        }, {
            perceived_negatively: false,
            word: "poco pretencioso"
        }],
        Neuroticism_minus_Conscientiousness_minus: [{
            perceived_negatively: false,
            word: "informal"
        }, {
            perceived_negatively: false,
            word: "de perfil bajo"
        }],
        Neuroticism_minus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "racional"
        }, {
            perceived_negatively: false,
            word: "objetivo"
        }, {
            perceived_negatively: false,
            word: "estable"
        }, {
            perceived_negatively: false,
            word: "lógico"
        }, {
            perceived_negatively: false,
            word: "decidido"
        }, {
            perceived_negatively: false,
            word: "preparado"
        }, {
            perceived_negatively: false,
            word: "conciso"
        }, {
            perceived_negatively: false,
            word: "exhaustivo"
        }, {
            perceived_negatively: false,
            word: "económico"
        }, {
            perceived_negatively: false,
            word: "disciplinado"
        }],
        Neuroticism_minus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "modesto"
        }, {
            perceived_negatively: true,
            word: "poco excitable"
        }, {
            perceived_negatively: false,
            word: "plácido"
        }, {
            perceived_negatively: false,
            word: "tranquilo"
        }],
        Neuroticism_minus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "inconsciente de si mismo"
        }, {
            perceived_negatively: false,
            word: "incansable"
        }, {
            perceived_negatively: false,
            word: "infatigable"
        }],
        Neuroticism_minus_Openness_minus: [{
            perceived_negatively: false,
            word: "imperturbable"
        }, {
            perceived_negatively: true,
            word: "insensible"
        }],
        Neuroticism_minus_Openness_plus: [{
            perceived_negatively: false,
            word: "sentido"
        }, {
            perceived_negatively: false,
            word: "versátil"
        }, {
            perceived_negatively: false,
            word: "creativo"
        }, {
            perceived_negatively: false,
            word: "intelectual"
        }, {
            perceived_negatively: false,
            word: "perspicaz"
        }],
        Neuroticism_plus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "temperamental"
        }, {
            perceived_negatively: true,
            word: "irritable"
        }, {
            perceived_negatively: true,
            word: "peleador"
        }, {
            perceived_negatively: true,
            word: "impaciente"
        }, {
            perceived_negatively: true,
            word: "gruñón"
        }, {
            perceived_negatively: true,
            word: "malhumorado"
        }, {
            perceived_negatively: true,
            word: "irritable"
        }],
        Neuroticism_plus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "emotivo"
        }, {
            perceived_negatively: true,
            word: "crédulo"
        }, {
            perceived_negatively: false,
            word: "cariñoso"
        }, {
            perceived_negatively: false,
            word: "sensible"
        }, {
            perceived_negatively: false,
            word: "blando"
        }],
        Neuroticism_plus_Conscientiousness_minus: [{
            perceived_negatively: true,
            word: "compulsivo"
        }, {
            perceived_negatively: true,
            word: "inquisitivo"
        }, {
            perceived_negatively: true,
            word: "desenfrenado"
        }, {
            perceived_negatively: true,
            word: "olvidadizo"
        }, {
            perceived_negatively: true,
            word: "impulsivo"
        }],
        Neuroticism_plus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "detallista"
        }, {
            perceived_negatively: true,
            word: "excitable"
        }],
        Neuroticism_plus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "guardado"
        }, {
            perceived_negatively: true,
            word: "irritable"
        }, {
            perceived_negatively: true,
            word: "inseguro"
        }, {
            perceived_negatively: true,
            word: "pesimista"
        }, {
            perceived_negatively: false,
            word: "reservado"
        }, {
            perceived_negatively: true,
            word: "temeroso"
        }, {
            perceived_negatively: true,
            word: "negativo"
        }, {
            perceived_negatively: false,
            word: "auto-crítico"
        }],
        Neuroticism_plus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "excitable"
        }, {
            perceived_negatively: true,
            word: "verborrágico"
        }, {
            perceived_negatively: false,
            word: "coqueto"
        }, {
            perceived_negatively: true,
            word: "explosivo"
        }, {
            perceived_negatively: false,
            word: "extravagante"
        }, {
            perceived_negatively: true,
            word: "volátil"
        }],
        Neuroticism_plus_Openness_minus: [{
            perceived_negatively: false,
            word: "irritable"
        }, {
            perceived_negatively: false,
            word: "fastidioso"
        }, {
            perceived_negatively: false,
            word: "aprensivo"
        }],
        Neuroticism_plus_Openness_plus: [{
            perceived_negatively: false,
            word: "excitable"
        }, {
            perceived_negatively: false,
            word: "apasionado"
        }, {
            perceived_negatively: false,
            word: "sensual"
        }],
        Openness_minus_Agreeableness_minus: [{
            perceived_negatively: true,
            word: "ordinario"
        }, {
            perceived_negatively: true,
            word: "sin tacto"
        }, {
            perceived_negatively: true,
            word: "brusco"
        }, {
            perceived_negatively: true,
            word: "cerrado"
        }, {
            perceived_negatively: true,
            word: "duro"
        }],
        Openness_minus_Agreeableness_plus: [{
            perceived_negatively: true,
            word: "simple"
        }, {
            perceived_negatively: true,
            word: "dependiente"
        }],
        Openness_minus_Conscientiousness_minus: [{
            perceived_negatively: true,
            word: "cortoplacista"
        }, {
            perceived_negatively: false,
            word: "temerario"
        }, {
            perceived_negatively: true,
            word: "ilógico"
        }, {
            perceived_negatively: true,
            word: "inmaduro"
        }, {
            perceived_negatively: true,
            word: "azaroso"
        }, {
            perceived_negatively: false,
            word: "laxo"
        }, {
            perceived_negatively: true,
            word: "irrespetuoso"
        }],
        Openness_minus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "convencional"
        }, {
            perceived_negatively: false,
            word: "tradicional"
        }],
        Openness_minus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "predecible"
        }, {
            perceived_negatively: true,
            word: "poco imaginativo"
        }, {
            perceived_negatively: false,
            word: "sombrío"
        }, {
            perceived_negatively: true,
            word: "apático"
        }, {
            perceived_negatively: true,
            word: "poco aventurero"
        }],
        Openness_minus_Extraversion_plus: [{
            perceived_negatively: true,
            word: "verborrágico"
        }, {
            perceived_negatively: true,
            word: "inescrupuloso"
        }, {
            perceived_negatively: true,
            word: "pomposo"
        }],
        Openness_minus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "imperturbable"
        }, {
            perceived_negatively: true,
            word: "insensible"
        }],
        Openness_minus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "irritable"
        }, {
            perceived_negatively: false,
            word: "fastidioso"
        }, {
            perceived_negatively: false,
            word: "aprensivo"
        }],
        Openness_plus_Agreeableness_minus: [{
            perceived_negatively: false,
            word: "perspicaz"
        }, {
            perceived_negatively: false,
            word: "excéntrico"
        }, {
            perceived_negatively: false,
            word: "individualista"
        }],
        Openness_plus_Agreeableness_plus: [{
            perceived_negatively: false,
            word: "idealista"
        }, {
            perceived_negatively: false,
            word: "diplomático"
        }, {
            perceived_negatively: false,
            word: "profundo"
        }, {
            perceived_negatively: false,
            word: "una persona con tacto"
        }, {
            perceived_negatively: false,
            word: "amistoso"
        }],
        Openness_plus_Conscientiousness_minus: [{
            perceived_negatively: false,
            word: "poco convencional"
        }, {
            perceived_negatively: false,
            word: "peculiar"
        }],
        Openness_plus_Conscientiousness_plus: [{
            perceived_negatively: false,
            word: "analítico"
        }, {
            perceived_negatively: false,
            word: "perceptivo"
        }, {
            perceived_negatively: false,
            word: "informativo"
        }, {
            perceived_negatively: false,
            word: "grandilocuente"
        }, {
            perceived_negatively: false,
            word: "digno"
        }, {
            perceived_negatively: false,
            word: "culto"
        }],
        Openness_plus_Extraversion_minus: [{
            perceived_negatively: false,
            word: "introspectivo"
        }, {
            perceived_negatively: false,
            word: "meditativo"
        }, {
            perceived_negatively: false,
            word: "contemplativo"
        }, {
            perceived_negatively: false,
            word: "introspectivo"
        }, {
            perceived_negatively: false,
            word: "pensativo"
        }],
        Openness_plus_Extraversion_plus: [{
            perceived_negatively: false,
            word: "mundano"
        }, {
            perceived_negatively: false,
            word: "exagerado"
        }, {
            perceived_negatively: false,
            word: "elocuente"
        }, {
            perceived_negatively: false,
            word: "inquisitivo"
        }, {
            perceived_negatively: false,
            word: "intenso"
        }],
        Openness_plus_Neuroticism_minus: [{
            perceived_negatively: false,
            word: "creativo"
        }, {
            perceived_negatively: false,
            word: "intelectual"
        }, {
            perceived_negatively: false,
            word: "perspicaz"
        }, {
            perceived_negatively: false,
            word: "versátil"
        }, {
            perceived_negatively: false,
            word: "inventivo"
        }],
        Openness_plus_Neuroticism_plus: [{
            perceived_negatively: false,
            word: "apasionado"
        }, {
            perceived_negatively: false,
            word: "excitable"
        }, {
            perceived_negatively: false,
            word: "sensual"
        }]
    },
    values: {
        Hedonism: [{
            Term: "Disfrutar de la vida",
            LowDescription: "Prefiere actividades con un propósito más grande que el sólo deleite personal",
            HighDescription: "Tiene gran motivación por disfrutar la vida en su plenitud"
        }],
        "Self-transcendence": [{
            Term: "Ayudar a los demás",
            LowDescription: "Cree que las personas pueden encargarse de sus propios asuntos sin interferencia",
            HighDescription: "Cree que es importante cuidar de las personas que lo rodean"
        }, {
            Term: "La justicia",
            LowDescription: "Cree que son las personas crean sus oportunidades",
            HighDescription: "Cree en la justicia social y la igualdad para todos"
        }, {
            Term: "La justicia social",
            LowDescription: "Cree que son las personas crean sus oportunidades",
            HighDescription: "Cree en la justicia social y la igualdad para todos"
        }, {
            Term: "La igualdad",
            LowDescription: "Cree que son las personas crean sus oportunidades",
            HighDescription: "Cree en la justicia social y la igualdad para todos"
        }, {
            Term: "El servicio comunitario",
            LowDescription: "Cree que las personas pueden encargarse de sus propios asuntos sin interferencia",
            HighDescription: "Cree que es importante cuidar de las personas que lo rodean"
        }],
        Conservation: [{
            Term: "Las tradiciones",
            LowDescription: "Le importa más seguir su propio camino que seguir el camino de otros",
            HighDescription: "Tiene mucho respeto por los grupos a los que pertenece y sigue su guía"
        }, {
            Term: "La armonía",
            LowDescription: "Decide qué es lo correcto basado en sus creencias, no en lo que la gente piensa",
            HighDescription: "Cree que las reglas existen por una razón y nunca intenta trasgredirlas"
        }, {
            Term: "La humildad",
            LowDescription: "Decide qué es lo correcto basado en sus creencias, no en lo que la gente piensa",
            HighDescription: "Ve valor en deferir a otros"
        }, {
            Term: "Las normas sociales",
            LowDescription: "Decide qué es lo correcto basado en sus creencias, no en lo que la gente piensa",
            HighDescription: "Cree que las reglas existen por una razón y nunca intenta trasgredirlas"
        }, {
            Term: "La seguridad",
            LowDescription: "Prefiere la seguridad a costa de dejar a un lado sus metas",
            HighDescription: "Cree que es importante salvaguardar la seguridad"
        }, {
            Term: "La seguridad",
            LowDescription: "Prefiere estar seguro a costa de dejar a un lado sus metas",
            HighDescription: "Cree que es importante salvaguardar la seguridad"
        }],
        "Openness-to-change": [{
            Term: "Ser independiente",
            LowDescription: "Recibe de buena manera que otros dirijan sus actividades",
            HighDescription: "Le gusta establecer sus propias metas para decidir cómo alcanzarlas mejor"
        }, {
            Term: "La emoción",
            LowDescription: "Se apega a las cosas que conoce antes que arriesgarse a probar algo nuevo y riesgoso",
            HighDescription: "Está ansioso por buscar experiencias nuevas y emocionantes"
        }, {
            Term: "La creatividad",
            LowDescription: "Se apega a las cosas que conoce antes que arriesgarse a probar algo nuevo y riesgoso",
            HighDescription: "Está ansioso por buscar experiencias nuevas y emocionantes"
        }, {
            Term: "La curiosidad",
            LowDescription: "Se apega a las cosas que conoce antes que arriesgarse a probar algo nuevo y riesgoso",
            HighDescription: "Está ansioso por buscar experiencias nuevas y emocionantes"
        }, {
            Term: "La autonomía",
            LowDescription: "Recibe de buena manera que otros dirijan sus actividades",
            HighDescription: "Le gusta establecer sus propias metas para decidir cómo alcanzarlas mejor"
        }, {
            Term: "La libertad",
            LowDescription: "Recibe de buena manera que otros dirijan sus actividades",
            HighDescription: "Le gusta establecer sus propias metas para decidir cómo alcanzarlas mejor"
        }],
        "Self-enhancement": [{
            Term: "Alcanzar el éxito",
            LowDescription: "Toma decisiones sin considerar cómo muestran sus talentos",
            HighDescription: "Busca oportunidades para autosuperase y para demostrar que es una persona capaz"
        }, {
            Term: "Mejorar su estatus social",
            LowDescription: "Está conforme con su estatus social y no siente necesidad de mejorarlo",
            HighDescription: "Se esfuerza considerablemente para mejorar su estatus e imagen pública"
        }, {
            Term: "La ambición",
            LowDescription: "Está conforme con su estatus social y no siente necesidad de mejorarlo",
            HighDescription: "Siente que es importante avanzar para alcanzar metas"
        }, {
            Term: "Los grandes logros",
            LowDescription: "Toma decisiones sin considerar cómo muestran sus talentos",
            HighDescription: "Busca oportunidades para autosuperase y para demostrar que es una persona capaz"
        }]
    }
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2JhdGFyeXBhL3dvcmtzcGFjZXMvZGVtb3MvbnBtLXN5c3RlbXUvdGV4dC1zdW1tYXJ5L25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9ob21lL2JhdGFyeXBhL3dvcmtzcGFjZXMvZGVtb3MvbnBtLXN5c3RlbXUvdGV4dC1zdW1tYXJ5Ly5idWlsZC9mYWtlXzYwNWNkNDBjLmpzIiwiL2hvbWUvYmF0YXJ5cGEvd29ya3NwYWNlcy9kZW1vcy9ucG0tc3lzdGVtdS90ZXh0LXN1bW1hcnkvLmJ1aWxkL2Zvcm1hdC5qcyIsIi9ob21lL2JhdGFyeXBhL3dvcmtzcGFjZXMvZGVtb3MvbnBtLXN5c3RlbXUvdGV4dC1zdW1tYXJ5Ly5idWlsZC9pMThuLmpzIiwiL2hvbWUvYmF0YXJ5cGEvd29ya3NwYWNlcy9kZW1vcy9ucG0tc3lzdGVtdS90ZXh0LXN1bW1hcnkvLmJ1aWxkL2kxOG4vZW4uanMiLCIvaG9tZS9iYXRhcnlwYS93b3Jrc3BhY2VzL2RlbW9zL25wbS1zeXN0ZW11L3RleHQtc3VtbWFyeS8uYnVpbGQvaTE4bi9lcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNnQkEsWUFBWSxDQUFDOztBQUViLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUM7SUFDNUIsSUFBSSxHQUFLLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQzs7Ozs7QUFLL0IsTUFBTSxDQUFDLE9BQU8sR0FBRyxVQUFVLElBQUksRUFBRTs7QUFHL0IsTUFBSSxJQUFJLEdBQUksRUFBRTtNQUNaLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQztNQUNyQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7O0FB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QUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFdBQVc7U0FDdEIsQ0FDSjtBQUNELGdEQUEwQyxDQUN0QztBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLGNBQWM7U0FDekIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFdBQVc7U0FDdEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFdBQVc7U0FDdEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFVBQVU7U0FDckIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFdBQVc7U0FDdEIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLEtBQUs7U0FDaEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFVBQVU7U0FDckIsQ0FDSjtBQUNELCtDQUF5QyxDQUNyQztBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLGNBQWM7U0FDekIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLGFBQWE7U0FDeEIsQ0FDSjtBQUNELDJDQUFxQyxDQUNqQztBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLGFBQWE7U0FDeEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLGVBQWU7U0FDMUIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFFBQVE7U0FDbkIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFdBQVc7U0FDdEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLGVBQWU7U0FDMUIsQ0FDSjtBQUNELDBDQUFvQyxDQUNoQztBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFNBQVM7U0FDcEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLGNBQWM7U0FDekIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFNBQVM7U0FDcEIsQ0FDSjtBQUNELDBDQUFvQyxDQUNoQztB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QUFRLGVBQWU7U0FDMUIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFdBQVc7U0FDdEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFVBQVU7U0FDckIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFlBQVk7U0FDdkIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFFBQVE7U0FDbkIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLGFBQWE7U0FDeEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFdBQVc7U0FDdEIsQ0FDSjtBQUNELDZDQUF1QyxDQUNuQztBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFNBQVM7U0FDcEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFNBQVM7U0FDcEIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFVBQVU7U0FDckIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFVBQVU7U0FDckIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFFBQVE7U0FDbkIsQ0FDSjtBQUNELGtEQUE0QyxDQUN4QztBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFlBQVk7U0FDdkIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLGFBQWE7U0FDeEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLGNBQWM7U0FDekIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFlBQVk7U0FDdkIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFdBQVc7U0FDdEIsQ0FDSjtBQUNELGlEQUEyQyxDQUN2QztBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFlBQVk7U0FDdkIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFdBQVc7U0FDdEIsQ0FDSjtBQUNELDZDQUF1QyxDQUNuQztBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFVBQVU7U0FDckIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFdBQVc7U0FDdEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFVBQVU7U0FDckIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFdBQVc7U0FDdEIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFdBQVc7U0FDdEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFVBQVU7U0FDckIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFVBQVU7U0FDckIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLGNBQWM7U0FDekIsQ0FDSjtBQUNELDRDQUFzQyxDQUNsQztBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFdBQVc7U0FDdEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLGNBQWM7U0FDekIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFNBQVM7U0FDcEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFdBQVc7U0FDdEIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLGNBQWM7U0FDekIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFNBQVM7U0FDcEIsQ0FDSjtBQUNELHlDQUFtQyxDQUMvQjtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFdBQVc7U0FDdEIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFlBQVk7U0FDdkIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFdBQVc7U0FDdEIsQ0FDSjtBQUNELHdDQUFrQyxDQUM5QjtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFdBQVc7U0FDdEIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFlBQVk7U0FDdkIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFNBQVM7U0FDcEIsQ0FDSjtBQUNELDRDQUFzQyxDQUNsQztBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFdBQVc7U0FDdEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFdBQVc7U0FDdEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFFBQVE7U0FDbkIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFNBQVM7U0FDcEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLE1BQU07U0FDakIsQ0FDSjtBQUNELDJDQUFxQyxDQUNqQztBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFFBQVE7U0FDbkIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLGFBQWE7U0FDeEIsQ0FDSjtBQUNELGdEQUEwQyxDQUN0QztBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLGVBQWU7U0FDMUIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFdBQVc7U0FDdEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFNBQVM7U0FDcEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFVBQVU7U0FDckIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFNBQVM7U0FDcEIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLE1BQU07U0FDakIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLGNBQWM7U0FDekIsQ0FDSjtBQUNELCtDQUF5QyxDQUNyQztBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLGNBQWM7U0FDekIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLGFBQWE7U0FDeEIsQ0FDSjtBQUNELDJDQUFxQyxDQUNqQztBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFlBQVk7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RyxDQUNKO0FBQ0QsMEJBQWtCLEVBQUUsQ0FDaEI7QUFDSSxrQkFBUSxtQkFBbUI7QUFDM0IsNEJBQWtCLDJEQUEyRDtBQUM3RSw2QkFBbUIsaUZBQWlGO1NBQ3ZHLEVBQ0Q7QUFDSSxrQkFBUSwyQkFBMkI7QUFDbkMsNEJBQWtCLHdFQUF3RTtBQUMxRiw2QkFBbUIsd0VBQXdFO1NBQzlGLEVBQ0Q7QUFDSSxrQkFBUSxhQUFhO0FBQ3JCLDRCQUFrQix3RUFBd0U7QUFDMUYsNkJBQW1CLHNEQUFzRDtTQUM1RSxFQUNEO0FBQ0ksa0JBQVEsb0JBQW9CO0FBQzVCLDRCQUFrQiwyREFBMkQ7QUFDN0UsNkJBQW1CLGlGQUFpRjtTQUN2RyxDQUNKO0tBQ0Y7Q0FDRixDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTUgSUJNIENvcnAuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBmb3JtYXQgPSByZXF1aXJlKCcuL2Zvcm1hdCcpLFxuICAgIGkxOG4gICA9IHJlcXVpcmUoJy4vaTE4bicpO1xuXG4vKipcbiAqIFByb3ZpZGVzIGEgVGV4dCBTdW1tYXJ5IGZvciBwcm9maWxlcy5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAobGFuZykge1xuXG5cbiAgdmFyIHNlbGYgID0ge30sXG4gICAgZGljdGlvbmFyeSA9IGkxOG4uZ2V0RGljdGlvbmFyeShsYW5nKSxcbiAgICB0cGhyYXNlID0gaTE4bi50cmFuc2xhdG9yRmFjdG9yeS5jcmVhdGVUcmFuc2xhdG9yKGRpY3Rpb25hcnkucGhyYXNlcyk7IC8vIGkxOG4gZm9yIHBocmFzZXNcblxuICAvLyBEb3dubG9hZCBhbGwgc3RhdGljIGRhdGEuXG4gIHNlbGYuY2lyY3VtcGxleERhdGEgPSBkaWN0aW9uYXJ5LnRyYWl0cztcbiAgc2VsZi5mYWNldHNEYXRhID0gZGljdGlvbmFyeS5mYWNldHM7XG4gIHNlbGYudmFsdWVzRGF0YSA9IGRpY3Rpb25hcnkudmFsdWVzO1xuICBzZWxmLm5lZWRzRGF0YSA9IGRpY3Rpb25hcnkubmVlZHM7XG5cbiAgZnVuY3Rpb24gY29tcGFyZUJ5UmVsZXZhbmNlKG8xLCBvMikge1xuICAgIHZhciByZXN1bHQgPSAwO1xuXG4gICAgaWYgKE1hdGguYWJzKDAuNSAtIG8xLnBlcmNlbnRhZ2UpID4gTWF0aC5hYnMoMC41IC0gbzIucGVyY2VudGFnZSkpIHtcbiAgICAgIHJlc3VsdCA9IC0xOyAvLyBBIHRyYWl0IHdpdGggMSUgaXMgbW9yZSBpbnRlcmVzdGluZyB0aGFuIG9uZSB3aXRoIDYwJS5cbiAgICB9XG5cbiAgICBpZiAoTWF0aC5hYnMoMC41IC0gbzEucGVyY2VudGFnZSkgPCBNYXRoLmFicygwLjUgLSBvMi5wZXJjZW50YWdlKSkge1xuICAgICAgcmVzdWx0ID0gMTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gY29tcGFyZUJ5VmFsdWUobzEsIG8yKSB7XG4gICAgdmFyIHJlc3VsdCA9IDA7XG5cbiAgICBpZiAoTWF0aC5hYnMobzEucGVyY2VudGFnZSkgPiBNYXRoLmFicyhvMi5wZXJjZW50YWdlKSkge1xuICAgICAgcmVzdWx0ID0gLTE7IC8vIDEwMCAlIGhhcyBwcmVjZWRlbmNlIG92ZXIgOTklXG4gICAgfVxuXG4gICAgaWYgKE1hdGguYWJzKG8xLnBlcmNlbnRhZ2UpIDwgTWF0aC5hYnMobzIucGVyY2VudGFnZSkpIHtcbiAgICAgIHJlc3VsdCA9IDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENpcmN1bXBsZXhBZGplY3RpdmUocDEsIHAyLCBvcmRlcikge1xuICAgIC8vIFNvcnQgdGhlIHBlcnNvbmFsaXR5IHRyYWl0cyBpbiB0aGUgb3JkZXIgdGhlIEpTT04gZmlsZSBzdG9yZWQgaXQuXG4gICAgdmFyIG9yZGVyZWQgPSBbcDEsIHAyXS5zb3J0KGZ1bmN0aW9uIChvMSwgbzIpIHtcbiAgICAgIHZhclxuICAgICAgICBpMSA9ICdFQU5PQycuaW5kZXhPZihvMS5pZC5jaGFyQXQoMCkpLFxuICAgICAgICBpMiA9ICdFQU5PQycuaW5kZXhPZihvMi5pZC5jaGFyQXQoMCkpO1xuXG4gICAgICByZXR1cm4gaTEgPCBpMiA/IC0xIDogMTtcbiAgICB9KSxcbiAgICAgIC8vIEFzc2VtYmxlIHRoZSBpZGVudGlmaWVyIGFzIHRoZSBKU09OIGZpbGUgc3RvcmVkIGl0LlxuICAgICAgaWRlbnRpZmllciA9IG9yZGVyZWRbMF0uaWQuXG4gICAgICBjb25jYXQob3JkZXJlZFswXS5wZXJjZW50YWdlID4gMC41ID8gJ19wbHVzXycgOiAnX21pbnVzXycpLlxuICAgICAgY29uY2F0KG9yZGVyZWRbMV0uaWQpLlxuICAgICAgY29uY2F0KG9yZGVyZWRbMV0ucGVyY2VudGFnZSA+IDAuNSA/ICdfcGx1cycgOiAnX21pbnVzJyksXG5cbiAgICAgIHRyYWl0TXVsdCA9IHNlbGYuY2lyY3VtcGxleERhdGFbaWRlbnRpZmllcl1bMF0sXG4gICAgICBzZW50ZW5jZSA9IFwiJXNcIjtcblxuICAgIGlmICh0cmFpdE11bHQucGVyY2VpdmVkX25lZ2F0aXZlbHkpIHtcbiAgICAgIHN3aXRjaCAob3JkZXIpIHtcbiAgICAgIGNhc2UgMDpcbiAgICAgICAgc2VudGVuY2UgPSB0cGhyYXNlKCdhIGJpdCAlcycpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgc2VudGVuY2UgPSB0cGhyYXNlKCdzb21ld2hhdCAlcycpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgc2VudGVuY2UgPSB0cGhyYXNlKCdjYW4gYmUgcGVyY2VpdmVkIGFzICVzJyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmb3JtYXQoc2VudGVuY2UsIHRyYWl0TXVsdC53b3JkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEZhY2V0SW5mbyhmKSB7XG4gICAgdmFyXG4gICAgICBkYXRhID0gc2VsZi5mYWNldHNEYXRhW2YuaWQucmVwbGFjZSgnXycsICctJykucmVwbGFjZSgnICcsICctJyldLFxuICAgICAgdCwgZDtcblxuICAgIGlmIChmLnBlcmNlbnRhZ2UgPiAwLjUpIHtcbiAgICAgIHQgPSBkYXRhLkhpZ2hUZXJtLnRvTG93ZXJDYXNlKCk7XG4gICAgICBkID0gZGF0YS5IaWdoRGVzY3JpcHRpb24udG9Mb3dlckNhc2UoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdCA9IGRhdGEuTG93VGVybS50b0xvd2VyQ2FzZSgpO1xuICAgICAgZCA9IGRhdGEuTG93RGVzY3JpcHRpb24udG9Mb3dlckNhc2UoKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogZi5pZCxcbiAgICAgIHRlcm06IHQsXG4gICAgICBkZXNjcmlwdGlvbjogZFxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBpbnRlcnZhbEZvcihwKSB7XG4gICAgLy8gVGhlIE1JTiBoYW5kbGVzIHRoZSBzcGVjaWFsIGNhc2UgZm9yIDEwMCUuXG4gICAgcmV0dXJuIE1hdGgubWluKE1hdGguZmxvb3IocCAqIDQpLCAzKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEluZm9Gb3JWYWx1ZSh2KSB7XG4gICAgdmFyXG4gICAgICBkYXRhID0gc2VsZi52YWx1ZXNEYXRhW3YuaWQucmVwbGFjZSgvW18gXS9nLCAnLScpXVswXSxcbiAgICAgIGQgPSB2LnBlcmNlbnRhZ2UgPiAwLjUgPyBkYXRhLkhpZ2hEZXNjcmlwdGlvbiA6IGRhdGEuTG93RGVzY3JpcHRpb247XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogdi5pZCxcbiAgICAgIHRlcm06IGRhdGEuVGVybS50b0xvd2VyQ2FzZSgpLFxuICAgICAgZGVzY3JpcHRpb246IGRcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0V29yZHNGb3JOZWVkKG4pIHtcbiAgICAvLyBBc3NlbWJsZSB0aGUgaWRlbnRpZmllciBhcyB0aGUgSlNPTiBmaWxlIHN0b3JlZCBpdC5cbiAgICB2YXIgdHJhaXRNdWx0ID0gc2VsZi5uZWVkc0RhdGFbbi5pZF07XG4gICAgcmV0dXJuIHRyYWl0TXVsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2VtYmxlVHJhaXRzKHBlcnNvbmFsaXR5VHJlZSkge1xuICAgIHZhclxuICAgICAgc2VudGVuY2VzID0gW10sXG4gICAgICBiaWc1ZWxlbWVudHMgPSBbXSxcbiAgICAgIHJlbGV2YW50QmlnNSxcbiAgICAgIGFkaiwgYWRqMSwgYWRqMiwgYWRqMztcblxuICAgIC8vIFNvcnQgdGhlIEJpZyA1IGJhc2VkIG9uIGhvdyBleHRyZW1lIHRoZSBudW1iZXIgaXMuXG4gICAgcGVyc29uYWxpdHlUcmVlLmNoaWxkcmVuWzBdLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIGJpZzVlbGVtZW50cy5wdXNoKHtcbiAgICAgICAgaWQ6IHAuaWQsXG4gICAgICAgIHBlcmNlbnRhZ2U6IHAucGVyY2VudGFnZVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgYmlnNWVsZW1lbnRzLnNvcnQoY29tcGFyZUJ5UmVsZXZhbmNlKTtcblxuICAgIC8vIFJlbW92ZSBldmVyeXRoaW5nIGJldHdlZW4gMzIlIGFuZCA2OCUsIGFzIGl0J3MgaW5zaWRlIHRoZSBjb21tb24gcGVvcGxlLlxuICAgIHJlbGV2YW50QmlnNSA9IGJpZzVlbGVtZW50cy5maWx0ZXIoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHJldHVybiBNYXRoLmFicygwLjUgLSBpdGVtLnBlcmNlbnRhZ2UpID4gMC4xODtcbiAgICB9KTtcbiAgICBpZiAocmVsZXZhbnRCaWc1Lmxlbmd0aCA8IDIpIHtcbiAgICAgIC8vIEV2ZW4gaWYgbm8gQmlnIDUgYXR0cmlidXRlIGlzIGludGVyZXN0aW5nLCB5b3UgZ2V0IDEgYWRqZWN0aXZlLlxuICAgICAgcmVsZXZhbnRCaWc1ID0gW2JpZzVlbGVtZW50c1swXSwgYmlnNWVsZW1lbnRzWzFdXTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKHJlbGV2YW50QmlnNS5sZW5ndGgpIHtcbiAgICBjYXNlIDI6XG4gICAgICAvLyBSZXBvcnQgMSBhZGplY3RpdmUuXG4gICAgICBhZGogPSBnZXRDaXJjdW1wbGV4QWRqZWN0aXZlKHJlbGV2YW50QmlnNVswXSwgcmVsZXZhbnRCaWc1WzFdLCAwKTtcbiAgICAgIHNlbnRlbmNlcy5wdXNoKGZvcm1hdCh0cGhyYXNlKCdZb3UgYXJlICVzJyksIGFkaikgKyAnLicpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAzOlxuICAgICAgLy8gUmVwb3J0IDIgYWRqZWN0aXZlcy5cbiAgICAgIGFkajEgPSBnZXRDaXJjdW1wbGV4QWRqZWN0aXZlKHJlbGV2YW50QmlnNVswXSwgcmVsZXZhbnRCaWc1WzFdLCAwKTtcbiAgICAgIGFkajIgPSBnZXRDaXJjdW1wbGV4QWRqZWN0aXZlKHJlbGV2YW50QmlnNVsxXSwgcmVsZXZhbnRCaWc1WzJdLCAxKTtcbiAgICAgIHNlbnRlbmNlcy5wdXNoKGZvcm1hdCh0cGhyYXNlKCdZb3UgYXJlICVzIGFuZCAlcycpLCAgYWRqMSwgYWRqMikgKyAnLicpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSA0OlxuICAgIGNhc2UgNTpcbiAgICAgIC8vIFJlcG9ydCAzIGFkamVjdGl2ZXMuXG4gICAgICBhZGoxID0gZ2V0Q2lyY3VtcGxleEFkamVjdGl2ZShyZWxldmFudEJpZzVbMF0sIHJlbGV2YW50QmlnNVsxXSwgMCk7XG4gICAgICBhZGoyID0gZ2V0Q2lyY3VtcGxleEFkamVjdGl2ZShyZWxldmFudEJpZzVbMV0sIHJlbGV2YW50QmlnNVsyXSwgMSk7XG4gICAgICBhZGozID0gZ2V0Q2lyY3VtcGxleEFkamVjdGl2ZShyZWxldmFudEJpZzVbMl0sIHJlbGV2YW50QmlnNVszXSwgMik7XG4gICAgICBzZW50ZW5jZXMucHVzaChmb3JtYXQodHBocmFzZSgnWW91IGFyZSAlcywgJXMgYW5kICVzJyksICBhZGoxLCBhZGoyLCBhZGozKSArICcuJyk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICByZXR1cm4gc2VudGVuY2VzO1xuICB9XG5cbiAgZnVuY3Rpb24gYXNzZW1ibGVGYWNldHMocGVyc29uYWxpdHlUcmVlKSB7XG4gICAgdmFyXG4gICAgICBzZW50ZW5jZXMgPSBbXSxcbiAgICAgIGZhY2V0RWxlbWVudHMgPSBbXSxcbiAgICAgIGluZm8sXG4gICAgICBpO1xuXG4gICAgLy8gQXNzZW1ibGUgdGhlIGZ1bGwgbGlzdCBvZiBmYWNldHMgYW5kIHNvcnQgdGhlbSBiYXNlZCBvbiBob3cgZXh0cmVtZVxuICAgIC8vIGlzIHRoZSBudW1iZXIuXG4gICAgcGVyc29uYWxpdHlUcmVlLmNoaWxkcmVuWzBdLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAoZikge1xuICAgICAgICBmYWNldEVsZW1lbnRzLnB1c2goe1xuICAgICAgICAgIGlkOiBmLmlkLFxuICAgICAgICAgIHBlcmNlbnRhZ2U6IGYucGVyY2VudGFnZSxcbiAgICAgICAgICBwYXJlbnQ6IHBcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBmYWNldEVsZW1lbnRzLnNvcnQoY29tcGFyZUJ5UmVsZXZhbmNlKTtcblxuICAgIC8vIEFzc2VtYmxlIGFuIGFkamVjdGl2ZSBhbmQgZGVzY3JpcHRpb24gZm9yIHRoZSB0d28gbW9zdCBpbXBvcnRhbnQgZmFjZXRzLlxuICAgIGluZm8gPSBnZXRGYWNldEluZm8oZmFjZXRFbGVtZW50c1swXSk7XG4gICAgc2VudGVuY2VzLnB1c2goZm9ybWF0KHRwaHJhc2UoJ1lvdSBhcmUgJXMnKSwgaW5mby50ZXJtKSArICc6ICcgKyBpbmZvLmRlc2NyaXB0aW9uICsgJy4nKTtcbiAgICBpbmZvID0gZ2V0RmFjZXRJbmZvKGZhY2V0RWxlbWVudHNbMV0pO1xuICAgIHNlbnRlbmNlcy5wdXNoKGZvcm1hdCh0cGhyYXNlKCdZb3UgYXJlICVzJyksIGluZm8udGVybSkgKyAnOiAnICsgaW5mby5kZXNjcmlwdGlvbiArICcuJyk7XG5cbiAgICAvLyBJZiBhbGwgdGhlIGZhY2V0cyBjb3JyZXNwb25kIHRvIHRoZSBzYW1lIGZlYXR1cmUsIGNvbnRpbnVlIHVudGlsIGFcbiAgICAvLyBkaWZmZXJlbnQgcGFyZW50IGZlYXR1cmUgaXMgZm91bmQuXG4gICAgaSA9IDI7XG4gICAgaWYgKGZhY2V0RWxlbWVudHNbMF0ucGFyZW50ID09PSBmYWNldEVsZW1lbnRzWzFdLnBhcmVudCkge1xuICAgICAgd2hpbGUgKGZhY2V0RWxlbWVudHNbMF0ucGFyZW50ID09PSBmYWNldEVsZW1lbnRzW2ldLnBhcmVudCkge1xuICAgICAgICBpICs9IDE7XG4gICAgICB9XG4gICAgfVxuICAgIGluZm8gPSBnZXRGYWNldEluZm8oZmFjZXRFbGVtZW50c1tpXSk7XG4gICAgc2VudGVuY2VzLnB1c2goZm9ybWF0KHRwaHJhc2UoJ0FuZCB5b3UgYXJlICVzJyksIGluZm8udGVybSkgKyAnOiAnICsgaW5mby5kZXNjcmlwdGlvbiArICcuJyk7XG5cbiAgICByZXR1cm4gc2VudGVuY2VzO1xuICB9XG5cbiAgLyoqXG4gICAqIEFzc2VtYmxlIHRoZSBsaXN0IG9mIHZhbHVlcyBhbmQgc29ydCB0aGVtIGJhc2VkIG9uIHJlbGV2YW5jZS5cbiAgICovXG4gIGZ1bmN0aW9uIGFzc2VtYmxlVmFsdWVzKHZhbHVlc1RyZWUpIHtcbiAgICB2YXJcbiAgICAgIHNlbnRlbmNlcyA9IFtdLFxuICAgICAgdmFsdWVzTGlzdCA9IFtdLFxuICAgICAgc2FtZVFJLCBpbmZvMSwgaW5mbzIsXG4gICAgICBzZW50ZW5jZSxcbiAgICAgIHZhbHVlc0luZm8sXG4gICAgICBpLCB0ZXJtMSwgdGVybTI7XG5cbiAgICB2YWx1ZXNUcmVlLmNoaWxkcmVuWzBdLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHZhbHVlc0xpc3QucHVzaCh7XG4gICAgICAgIGlkOiBwLmlkLFxuICAgICAgICBwZXJjZW50YWdlOiBwLnBlcmNlbnRhZ2VcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHZhbHVlc0xpc3Quc29ydChjb21wYXJlQnlSZWxldmFuY2UpO1xuXG4gICAgLy8gQXJlIHRoZSB0d28gbW9zdCByZWxldmFudCBpbiB0aGUgc2FtZSBxdWFydGlsZSBpbnRlcnZhbD8gKGUuZy4gMCUtMjUlKVxuICAgIHNhbWVRSSA9IGludGVydmFsRm9yKHZhbHVlc0xpc3RbMF0ucGVyY2VudGFnZSkgPT09IGludGVydmFsRm9yKHZhbHVlc0xpc3RbMV0ucGVyY2VudGFnZSk7XG5cbiAgICAvLyBHZXQgYWxsIHRoZSB0ZXh0IGFuZCBkYXRhIHJlcXVpcmVkLlxuICAgIGluZm8xID0gZ2V0SW5mb0ZvclZhbHVlKHZhbHVlc0xpc3RbMF0pO1xuICAgIGluZm8yID0gZ2V0SW5mb0ZvclZhbHVlKHZhbHVlc0xpc3RbMV0pO1xuXG4gICAgaWYgKHNhbWVRSSkge1xuICAgICAgLy8gQXNzZW1ibGUgdGhlIGZpcnN0ICdib3RoJyBzZW50ZW5jZS5cbiAgICAgIHRlcm0xID0gaW5mbzEudGVybTtcbiAgICAgIHRlcm0yID0gaW5mbzIudGVybTtcbiAgICAgIHN3aXRjaCAoaW50ZXJ2YWxGb3IodmFsdWVzTGlzdFswXS5wZXJjZW50YWdlKSkge1xuICAgICAgY2FzZSAwOlxuICAgICAgICBzZW50ZW5jZSA9IGZvcm1hdCh0cGhyYXNlKCdZb3UgYXJlIHJlbGF0aXZlbHkgdW5jb25jZXJuZWQgd2l0aCBib3RoICVzIGFuZCAlcycpLCB0ZXJtMSwgdGVybTIpICsgJy4nO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgc2VudGVuY2UgPSBmb3JtYXQodHBocmFzZShcIllvdSBkb24ndCBmaW5kIGVpdGhlciAlcyBvciAlcyB0byBiZSBwYXJ0aWN1bGFybHkgbW90aXZhdGluZyBmb3IgeW91XCIpLCB0ZXJtMSwgdGVybTIpICsgJy4nO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgc2VudGVuY2UgPSBmb3JtYXQodHBocmFzZSgnWW91IHZhbHVlIGJvdGggJXMgYW5kICVzIGEgYml0JyksIHRlcm0xLCB0ZXJtMikgKyAnLic7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBzZW50ZW5jZSA9IGZvcm1hdCh0cGhyYXNlKCdZb3UgY29uc2lkZXIgYm90aCAlcyBhbmQgJXMgdG8gZ3VpZGUgYSBsYXJnZSBwYXJ0IG9mIHdoYXQgeW91IGRvJyksIHRlcm0xLCB0ZXJtMikgKyAnLic7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgc2VudGVuY2VzLnB1c2goc2VudGVuY2UpO1xuXG4gICAgICAvLyBBc3NlbWJsZSB0aGUgZmluYWwgc3RyaW5ncyBpbiB0aGUgY29ycmVjdCBmb3JtYXQuXG4gICAgICBzZW50ZW5jZXMucHVzaChpbmZvMS5kZXNjcmlwdGlvbiArICcuJyk7XG4gICAgICBzZW50ZW5jZXMucHVzaChmb3JtYXQodHBocmFzZSgnQW5kICVzJyksIGluZm8yLmRlc2NyaXB0aW9uLnRvTG93ZXJDYXNlKCkpICsgJy4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWVzSW5mbyA9IFtpbmZvMSwgaW5mbzJdO1xuICAgICAgZm9yIChpID0gMDsgaSA8IHZhbHVlc0luZm8ubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgLy8gUHJvY2VzcyBpdCB0aGlzIHdheSBiZWNhdXNlIHRoZSBjb2RlIGlzIHRoZSBzYW1lLlxuICAgICAgICBzd2l0Y2ggKGludGVydmFsRm9yKHZhbHVlc0xpc3RbaV0ucGVyY2VudGFnZSkpIHtcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgIHNlbnRlbmNlID0gZm9ybWF0KHRwaHJhc2UoJ1lvdSBhcmUgcmVsYXRpdmVseSB1bmNvbmNlcm5lZCB3aXRoICVzJyksIHZhbHVlc0luZm9baV0udGVybSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBzZW50ZW5jZSA9IGZvcm1hdCh0cGhyYXNlKFwiWW91IGRvbid0IGZpbmQgJXMgdG8gYmUgcGFydGljdWxhcmx5IG1vdGl2YXRpbmcgZm9yIHlvdVwiKSwgdmFsdWVzSW5mb1tpXS50ZXJtKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHNlbnRlbmNlID0gZm9ybWF0KHRwaHJhc2UoJ1lvdSB2YWx1ZSAlcyBhIGJpdCBtb3JlJyksICB2YWx1ZXNJbmZvW2ldLnRlcm0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgc2VudGVuY2UgPSBmb3JtYXQodHBocmFzZSgnWW91IGNvbnNpZGVyICVzIHRvIGd1aWRlIGEgbGFyZ2UgcGFydCBvZiB3aGF0IHlvdSBkbycpLCAgdmFsdWVzSW5mb1tpXS50ZXJtKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBzZW50ZW5jZSA9IHNlbnRlbmNlLmNvbmNhdCgnOiAnKS5cbiAgICAgICAgICAgIGNvbmNhdCh2YWx1ZXNJbmZvW2ldLmRlc2NyaXB0aW9uLnRvTG93ZXJDYXNlKCkpLlxuICAgICAgICAgICAgY29uY2F0KCcuJyk7XG4gICAgICAgIHNlbnRlbmNlcy5wdXNoKHNlbnRlbmNlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc2VudGVuY2VzO1xuICB9XG5cbiAgLyoqXG4gICAqIEFzc2VtYmxlIHRoZSBsaXN0IG9mIG5lZWRzIGFuZCBzb3J0IHRoZW0gYmFzZWQgb24gdmFsdWUuXG4gICAqL1xuICBmdW5jdGlvbiBhc3NlbWJsZU5lZWRzKG5lZWRzVHJlZSkge1xuICAgIHZhclxuICAgICAgc2VudGVuY2VzID0gW10sXG4gICAgICBuZWVkc0xpc3QgPSBbXSxcbiAgICAgIHdvcmQsXG4gICAgICBzZW50ZW5jZTtcblxuICAgIG5lZWRzVHJlZS5jaGlsZHJlblswXS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICBuZWVkc0xpc3QucHVzaCh7XG4gICAgICAgIGlkOiBwLmlkLFxuICAgICAgICBwZXJjZW50YWdlOiBwLnBlcmNlbnRhZ2VcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIG5lZWRzTGlzdC5zb3J0KGNvbXBhcmVCeVZhbHVlKTtcblxuICAgIC8vIEdldCB0aGUgd29yZHMgcmVxdWlyZWQuXG4gICAgd29yZCA9IGdldFdvcmRzRm9yTmVlZChuZWVkc0xpc3RbMF0pWzBdO1xuXG4gICAgLy8gRm9ybSB0aGUgcmlnaHQgc2VudGVuY2UgZm9yIHRoZSBzaW5nbGUgbmVlZC5cbiAgICBzd2l0Y2ggKGludGVydmFsRm9yKG5lZWRzTGlzdFswXS5wZXJjZW50YWdlKSkge1xuICAgIGNhc2UgMDpcbiAgICAgIHNlbnRlbmNlID0gdHBocmFzZSgnRXhwZXJpZW5jZXMgdGhhdCBtYWtlIHlvdSBmZWVsIGhpZ2ggJXMgYXJlIGdlbmVyYWxseSB1bmFwcGVhbGluZyB0byB5b3UnKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMTpcbiAgICAgIHNlbnRlbmNlID0gdHBocmFzZSgnRXhwZXJpZW5jZXMgdGhhdCBnaXZlIGEgc2Vuc2Ugb2YgJXMgaG9sZCBzb21lIGFwcGVhbCB0byB5b3UnKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMjpcbiAgICAgIHNlbnRlbmNlID0gdHBocmFzZSgnWW91IGFyZSBtb3RpdmF0ZWQgdG8gc2VlayBvdXQgZXhwZXJpZW5jZXMgdGhhdCBwcm92aWRlIGEgc3Ryb25nIGZlZWxpbmcgb2YgJXMnKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMzpcbiAgICAgIHNlbnRlbmNlID0gdHBocmFzZSgnWW91ciBjaG9pY2VzIGFyZSBkcml2ZW4gYnkgYSBkZXNpcmUgZm9yICVzJyk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgc2VudGVuY2UgPSBmb3JtYXQoc2VudGVuY2UsIHdvcmQpLmNvbmNhdChcIi5cIik7XG4gICAgc2VudGVuY2VzLnB1c2goc2VudGVuY2UpO1xuXG4gICAgcmV0dXJuIHNlbnRlbmNlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIFRyYWl0VHJlZSByZXR1cm5zIGEgdGV4dFxuICAgKiBzdW1tYXJ5IGRlc2NyaWJpbmcgdGhlIHJlc3VsdC5cbiAgICpcbiAgICogQHBhcmFtIHRyZWUgQSBUcmFpdFRyZWUuXG4gICAqIEByZXR1cm4gQW4gYXJyYXkgb2Ygc3RyaW5ncyByZXByZXNlbnRpbmcgdGhlXG4gICAqICAgICAgICAgcGFyYWdyYXBocyBvZiB0aGUgdGV4dCBzdW1tYXJ5LlxuICAgKi9cbiAgZnVuY3Rpb24gYXNzZW1ibGUodHJlZSkge1xuICAgIHJldHVybiBbXG4gICAgICBhc3NlbWJsZVRyYWl0cyh0cmVlLmNoaWxkcmVuWzBdKSxcbiAgICAgIGFzc2VtYmxlRmFjZXRzKHRyZWUuY2hpbGRyZW5bMF0pLFxuICAgICAgYXNzZW1ibGVOZWVkcyh0cmVlLmNoaWxkcmVuWzFdKSxcbiAgICAgIGFzc2VtYmxlVmFsdWVzKHRyZWUuY2hpbGRyZW5bMl0pXG4gICAgXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIFRyYWl0VHJlZSByZXR1cm5zIGEgdGV4dFxuICAgKiBzdW1tYXJ5IGRlc2NyaWJpbmcgdGhlIHJlc3VsdC5cbiAgICpcbiAgICogQHBhcmFtIHRyZWUgQSBUcmFpdFRyZWUuXG4gICAqIEByZXR1cm4gQSBTdHJpbmcgY29udGFpbmluZyB0aGUgdGV4dCBzdW1tYXJ5LlxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U3VtbWFyeShwcm9maWxlKSB7XG4gICAgcmV0dXJuIGFzc2VtYmxlKHByb2ZpbGUudHJlZSkubWFwKGZ1bmN0aW9uIChwYXJhZ3JhcGgpIHsgcmV0dXJuIHBhcmFncmFwaC5qb2luKFwiIFwiKTsgfSkuam9pbihcIlxcblwiKTtcbiAgfVxuXG4gIC8qIFRleHQtU3VtbWFyeSBBUEkgKi9cbiAgc2VsZi5hc3NlbWJsZVRyYWl0cyA9IGFzc2VtYmxlVHJhaXRzO1xuICBzZWxmLmFzc2VtYmxlRmFjZXRzID0gYXNzZW1ibGVGYWNldHM7XG4gIHNlbGYuYXNzZW1ibGVOZWVkcyA9IGFzc2VtYmxlTmVlZHM7XG4gIHNlbGYuYXNzZW1ibGVWYWx1ZXMgPSBhc3NlbWJsZVZhbHVlcztcbiAgc2VsZi5hc3NlbWJsZSA9IGFzc2VtYmxlO1xuICBzZWxmLmdldFN1bW1hcnkgPSBnZXRTdW1tYXJ5O1xuXG4gIHJldHVybiBzZWxmO1xufTtcbiIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTUgSUJNIENvcnAuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5cbi8qKlxuICogR2l2ZW4gYSB0ZW1wbGF0ZSBzdHJpbmcgdG8gZm9ybWF0IGFuZCBzZXJ2ZXJhbCBzdHJpbmdzXG4gKiB0byBmaWxsIHRoZSB0ZW1wbGF0ZSwgaXQgcmV0dXJucyB0aGUgZm9ybWF0dGVkIHN0cmluZy5cbiAqIEBwYXJhbSB0ZW1wbGF0ZSBUaGlzIGlzIGEgc3RyaW5nIGNvbnRhaW5pbmcgemVybywgb25lIG9yXG4gKiAgICAgICAgICAgICAgICAgbW9yZSBvY2N1cnJlbmNlcyBvZiBcIiVzXCIuXG4gKiBAcGFyYW0gLi4uc3RyaW5nc1xuICogQHJldHVybnMgVGhlIGZvcm1hdHR0ZWQgdGVtcGxhdGUuXG4gKi9cbmZ1bmN0aW9uIGZvcm1hdChzdWJqZWN0KSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXJcbiAgICByZXBsYWNlcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5hcHBseShhcmd1bWVudHMsIFsxLCBhcmd1bWVudHMubGVuZ3RoXSksXG4gICAgcGFydHMgPSBudWxsLFxuICAgIG91dHB1dCxcbiAgICBpO1xuXG4gIGlmICgoc3ViamVjdC5tYXRjaCgvJXMvZykgPT09IG51bGwgJiYgcmVwbGFjZXMubGVuZ3RoID4gMCkgfHwgcmVwbGFjZXMubGVuZ3RoICE9PSBzdWJqZWN0Lm1hdGNoKC8lcy9nKS5sZW5ndGgpIHtcbiAgICB0aHJvdyAnRm9ybWF0IGVycm9yOiBUaGUgc3RyaW5nIGNvdW50IHRvIHJlcGxhY2UgZG8gbm90IG1hdGNoZXMgdGhlIGFyZ3VtZW50IGNvdW50LiBTdWJqZWN0OiAnICsgc3ViamVjdCArICcuIFJlcGxhY2VzOiAnICsgcmVwbGFjZXM7XG4gIH1cblxuICBvdXRwdXQgPSBzdWJqZWN0O1xuICBmb3IgKGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgcGFydHMgPSBvdXRwdXQuc3BsaXQoJyVzJyk7XG4gICAgb3V0cHV0ID0gcGFydHNbMF0gKyBhcmd1bWVudHNbaV0gKyBwYXJ0cy5zbGljZSgxLCBwYXJ0cy5sZW5ndGgpLmpvaW4oJyVzJyk7XG4gIH1cblxuICByZXR1cm4gb3V0cHV0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZvcm1hdDtcbiIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTUgSUJNIENvcnAuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG52YXIgZm9ybWF0ID0gcmVxdWlyZSgnLi9mb3JtYXQnKTtcblxuLyoqXG4gKiBDcmVhdGVzIHRyYW5zbGF0b3JzXG4gKlxuICogQGF1dGhvciBBcnkgUGFibG8gQmF0aXN0YSA8YmF0YXJ5cGFAYXIuaWJtLmNvbT5cbiAqL1xudmFyIHRyYW5zbGF0b3JGYWN0b3J5ID0gKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgc2VsZiA9IHtcblxuICAgICAgLyoqXG4gICAgICAgKiBHZXQgdGhlIHZhbHVlIGZvciB0aGUgZ2l2ZW4ga2V5IGZyb20gdGhlIGRpY3Rpb25hcnkuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIGRpY3Rpb25hcnkgQSBkaWN0aW9uYXJ5IHdpdGggU3RyaW5nIGtleXMgYW5kIFN0cmluZyB2YWx1ZXMuXG4gICAgICAgKiBAcGFyYW0ga2V5IEEga2V5LiBDYW4gY29udGFpbiAnLicgdG8gaW5kaWNhdGUga2V5J3MgcHJlc2VudCBpbiBzdWItZGljdGlvbmFyaWVzLlxuICAgICAgICogICAgICAgICAgICAgICAgICAgRm9yIGV4YW1wbGUgJ2FwcGxpY2F0aW9uLm5hbWUnIGxvb2tzIHVwIGZvciB0aGUgJ2FwcGxpY2F0aW9uJyBrZXlcbiAgICAgICAqICAgICAgICAgICAgICAgICAgIGluIHRoZSBkaWN0aW9uYXJ5IGFuZCwgd2l0aCBpdCdzIHZhbHVlLCBsb29rcyB1cCBmb3IgdGhlICduYW1lJyBrZXkuXG4gICAgICAgKiBAcGFyYW0gZGVmYXVsdFZhbHVlIEEgdmFsdWUgdG8gcmV0dXJuIGlmIHRoZSBrZXkgaXMgbm90IGluIHRoZSBkaWN0aW9uYXJ5LlxuICAgICAgICogQHJldHVybnMgVGhlIHZhbHVlIGZyb20gdGhlIGRpY3Rpb25hcnkuXG4gICAgICAgKi9cbiAgICAgIGdldEtleSA6IGZ1bmN0aW9uIChkaWN0aW9uYXJ5LCBrZXksIGRlZmF1bHRWYWx1ZSkge1xuICAgICAgICB2YXIgaSxcbiAgICAgICAgICBwYXJ0cyA9IGtleS5zcGxpdCgnLicpLFxuICAgICAgICAgIHZhbHVlID0gZGljdGlvbmFyeTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpID0gaSArIDEpIHtcbiAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3BhcnRzW2ldXTtcbiAgICAgICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGRlZmF1bHRWYWx1ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgICAqIENyZWF0ZXMgYSB0cmFuc2xhdGlvbiBmdW5jdGlvbiBnaXZlbiBhIGRpY3Rpb25hcnkgb2YgdHJhbnNsYXRpb25zXG4gICAgICAgKiBhbmQgYW4gb3B0aW9uYWwgYmFja3VwIGRpY3Rpb25hcnkgaWYgdGhlIGtleSBpcyBubyBwcmVzZW50IGluIHRoZVxuICAgICAgICogZmlyc3Qgb25lLiBUaGUga2V5IGlzIHJldHVybmVkIGlmIG5vdCBmb3VuZCBpbiB0aGUgZGljdGlvbmFyaWVzLlxuICAgICAgICogQHBhcmFtIHRyYW5zbGF0aW9ucyBBIHRyYW5zbGF0aW9uIGRpY3Rpb25hcnkuXG4gICAgICAgKiBAcGFyYW0gZGVmYXVsdHMgQSB0cmFuc2xhdGlvbiBkaWN0aW9uYXJ5LlxuICAgICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBBIHRyYW5zbGF0b3IuXG4gICAgICAgKi9cbiAgICAgIGNyZWF0ZVRyYW5zbGF0b3IgOiBmdW5jdGlvbiAodHJhbnNsYXRpb25zLCBkZWZhdWx0cykge1xuICAgICAgICBkZWZhdWx0cyA9IGRlZmF1bHRzIHx8IHt9O1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgIHZhciB2YWx1ZSA9IHNlbGYuZ2V0S2V5KHRyYW5zbGF0aW9ucywga2V5LCBudWxsKTtcbiAgICAgICAgICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGZvcm1hdCgnUGVuZGluZyB0cmFuc2xhdGlvbiBmb3I6ICVzJywga2V5KSk7XG4gICAgICAgICAgICB2YWx1ZSA9IF90aGlzLmdldEtleShkZWZhdWx0cywga2V5LCBrZXkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBzZWxmO1xuXG4gIH0oKSksXG5cblxuLyoqXG4gKiBQcm92aWRlIGZpbGVzIGFjY29yZGluZyB0byB1c2VyJ3MgbG9jYWxlXG4gKlxuICogQGF1dGhvciBBcnkgUGFibG8gQmF0aXN0YSA8YmF0YXJ5cGFAYXIuaWJtLmNvbT5cbiAqL1xuICBpMThuUHJvdmlkZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBERUZBVUxUX0xPQ0FMRSA9ICdlbicsXG4gICAgICAgIEkxOE5fRElSID0gJy4vaTE4bicsXG4gICAgICAgIHNlbGYgPSB7XG4gICAgICAgICAgZGljdGlvbmFyaWVzOiB7XG4gICAgICAgICAgICAnZW4nOiByZXF1aXJlKCcuL2kxOG4vZW4nKSxcbiAgICAgICAgICAgICdlcyc6IHJlcXVpcmUoJy4vaTE4bi9lcycpXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFsbCB0aGUgbG9jYWxlIG9wdGlvbnMuXG4gICAgICogZm9yICdlcy1BUidbJ3RyYWl0c19lcy1BUi5qc29uJywgJ3RyYWl0c19lcy5qc29uJywgJ3RyYWl0cy5qc29uJ11cbiAgICAgKlxuICAgICAqIEBwYXJhbSBsb2NhbGUgQSBsb2NhbGUgKGZvcm1hdDogbGwtQ0MpXG4gICAgICogQHJldHVybnMge0FycmF5fSBBbiBhcnJheSBvZiB0aGUgcG9zc2libGUgbmFtZXMgZm9yIGRpY3Rpb25hcnkgZmlsZS5cbiAgICAgKi9cbiAgICBzZWxmLmdldExvY2FsZU9wdGlvbnMgPSBmdW5jdGlvbiAobG9jYWxlKSB7XG4gICAgICB2YXJcbiAgICAgICAgbG9jYWxlUGFydHMgPSBsb2NhbGUuc3BsaXQoJy0nKSxcbiAgICAgICAgb3B0aW9ucyA9IFtdO1xuXG4gICAgICBvcHRpb25zLnB1c2gobG9jYWxlLnJlcGxhY2UoJy0nLCAnXycpKTtcbiAgICAgIGlmIChsb2NhbGVQYXJ0cy5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgb3B0aW9ucy5wdXNoKGxvY2FsZVBhcnRzWzBdKTtcbiAgICAgIH1cblxuICAgICAgb3B0aW9ucy5wdXNoKERFRkFVTFRfTE9DQUxFKTtcblxuICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgYXBwcm9waWF0ZSBkaWN0aW9uYXJ5IGZpbGUgZm9yIHVzZXIncyBsb2NhbGUuXG4gICAgICovXG4gICAgc2VsZi5nZXREaWN0aW9uYXJ5ID0gZnVuY3Rpb24gKGxvY2FsZSkge1xuICAgICAgdmFyIGxvY2FsZXMgPSBzZWxmLmdldExvY2FsZU9wdGlvbnMobG9jYWxlKSxcbiAgICAgICAgICBkaWN0O1xuXG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbG9jYWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoc2VsZi5kaWN0aW9uYXJpZXNbbG9jYWxlc1tpXV0pIHtcbiAgICAgICAgICByZXR1cm4gc2VsZi5kaWN0aW9uYXJpZXNbbG9jYWxlc1tpXV07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3Qgb2J0YWluIGFueSBkaWN0aW9uYXJ5IGZvciBsb2NhbGUgXCInICsgbG9jYWxlICsgJ1wiJyk7XG4gICAgfTtcblxuICAgIHJldHVybiBzZWxmO1xuXG4gIH0oKSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBpMThuUHJvdmlkZXIgOiBpMThuUHJvdmlkZXIsXG4gIGdldERpY3Rpb25hcnkgOiBpMThuUHJvdmlkZXIuZ2V0RGljdGlvbmFyeSxcbiAgdHJhbnNsYXRvckZhY3RvcnkgOiB0cmFuc2xhdG9yRmFjdG9yeVxufTtcbiIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTUgSUJNIENvcnAuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgXCJmYWNldHNcIiA6IHtcbiAgXHRcIkZyaWVuZGxpbmVzc1wiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJFeHRyYXZlcnNpb25cIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIlJlc2VydmVkXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiT3V0Z29pbmdcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGEgcHJpdmF0ZSBwZXJzb24gYW5kIGRvbid0IGxldCBtYW55IHBlb3BsZSBpblwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgbWFrZSBmcmllbmRzIGVhc2lseSBhbmQgZmVlbCBjb21mb3J0YWJsZSBhcm91bmQgb3RoZXIgcGVvcGxlXCJcbiAgXHR9LFxuICBcdFwiR3JlZ2FyaW91c25lc3NcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiRXh0cmF2ZXJzaW9uXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJJbmRlcGVuZGVudFwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIlNvY2lhYmxlXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGhhdmUgYSBzdHJvbmcgZGVzaXJlIHRvIGhhdmUgdGltZSB0byB5b3Vyc2VsZlwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgZW5qb3kgYmVpbmcgaW4gdGhlIGNvbXBhbnkgb2Ygb3RoZXJzXCJcbiAgXHR9LFxuICBcdFwiQXNzZXJ0aXZlbmVzc1wiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJFeHRyYXZlcnNpb25cIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkRlbXVyZVwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIkFzc2VydGl2ZVwiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBwcmVmZXIgdG8gbGlzdGVuIHRoYW4gdG8gdGFsaywgZXNwZWNpYWxseSBpbiBncm91cCBzaXR1YXRpb25zXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSB0ZW5kIHRvIHNwZWFrIHVwIGFuZCB0YWtlIGNoYXJnZSBvZiBzaXR1YXRpb25zLCBhbmQgeW91IGFyZSBjb21mb3J0YWJsZSBsZWFkaW5nIGdyb3Vwc1wiXG4gIFx0fSxcbiAgXHRcIkFjdGl2aXR5LWxldmVsXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkV4dHJhdmVyc2lvblwiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiTGFpZC1iYWNrXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiRW5lcmdldGljXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGFwcHJlY2lhdGUgYSByZWxheGVkIHBhY2UgaW4gbGlmZVwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgZW5qb3kgYSBmYXN0LXBhY2VkLCBidXN5IHNjaGVkdWxlIHdpdGggbWFueSBhY3Rpdml0aWVzXCJcbiAgXHR9LFxuICBcdFwiRXhjaXRlbWVudC1zZWVraW5nXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkV4dHJhdmVyc2lvblwiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiQ2FsbS1zZWVraW5nXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiRXhjaXRlbWVudC1zZWVraW5nXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IHByZWZlciBhY3Rpdml0aWVzIHRoYXQgYXJlIHF1aWV0LCBjYWxtLCBhbmQgc2FmZVwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGV4Y2l0ZWQgYnkgdGFraW5nIHJpc2tzIGFuZCBmZWVsIGJvcmVkIHdpdGhvdXQgbG90cyBvZiBhY3Rpb24gZ29pbmcgb25cIlxuICBcdH0sXG4gIFx0XCJDaGVlcmZ1bG5lc3NcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiRXh0cmF2ZXJzaW9uXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJTb2xlbW5cIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJDaGVlcmZ1bFwiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgZ2VuZXJhbGx5IHNlcmlvdXMgYW5kIGRvIG5vdCBqb2tlIG11Y2hcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBhIGpveWZ1bCBwZXJzb24gYW5kIHNoYXJlIHRoYXQgam95IHdpdGggdGhlIHdvcmxkXCJcbiAgXHR9LFxuICBcdFwiVHJ1c3RcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiQWdyZWVhYmxlbmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiQ2F1dGlvdXMgb2Ygb3RoZXJzXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiVHJ1c3Rpbmcgb2Ygb3RoZXJzXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSB3YXJ5IG9mIG90aGVyIHBlb3BsZSdzIGludGVudGlvbnMgYW5kIGRvIG5vdCB0cnVzdCBlYXNpbHlcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGJlbGlldmUgdGhlIGJlc3QgaW4gb3RoZXJzIGFuZCB0cnVzdCBwZW9wbGUgZWFzaWx5XCJcbiAgXHR9LFxuICBcdFwiQ29vcGVyYXRpb25cIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiQWdyZWVhYmxlbmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiQ29udHJhcnlcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJBY2NvbW1vZGF0aW5nXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGRvIG5vdCBzaHkgYXdheSBmcm9tIGNvbnRyYWRpY3Rpbmcgb3RoZXJzXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgZWFzeSB0byBwbGVhc2UgYW5kIHRyeSB0byBhdm9pZCBjb25mcm9udGF0aW9uXCJcbiAgXHR9LFxuICBcdFwiQWx0cnVpc21cIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiQWdyZWVhYmxlbmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiU2VsZi1mb2N1c2VkXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiQWx0cnVpc3RpY1wiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgbW9yZSBjb25jZXJuZWQgd2l0aCB0YWtpbmcgY2FyZSBvZiB5b3Vyc2VsZiB0aGFuIHRha2luZyB0aW1lIGZvciBvdGhlcnNcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGZlZWwgZnVsZmlsbGVkIHdoZW4gaGVscGluZyBvdGhlcnMsIGFuZCB3aWxsIGdvIG91dCBvZiB5b3VyIHdheSB0byBkbyBzb1wiXG4gIFx0fSxcbiAgXHRcIk1vcmFsaXR5XCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkFncmVlYWJsZW5lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkNvbXByb21pc2luZ1wiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIlVuY29tcHJvbWlzaW5nXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBjb21mb3J0YWJsZSB1c2luZyBldmVyeSB0cmljayBpbiB0aGUgYm9vayB0byBnZXQgd2hhdCB5b3Ugd2FudFwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgdGhpbmsgaXQgaXMgd3JvbmcgdG8gdGFrZSBhZHZhbnRhZ2Ugb2Ygb3RoZXJzIHRvIGdldCBhaGVhZFwiXG4gIFx0fSxcbiAgXHRcIk1vZGVzdHlcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiQWdyZWVhYmxlbmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiUHJvdWRcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJNb2Rlc3RcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgaG9sZCB5b3Vyc2VsZiBpbiBoaWdoIHJlZ2FyZCwgc2F0aXNmaWVkIHdpdGggd2hvIHlvdSBhcmVcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSB1bmNvbWZvcnRhYmxlIGJlaW5nIHRoZSBjZW50ZXIgb2YgYXR0ZW50aW9uXCJcbiAgXHR9LFxuICBcdFwiU3ltcGF0aHlcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiQWdyZWVhYmxlbmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiSGFyZGVuZWRcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJFbXBhdGhldGljXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IHRoaW5rIHRoYXQgcGVvcGxlIHNob3VsZCBnZW5lcmFsbHkgcmVseSBtb3JlIG9uIHRoZW1zZWx2ZXMgdGhhbiBvbiBvdGhlciBwZW9wbGVcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGZlZWwgd2hhdCBvdGhlcnMgZmVlbCBhbmQgYXJlIGNvbXBhc3Npb25hdGUgdG93YXJkcyB0aGVtXCJcbiAgXHR9LFxuICBcdFwiU2VsZi1lZmZpY2FjeVwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJDb25zY2llbnRpb3VzbmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiU2VsZi1kb3VidGluZ1wiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIlNlbGYtYXNzdXJlZFwiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBmcmVxdWVudGx5IGRvdWJ0IHlvdXIgYWJpbGl0eSB0byBhY2hpZXZlIHlvdXIgZ29hbHNcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGZlZWwgeW91IGhhdmUgdGhlIGFiaWxpdHkgdG8gc3VjY2VlZCBpbiB0aGUgdGFza3MgeW91IHNldCBvdXQgdG8gZG9cIlxuICBcdH0sXG4gIFx0XCJPcmRlcmxpbmVzc1wiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJDb25zY2llbnRpb3VzbmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiVW5zdHJ1Y3R1cmVkXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiT3JnYW5pemVkXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGRvIG5vdCBtYWtlIGEgbG90IG9mIHRpbWUgZm9yIG9yZ2FuaXphdGlvbiBpbiB5b3VyIGRhaWx5IGxpZmVcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGZlZWwgYSBzdHJvbmcgbmVlZCBmb3Igc3RydWN0dXJlIGluIHlvdXIgbGlmZVwiXG4gIFx0fSxcbiAgXHRcIkR1dGlmdWxuZXNzXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkNvbnNjaWVudGlvdXNuZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJDYXJlZnJlZVwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIkR1dGlmdWxcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgZG8gd2hhdCB5b3Ugd2FudCwgZGlzcmVnYXJkaW5nIHJ1bGVzIGFuZCBvYmxpZ2F0aW9uc1wiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgdGFrZSBydWxlcyBhbmQgb2JsaWdhdGlvbnMgc2VyaW91c2x5LCBldmVuIHdoZW4gdGhleSdyZSBpbmNvbnZlbmllbnRcIlxuICBcdH0sXG4gIFx0XCJBY2hpZXZlbWVudC1zdHJpdmluZ1wiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJDb25zY2llbnRpb3VzbmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiQ29udGVudFwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIkRyaXZlblwiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgY29udGVudCB3aXRoIHlvdXIgbGV2ZWwgb2YgYWNjb21wbGlzaG1lbnQgYW5kIGRvIG5vdCBmZWVsIHRoZSBuZWVkIHRvIHNldCBhbWJpdGlvdXMgZ29hbHNcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGhhdmUgaGlnaCBnb2FscyBmb3IgeW91cnNlbGYgYW5kIHdvcmsgaGFyZCB0byBhY2hpZXZlIHRoZW1cIlxuICBcdH0sXG4gIFx0XCJTZWxmLWRpc2NpcGxpbmVcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiQ29uc2NpZW50aW91c25lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkludGVybWl0dGVudFwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIlBlcnNpc3RlbnRcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgaGF2ZSBhIGhhcmQgdGltZSBzdGlja2luZyB3aXRoIGRpZmZpY3VsdCB0YXNrcyBmb3IgYSBsb25nIHBlcmlvZCBvZiB0aW1lXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBjYW4gdGFja2xlIGFuZCBzdGljayB3aXRoIHRvdWdoIHRhc2tzXCJcbiAgXHR9LFxuICBcdFwiQ2F1dGlvdXNuZXNzXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkNvbnNjaWVudGlvdXNuZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJCb2xkXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiRGVsaWJlcmF0ZVwiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSB3b3VsZCByYXRoZXIgdGFrZSBhY3Rpb24gaW1tZWRpYXRlbHkgdGhhbiBzcGVuZCB0aW1lIGRlbGliZXJhdGluZyBtYWtpbmcgYSBkZWNpc2lvblwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgY2FyZWZ1bGx5IHRoaW5rIHRocm91Z2ggZGVjaXNpb25zIGJlZm9yZSBtYWtpbmcgdGhlbVwiXG4gIFx0fSxcbiAgXHRcIkFueGlldHlcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiTmV1cm90aWNpc21cIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIlNlbGYtYXNzdXJlZFwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIlByb25lIHRvIHdvcnJ5XCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IHRlbmQgdG8gZmVlbCBjYWxtIGFuZCBzZWxmLWFzc3VyZWRcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IHRlbmQgdG8gd29ycnkgYWJvdXQgdGhpbmdzIHRoYXQgbWlnaHQgaGFwcGVuXCJcbiAgXHR9LFxuICBcdFwiQW5nZXJcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiTmV1cm90aWNpc21cIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIk1pbGQtdGVtcGVyZWRcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJGaWVyeVwiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIkl0IHRha2VzIGEgbG90IHRvIGdldCB5b3UgYW5ncnlcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGhhdmUgYSBmaWVyeSB0ZW1wZXIsIGVzcGVjaWFsbHkgd2hlbiB0aGluZ3MgZG8gbm90IGdvIHlvdXIgd2F5XCJcbiAgXHR9LFxuICBcdFwiRGVwcmVzc2lvblwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJOZXVyb3RpY2lzbVwiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiQ29udGVudFwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIk1lbGFuY2hvbHlcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGdlbmVyYWxseSBjb21mb3J0YWJsZSB3aXRoIHlvdXJzZWxmIGFzIHlvdSBhcmVcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IHRoaW5rIHF1aXRlIG9mdGVuIGFib3V0IHRoZSB0aGluZ3MgeW91IGFyZSB1bmhhcHB5IGFib3V0XCJcbiAgXHR9LFxuICBcdFwiU2VsZi1jb25zY2lvdXNuZXNzXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIk5ldXJvdGljaXNtXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJDb25maWRlbnRcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJTZWxmLWNvbnNjaW91c1wiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgaGFyZCB0byBlbWJhcnJhc3MgYW5kIGFyZSBzZWxmLWNvbmZpZGVudCBtb3N0IG9mIHRoZSB0aW1lXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgc2Vuc2l0aXZlIGFib3V0IHdoYXQgb3RoZXJzIG1pZ2h0IGJlIHRoaW5raW5nIGFib3V0IHlvdVwiXG4gIFx0fSxcbiAgXHRcIkltbW9kZXJhdGlvblwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJOZXVyb3RpY2lzbVwiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiU2VsZi1jb250cm9sbGVkXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiSGVkb25pc3RpY1wiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBoYXZlIGNvbnRyb2wgb3ZlciB5b3VyIGRlc2lyZXMsIHdoaWNoIGFyZSBub3QgcGFydGljdWxhcmx5IGludGVuc2VcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGZlZWwgeW91ciBkZXNpcmVzIHN0cm9uZ2x5IGFuZCBhcmUgZWFzaWx5IHRlbXB0ZWQgYnkgdGhlbVwiXG4gIFx0fSxcbiAgXHRcIlZ1bG5lcmFiaWxpdHlcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiTmV1cm90aWNpc21cIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkNhbG0gdW5kZXIgcHJlc3N1cmVcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJTdXNjZXB0aWJsZSB0byBzdHJlc3NcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgaGFuZGxlIHVuZXhwZWN0ZWQgZXZlbnRzIGNhbG1seSBhbmQgZWZmZWN0aXZlbHlcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBlYXNpbHkgb3ZlcndoZWxtZWQgaW4gc3RyZXNzZnVsIHNpdHVhdGlvbnNcIlxuICBcdH0sXG4gIFx0XCJJbWFnaW5hdGlvblwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJPcGVubmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiRG93bi10by1lYXJ0aFwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIkltYWdpbmF0aXZlXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IHByZWZlciBmYWN0cyBvdmVyIGZhbnRhc3lcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGhhdmUgYSB3aWxkIGltYWdpbmF0aW9uXCJcbiAgXHR9LFxuICBcdFwiQXJ0aXN0aWMtaW50ZXJlc3RzXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIk9wZW5uZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJVbmNvbmNlcm5lZCB3aXRoIGFydFwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIkFwcHJlY2lhdGl2ZSBvZiBhcnRcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGxlc3MgY29uY2VybmVkIHdpdGggYXJ0aXN0aWMgb3IgY3JlYXRpdmUgYWN0aXZpdGllcyB0aGFuIG1vc3QgcGVvcGxlIHdobyBwYXJ0aWNpcGF0ZWQgaW4gb3VyIHN1cnZleXNcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGVuam95IGJlYXV0eSBhbmQgc2VlayBvdXQgY3JlYXRpdmUgZXhwZXJpZW5jZXNcIlxuICBcdH0sXG4gIFx0XCJFbW90aW9uYWxpdHlcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiT3Blbm5lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkRpc3Bhc3Npb25hdGVcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJFbW90aW9uYWxseSBhd2FyZVwiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBkbyBub3QgZnJlcXVlbnRseSB0aGluayBhYm91dCBvciBvcGVubHkgZXhwcmVzcyB5b3VyIGVtb3Rpb25zXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgYXdhcmUgb2YgeW91ciBmZWVsaW5ncyBhbmQgaG93IHRvIGV4cHJlc3MgdGhlbVwiXG4gIFx0fSxcbiAgXHRcIkFkdmVudHVyb3VzbmVzc1wiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJPcGVubmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiQ29uc2lzdGVudFwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIkFkdmVudHVyb3VzXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGVuam95IGZhbWlsaWFyIHJvdXRpbmVzIGFuZCBwcmVmZXIgbm90IHRvIGRldmlhdGUgZnJvbSB0aGVtXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgZWFnZXIgdG8gZXhwZXJpZW5jZSBuZXcgdGhpbmdzXCJcbiAgXHR9LFxuICBcdFwiSW50ZWxsZWN0XCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIk9wZW5uZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJDb25jcmV0ZVwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIlBoaWxvc29waGljYWxcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgcHJlZmVyIGRlYWxpbmcgd2l0aCB0aGUgd29ybGQgYXMgaXQgaXMsIHJhcmVseSBjb25zaWRlcmluZyBhYnN0cmFjdCBpZGVhc1wiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIG9wZW4gdG8gYW5kIGludHJpZ3VlZCBieSBuZXcgaWRlYXMgYW5kIGxvdmUgdG8gZXhwbG9yZSB0aGVtXCJcbiAgXHR9LFxuICBcdFwiTGliZXJhbGlzbVwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJPcGVubmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiUmVzcGVjdGZ1bCBvZiBhdXRob3JpdHlcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJBdXRob3JpdHktY2hhbGxlbmdpbmdcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgcHJlZmVyIGZvbGxvd2luZyB3aXRoIHRyYWRpdGlvbiBpbiBvcmRlciB0byBtYWludGFpbiBhIHNlbnNlIG9mIHN0YWJpbGl0eVwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgcHJlZmVyIHRvIGNoYWxsZW5nZSBhdXRob3JpdHkgYW5kIHRyYWRpdGlvbmFsIHZhbHVlcyB0byBoZWxwIGJyaW5nIGFib3V0IHBvc2l0aXZlIGNoYW5nZXNcIlxuICBcdH1cbiAgfSxcbiAgXCJuZWVkc1wiOiB7XG4gICAgICBcIkNoYWxsZW5nZVwiOiBbXG4gICAgICAgICAgXCJwcmVzdGlnZVwiLFxuICAgICAgICAgIFwiY29tcGV0aXRpb25cIixcbiAgICAgICAgICBcImdsb3J5XCJcbiAgICAgIF0sXG4gICAgICBcIkNsb3NlbmVzc1wiOiBbXG4gICAgICAgICAgXCJiZWxvbmdpbmduZXNzXCIsXG4gICAgICAgICAgXCJub3N0YWxnaWFcIixcbiAgICAgICAgICBcImludGltYWN5XCJcbiAgICAgIF0sXG4gICAgICBcIkN1cmlvc2l0eVwiOiBbXG4gICAgICAgICAgXCJkaXNjb3ZlcnlcIixcbiAgICAgICAgICBcIm1hc3RlcnlcIixcbiAgICAgICAgICBcImdhaW5pbmcga25vd2xlZGdlXCJcbiAgICAgIF0sXG4gICAgICBcIkV4Y2l0ZW1lbnRcIjogW1xuICAgICAgICAgIFwicmV2ZWxyeVwiLFxuICAgICAgICAgIFwiYW50aWNpcGF0aW9uXCIsXG4gICAgICAgICAgXCJleGhpbGlyYXRpb25cIlxuICAgICAgXSxcbiAgICAgIFwiSGFybW9ueVwiOiBbXG4gICAgICAgICAgXCJ3ZWxsLWJlaW5nXCIsXG4gICAgICAgICAgXCJjb3VydGVzeVwiLFxuICAgICAgICAgIFwicG9saXRlbmVzc1wiXG4gICAgICBdLFxuICAgICAgXCJJZGVhbFwiOiBbXG4gICAgICAgICAgXCJzb3BoaXN0aWNhdGlvblwiLFxuICAgICAgICAgIFwic3Bpcml0dWFsaXR5XCIsXG4gICAgICAgICAgXCJzdXBlcmlvcml0eVwiLFxuICAgICAgICAgIFwiZnVsZmlsbG1lbnRcIlxuICAgICAgXSxcbiAgICAgIFwiTGliZXJ0eVwiOiBbXG4gICAgICAgICAgXCJtb2Rlcm5pdHlcIixcbiAgICAgICAgICBcImV4cGFuZGluZyBwb3NzaWJpbGl0eVwiLFxuICAgICAgICAgIFwiZXNjYXBlXCIsXG4gICAgICAgICAgXCJzcG9udGFuZWl0eVwiLFxuICAgICAgICAgIFwibm92ZWx0eVwiXG4gICAgICBdLFxuICAgICAgXCJMb3ZlXCI6IFtcbiAgICAgICAgICBcImNvbm5lY3RlZG5lc3NcIixcbiAgICAgICAgICBcImFmZmluaXR5XCJcbiAgICAgIF0sXG4gICAgICBcIlByYWN0aWNhbGl0eVwiOiBbXG4gICAgICAgICAgXCJlZmZpY2llbmN5XCIsXG4gICAgICAgICAgXCJwcmFjdGljYWxpdHlcIixcbiAgICAgICAgICBcImhpZ2ggdmFsdWVcIixcbiAgICAgICAgICBcImNvbnZlbmllbmNlXCJcbiAgICAgIF0sXG4gICAgICBcIlNlbGYtZXhwcmVzc2lvblwiOiBbXG4gICAgICAgICAgXCJzZWxmLWV4cHJlc3Npb25cIixcbiAgICAgICAgICBcInBlcnNvbmFsIGVtcG93ZXJtZW50XCIsXG4gICAgICAgICAgXCJwZXJzb25hbCBzdHJlbmd0aFwiXG4gICAgICBdLFxuICAgICAgXCJTdGFiaWxpdHlcIjogW1xuICAgICAgICAgIFwic3RhYmlsaXR5XCIsXG4gICAgICAgICAgXCJhdXRoZW50aWNpdHlcIixcbiAgICAgICAgICBcInRydXN0d29ydGhpbmVzc1wiXG4gICAgICBdLFxuICAgICAgXCJTdHJ1Y3R1cmVcIjogW1xuICAgICAgICAgIFwib3JnYW5pemF0aW9uXCIsXG4gICAgICAgICAgXCJzdHJhaWdodGZvcndhcmRuZXNzXCIsXG4gICAgICAgICAgXCJjbGFyaXR5XCIsXG4gICAgICAgICAgXCJyZWxpYWJpbGl0eVwiXG4gICAgICBdXG4gIH0sXG4gIFwicGhyYXNlc1wiOiB7XG4gICAgXCJZb3UgYXJlICVzXCI6IFwiWW91IGFyZSAlc1wiLFxuICAgIFwiWW91IGFyZSAlcyBhbmQgJXNcIjogXCJZb3UgYXJlICVzIGFuZCAlc1wiLFxuICAgIFwiWW91IGFyZSAlcywgJXMgYW5kICVzXCI6IFwiWW91IGFyZSAlcywgJXMgYW5kICVzXCIsXG4gICAgXCJBbmQgeW91IGFyZSAlc1wiOiBcIkFuZCB5b3UgYXJlICVzXCIsXG4gICAgXCJZb3UgYXJlIHJlbGF0aXZlbHkgdW5jb25jZXJuZWQgd2l0aCAlc1wiOiBcIllvdSBhcmUgcmVsYXRpdmVseSB1bmNvbmNlcm5lZCB3aXRoICVzXCIsXG4gICAgXCJZb3UgYXJlIHJlbGF0aXZlbHkgdW5jb25jZXJuZWQgd2l0aCBib3RoICVzIGFuZCAlc1wiOiBcIllvdSBhcmUgcmVsYXRpdmVseSB1bmNvbmNlcm5lZCB3aXRoIGJvdGggJXMgYW5kICVzXCIsXG4gICAgXCJZb3UgZG9uJ3QgZmluZCAlcyB0byBiZSBwYXJ0aWN1bGFybHkgbW90aXZhdGluZyBmb3IgeW91XCI6IFwiWW91IGRvbid0IGZpbmQgJXMgdG8gYmUgcGFydGljdWxhcmx5IG1vdGl2YXRpbmcgZm9yIHlvdVwiLFxuICAgIFwiWW91IGRvbid0IGZpbmQgZWl0aGVyICVzIG9yICVzIHRvIGJlIHBhcnRpY3VsYXJseSBtb3RpdmF0aW5nIGZvciB5b3VcIjogXCJZb3UgZG9uJ3QgZmluZCBlaXRoZXIgJXMgb3IgJXMgdG8gYmUgcGFydGljdWxhcmx5IG1vdGl2YXRpbmcgZm9yIHlvdVwiLFxuICAgIFwiWW91IHZhbHVlIGJvdGggJXMgYSBiaXRcIjogXCJZb3UgdmFsdWUgYm90aCAlcyBhIGJpdFwiLFxuICAgIFwiWW91IHZhbHVlIGJvdGggJXMgYW5kICVzIGEgYml0XCI6IFwiWW91IHZhbHVlIGJvdGggJXMgYW5kICVzIGEgYml0XCIsXG4gICAgXCJZb3UgY29uc2lkZXIgJXMgdG8gZ3VpZGUgYSBsYXJnZSBwYXJ0IG9mIHdoYXQgeW91IGRvXCIgOiBcIllvdSBjb25zaWRlciAlcyB0byBndWlkZSBhIGxhcmdlIHBhcnQgb2Ygd2hhdCB5b3UgZG9cIixcbiAgICBcIllvdSBjb25zaWRlciBib3RoICVzIGFuZCAlcyB0byBndWlkZSBhIGxhcmdlIHBhcnQgb2Ygd2hhdCB5b3UgZG9cIiA6IFwiWW91IGNvbnNpZGVyIGJvdGggJXMgYW5kICVzIHRvIGd1aWRlIGEgbGFyZ2UgcGFydCBvZiB3aGF0IHlvdSBkb1wiLFxuICAgIFwiQW5kICVzXCI6IFwiQW5kICVzXCIsXG4gICAgXCJFeHBlcmllbmNlcyB0aGF0IG1ha2UgeW91IGZlZWwgaGlnaCAlcyBhcmUgZ2VuZXJhbGx5IHVuYXBwZWFsaW5nIHRvIHlvdVwiOiBcIkV4cGVyaWVuY2VzIHRoYXQgbWFrZSB5b3UgZmVlbCBoaWdoICVzIGFyZSBnZW5lcmFsbHkgdW5hcHBlYWxpbmcgdG8geW91XCIsXG4gICAgXCJFeHBlcmllbmNlcyB0aGF0IGdpdmUgYSBzZW5zZSBvZiAlcyBob2xkIHNvbWUgYXBwZWFsIHRvIHlvdVwiOiBcIkV4cGVyaWVuY2VzIHRoYXQgZ2l2ZSBhIHNlbnNlIG9mICVzIGhvbGQgc29tZSBhcHBlYWwgdG8geW91XCIsXG4gICAgXCJZb3UgYXJlIG1vdGl2YXRlZCB0byBzZWVrIG91dCBleHBlcmllbmNlcyB0aGF0IHByb3ZpZGUgYSBzdHJvbmcgZmVlbGluZyBvZiAlc1wiOiBcIllvdSBhcmUgbW90aXZhdGVkIHRvIHNlZWsgb3V0IGV4cGVyaWVuY2VzIHRoYXQgcHJvdmlkZSBhIHN0cm9uZyBmZWVsaW5nIG9mICVzXCIsXG4gICAgXCJZb3VyIGNob2ljZXMgYXJlIGRyaXZlbiBieSBhIGRlc2lyZSBmb3IgJXNcIiA6IFwiWW91ciBjaG9pY2VzIGFyZSBkcml2ZW4gYnkgYSBkZXNpcmUgZm9yICVzXCIsXG4gICAgXCJhIGJpdCAlc1wiOiBcImEgYml0ICVzXCIsXG4gICAgXCJzb21ld2hhdCAlc1wiIDogXCJzb21ld2hhdCAlc1wiLFxuICAgIFwiY2FuIGJlIHBlcmNlaXZlZCBhcyAlc1wiOiBcImNhbiBiZSBwZXJjZWl2ZWQgYXMgJXNcIlxuICB9LFxuICBcInRyYWl0c1wiOiB7XG4gICAgICBcIkFncmVlYWJsZW5lc3NfbWludXNfQ29uc2NpZW50aW91c25lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbmNvbnNpZGVyYXRlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbXBvbGl0ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGlzdHJ1c3RmdWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuY29vcGVyYXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRob3VnaHRsZXNzXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJBZ3JlZWFibGVuZXNzX21pbnVzX0NvbnNjaWVudGlvdXNuZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic3RyaWN0XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmlnaWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInN0ZXJuXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJBZ3JlZWFibGVuZXNzX21pbnVzX0V4dHJhdmVyc2lvbl9taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImN5bmljYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIndhcnkgb2Ygb3RoZXJzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZWNsdXNpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRldGFjaGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbXBlcnNvbmFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJnbHVtXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJBZ3JlZWFibGVuZXNzX21pbnVzX0V4dHJhdmVyc2lvbl9wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYnVsbGhlYWRlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYWJydXB0XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjcnVkZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29tYmF0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJyb3VnaFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNseVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibWFuaXB1bGF0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJncnVmZlwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGV2aW91c1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQWdyZWVhYmxlbmVzc19taW51c19OZXVyb3RpY2lzbV9taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluc2Vuc2l0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmFmZmVjdGlvbmF0ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGFzc2lvbmxlc3NcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuZW1vdGlvbmFsXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJBZ3JlZWFibGVuZXNzX21pbnVzX05ldXJvdGljaXNtX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjcml0aWNhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VsZmlzaFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaWxsLXRlbXBlcmVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhbnRhZ29uaXN0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImdydW1weVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYml0dGVyXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkaXNhZ3JlZWFibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRlbWFuZGluZ1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQWdyZWVhYmxlbmVzc19taW51c19PcGVubmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvYXJzZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGFjdGxlc3NcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImN1cnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm5hcnJvdy1taW5kZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNhbGxvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInJ1dGhsZXNzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmNoYXJpdGFibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInZpbmRpY3RpdmVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkFncmVlYWJsZW5lc3NfbWludXNfT3Blbm5lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzaHJld2RcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJlY2NlbnRyaWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbmRpdmlkdWFsaXN0aWNcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkFncmVlYWJsZW5lc3NfcGx1c19Db25zY2llbnRpb3VzbmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bnByZXRlbnRpb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VsZi1lZmZhY2luZ1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQWdyZWVhYmxlbmVzc19wbHVzX0NvbnNjaWVudGlvdXNuZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaGVscGZ1bFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvb3BlcmF0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uc2lkZXJhdGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJyZXNwZWN0ZnVsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9saXRlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmVhc29uYWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvdXJ0ZW91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRob3VnaHRmdWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJsb3lhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm1vcmFsXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJBZ3JlZWFibGVuZXNzX3BsdXNfRXh0cmF2ZXJzaW9uX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNvZnQtaGVhcnRlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFncmVlYWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm9ibGlnaW5nXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaHVtYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJsZW5pZW50XCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJBZ3JlZWFibGVuZXNzX3BsdXNfRXh0cmF2ZXJzaW9uX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZWZmZXJ2ZXNjZW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaGFwcHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmcmllbmRseVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm1lcnJ5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiam92aWFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaHVtb3JvdXNcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkFncmVlYWJsZW5lc3NfcGx1c19OZXVyb3RpY2lzbV9taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJnZW5lcm91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBsZWFzYW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidG9sZXJhbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwZWFjZWZ1bFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZsZXhpYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZWFzeS1nb2luZ1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZhaXJcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjaGFyaXRhYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidHJ1c3RmdWxcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkFncmVlYWJsZW5lc3NfcGx1c19OZXVyb3RpY2lzbV9wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlbnRpbWVudGFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYWZmZWN0aW9uYXRlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2Vuc2l0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic29mdFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBhc3Npb25hdGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJyb21hbnRpY1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQWdyZWVhYmxlbmVzc19wbHVzX09wZW5uZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVwZW5kZW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzaW1wbGVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkFncmVlYWJsZW5lc3NfcGx1c19PcGVubmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImdlbmlhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRhY3RmdWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkaXBsb21hdGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVlcFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImlkZWFsaXN0aWNcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkNvbnNjaWVudGlvdXNuZXNzX21pbnVzX0FncmVlYWJsZW5lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJyYXNoXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmNvb3BlcmF0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bnJlbGlhYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkaXN0cnVzdGZ1bFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGhvdWdodGxlc3NcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkNvbnNjaWVudGlvdXNuZXNzX21pbnVzX0FncmVlYWJsZW5lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bnByZXRlbnRpb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VsZi1lZmZhY2luZ1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQ29uc2NpZW50aW91c25lc3NfbWludXNfRXh0cmF2ZXJzaW9uX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5kZWNpc2l2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYWltbGVzc1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIndpc2h5LXdhc2h5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibm9uY29tbWl0dGFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmFtYml0aW91c1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQ29uc2NpZW50aW91c25lc3NfbWludXNfRXh0cmF2ZXJzaW9uX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bnJ1bHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJib2lzdGVyb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJyZWNrbGVzc1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGV2aWwtbWF5LWNhcmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkZW1vbnN0cmF0aXZlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJDb25zY2llbnRpb3VzbmVzc19taW51c19OZXVyb3RpY2lzbV9taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbmZvcm1hbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImxvdy1rZXlcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkNvbnNjaWVudGlvdXNuZXNzX21pbnVzX05ldXJvdGljaXNtX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzY2F0dGVyYnJhaW5lZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5jb25zaXN0ZW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJlcnJhdGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmb3JnZXRmdWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImltcHVsc2l2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZnJpdm9sb3VzXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJDb25zY2llbnRpb3VzbmVzc19taW51c19PcGVubmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmb29saGFyZHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImlsbG9naWNhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1tYXR1cmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImhhcGhhemFyZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImxheFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZmxpcHBhbnRcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkNvbnNjaWVudGlvdXNuZXNzX21pbnVzX09wZW5uZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5jb252ZW50aW9uYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJxdWlya3lcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkNvbnNjaWVudGlvdXNuZXNzX3BsdXNfQWdyZWVhYmxlbmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInN0ZXJuXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic3RyaWN0XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmlnaWRcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkNvbnNjaWVudGlvdXNuZXNzX3BsdXNfQWdyZWVhYmxlbmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRlcGVuZGFibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJyZXNwb25zaWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInJlbGlhYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibWFubmVybHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb25zaWRlcmF0ZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQ29uc2NpZW50aW91c25lc3NfcGx1c19FeHRyYXZlcnNpb25fbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY2F1dGlvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb25maWRlbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwdW5jdHVhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZvcm1hbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRocmlmdHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwcmluY2lwbGVkXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJDb25zY2llbnRpb3VzbmVzc19wbHVzX0V4dHJhdmVyc2lvbl9wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFtYml0aW91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFsZXJ0XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZmlybVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInB1cnBvc2VmdWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb21wZXRpdGl2ZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQ29uc2NpZW50aW91c25lc3NfcGx1c19OZXVyb3RpY2lzbV9taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0aG9yb3VnaFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInN0ZWFkeVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbnNpc3RlbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZWxmLWRpc2NpcGxpbmVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibG9naWNhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRlY2lzaXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29udHJvbGxlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbmNpc2VcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkNvbnNjaWVudGlvdXNuZXNzX3BsdXNfTmV1cm90aWNpc21fcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwYXJ0aWN1bGFyXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJoaWdoLXN0cnVuZ1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQ29uc2NpZW50aW91c25lc3NfcGx1c19PcGVubmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0cmFkaXRpb25hbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbnZlbnRpb25hbFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQ29uc2NpZW50aW91c25lc3NfcGx1c19PcGVubmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNvcGhpc3RpY2F0ZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwZXJmZWN0aW9uaXN0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbmR1c3RyaW91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRpZ25pZmllZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInJlZmluZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjdWx0dXJlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZvcmVzaWdodGVkXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJFeHRyYXZlcnNpb25fbWludXNfQWdyZWVhYmxlbmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJza2VwdGljYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ3YXJ5IG9mIG90aGVyc1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VjbHVzaXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmNvbW11bmljYXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuc29jaWFibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImdsdW1cIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRldGFjaGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYWxvb2ZcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkV4dHJhdmVyc2lvbl9taW51c19BZ3JlZWFibGVuZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5hZ2dyZXNzaXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaHVtYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic3VibWlzc2l2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRpbWlkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29tcGxpYW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibmHDr3ZlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJFeHRyYXZlcnNpb25fbWludXNfQ29uc2NpZW50aW91c25lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbmRpcmVjdFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5lbmVyZ2V0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNsdWdnaXNoXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJub25wZXJzaXN0ZW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ2YWd1ZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiRXh0cmF2ZXJzaW9uX21pbnVzX0NvbnNjaWVudGlvdXNuZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmVzdHJhaW5lZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlcmlvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkaXNjcmVldFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNhdXRpb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicHJpbmNpcGxlZFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiRXh0cmF2ZXJzaW9uX21pbnVzX05ldXJvdGljaXNtX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRyYW5xdWlsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VkYXRlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGxhY2lkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1wYXJ0aWFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5hc3N1bWluZ1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFjcXVpZXNjZW50XCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJFeHRyYXZlcnNpb25fbWludXNfTmV1cm90aWNpc21fcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJndWFyZGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVzc2ltaXN0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZWNyZXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvd2FyZGx5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VjcmV0aXZlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJFeHRyYXZlcnNpb25fbWludXNfT3Blbm5lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic29tYmVyXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJtZWVrXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmFkdmVudHVyb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGFzc2l2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXBhdGhldGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZG9jaWxlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJFeHRyYXZlcnNpb25fbWludXNfT3Blbm5lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbm5lci1kaXJlY3RlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImludHJvc3BlY3RpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJtZWRpdGF0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29udGVtcGxhdGluZ1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlbGYtZXhhbWluaW5nXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJFeHRyYXZlcnNpb25fcGx1c19BZ3JlZWFibGVuZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm9waW5pb25hdGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmb3JjZWZ1bFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZG9taW5lZXJpbmdcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImJvYXN0ZnVsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJib3NzeVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRvbWluYW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3VubmluZ1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiRXh0cmF2ZXJzaW9uX3BsdXNfQWdyZWVhYmxlbmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNvY2lhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImVuZXJnZXRpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImVudGh1c2lhc3RpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbW11bmljYXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ2aWJyYW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic3Bpcml0ZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJtYWduZXRpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInplc3RmdWxcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkV4dHJhdmVyc2lvbl9wbHVzX0NvbnNjaWVudGlvdXNuZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImJvaXN0ZXJvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJtaXNjaGlldm91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImV4aGliaXRpb25pc3RpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImdyZWdhcmlvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkZW1vbnN0cmF0aXZlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJFeHRyYXZlcnNpb25fcGx1c19Db25zY2llbnRpb3VzbmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFjdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbXBldGl0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVyc2lzdGVudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFtYml0aW91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInB1cnBvc2VmdWxcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkV4dHJhdmVyc2lvbl9wbHVzX05ldXJvdGljaXNtX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbmZpZGVudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImJvbGRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhc3N1cmVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5pbmhpYml0ZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb3VyYWdlb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYnJhdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZWxmLXNhdGlzZmllZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInZpZ29yb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic3Ryb25nXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJFeHRyYXZlcnNpb25fcGx1c19OZXVyb3RpY2lzbV9wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImV4cGxvc2l2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwid29yZHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJleHRyYXZhZ2FudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidm9sYXRpbGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmbGlydGF0aW91c1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiRXh0cmF2ZXJzaW9uX3BsdXNfT3Blbm5lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ2ZXJib3NlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bnNjcnVwdWxvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBvbXBvdXNcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkV4dHJhdmVyc2lvbl9wbHVzX09wZW5uZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhwcmVzc2l2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNhbmRpZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRyYW1hdGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic3BvbnRhbmVvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ3aXR0eVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm9wcG9ydHVuaXN0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbmRlcGVuZGVudFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiTmV1cm90aWNpc21fbWludXNfQWdyZWVhYmxlbmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuZW1vdGlvbmFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbnNlbnNpdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5hZmZlY3Rpb25hdGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBhc3Npb25sZXNzXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJOZXVyb3RpY2lzbV9taW51c19BZ3JlZWFibGVuZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGF0aWVudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInJlbGF4ZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmRlbWFuZGluZ1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRvd24tdG8tZWFydGhcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJvcHRpbWlzdGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uY2VpdGxlc3NcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmNyaXRpY2FsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5wcmV0ZW50aW91c1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiTmV1cm90aWNpc21fbWludXNfQ29uc2NpZW50aW91c25lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5mb3JtYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJsb3cta2V5XCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJOZXVyb3RpY2lzbV9taW51c19Db25zY2llbnRpb3VzbmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInJhdGlvbmFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwib2JqZWN0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic3RlYWR5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibG9naWNhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRlY2lzaXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9pc2VkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uY2lzZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRob3JvdWdoXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZWNvbm9taWNhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlbGYtZGlzY2lwbGluZWRcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk5ldXJvdGljaXNtX21pbnVzX0V4dHJhdmVyc2lvbl9taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmFzc3VtaW5nXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmV4Y2l0YWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBsYWNpZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRyYW5xdWlsXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJOZXVyb3RpY2lzbV9taW51c19FeHRyYXZlcnNpb25fcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bnNlbGZjb25zY2lvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ3ZWFyaWxlc3NcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbmRlZmF0aWdhYmxlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJOZXVyb3RpY2lzbV9taW51c19PcGVubmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbXBlcnR1cmJhYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbnNlbnNpdGl2ZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiTmV1cm90aWNpc21fbWludXNfT3Blbm5lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJoZWFydGZlbHRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ2ZXJzYXRpbGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjcmVhdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImludGVsbGVjdHVhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluc2lnaHRmdWxcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk5ldXJvdGljaXNtX3BsdXNfQWdyZWVhYmxlbmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRlbXBlcmFtZW50YWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImlycml0YWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicXVhcnJlbHNvbWVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImltcGF0aWVudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ3J1bXB5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjcmFiYnlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNyYW5reVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiTmV1cm90aWNpc21fcGx1c19BZ3JlZWFibGVuZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZW1vdGlvbmFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJndWxsaWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFmZmVjdGlvbmF0ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlbnNpdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNvZnRcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk5ldXJvdGljaXNtX3BsdXNfQ29uc2NpZW50aW91c25lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb21wdWxzaXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJub3NleVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VsZi1pbmR1bGdlbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZvcmdldGZ1bFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1wdWxzaXZlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJOZXVyb3RpY2lzbV9wbHVzX0NvbnNjaWVudGlvdXNuZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGFydGljdWxhclwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaGlnaC1zdHJ1bmdcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk5ldXJvdGljaXNtX3BsdXNfRXh0cmF2ZXJzaW9uX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImd1YXJkZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZyZXRmdWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluc2VjdXJlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwZXNzaW1pc3RpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlY3JldGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZmVhcmZ1bFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibmVnYXRpdmlzdGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VsZi1jcml0aWNhbFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiTmV1cm90aWNpc21fcGx1c19FeHRyYXZlcnNpb25fcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJleGNpdGFibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIndvcmR5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZmxpcnRhdGlvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImV4cGxvc2l2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImV4dHJhdmFnYW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ2b2xhdGlsZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiTmV1cm90aWNpc21fcGx1c19PcGVubmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJlYXNpbHkgcmF0dGxlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImVhc2lseSBpcmtlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFwcHJlaGVuc2l2ZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiTmV1cm90aWNpc21fcGx1c19PcGVubmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImV4Y2l0YWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBhc3Npb25hdGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZW5zdWFsXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJPcGVubmVzc19taW51c19BZ3JlZWFibGVuZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29hcnNlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0YWN0bGVzc1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3VydFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibmFycm93LW1pbmRlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY2FsbG91c1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiT3Blbm5lc3NfbWludXNfQWdyZWVhYmxlbmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2ltcGxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkZXBlbmRlbnRcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk9wZW5uZXNzX21pbnVzX0NvbnNjaWVudGlvdXNuZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2hvcnRzaWdodGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZm9vbGhhcmR5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbGxvZ2ljYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImltbWF0dXJlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJoYXBoYXphcmRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJsYXhcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZsaXBwYW50XCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJPcGVubmVzc19taW51c19Db25zY2llbnRpb3VzbmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbnZlbnRpb25hbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRyYWRpdGlvbmFsXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJPcGVubmVzc19taW51c19FeHRyYXZlcnNpb25fbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicHJlZGljdGFibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuaW1hZ2luYXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzb21iZXJcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFwYXRoZXRpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5hZHZlbnR1cm91c1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiT3Blbm5lc3NfbWludXNfRXh0cmF2ZXJzaW9uX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ2ZXJib3NlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bnNjcnVwdWxvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBvbXBvdXNcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk9wZW5uZXNzX21pbnVzX05ldXJvdGljaXNtX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImltcGVydHVyYmFibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluc2Vuc2l0aXZlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJPcGVubmVzc19taW51c19OZXVyb3RpY2lzbV9wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImVhc2lseSByYXR0bGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZWFzaWx5IGlya2VkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXBwcmVoZW5zaXZlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJPcGVubmVzc19wbHVzX0FncmVlYWJsZW5lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2hyZXdkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZWNjZW50cmljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5kaXZpZHVhbGlzdGljXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJPcGVubmVzc19wbHVzX0FncmVlYWJsZW5lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpZGVhbGlzdGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGlwbG9tYXRpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRlZXBcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0YWN0ZnVsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ2VuaWFsXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJPcGVubmVzc19wbHVzX0NvbnNjaWVudGlvdXNuZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuY29udmVudGlvbmFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicXVpcmt5XCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJPcGVubmVzc19wbHVzX0NvbnNjaWVudGlvdXNuZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYW5hbHl0aWNhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBlcmNlcHRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbmZvcm1hdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFydGljdWxhdGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkaWduaWZpZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjdWx0dXJlZFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiT3Blbm5lc3NfcGx1c19FeHRyYXZlcnNpb25fbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW50cm9zcGVjdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm1lZGl0YXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb250ZW1wbGF0aW5nXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VsZi1leGFtaW5pbmdcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbm5lci1kaXJlY3RlZFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiT3Blbm5lc3NfcGx1c19FeHRyYXZlcnNpb25fcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ3b3JsZGx5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGhlYXRyaWNhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImVsb3F1ZW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5xdWlzaXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbnRlbnNlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJPcGVubmVzc19wbHVzX05ldXJvdGljaXNtX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNyZWF0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW50ZWxsZWN0dWFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5zaWdodGZ1bFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInZlcnNhdGlsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImludmVudGl2ZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiT3Blbm5lc3NfcGx1c19OZXVyb3RpY2lzbV9wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBhc3Npb25hdGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJleGNpdGFibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZW5zdWFsXCJcbiAgICAgICAgICB9XG4gICAgICBdXG4gIH0sXG4gIFwidmFsdWVzXCI6IHtcbiAgICAgIFwiSGVkb25pc21cIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiVGFraW5nIHBsZWFzdXJlIGluIGxpZmVcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBwcmVmZXIgYWN0aXZpdGllcyB3aXRoIGEgcHVycG9zZSBncmVhdGVyIHRoYW4ganVzdCBwZXJzb25hbCBlbmpveW1lbnRcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGhpZ2hseSBtb3RpdmF0ZWQgdG8gZW5qb3kgbGlmZSB0byBpdHMgZnVsbGVzdFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiU2VsZi10cmFuc2NlbmRlbmNlXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIkhlbHBpbmcgb3RoZXJzXCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgdGhpbmsgcGVvcGxlIGNhbiBoYW5kbGUgdGhlaXIgb3duIGJ1c2luZXNzIHdpdGhvdXQgaW50ZXJmZXJlbmNlXCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IHRoaW5rIGl0IGlzIGltcG9ydGFudCB0byB0YWtlIGNhcmUgb2YgdGhlIHBlb3BsZSBhcm91bmQgeW91XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiRmFpcm5lc3NcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBiZWxpZXZlIHRoYXQgcGVvcGxlIGNyZWF0ZSB0aGVpciBvd24gb3Bwb3J0dW5pdGllc1wiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBiZWxpZXZlIGluIHNvY2lhbCBqdXN0aWNlIGFuZCBlcXVhbGl0eSBmb3IgYWxsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiU29jaWFsIGp1c3RpY2VcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBiZWxpZXZlIHRoYXQgcGVvcGxlIGNyZWF0ZSB0aGVpciBvd24gb3Bwb3J0dW5pdGllc1wiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBiZWxpZXZlIGluIHNvY2lhbCBqdXN0aWNlIGFuZCBlcXVhbGl0eSBmb3IgYWxsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiRXF1YWxpdHlcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBiZWxpZXZlIHRoYXQgcGVvcGxlIGNyZWF0ZSB0aGVpciBvd24gb3Bwb3J0dW5pdGllc1wiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBiZWxpZXZlIGluIHNvY2lhbCBqdXN0aWNlIGFuZCBlcXVhbGl0eSBmb3IgYWxsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiQ29tbXVuaXR5IHNlcnZpY2VcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSB0aGluayBwZW9wbGUgY2FuIGhhbmRsZSB0aGVpciBvd24gYnVzaW5lc3Mgd2l0aG91dCBpbnRlcmZlcmVuY2VcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgdGhpbmsgaXQgaXMgaW1wb3J0YW50IHRvIHRha2UgY2FyZSBvZiB0aGUgcGVvcGxlIGFyb3VuZCB5b3VcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkNvbnNlcnZhdGlvblwiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJUcmFkaXRpb25cIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBjYXJlIG1vcmUgYWJvdXQgbWFraW5nIHlvdXIgb3duIHBhdGggdGhhbiBmb2xsb3dpbmcgd2hhdCBvdGhlcnMgaGF2ZSBkb25lXCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGhpZ2hseSByZXNwZWN0IHRoZSBncm91cHMgeW91IGJlbG9uZyB0byBhbmQgZm9sbG93IHRoZWlyIGd1aWRhbmNlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiSGFybW9ueVwiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGRlY2lkZSB3aGF0IGlzIHJpZ2h0IGJhc2VkIG9uIHlvdXIgYmVsaWVmcywgbm90IHdoYXQgb3RoZXIgcGVvcGxlIHRoaW5rXCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGtub3cgcnVsZXMgYXJlIHRoZXJlIGZvciBhIHJlYXNvbiwgYW5kIHlvdSB0cnkgbmV2ZXIgdG8gYnJlYWsgdGhlbVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIkh1bWlsaXR5XCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgZGVjaWRlIHdoYXQgaXMgcmlnaHQgYmFzZWQgb24geW91ciBiZWxpZWZzLCBub3Qgd2hhdCBvdGhlciBwZW9wbGUgdGhpbmtcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3Ugc2VlIHdvcnRoIGluIGRlZmVycmluZyB0byBvdGhlcnNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJTb2NpYWwgbm9ybXNcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBkZWNpZGUgd2hhdCBpcyByaWdodCBiYXNlZCBvbiB5b3VyIGJlbGllZnMsIG5vdCB3aGF0IG90aGVyIHBlb3BsZSB0aGlua1wiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBrbm93IHJ1bGVzIGFyZSB0aGVyZSBmb3IgYSByZWFzb24sIGFuZCB5b3UgdHJ5IG5ldmVyIHRvIGJyZWFrIHRoZW1cIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJTZWN1cml0eVwiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGJlbGlldmUgdGhhdCBzZWN1cml0eSBpcyB3b3J0aCBzYWNyaWZpY2luZyB0byBhY2hpZXZlIG90aGVyIGdvYWxzXCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGJlbGlldmUgdGhhdCBzYWZldHkgYW5kIHNlY3VyaXR5IGFyZSBpbXBvcnRhbnQgdGhpbmdzIHRvIHNhZmVndWFyZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIlNhZmV0eVwiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGJlbGlldmUgdGhhdCBzYWZldHkgaXMgd29ydGggc2FjcmlmaWNpbmcgdG8gYWNoaWV2ZSBvdGhlciBnb2Fsc1wiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBiZWxpZXZlIHRoYXQgc2FmZXR5IGFuZCBzZWN1cml0eSBhcmUgaW1wb3J0YW50IHRoaW5ncyB0byBzYWZlZ3VhcmRcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk9wZW5uZXNzLXRvLWNoYW5nZVwiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJJbmRlcGVuZGVuY2VcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSB3ZWxjb21lIHdoZW4gb3RoZXJzIGRpcmVjdCB5b3VyIGFjdGl2aXRpZXMgZm9yIHlvdVwiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBsaWtlIHRvIHNldCB5b3VyIG93biBnb2FscyB0byBkZWNpZGUgaG93IHRvIGJlc3QgYWNoaWV2ZSB0aGVtXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiRXhjaXRlbWVudFwiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IHdvdWxkIHJhdGhlciBzdGljayB3aXRoIHRoaW5ncyB5b3UgYWxyZWFkeSBrbm93IHlvdSBsaWtlIHRoYW4gcmlzayB0cnlpbmcgc29tZXRoaW5nIG5ldyBhbmQgcmlza3lcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGVhZ2VyIHRvIHNlYXJjaCBvdXQgbmV3IGFuZCBleGNpdGluZyBleHBlcmllbmNlc1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIkNyZWF0aXZpdHlcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSB3b3VsZCByYXRoZXIgc3RpY2sgd2l0aCB0aGluZ3MgeW91IGFscmVhZHkga25vdyB5b3UgbGlrZSB0aGFuIHJpc2sgdHJ5aW5nIHNvbWV0aGluZyBuZXcgYW5kIHJpc2t5XCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBlYWdlciB0byBzZWFyY2ggb3V0IG5ldyBhbmQgZXhjaXRpbmcgZXhwZXJpZW5jZXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJDdXJpb3NpdHlcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSB3b3VsZCByYXRoZXIgc3RpY2sgd2l0aCB0aGluZ3MgeW91IGFscmVhZHkga25vdyB5b3UgbGlrZSB0aGFuIHJpc2sgdHJ5aW5nIHNvbWV0aGluZyBuZXcgYW5kIHJpc2t5XCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBlYWdlciB0byBzZWFyY2ggb3V0IG5ldyBhbmQgZXhjaXRpbmcgZXhwZXJpZW5jZXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJTZWxmLWRpcmVjdGlvblwiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IHdlbGNvbWUgd2hlbiBvdGhlcnMgZGlyZWN0IHlvdXIgYWN0aXZpdGllcyBmb3IgeW91XCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGxpa2UgdG8gc2V0IHlvdXIgb3duIGdvYWxzIHRvIGRlY2lkZSBob3cgdG8gYmVzdCBhY2hpZXZlIHRoZW1cIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJGcmVlZG9tXCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3Ugd2VsY29tZSB3aGVuIG90aGVycyBkaXJlY3QgeW91ciBhY3Rpdml0aWVzIGZvciB5b3VcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgbGlrZSB0byBzZXQgeW91ciBvd24gZ29hbHMgdG8gZGVjaWRlIGhvdyB0byBiZXN0IGFjaGlldmUgdGhlbVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiU2VsZi1lbmhhbmNlbWVudFwiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJBY2hpZXZpbmcgc3VjY2Vzc1wiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IG1ha2UgZGVjaXNpb25zIHdpdGggbGl0dGxlIHJlZ2FyZCBmb3IgaG93IHRoZXkgc2hvdyBvZmYgeW91ciB0YWxlbnRzXCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IHNlZWsgb3V0IG9wcG9ydHVuaXRpZXMgdG8gaW1wcm92ZSB5b3Vyc2VsZiBhbmQgZGVtb25zdHJhdGUgdGhhdCB5b3UgYXJlIGEgY2FwYWJsZSBwZXJzb25cIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJHYWluaW5nIHNvY2lhbCBzdGF0dXNcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgY29tZm9ydGFibGUgd2l0aCB5b3VyIHNvY2lhbCBzdGF0dXMgYW5kIGRvbid0IGZlZWwgYSBzdHJvbmcgbmVlZCB0byBpbXByb3ZlIGl0XCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IHB1dCBzdWJzdGFudGlhbCBlZmZvcnQgaW50byBpbXByb3ZpbmcgeW91ciBzdGF0dXMgYW5kIHB1YmxpYyBpbWFnZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIkFtYml0aW9uXCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGNvbWZvcnRhYmxlIHdpdGggeW91ciBzb2NpYWwgc3RhdHVzIGFuZCBkb24ndCBmZWVsIGEgc3Ryb25nIG5lZWQgdG8gaW1wcm92ZSBpdFwiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBmZWVsIGl0IGlzIGltcG9ydGFudCB0byBwdXNoIGZvcndhcmQgdG93YXJkcyBnb2Fsc1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIkhpZ2ggYWNoaWV2ZW1lbnRcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBtYWtlIGRlY2lzaW9ucyB3aXRoIGxpdHRsZSByZWdhcmQgZm9yIGhvdyB0aGV5IHNob3cgb2ZmIHlvdXIgdGFsZW50c1wiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBzZWVrIG91dCBvcHBvcnR1bml0aWVzIHRvIGltcHJvdmUgeW91cnNlbGYgYW5kIGRlbW9uc3RyYXRlIHRoYXQgeW91IGFyZSBhIGNhcGFibGUgcGVyc29uXCJcbiAgICAgICAgICB9XG4gICAgICBdXG4gIH1cbn1cbiIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTUgSUJNIENvcnAuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgXCJmYWNldHNcIjp7XG4gICAgXCJBcnRpc3RpYy1pbnRlcmVzdHNcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiVW5hIHBlcnNvbmEgcXVlIGFwcmVjaWEgZWwgYXJ0ZVwiLFxuICAgICAgICBcIkJpZzVcIjogXCJBcGVydHVyYSBhIGV4cGVyaWVuY2lhc1wiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkRpc2ZydXRhIGRlIGxhIGJlbGxlemEgeSBidXNjYSBleHBlcmllbmNpYXMgY3JlYXRpdmFzXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJMZSBpbnRlcmVzYW4gbWVub3MgbGFzIGFjdGl2aWRhZGVzIGFydMOtc3RpY2FzIG8gY3JlYXRpdmFzIHF1ZSBsYSBtYXlvcsOtYSBkZSBsYXMgcGVyc29uYXMgcXVlIHBhcnRpY2lwYXJvbiBkZSBudWVzdHJhcyBlbmN1ZXN0YXNcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiVW5hIHBlcnNvbmEgZGVzaW50ZXJlc2FkYSBwb3IgZWwgYXJ0ZVwiXG4gICAgfSxcbiAgICBcIkR1dGlmdWxuZXNzXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIlVuYSBwZXJzb25hIHF1ZSBjdW1wbGUgY29uIHN1IGRlYmVyXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIlJlc3BvbnNhYmlsaWRhZFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlRvbWEgbGFzIHJlZ2xhcyB5IGxhcyBvYmxpZ2FjaW9uZXMgc2VyaWFtZW50ZSwgYcO6biBjdWFuZG8gc29uIGluY29udmVuaWVudGVzXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJIYWNlIGxvIHF1ZSBxdWllcmUgc2luIGltcG9ydGFyIGxhcyByZWdsYXMgeSBsYXMgb2JsaWdhY2lvbmVzXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIkRlc3ByZW9jdXBhZG9cIlxuICAgIH0sXG4gICAgXCJDb29wZXJhdGlvblwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJBY29tb2RhdGljaW9cIixcbiAgICAgICAgXCJCaWc1XCI6IFwiQWZhYmlsaWRhZFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkVzIGbDoWNpbCBkZSBjb21wbGFjZXIgZSBpbnRlbnRhIGV2aXRhciBwb3NpYmxlcyBjb25mcm9udGFjaW9uZXNcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIk5vIHRlIGltcG9ydGEgY29udHJhZGVjaXIgYSBsb3MgZGVtw6FzXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIkNvbnRyYXJpb1wiXG4gICAgfSxcbiAgICBcIlNlbGYtY29uc2Npb3VzbmVzc1wiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJDb25zY2llbnRlIGRlIHPDrSBtaXNtb1wiLFxuICAgICAgICBcIkJpZzVcIjogXCJSYW5nbyBlbW9jaW9uYWxcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJFcyBzZW5zaWJsZSBhIGxvIHF1ZSBsYXMgZGVtw6FzIHBlcnNvbmFzIHBvZHLDrWFuIGVzdGFyIHBlbnNhbmRvIGFjZXJjYSBkZSB1c3RlZFwiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiRXMgZGlmw61jaWwgZGUgYXZlcmdvbnphciB5IGNvbmbDrWEgZW4gc8OtIG1pc21vIGxhIG1heW9yIHBhcnRlIGRlbCB0aWVtcG9cIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiQ29uZmlhZG9cIlxuICAgIH0sXG4gICAgXCJPcmRlcmxpbmVzc1wiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJPcmdhbml6YWRvXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIlJlc3BvbnNhYmlsaWRhZFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlNpZW50ZSB1bmEgZnVlcnRlIG5lY2VzaWRhZCBkZSBtYW50ZW5lciB1bmEgdmlkYSBlc3RydWN0dXJhZGFcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIk5vIGxlIGRlZGljYSBtdWNobyB0aWVtcG8gYSBvcmdhbml6YXJzZSBlbiBzdSB2aWRhIGRpYXJpYVwiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJEZXNlc3RydWN0dXJhZG9cIlxuICAgIH0sXG4gICAgXCJTeW1wYXRoeVwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJFbXDDoXRpY29cIixcbiAgICAgICAgXCJCaWc1XCI6IFwiQWZhYmlsaWRhZFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlNpZW50ZSBsbyBxdWUgb3Ryb3Mgc2llbnRlbiB5IGVzIGNvbXBhc2l2byBjb24gZWxsb3NcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkNyZWUgcXVlIGxhcyBwZXJzb25hcyBkZWJlcsOtYW4gY29uZmlhciBtw6FzIGVuIHPDrSBtaXNtb3MgcXVlIGVuIG90cmFzIHBlcnNvbmFzXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIlVuYSBwZXJzb25hIGRlIGdyYW4gZm9ydGFsZXphXCJcbiAgICB9LFxuICAgIFwiQWN0aXZpdHktbGV2ZWxcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiRW5lcmfDqXRpY29cIixcbiAgICAgICAgXCJCaWc1XCI6IFwiRXh0cmF2ZXJzacOzblwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkRpc2ZydXRhIGxsZXZhciB1biByaXRtbyBkZSB2aWRhIGFjZWxlcmFkbywgdW5hIGFnZW5kYSBvY3VwYWRhIGNvbiBtdWNoYXMgYWN0aXZpZGFkZXNcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkFwcmVjaWEgbGxldmFyIHVuIHJpdG1vIGRlIHZpZGEgcmVsYWphZG9cIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiUmVsYWphZG9cIlxuICAgIH0sXG4gICAgXCJTZWxmLWVmZmljYWN5XCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIlNlZ3VybyBkZSBzw60gbWlzbW9cIixcbiAgICAgICAgXCJCaWc1XCI6IFwiUmVzcG9uc2FiaWxpZGFkXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiU2llbnRlIHF1ZSB0aWVuZSBsYSBoYWJpbGlkYWQgZGUgdHJpdW5mYXIgZW4gbGFzIHRhcmVhcyBxdWUgc2UgcHJvcG9uZSByZWFsaXphclwiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiRnJlY3VlbnRlbWVudGUgZHVkYSBhY2VyY2EgZGUgc3UgaGFiaWxpZGFkIHBhcmEgYWxjYW56YXIgc3VzIG1ldGFzXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIkluc2VndXJvIGRlIHPDrSBtaXNtYVwiXG4gICAgfSxcbiAgICBcIlNlbGYtZGlzY2lwbGluZVwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJQZXJzaXN0ZW50ZVwiLFxuICAgICAgICBcIkJpZzVcIjogXCJSZXNwb25zYWJpbGlkYWRcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJQdWVkZSBoYWNlciBmcmVudGUgeSBsbGV2YXIgYSBjYWJvIHRhcmVhcyBkaWbDrWNpbGVzXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJMZSBkYSB0cmFiYWpvIGxsZXZhciBhZGVsYW50ZSB0YXJlYXMgZGlmw61jaWxlcyBwb3IgdW4gbGFyZ28gcGVyaW9kbyBkZSB0aWVtcG9cIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiSW50ZXJtaXRlbnRlXCJcbiAgICB9LFxuICAgIFwiQWx0cnVpc21cIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiQWx0cnVpc3RhXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkFmYWJpbGlkYWRcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJTZSBzaWVudGUgcmVhbGl6YWRvIGF5dWRhbmRvIGEgb3Ryb3MgeSBkZWphcsOhIHN1cyBjb3NhcyBkZSBsYWRvIHBhcmEgaGFjZXJsb1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiRXN0w6EgbcOhcyBlbmZvY2FkbyBlbiBjdWlkYXIgZGUgdXN0ZWQgbWlzbW8gcXVlIGVuIGRlZGljYXIgdGllbXBvIGEgb3RyYXMgcGVyc29uYXNcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiSW5kaXZpZHVhbGlzdGFcIlxuICAgIH0sXG4gICAgXCJDYXV0aW91c25lc3NcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiUHJ1ZGVudGVcIixcbiAgICAgICAgXCJCaWc1XCI6IFwiUmVzcG9uc2FiaWxpZGFkXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiUGllbnNhIGN1aWRhZG9zYW1lbnRlIGFjZXJjYSBkZSBzdXMgZGVjaXNpb25lcyBhbnRlcyBkZSB0b21hcmxhc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiUHJlZmllcmUgdG9tYXIgYWNjacOzbiBpbm1lZGlhdGFtZW50ZSBhbnRlcyBxdWUgaW52ZXJ0aXIgdGllbXBvIGRlbGliZXJhbmRvIHF1w6kgZGVjaXNpw7NuIHRvbWFyXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIkF1ZGF6XCJcbiAgICB9LFxuICAgIFwiTW9yYWxpdHlcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiSW50cmFuc2lnZW50ZVwiLFxuICAgICAgICBcIkJpZzVcIjogXCJBZmFiaWxpZGFkXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiUGllbnNhIHF1ZSBlc3TDoSBtYWwgdG9tYXIgdmVudGFqYSBkZSBsb3MgZGVtw6FzIHBhcmEgYXZhbnphclwiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiVXRpbGl6YSBjdWFscXVpZXIgbWVkaW8gcG9zaWJsZSBwYXJhIGNvbnNlZ3VpciBsbyBxdWUgcXVpZXJlIHkgZXN0w6EgY8OzbW9kbyBjb24gZWxsb1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJVbmEgcGVyc29uYSBjb21wcm9tZXRpZGFcIlxuICAgIH0sXG4gICAgXCJBbnhpZXR5XCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIlByb3BlbnNvIGEgcHJlb2N1cGFyc2VcIixcbiAgICAgICAgXCJCaWc1XCI6IFwiUmFuZ28gZW1vY2lvbmFsXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiVGllbmRlIGEgcHJlb2N1cGFyc2UgYWNlcmNhIGRlIGxhcyBjb3NhcyBxdWUgcG9kcsOtYW4gcGFzYXJcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlRpZW5kZSBhIHNlbnRpcnNlIHRyYW5xdWlsbyB5IGEgY29uZmlhciBlbiBzw60gbWlzbW9cIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiU2VndXJvIGRlIHPDrSBtaXNtb1wiXG4gICAgfSxcbiAgICBcIkVtb3Rpb25hbGl0eVwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJFbW9jaW9uYWxtZW50ZSBjb25zY2llbnRlXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkFwZXJ0dXJhIGEgZXhwZXJpZW5jaWFzXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiRXMgY29uc2NpZW50ZSBkZSBzdXMgc2VudGltaWVudG9zIHkgZGUgY8OzbW8gZXhwcmVzYXJsb3NcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIk5vIHBpZW5zYSBmcmVjdWVudGVtZW50ZSBhY2VyY2EgZGUgc3VzIGVtb2Npb25lcyBuaSBsYXMgZXhwcmVzYSBhYmllcnRhbWVudGVcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiRGVzYXBhc2lvbmFkb1wiXG4gICAgfSxcbiAgICBcIlZ1bG5lcmFiaWxpdHlcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiU3VzY2VwdGlibGUgYWwgZXN0csOpc1wiLFxuICAgICAgICBcIkJpZzVcIjogXCJSYW5nbyBlbW9jaW9uYWxcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJTZSBhYnJ1bWEgZsOhY2lsbWVudGUgZW4gc2l0dWFjaW9uZXMgZGUgZXN0csOpc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiTWFuZWphIGV2ZW50b3MgaW5lc3BlcmFkb3MgY29uIGNhbG1hIHkgZWZlY3RpdmFtZW50ZVwiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJVbmEgcGVyc29uYSBxdWUgbWFudGllbmUgbGEgY2FsbWEgYmFqbyBwcmVzacOzblwiXG4gICAgfSxcbiAgICBcIkltbW9kZXJhdGlvblwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJIZWRvbmlzdGFcIixcbiAgICAgICAgXCJCaWc1XCI6IFwiUmFuZ28gZW1vY2lvbmFsXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiU2llbnRlIGZ1ZXJ0ZW1lbnRlIHN1cyBkZXNlb3MgeSBlcyBmw6FjaWxtZW50ZSB0ZW50YWRvIHBvciBlbGxvc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiQ29udHJvbGEgc3VzIGRlc2VvcywgbG9zIGN1YWxlcyBubyBzb24gcGFydGljdWxhcm1lbnRlIGludGVuc29zXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIlNlcmVub1wiXG4gICAgfSxcbiAgICBcIkZyaWVuZGxpbmVzc1wiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJFeHRyb3ZlcnRpZG9cIixcbiAgICAgICAgXCJCaWc1XCI6IFwiRXh0cmF2ZXJzacOzblwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkhhY2UgYW1pZ29zIGbDoWNpbG1lbnRlIHkgc2Ugc2llbnRlIGPDs21vZG8gZXN0YW5kbyBjb24gb3RyYXMgcGVyc29uYXNcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkVzIHVuYSBwZXJzb25hIHJlc2VydmFkYSB5IG5vIGRlamEgYSBtdWNoYXMgcGVyc29uYXMgZW50cmFyXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIlJlc2VydmFkb1wiXG4gICAgfSxcbiAgICBcIkFjaGlldmVtZW50LXN0cml2aW5nXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIlVuYSBwZXJzb25hIG1vdGl2YWRhXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIlJlc3BvbnNhYmlsaWRhZFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlNlIHByb3BvbmUgZ3JhbmRlcyBtZXRhcyB5IHRyYWJhamEgZHVybyBwYXJhIGFsY2FuemFybGFzXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJFc3TDoSBjb25mb3JtZSBjb24gc3VzIGxvZ3JvcyB5IG5vIHNpZW50ZSBsYSBuZWNlc2lkYWQgZGUgcG9uZXJzZSBtZXRhcyBtw6FzIGFtYmljaW9zYXNcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiVW5hIHBlcnNvbmEgc2F0aXNmZWNoYVwiXG4gICAgfSxcbiAgICBcIk1vZGVzdHlcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiTW9kZXN0b1wiLFxuICAgICAgICBcIkJpZzVcIjogXCJBZmFiaWxpZGFkXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiU2Ugc2llbnRlIGPDs21vZG8gc2llbmRvIGVsIGNlbnRybyBkZSBhdGVuY2nDs25cIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlNlIHRpZW5lIHVuYSBlc3RpbWEgYWx0YSwgc2UgZW5jdWVudHJhIHNhdGlzZmVjaG8gY29uIHF1acOpbiBlc1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJPcmd1bGxvc29cIlxuICAgIH0sXG4gICAgXCJFeGNpdGVtZW50LXNlZWtpbmdcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiVW5hIHBlcnNvbmEgcXVlIGJ1c2NhIGxhIGVtb2Npw7NuXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkV4dHJhdmVyc2nDs25cIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJMZSBlbW9jaW9uYSB0b21hciByaWVzZ29zIHkgc2UgYWJ1cnJlIHNpIG5vIHNlIHZlIGVudnVlbHRvIGVuIG11Y2hhIGFjY2nDs25cIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlByZWZpZXJlIGxhcyBhY3RpdmlkYWRlcyB0cmFucXVpbGFzLCBwYWPDrWZpY2FzIHkgc2VndXJhc1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJVbmEgcGVyc29uYSBxdWUgYnVzY2EgbGEgY2FsbWFcIlxuICAgIH0sXG4gICAgXCJBc3NlcnRpdmVuZXNzXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIkFzZXJ0aXZvXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkV4dHJhdmVyc2nDs25cIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJUaWVuZGUgYSBleHByZXNhcnNlIHkgYSBoYWNlcnNlIGNhcmdvIGRlIGxhcyBzaXR1YWNpb25lcywgeSBzZSBlbmN1ZW50cmEgY8OzbW9kbyBsaWRlcmFuZG8gZ3J1cG9zXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJQcmVmaWVyZSBlc2N1Y2hhciBhbnRlcyBxdWUgaGFibGFyLCBlc3BlY2lhbG1lbnRlIGVuIHNpdHVhY2lvbmVzIGRlIGdydXBvXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIkNhbGxhZG9cIlxuICAgIH0sXG4gICAgXCJBZHZlbnR1cm91c25lc3NcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiQXVkYXpcIixcbiAgICAgICAgXCJCaWc1XCI6IFwiQXBlcnR1cmEgYSBleHBlcmllbmNpYXNcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJFc3TDoSBkZXNlb3NvIGRlIHRlbmVyIG51ZXZhcyBleHBlcmllbmNpYXNcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkRpc2ZydXRhIGRlIGxhcyBydXRpbmFzIGZhbWlsaWFyZXMgeSBwcmVmaWVyZSBubyBkZXN2aWFyc2UgZGUgZWxsYXNcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiQ29uc2lzdGVudGVcIlxuICAgIH0sXG4gICAgXCJHcmVnYXJpb3VzbmVzc1wiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJTb2NpYWJsZVwiLFxuICAgICAgICBcIkJpZzVcIjogXCJFeHRyYXZlcnNpw7NuXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiRGlzZnJ1dGEgZXN0YW5kbyBlbiBjb21wYcOxw61hIGRlIG90cm9zXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJUaWVuZSB1biBmdWVydGUgZGVzZW8gZGUgdGVuZXIgdGllbXBvIHBhcmEgdXN0ZWQgbWlzbW9cIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiSW5kZXBlbmRpZW50ZVwiXG4gICAgfSxcbiAgICBcIkNoZWVyZnVsbmVzc1wiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJBbGVncmVcIixcbiAgICAgICAgXCJCaWc1XCI6IFwiRXh0cmF2ZXJzacOzblwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkVzIHVuYSBwZXJzb25hIGFsZWdyZSB5IGNvbXBhcnRlIGVzYSBhbGVncsOtYSBjb24gZWwgbXVuZG9cIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkdlbmVyYWxtZW50ZSBlcyBzZXJpbyB5IG5vIGhhY2UgbXVjaGFzIGJyb21hc1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJTb2xlbW5lXCJcbiAgICB9LFxuICAgIFwiSW1hZ2luYXRpb25cIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiSW1hZ2luYXRpdm9cIixcbiAgICAgICAgXCJCaWc1XCI6IFwiQXBlcnR1cmEgYSBleHBlcmllbmNpYXNcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJTdSBpbWFnaW5hY2nDs24gdnVlbGEgbGlicmVcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlByZWZpZXJlIGhlY2hvcyBhbnRlcyBxdWUgbGEgZmFudGFzw61hXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIlVuYSBwZXJzb25hIGNvbiBsb3MgcGllcyBlbiBsYSB0aWVycmFcIlxuICAgIH0sXG4gICAgXCJEZXByZXNzaW9uXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIk1lbGFuY8OzbGljb1wiLFxuICAgICAgICBcIkJpZzVcIjogXCJSYW5nbyBlbW9jaW9uYWxcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJQaWVuc2EgYmFzdGFudGUgc2VndWlkbyBlbiBsYXMgY29zYXMgY29uIGxhcyBxdWUgZXN0w6EgZGlzY29uZm9ybWVcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkdlbmVyYWxtZW50ZSBzZSBhY2VwdGEgYSB1c3RlZCBtaXNtbyB0YWwgY3VhbCBlc1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJVbmEgcGVyc29uYSBzYXRpc2ZlY2hhXCJcbiAgICB9LFxuICAgIFwiQW5nZXJcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiSW50ZW5zb1wiLFxuICAgICAgICBcIkJpZzVcIjogXCJSYW5nbyBlbW9jaW9uYWxcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJUaWVuZSB1biB0ZW1wZXJhbWVudG8gZnVlcnRlLCBlc3BlY2lhbG1lbnRlIGN1YW5kbyBsYXMgY29zYXMgbm8gZnVuY2lvbmFuIGNvbW8gZXNwZXJhXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJFcyBkaWbDrWNpbCBoYWNlcmxlIGVub2phclwiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJBcGFjaWJsZVwiXG4gICAgfSxcbiAgICBcIlRydXN0XCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIlVuYSBwZXJzb25hIHF1ZSBjb25mw61hIGVuIGxvcyBkZW3DoXNcIixcbiAgICAgICAgXCJCaWc1XCI6IFwiQWZhYmlsaWRhZFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkNyZWUgbG8gbWVqb3IgZGUgbG9zIGRlbcOhcyB5IGNvbmbDrWEgZsOhY2lsbWVudGUgZW4gbGFzIHBlcnNvbmFzXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJTZSBjdWlkYSBkZSBsYXMgaW50ZW5jaW9uZXMgZGUgbG9zIGRlbcOhcyB5IG5vIGNvbmbDrWEgZsOhY2lsbWVudGVcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiQ3VpZGFkb3NvIGNvbiBsb3MgZGVtw6FzXCJcbiAgICB9LFxuICAgIFwiSW50ZWxsZWN0XCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIkZpbG9zw7NmaWNvXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkFwZXJ0dXJhIGEgZXhwZXJpZW5jaWFzXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiRXN0w6EgYWJpZXJ0byBhIG51ZXZhcyBpZGVhcywgbGUgaW50cmlnYW4geSBhbWEgZXhwbG9yYXJsYXNcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlByZWZpZXJlIGxpZGlhciBjb24gZWwgbXVuZG8gdGFsIGN1YWwgZXMsIHJhcmFtZW50ZSBjb25zaWRlcmFuZG8gaWRlYXMgYWJzdHJhY3Rhc1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJDb25jcmV0b1wiXG4gICAgfSxcbiAgICBcIkxpYmVyYWxpc21cIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiRGVzYWZpYW50ZSBhbnRlIGxhIGF1dG9yaWRhZFwiLFxuICAgICAgICBcIkJpZzVcIjogXCJBcGVydHVyYSBhIGV4cGVyaWVuY2lhc1wiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlByZWZpZXJlIGRlc2FmaWFyIGEgbGEgYXV0b3JpZGFkIHkgIGEgbG9zIHZhbG9yZXMgdHJhZGljaW9uYWxlcyBwYXJhIGxvZ3JhciBjYW1iaW9zIHBvc2l0aXZvc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiUHJlZmllcmUgc2VndWlyIHRyYWRpY2lvbmVzIHBhcmEgbWFudGVuZXIgdW5hIHNlbnNhY2nDs24gZGUgZXN0YWJpbGlkYWRcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiUmVzcGV0dW9zbyBkZSBsYSBhdXRvcmlkYWRcIlxuICAgIH1cbiAgfSxcbiAgXCJuZWVkc1wiOiB7XG4gICAgXCJTdGFiaWxpdHlcIjogW1xuICAgICAgICBcImVzdGFiaWxpZGFkXCIsXG4gICAgICAgIFwiYXV0ZW50aWNpZGFkXCIsXG4gICAgICAgIFwiaW50ZWdyaWRhZFwiXG4gICAgXSxcbiAgICBcIlByYWN0aWNhbGl0eVwiOiBbXG4gICAgICAgIFwiZWZpY2llbmNpYVwiLFxuICAgICAgICBcInByYWN0aWNpZGFkXCIsXG4gICAgICAgIFwidmFsb3IgYWdyZWdhZG9cIixcbiAgICAgICAgXCJjb252ZW5pZW5jaWFcIlxuICAgIF0sXG4gICAgXCJMb3ZlXCI6IFtcbiAgICAgICAgXCJhZmluaWRhZFwiLFxuICAgICAgICBcImNvbmV4acOzblwiXG4gICAgXSxcbiAgICBcIlNlbGYtZXhwcmVzc2lvblwiOiBbXG4gICAgICAgIFwiYXV0by1leHByZXNpw7NuXCIsXG4gICAgICAgIFwiZW1wb2RlcmFtaWVudG8gcGVyc29uYWxcIixcbiAgICAgICAgXCJmb3J0YWxlemEgcGVyc29uYWxcIlxuICAgIF0sXG4gICAgXCJDaGFsbGVuZ2VcIjogW1xuICAgICAgICBcInByZXN0aWdpb1wiLFxuICAgICAgICBcImNvbXBldGVuY2lhXCIsXG4gICAgICAgIFwiZ2xvcmlhXCJcbiAgICBdLFxuICAgIFwiQ2xvc2VuZXNzXCI6IFtcbiAgICAgICAgXCJwZXJ0ZW5lbmNpYVwiLFxuICAgICAgICBcIm5vc3RhbGdpYVwiLFxuICAgICAgICBcImludGltaWRhZFwiXG4gICAgXSxcbiAgICBcIkxpYmVydHlcIjogW1xuICAgICAgICBcIm1vZGVybmlkYWRcIixcbiAgICAgICAgXCJleHBhbnNpw7NuIGRlIHBvc2liaWxpZGFkZXNcIixcbiAgICAgICAgXCJwb2RlciBlc2NhcGFyXCIsXG4gICAgICAgIFwiZXNwb250YW5laWRhZFwiLFxuICAgICAgICBcIm5vdmVkYWRcIlxuICAgIF0sXG4gICAgXCJFeGNpdGVtZW50XCI6IFtcbiAgICAgICAgXCJyZWdvY2lqb1wiLFxuICAgICAgICBcImFudGljaXBhY2nDs25cIixcbiAgICAgICAgXCJjZWJyYWNpw7NuXCJcbiAgICBdLFxuICAgIFwiSWRlYWxcIjogW1xuICAgICAgICBcInNvZmlzdGljYWNpw7NuXCIsXG4gICAgICAgIFwiZXNwaXJpdHVhbGlkYWRcIixcbiAgICAgICAgXCJzdXBlcmlvcmlkYWRcIixcbiAgICAgICAgXCJyZWFsaXphY2nDs25cIlxuICAgIF0sXG4gICAgXCJIYXJtb255XCI6IFtcbiAgICAgICAgXCJiaWVuZXN0YXJcIixcbiAgICAgICAgXCJjb3J0ZXPDrWFcIixcbiAgICAgICAgXCJjaXZpbGlkYWRcIlxuICAgIF0sXG4gICAgXCJDdXJpb3NpdHlcIjogW1xuICAgICAgICBcImRlc2N1YnJpbWllbnRvXCIsXG4gICAgICAgIFwibWFlc3Ryw61hXCIsXG4gICAgICAgIFwiYWRxdWlzaWNpw7NuIGRlIGNvbm9jaW1pZW50b1wiXG4gICAgXSxcbiAgICBcIlN0cnVjdHVyZVwiOiBbXG4gICAgICAgIFwib3JnYW5pemFjacOzblwiLFxuICAgICAgICBcImZyYW5xdWV6YVwiLFxuICAgICAgICBcImNsYXJpZGFkXCIsXG4gICAgICAgIFwiY29uZmlhYmlsaWRhZFwiXG4gICAgXVxuICB9LFxuICBcInBocmFzZXNcIjoge1xuICAgIFwiWW91IGFyZSAlc1wiOiBcIlVzdGVkIGVzICVzXCIsXG4gICAgXCJZb3UgYXJlICVzIGFuZCAlc1wiOiBcIlVzdGVkIGVzICVzIHkgJXNcIixcbiAgICBcIllvdSBhcmUgJXMsICVzIGFuZCAlc1wiOiBcIlVzdGVkIGVzICVzLCAlcyB5ICVzXCIsXG4gICAgXCJBbmQgeW91IGFyZSAlc1wiOiBcIlkgdXN0ZWQgZXMgJXNcIixcbiAgICBcIllvdSBhcmUgcmVsYXRpdmVseSB1bmNvbmNlcm5lZCB3aXRoICVzXCI6IFwiVXN0ZWQgZXMgcmVsYXRpdmFtZW50ZSBpbmRpZmVyZW50ZSBjb24gJXNcIixcbiAgICBcIllvdSBhcmUgcmVsYXRpdmVseSB1bmNvbmNlcm5lZCB3aXRoIGJvdGggJXMgYW5kICVzXCI6IFwiVXN0ZWQgZXMgcmVsYXRpdmFtZW50ZSBpbmRpZmVyZW50ZSBjb24gJXMgeSAlc1wiLFxuICAgIFwiWW91IGRvbid0IGZpbmQgJXMgdG8gYmUgcGFydGljdWxhcmx5IG1vdGl2YXRpbmcgZm9yIHlvdVwiOiBcIlVzdGVkIG5vIGVuY3VlbnRyYSBhICVzIHBhcnRpY3VsYXJtZW50ZSBtb3RpdmFudGUgcGFyYSB1c3RlZFwiLFxuICAgIFwiWW91IGRvbid0IGZpbmQgZWl0aGVyICVzIG9yICVzIHRvIGJlIHBhcnRpY3VsYXJseSBtb3RpdmF0aW5nIGZvciB5b3VcIjogXCJVc3RlZCBubyBlbmN1ZW50cmEgYSAlcyBvICVzIHBhcnRpY3VsYXJtZW50ZSBtb3RpdmFudGVzIHBhcmEgdXN0ZWRcIixcbiAgICBcIllvdSB2YWx1ZSBib3RoICVzIGEgYml0XCI6IFwiVXN0ZWQgdmFsb3JhIGEgJXMgdW4gcG9jb1wiLFxuICAgIFwiWW91IHZhbHVlIGJvdGggJXMgYW5kICVzIGEgYml0XCI6IFwiVXN0ZWQgdmFsb3JhIGEgJXMgeSAlcyB1biBwb2NvXCIsXG4gICAgXCJZb3UgY29uc2lkZXIgJXMgdG8gZ3VpZGUgYSBsYXJnZSBwYXJ0IG9mIHdoYXQgeW91IGRvXCIgOiBcIlVzdGVkIGNvbnNpZGVyYSBxdWUgJXMgbG8gZ3VpYSBlbiBncmFuIHBhcnRlIGRlIGxvIHF1ZSBoYWNlXCIsXG4gICAgXCJZb3UgY29uc2lkZXIgYm90aCAlcyBhbmQgJXMgdG8gZ3VpZGUgYSBsYXJnZSBwYXJ0IG9mIHdoYXQgeW91IGRvXCIgOiBcIlVzdGVkIGNvbnNpZGVyYSBxdWUgJXMgeSAlcyBsbyBndWlhbiBlbiBncmFuIHBhcnRlIGRlIGxvIHF1ZSBoYWNlXCIsXG4gICAgXCJBbmQgJXNcIjogXCJZICVzXCIsXG4gICAgXCJFeHBlcmllbmNlcyB0aGF0IG1ha2UgeW91IGZlZWwgaGlnaCAlcyBhcmUgZ2VuZXJhbGx5IHVuYXBwZWFsaW5nIHRvIHlvdVwiOiBcIk5vIGxlIGFncmFkYW4gbGFzIGV4cGVyaWVuY2lhcyBxdWUgbGUgZGFuIHVuYSBncmFuIHNlbnNhY2nDs24gZGUgJXNcIixcbiAgICBcIkV4cGVyaWVuY2VzIHRoYXQgZ2l2ZSBhIHNlbnNlIG9mICVzIGhvbGQgc29tZSBhcHBlYWwgdG8geW91XCI6IFwiTGUgYWdyYWRhbiBsYXMgZXhwZXJpZW5jaWFzIHF1ZSBsZSBkYW4gdW5hIHNlbnNhY2nDs24gZGUgJXNcIixcbiAgICBcIllvdSBhcmUgbW90aXZhdGVkIHRvIHNlZWsgb3V0IGV4cGVyaWVuY2VzIHRoYXQgcHJvdmlkZSBhIHN0cm9uZyBmZWVsaW5nIG9mICVzXCI6IFwiRXN0w6EgbW90aXZhZG8gYSBidXNjYXIgZXhwZXJpZW5jaWFzIHF1ZSBsbyBwcm92ZWFuIGRlIHVuYSBmdWVydGUgc2Vuc2FjacOzbiBkZSAlc1wiLFxuICAgIFwiWW91ciBjaG9pY2VzIGFyZSBkcml2ZW4gYnkgYSBkZXNpcmUgZm9yICVzXCIgOiBcIlN1cyBlbGVjY2lvbmVzIGVzdMOhbiBkZXRlcm1pbmFkYXMgcG9yIHVuIGRlc2VvIGRlICVzXCIsXG4gICAgXCJhIGJpdCAlc1wiOiBcInVuIHBvY28gJXNcIixcbiAgICBcInNvbWV3aGF0ICVzXCIgOiBcImFsZ28gJXNcIixcbiAgICBcImNhbiBiZSBwZXJjZWl2ZWQgYXMgJXNcIjogXCJwdWVkZSBzZXIgcGVyY2liaWRvIGNvbW8gJXNcIlxuICB9LFxuICBcInRyYWl0c1wiOiB7XG4gICAgXCJBZ3JlZWFibGVuZXNzX21pbnVzX0NvbnNjaWVudGlvdXNuZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVzY29uc2lkZXJhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZXNjb3J0w6lzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVzY29uZmlhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIGNvb3BlcmF0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaXJyZWZsZXhpdm9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkFncmVlYWJsZW5lc3NfbWludXNfQ29uc2NpZW50aW91c25lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJlc3RyaWN0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJyw61naWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZHVyb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQWdyZWVhYmxlbmVzc19taW51c19FeHRyYXZlcnNpb25fbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjw61uaWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY2F1dG8gY29uIGxvcyBkZW3DoXNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzb2xpdGFyaW9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZXNhcGVnYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1wZXJzb25hbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNvbWJyw61vXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJBZ3JlZWFibGVuZXNzX21pbnVzX0V4dHJhdmVyc2lvbl9wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwib2JzdGluYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYWJydXB0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNydWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29tYmF0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZHVyb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhc3R1dG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJtYW5pcHVsYWRvclwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImhvc2NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGFpbWFkb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQWdyZWVhYmxlbmVzc19taW51c19OZXVyb3RpY2lzbV9taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluc2Vuc2libGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIGFmZWN0dW9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlc2FwYXNpb25hZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ1bmEgcGVyc29uYSBzaW4gZW1vY2lvbmVzXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJBZ3JlZWFibGVuZXNzX21pbnVzX05ldXJvdGljaXNtX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjcsOtdGljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImVnb8Otc3RhXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGUgbWFsIGdlbmlvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYW50YWdvbmlzdGFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJncnXDscOzblwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFtYXJnYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVzYWdyYWRhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhpZ2VudGVcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkFncmVlYWJsZW5lc3NfbWludXNfT3Blbm5lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ0b3Njb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInVuYSBwZXJzb25hIHNpbiB0YWN0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImJydXNjb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNlcnJhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCLDoXNwZXJvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1wbGFjYWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gY2FyaXRhdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInZlbmdhdGl2b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQWdyZWVhYmxlbmVzc19taW51c19PcGVubmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBlcnNwaWNhelwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJleGPDqW50cmljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmRpdmlkdWFsaXN0YVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQWdyZWVhYmxlbmVzc19wbHVzX0NvbnNjaWVudGlvdXNuZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNvYnJpb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJtb2Rlc3RvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJBZ3JlZWFibGVuZXNzX3BsdXNfQ29uc2NpZW50aW91c25lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzZXJ2aWNpYWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29vcGVyYXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uc2lkZXJhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmVzcGV0dW9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb3J0w6lzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNlbnNhdG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXRlbnRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbnNpZGVyYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImxlYWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibW9yYWxcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkFncmVlYWJsZW5lc3NfcGx1c19FeHRyYXZlcnNpb25fbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29ubW92aWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhZ3JhZGFibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VydmljaWFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImh1bWlsZGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmR1bGdlbnRlXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJBZ3JlZWFibGVuZXNzX3BsdXNfRXh0cmF2ZXJzaW9uX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZWZlcnZlc2NlbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFsZWdyZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhbWlzdG9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhbGVncmVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiam92aWFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImpvY29zb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQWdyZWVhYmxlbmVzc19wbHVzX05ldXJvdGljaXNtX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImdlbmVyb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFncmFkYWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ0b2xlcmFudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGFjw61maWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImZsZXhpYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImbDoWNpbCBkZSB0cmF0YXJcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwianVzdG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY2FyaXRhdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb25maWFibGVcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkFncmVlYWJsZW5lc3NfcGx1c19OZXVyb3RpY2lzbV9wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNlbnRpbWVudGFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNhcmnDsW9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzZW5zaWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ0aWVybm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXBhc2lvbmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJyb23DoW50aWNvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJBZ3JlZWFibGVuZXNzX3BsdXNfT3Blbm5lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZXBlbmRpZW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNpbXBsZVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQWdyZWVhYmxlbmVzc19wbHVzX09wZW5uZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYW1pc3Rvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5hIHBlcnNvbmEgY29uIHRhY3RvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRpcGxvbcOhdGljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwcm9mdW5kb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpZGVhbGlzdGFcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkNvbnNjaWVudGlvdXNuZXNzX21pbnVzX0FncmVlYWJsZW5lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhcnJlYmF0YWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBjb29wZXJhdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gZmlhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVzY29uZmlhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpcnJlZmxleGl2b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQ29uc2NpZW50aW91c25lc3NfbWludXNfQWdyZWVhYmxlbmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gcHJldGVuY2lvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibW9kZXN0b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQ29uc2NpZW50aW91c25lc3NfbWludXNfRXh0cmF2ZXJzaW9uX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5kZWNpc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ1bmEgcGVyc29uYSBzaW4gcHJvcMOzc2l0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ1bmEgcGVyc29uYSBzaW4gY2Fyw6FjdGVyXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInVuYSBwZXJzb25hIHNpbiBjb21wcm9taXNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBhbWJpY2lvc29cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkNvbnNjaWVudGlvdXNuZXNzX21pbnVzX0V4dHJhdmVyc2lvbl9wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmV2b2x0b3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImJ1bGxpY2lvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ0ZW1lcmFyaW9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ0dW11bHR1b3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlbW9zdHJhdGl2b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQ29uc2NpZW50aW91c25lc3NfbWludXNfTmV1cm90aWNpc21fbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5mb3JtYWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGUgYmFqbyBwZXJmaWxcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkNvbnNjaWVudGlvdXNuZXNzX21pbnVzX05ldXJvdGljaXNtX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhdG9sb25kcmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluY29uc2lzdGVudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJlcnLDoXRpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJvbHZpZGFkaXpvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1wdWxzaXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZnLDrXZvbG9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkNvbnNjaWVudGlvdXNuZXNzX21pbnVzX09wZW5uZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInRlbWVyYXJpb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImlsw7NnaWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5tYWR1cm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhemFyb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImxheG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmRpc2NpcGxpbmFkb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQ29uc2NpZW50aW91c25lc3NfbWludXNfT3Blbm5lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIGNvbnZlbmNpb25hbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwZWN1bGlhclwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQ29uc2NpZW50aW91c25lc3NfcGx1c19BZ3JlZWFibGVuZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5mbGV4aWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJlc3RyaWN0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJyw61naWRvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJDb25zY2llbnRpb3VzbmVzc19wbHVzX0FncmVlYWJsZW5lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb25maWFibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmVzcG9uc2FibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VndXJvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImVkdWNhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uc2lkZXJhZG9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkNvbnNjaWVudGlvdXNuZXNzX3BsdXNfRXh0cmF2ZXJzaW9uX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNhdXRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNlZ3Vyb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJleGFjdG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZm9ybWFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFob3JyYXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicHJpbmNpcGlzdGFcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkNvbnNjaWVudGlvdXNuZXNzX3BsdXNfRXh0cmF2ZXJzaW9uX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYW1iaWNpb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFsZXJ0YVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJmaXJtZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZWNpZGlkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb21wZXRpdGl2b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQ29uc2NpZW50aW91c25lc3NfcGx1c19OZXVyb3RpY2lzbV9taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJtaW51Y2lvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXN0YWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb25zaXN0ZW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkaXNjaXBsaW5hZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibMOzZ2ljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZWNpZGlkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb250cm9sYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbmNpc29cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkNvbnNjaWVudGlvdXNuZXNzX3BsdXNfTmV1cm90aWNpc21fcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZXRhbGxpc3RhXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhjaXRhYmxlXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJDb25zY2llbnRpb3VzbmVzc19wbHVzX09wZW5uZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInRyYWRpY2lvbmFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbnZlbmNpb25hbFwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQ29uc2NpZW50aW91c25lc3NfcGx1c19PcGVubmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNvZmlzdGljYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBlcmZlY2Npb25pc3RhXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluZHVzdHJpb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRpZ25vXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInJlZmluYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImN1bHRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInByZXZpc29yXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJFeHRyYXZlcnNpb25fbWludXNfQWdyZWVhYmxlbmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJlc2PDqXB0aWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNhdXRvIGNvbiBsb3MgZGVtw6FzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic29saXRhcmlvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBjb211bmljYXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhbnRpc29jaWFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic29tYnLDrW9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZXNpbnRlcmVzYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFwYXJ0YWRvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJFeHRyYXZlcnNpb25fbWludXNfQWdyZWVhYmxlbmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBhY8OtZmljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJodW1pbGRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInN1bWlzb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ0w61taWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm9iZWRpZW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmdlbnVvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJFeHRyYXZlcnNpb25fbWludXNfQ29uc2NpZW50aW91c25lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmRpcmVjdG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkw6liaWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwZXJlem9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gcGVyc2lzdGVudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ2YWdvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJFeHRyYXZlcnNpb25fbWludXNfQ29uc2NpZW50aW91c25lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJtb2RlcmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzZXJpb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkaXNjcmV0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjYXV0ZWxvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicHJpbmNpcGlzdGFcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkV4dHJhdmVyc2lvbl9taW51c19OZXVyb3RpY2lzbV9taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ0cmFucXVpbG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic29zZWdhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGzDoWNpZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1wYXJjaWFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm1vZGVzdG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uZGVzY2VuZGllbnRlXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJFeHRyYXZlcnNpb25fbWludXNfTmV1cm90aWNpc21fcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZXNjb25maWFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwZXNpbWlzdGFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmVzZXJ2YWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29iYXJkZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjYWxsYWRvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJFeHRyYXZlcnNpb25fbWludXNfT3Blbm5lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic29tYnLDrW9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJtYW5zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gYXZlbnR1cmVyb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwYXNpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhcMOhdGljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkw7NjaWxcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkV4dHJhdmVyc2lvbl9taW51c19PcGVubmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInVuYSBwZXJzb25hIGd1aWFkYSBwb3Igc3UgcHJvcGlhIGNvbnNjaWVuY2lhIHkgdmFsb3Jlc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbnRyb3NwZWN0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBlbnNhdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb250ZW1wbGF0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImludHJvc3BlY3Rpdm9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkV4dHJhdmVyc2lvbl9wbHVzX0FncmVlYWJsZW5lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ0ZXJjb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInZpZ29yb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZG9taW5hZG9yXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicHJlc3VtaWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibWFuZMOzblwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkb21pbmFudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXN0dXRvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJFeHRyYXZlcnNpb25fcGx1c19BZ3JlZWFibGVuZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic29jaWFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImVuw6lyZ2ljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJlbnR1c2lhc3RhXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbXVuaWNhdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ2aWJyYW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJlc3Bpcml0dW9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJtYWduw6l0aWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImVudHVzaWFzdGFcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkV4dHJhdmVyc2lvbl9wbHVzX0NvbnNjaWVudGlvdXNuZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImJ1bGxpY2lvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidHJhdmllc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhoaWJpY2lvbmlzdGFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ3JlZ2FyaW9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVtb3N0cmF0aXZvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJFeHRyYXZlcnNpb25fcGx1c19Db25zY2llbnRpb3VzbmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFjdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb21wZXRpdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwZXJzaXN0ZW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhbWJpY2lvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVjaWRpZG9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkV4dHJhdmVyc2lvbl9wbHVzX05ldXJvdGljaXNtX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbmZpYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImF1ZGF6XCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNlZ3Vyb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZXNpbmhpYmlkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ2YWxpZW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ2YWxpZW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ1bmEgcGVyc29uYSBzYXRpc2ZlY2hhIGRlIHNpIG1pc21hXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInZpZ29yb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImZ1ZXJ0ZVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiRXh0cmF2ZXJzaW9uX3BsdXNfTmV1cm90aWNpc21fcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJleHBsb3Npdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ2ZXJib3Jyw6FnaWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImV4dHJhdmFnYW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInZvbMOhdGlsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvcXVldG9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkV4dHJhdmVyc2lvbl9wbHVzX09wZW5uZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmVyYm9ycsOhZ2ljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluZXNjcnVwdWxvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb21wb3NvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJFeHRyYXZlcnNpb25fcGx1c19PcGVubmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImV4cHJlc2l2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjw6FuZGlkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkcmFtw6F0aWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImVzcG9udMOhbmVvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluZ2VuaW9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJvcG9ydHVuaXN0YVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmRlcGVuZGllbnRlXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJOZXVyb3RpY2lzbV9taW51c19BZ3JlZWFibGVuZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBlbW9jaW9uYWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbnNlbnNpYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBjYXJpw7Fvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZXNhcGFzaW9uYWRvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJOZXVyb3RpY2lzbV9taW51c19BZ3JlZWFibGVuZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGFjaWVudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmVsYWphZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBleGlnZW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJyZWFsaXN0YVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJvcHRpbWlzdGFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibW9kZXN0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIGNyw610aWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gcHJldGVuY2lvc29cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk5ldXJvdGljaXNtX21pbnVzX0NvbnNjaWVudGlvdXNuZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluZm9ybWFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlIHBlcmZpbCBiYWpvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJOZXVyb3RpY2lzbV9taW51c19Db25zY2llbnRpb3VzbmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInJhY2lvbmFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm9iamV0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImVzdGFibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibMOzZ2ljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZWNpZGlkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwcmVwYXJhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uY2lzb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJleGhhdXN0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImVjb27Ds21pY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGlzY2lwbGluYWRvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJOZXVyb3RpY2lzbV9taW51c19FeHRyYXZlcnNpb25fbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibW9kZXN0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gZXhjaXRhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBsw6FjaWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInRyYW5xdWlsb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiTmV1cm90aWNpc21fbWludXNfRXh0cmF2ZXJzaW9uX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5jb25zY2llbnRlIGRlIHNpIG1pc21vXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluY2Fuc2FibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5mYXRpZ2FibGVcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk5ldXJvdGljaXNtX21pbnVzX09wZW5uZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImltcGVydHVyYmFibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbnNlbnNpYmxlXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJOZXVyb3RpY2lzbV9taW51c19PcGVubmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNlbnRpZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmVyc8OhdGlsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNyZWF0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImludGVsZWN0dWFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBlcnNwaWNhelwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiTmV1cm90aWNpc21fcGx1c19BZ3JlZWFibGVuZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGVtcGVyYW1lbnRhbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImlycml0YWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBlbGVhZG9yXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1wYWNpZW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImdydcOxw7NuXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibWFsaHVtb3JhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpcnJpdGFibGVcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk5ldXJvdGljaXNtX3BsdXNfQWdyZWVhYmxlbmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImVtb3Rpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjcsOpZHVsb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjYXJpw7Fvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2Vuc2libGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYmxhbmRvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJOZXVyb3RpY2lzbV9wbHVzX0NvbnNjaWVudGlvdXNuZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29tcHVsc2l2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImlucXVpc2l0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVzZW5mcmVuYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwib2x2aWRhZGl6b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImltcHVsc2l2b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiTmV1cm90aWNpc21fcGx1c19Db25zY2llbnRpb3VzbmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRldGFsbGlzdGFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJleGNpdGFibGVcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk5ldXJvdGljaXNtX3BsdXNfRXh0cmF2ZXJzaW9uX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImd1YXJkYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaXJyaXRhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5zZWd1cm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwZXNpbWlzdGFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmVzZXJ2YWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGVtZXJvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJuZWdhdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhdXRvLWNyw610aWNvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJOZXVyb3RpY2lzbV9wbHVzX0V4dHJhdmVyc2lvbl9wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImV4Y2l0YWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInZlcmJvcnLDoWdpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29xdWV0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImV4cGxvc2l2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJleHRyYXZhZ2FudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ2b2zDoXRpbFwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiTmV1cm90aWNpc21fcGx1c19PcGVubmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpcnJpdGFibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZmFzdGlkaW9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhcHJlbnNpdm9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk5ldXJvdGljaXNtX3BsdXNfT3Blbm5lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJleGNpdGFibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXBhc2lvbmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzZW5zdWFsXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJPcGVubmVzc19taW51c19BZ3JlZWFibGVuZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwib3JkaW5hcmlvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2luIHRhY3RvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYnJ1c2NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY2VycmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImR1cm9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk9wZW5uZXNzX21pbnVzX0FncmVlYWJsZW5lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNpbXBsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlcGVuZGllbnRlXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJPcGVubmVzc19taW51c19Db25zY2llbnRpb3VzbmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvcnRvcGxhY2lzdGFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGVtZXJhcmlvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaWzDs2dpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbm1hZHVyb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImF6YXJvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibGF4b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImlycmVzcGV0dW9zb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiT3Blbm5lc3NfbWludXNfQ29uc2NpZW50aW91c25lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb252ZW5jaW9uYWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidHJhZGljaW9uYWxcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk9wZW5uZXNzX21pbnVzX0V4dHJhdmVyc2lvbl9taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwcmVkZWNpYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBpbWFnaW5hdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzb21icsOtb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFww6F0aWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBhdmVudHVyZXJvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJPcGVubmVzc19taW51c19FeHRyYXZlcnNpb25fcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInZlcmJvcnLDoWdpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmVzY3J1cHVsb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9tcG9zb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiT3Blbm5lc3NfbWludXNfTmV1cm90aWNpc21fbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1wZXJ0dXJiYWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluc2Vuc2libGVcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk9wZW5uZXNzX21pbnVzX05ldXJvdGljaXNtX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaXJyaXRhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImZhc3RpZGlvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXByZW5zaXZvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJPcGVubmVzc19wbHVzX0FncmVlYWJsZW5lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVyc3BpY2F6XCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImV4Y8OpbnRyaWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluZGl2aWR1YWxpc3RhXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJPcGVubmVzc19wbHVzX0FncmVlYWJsZW5lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpZGVhbGlzdGFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGlwbG9tw6F0aWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInByb2Z1bmRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInVuYSBwZXJzb25hIGNvbiB0YWN0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhbWlzdG9zb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiT3Blbm5lc3NfcGx1c19Db25zY2llbnRpb3VzbmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIGNvbnZlbmNpb25hbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwZWN1bGlhclwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiT3Blbm5lc3NfcGx1c19Db25zY2llbnRpb3VzbmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFuYWzDrXRpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVyY2VwdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmZvcm1hdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJncmFuZGlsb2N1ZW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkaWdub1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjdWx0b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiT3Blbm5lc3NfcGx1c19FeHRyYXZlcnNpb25fbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW50cm9zcGVjdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJtZWRpdGF0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbnRlbXBsYXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW50cm9zcGVjdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwZW5zYXRpdm9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk9wZW5uZXNzX3BsdXNfRXh0cmF2ZXJzaW9uX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibXVuZGFub1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJleGFnZXJhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZWxvY3VlbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImlucXVpc2l0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImludGVuc29cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk9wZW5uZXNzX3BsdXNfTmV1cm90aWNpc21fbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3JlYXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW50ZWxlY3R1YWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVyc3BpY2F6XCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInZlcnPDoXRpbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbnZlbnRpdm9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk9wZW5uZXNzX3BsdXNfTmV1cm90aWNpc21fcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhcGFzaW9uYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImV4Y2l0YWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzZW5zdWFsXCJcbiAgICAgICAgfVxuICAgIF1cbn0sXG5cInZhbHVlc1wiOiB7XG4gICAgXCJIZWRvbmlzbVwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkRpc2ZydXRhciBkZSBsYSB2aWRhXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiUHJlZmllcmUgYWN0aXZpZGFkZXMgY29uIHVuIHByb3DDs3NpdG8gbcOhcyBncmFuZGUgcXVlIGVsIHPDs2xvIGRlbGVpdGUgcGVyc29uYWxcIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiVGllbmUgZ3JhbiBtb3RpdmFjacOzbiBwb3IgZGlzZnJ1dGFyIGxhIHZpZGEgZW4gc3UgcGxlbml0dWRcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIlNlbGYtdHJhbnNjZW5kZW5jZVwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkF5dWRhciBhIGxvcyBkZW3DoXNcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJDcmVlIHF1ZSBsYXMgcGVyc29uYXMgcHVlZGVuIGVuY2FyZ2Fyc2UgZGUgc3VzIHByb3Bpb3MgYXN1bnRvcyBzaW4gaW50ZXJmZXJlbmNpYVwiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJDcmVlIHF1ZSBlcyBpbXBvcnRhbnRlIGN1aWRhciBkZSBsYXMgcGVyc29uYXMgcXVlIGxvIHJvZGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkxhIGp1c3RpY2lhXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiQ3JlZSBxdWUgc29uIGxhcyBwZXJzb25hcyBjcmVhbiBzdXMgb3BvcnR1bmlkYWRlc1wiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJDcmVlIGVuIGxhIGp1c3RpY2lhIHNvY2lhbCB5IGxhIGlndWFsZGFkIHBhcmEgdG9kb3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJMYSBqdXN0aWNpYSBzb2NpYWxcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJDcmVlIHF1ZSBzb24gbGFzIHBlcnNvbmFzIGNyZWFuIHN1cyBvcG9ydHVuaWRhZGVzXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkNyZWUgZW4gbGEganVzdGljaWEgc29jaWFsIHkgbGEgaWd1YWxkYWQgcGFyYSB0b2Rvc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkxhIGlndWFsZGFkXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiQ3JlZSBxdWUgc29uIGxhcyBwZXJzb25hcyBjcmVhbiBzdXMgb3BvcnR1bmlkYWRlc1wiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJDcmVlIGVuIGxhIGp1c3RpY2lhIHNvY2lhbCB5IGxhIGlndWFsZGFkIHBhcmEgdG9kb3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJFbCBzZXJ2aWNpbyBjb211bml0YXJpb1wiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkNyZWUgcXVlIGxhcyBwZXJzb25hcyBwdWVkZW4gZW5jYXJnYXJzZSBkZSBzdXMgcHJvcGlvcyBhc3VudG9zIHNpbiBpbnRlcmZlcmVuY2lhXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkNyZWUgcXVlIGVzIGltcG9ydGFudGUgY3VpZGFyIGRlIGxhcyBwZXJzb25hcyBxdWUgbG8gcm9kZWFuXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJDb25zZXJ2YXRpb25cIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJMYXMgdHJhZGljaW9uZXNcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJMZSBpbXBvcnRhIG3DoXMgc2VndWlyIHN1IHByb3BpbyBjYW1pbm8gcXVlIHNlZ3VpciBlbCBjYW1pbm8gZGUgb3Ryb3NcIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiVGllbmUgbXVjaG8gcmVzcGV0byBwb3IgbG9zIGdydXBvcyBhIGxvcyBxdWUgcGVydGVuZWNlIHkgc2lndWUgc3UgZ3XDrWFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJMYSBhcm1vbsOtYVwiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkRlY2lkZSBxdcOpIGVzIGxvIGNvcnJlY3RvIGJhc2FkbyBlbiBzdXMgY3JlZW5jaWFzLCBubyBlbiBsbyBxdWUgbGEgZ2VudGUgcGllbnNhXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkNyZWUgcXVlIGxhcyByZWdsYXMgZXhpc3RlbiBwb3IgdW5hIHJhesOzbiB5IG51bmNhIGludGVudGEgdHJhc2dyZWRpcmxhc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkxhIGh1bWlsZGFkXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiRGVjaWRlIHF1w6kgZXMgbG8gY29ycmVjdG8gYmFzYWRvIGVuIHN1cyBjcmVlbmNpYXMsIG5vIGVuIGxvIHF1ZSBsYSBnZW50ZSBwaWVuc2FcIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiVmUgdmFsb3IgZW4gZGVmZXJpciBhIG90cm9zXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiTGFzIG5vcm1hcyBzb2NpYWxlc1wiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkRlY2lkZSBxdcOpIGVzIGxvIGNvcnJlY3RvIGJhc2FkbyBlbiBzdXMgY3JlZW5jaWFzLCBubyBlbiBsbyBxdWUgbGEgZ2VudGUgcGllbnNhXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkNyZWUgcXVlIGxhcyByZWdsYXMgZXhpc3RlbiBwb3IgdW5hIHJhesOzbiB5IG51bmNhIGludGVudGEgdHJhc2dyZWRpcmxhc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkxhIHNlZ3VyaWRhZFwiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlByZWZpZXJlIGxhIHNlZ3VyaWRhZCBhIGNvc3RhIGRlIGRlamFyIGEgdW4gbGFkbyBzdXMgbWV0YXNcIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiQ3JlZSBxdWUgZXMgaW1wb3J0YW50ZSBzYWx2YWd1YXJkYXIgbGEgc2VndXJpZGFkXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiTGEgc2VndXJpZGFkXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiUHJlZmllcmUgZXN0YXIgc2VndXJvIGEgY29zdGEgZGUgZGVqYXIgYSB1biBsYWRvIHN1cyBtZXRhc1wiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJDcmVlIHF1ZSBlcyBpbXBvcnRhbnRlIHNhbHZhZ3VhcmRhciBsYSBzZWd1cmlkYWRcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk9wZW5uZXNzLXRvLWNoYW5nZVwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIlNlciBpbmRlcGVuZGllbnRlXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiUmVjaWJlIGRlIGJ1ZW5hIG1hbmVyYSBxdWUgb3Ryb3MgZGlyaWphbiBzdXMgYWN0aXZpZGFkZXNcIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiTGUgZ3VzdGEgZXN0YWJsZWNlciBzdXMgcHJvcGlhcyBtZXRhcyBwYXJhIGRlY2lkaXIgY8OzbW8gYWxjYW56YXJsYXMgbWVqb3JcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJMYSBlbW9jacOzblwiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlNlIGFwZWdhIGEgbGFzIGNvc2FzIHF1ZSBjb25vY2UgYW50ZXMgcXVlIGFycmllc2dhcnNlIGEgcHJvYmFyIGFsZ28gbnVldm8geSByaWVzZ29zb1wiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJFc3TDoSBhbnNpb3NvIHBvciBidXNjYXIgZXhwZXJpZW5jaWFzIG51ZXZhcyB5IGVtb2Npb25hbnRlc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkxhIGNyZWF0aXZpZGFkXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiU2UgYXBlZ2EgYSBsYXMgY29zYXMgcXVlIGNvbm9jZSBhbnRlcyBxdWUgYXJyaWVzZ2Fyc2UgYSBwcm9iYXIgYWxnbyBudWV2byB5IHJpZXNnb3NvXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkVzdMOhIGFuc2lvc28gcG9yIGJ1c2NhciBleHBlcmllbmNpYXMgbnVldmFzIHkgZW1vY2lvbmFudGVzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiTGEgY3VyaW9zaWRhZFwiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlNlIGFwZWdhIGEgbGFzIGNvc2FzIHF1ZSBjb25vY2UgYW50ZXMgcXVlIGFycmllc2dhcnNlIGEgcHJvYmFyIGFsZ28gbnVldm8geSByaWVzZ29zb1wiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJFc3TDoSBhbnNpb3NvIHBvciBidXNjYXIgZXhwZXJpZW5jaWFzIG51ZXZhcyB5IGVtb2Npb25hbnRlc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkxhIGF1dG9ub23DrWFcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJSZWNpYmUgZGUgYnVlbmEgbWFuZXJhIHF1ZSBvdHJvcyBkaXJpamFuIHN1cyBhY3RpdmlkYWRlc1wiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJMZSBndXN0YSBlc3RhYmxlY2VyIHN1cyBwcm9waWFzIG1ldGFzIHBhcmEgZGVjaWRpciBjw7NtbyBhbGNhbnphcmxhcyBtZWpvclwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkxhIGxpYmVydGFkXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiUmVjaWJlIGRlIGJ1ZW5hIG1hbmVyYSBxdWUgb3Ryb3MgZGlyaWphbiBzdXMgYWN0aXZpZGFkZXNcIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiTGUgZ3VzdGEgZXN0YWJsZWNlciBzdXMgcHJvcGlhcyBtZXRhcyBwYXJhIGRlY2lkaXIgY8OzbW8gYWxjYW56YXJsYXMgbWVqb3JcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIlNlbGYtZW5oYW5jZW1lbnRcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJBbGNhbnphciBlbCDDqXhpdG9cIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJUb21hIGRlY2lzaW9uZXMgc2luIGNvbnNpZGVyYXIgY8OzbW8gbXVlc3RyYW4gc3VzIHRhbGVudG9zXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkJ1c2NhIG9wb3J0dW5pZGFkZXMgcGFyYSBhdXRvc3VwZXJhc2UgeSBwYXJhIGRlbW9zdHJhciBxdWUgZXMgdW5hIHBlcnNvbmEgY2FwYXpcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJNZWpvcmFyIHN1IGVzdGF0dXMgc29jaWFsXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiRXN0w6EgY29uZm9ybWUgY29uIHN1IGVzdGF0dXMgc29jaWFsIHkgbm8gc2llbnRlIG5lY2VzaWRhZCBkZSBtZWpvcmFybG9cIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiU2UgZXNmdWVyemEgY29uc2lkZXJhYmxlbWVudGUgcGFyYSBtZWpvcmFyIHN1IGVzdGF0dXMgZSBpbWFnZW4gcMO6YmxpY2FcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJMYSBhbWJpY2nDs25cIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJFc3TDoSBjb25mb3JtZSBjb24gc3UgZXN0YXR1cyBzb2NpYWwgeSBubyBzaWVudGUgbmVjZXNpZGFkIGRlIG1lam9yYXJsb1wiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJTaWVudGUgcXVlIGVzIGltcG9ydGFudGUgYXZhbnphciBwYXJhIGFsY2FuemFyIG1ldGFzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiTG9zIGdyYW5kZXMgbG9ncm9zXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiVG9tYSBkZWNpc2lvbmVzIHNpbiBjb25zaWRlcmFyIGPDs21vIG11ZXN0cmFuIHN1cyB0YWxlbnRvc1wiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJCdXNjYSBvcG9ydHVuaWRhZGVzIHBhcmEgYXV0b3N1cGVyYXNlIHkgcGFyYSBkZW1vc3RyYXIgcXVlIGVzIHVuYSBwZXJzb25hIGNhcGF6XCJcbiAgICAgICAgfVxuICAgIF1cbiAgfVxufVxuIl19
(1)
});
