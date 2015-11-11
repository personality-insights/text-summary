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

/**
 * Creates translators
 *
 * @author Ary Pablo Batista <batarypa@ar.ibm.com>
 */
"use strict";

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

},{"./i18n/en":4,"./i18n/es":5}],4:[function(_dereq_,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2JhdGFyeXBhL3dvcmtzcGFjZXMvZGVtb3MvbnBtLXN5c3RlbXUvdGV4dC1zdW1tYXJ5L25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9ob21lL2JhdGFyeXBhL3dvcmtzcGFjZXMvZGVtb3MvbnBtLXN5c3RlbXUvdGV4dC1zdW1tYXJ5Ly5idWlsZC9mYWtlXzQ2ODVlZGM0LmpzIiwiL2hvbWUvYmF0YXJ5cGEvd29ya3NwYWNlcy9kZW1vcy9ucG0tc3lzdGVtdS90ZXh0LXN1bW1hcnkvLmJ1aWxkL2Zvcm1hdC5qcyIsIi9ob21lL2JhdGFyeXBhL3dvcmtzcGFjZXMvZGVtb3MvbnBtLXN5c3RlbXUvdGV4dC1zdW1tYXJ5Ly5idWlsZC9pMThuLmpzIiwiL2hvbWUvYmF0YXJ5cGEvd29ya3NwYWNlcy9kZW1vcy9ucG0tc3lzdGVtdS90ZXh0LXN1bW1hcnkvLmJ1aWxkL2kxOG4vZW4uanMiLCIvaG9tZS9iYXRhcnlwYS93b3Jrc3BhY2VzL2RlbW9zL25wbS1zeXN0ZW11L3RleHQtc3VtbWFyeS8uYnVpbGQvaTE4bi9lcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNnQkEsWUFBWSxDQUFDOztBQUViLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUM7SUFDNUIsSUFBSSxHQUFLLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQzs7Ozs7QUFLL0IsTUFBTSxDQUFDLE9BQU8sR0FBRyxVQUFVLElBQUksRUFBRTs7QUFHL0IsTUFBSSxJQUFJLEdBQUksRUFBRTtNQUNaLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQztNQUNyQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7O0FB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QixJQUFJO0FBQzVCLGtCQUFRLGFBQWE7U0FDeEIsQ0FDSjtBQUNELDhDQUF3QyxDQUNwQztBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFVBQVU7U0FDckIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFNBQVM7U0FDcEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLGNBQWM7U0FDekIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLGNBQWM7U0FDekIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFFBQVE7U0FDbkIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFFBQVE7U0FDbkIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLGNBQWM7U0FDekIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFdBQVc7U0FDdEIsQ0FDSjtBQUNELDRDQUFzQyxDQUNsQztBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFFBQVE7U0FDbkIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFVBQVU7U0FDckIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLE1BQU07U0FDakIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLGVBQWU7U0FDMUIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFNBQVM7U0FDcEIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFVBQVU7U0FDckIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLGNBQWM7U0FDekIsRUFDRDtBQUNJLGtDQUF3QixJQUFJO0FBQzVCLGtCQUFRLFlBQVk7U0FDdkIsQ0FDSjtBQUNELDJDQUFxQyxDQUNqQztBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFFBQVE7U0FDbkIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLFdBQVc7U0FDdEIsRUFDRDtBQUNJLGtDQUF3QixLQUFLO0FBQzdCLGtCQUFRLGlCQUFpQjtTQUM1QixDQUNKO0FBQ0Qsb0RBQThDLENBQzFDO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsZUFBZTtTQUMxQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsZUFBZTtTQUMxQixDQUNKO0FBQ0QsbURBQTZDLENBQ3pDO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsU0FBUztTQUNwQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsYUFBYTtTQUN4QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsYUFBYTtTQUN4QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsWUFBWTtTQUN2QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsUUFBUTtTQUNuQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsWUFBWTtTQUN2QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsV0FBVztTQUN0QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsWUFBWTtTQUN2QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsT0FBTztTQUNsQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsT0FBTztTQUNsQixDQUNKO0FBQ0QsK0NBQXlDLENBQ3JDO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsY0FBYztTQUN6QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsV0FBVztTQUN0QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsUUFBUTtTQUNuQixFQUNEO0FBQ0ksa0NBQXdCLElBQUk7QUFDNUIsa0JBQVEsU0FBUztTQUNwQixDQUNKO0FBQ0QsOENBQXdDLENBQ3BDO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsY0FBYztTQUN6QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsT0FBTztTQUNsQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsT0FBTztTQUNsQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsUUFBUTtTQUNuQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixDQUNKO0FBQ0QsOENBQXdDLENBQ3BDO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsWUFBWTtTQUN2QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsTUFBTTtTQUNqQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsWUFBWTtTQUN2QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixDQUNKO0FBQ0QsNkNBQXVDLENBQ25DO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsYUFBYTtTQUN4QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsY0FBYztTQUN6QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsV0FBVztTQUN0QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsTUFBTTtTQUNqQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JB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a0JBQVEsTUFBTTtTQUNqQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsT0FBTztTQUNsQixDQUNKO0FBQ0QsK0NBQXlDLENBQ3JDO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsWUFBWTtTQUN2QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsV0FBVztTQUN0QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsV0FBVztTQUN0QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsU0FBUztTQUNwQixFQUNEO0FBQ0ksa0NBQXdCLElBQUk7QUFDNUIsa0JBQVEsWUFBWTtTQUN2QixDQUNKO0FBQ0QsOENBQXdDLENBQ3BDO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsY0FBYztTQUN6QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsUUFBUTtTQUNuQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsUUFBUTtTQUNuQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsUUFBUTtTQUNuQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsUUFBUTtTQUNuQixDQUNKO0FBQ0QsOENBQXdDLENBQ3BDO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsV0FBVztTQUN0QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsV0FBVztTQUN0QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsaUJBQWlCO1NBQzVCLEVBQ0Q7QUFDSSxrQ0FBd0Is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RDtTQUNuRSxFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsZUFBZTtTQUMxQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsV0FBVztTQUN0QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsZUFBZTtTQUMxQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsZUFBZTtTQUMxQixDQUNKO0FBQ0QsK0NBQXlDLENBQ3JDO0FBQ0ksa0NBQXdCLElBQUk7QUFDNUIsa0JBQVEsT0FBTztTQUNsQixFQUNEO0FBQ0ksa0NBQXdCLElBQUk7QUFDNUIsa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLElBQUk7QUFDNUIsa0JBQVEsV0FBVztTQUN0QixFQUNEO0FBQ0ksa0NBQXdCLElBQUk7QUFDNUIsa0JBQVEsV0FBVztTQUN0QixFQUNEO0FBQ0ksa0NBQXdCLElBQUk7QUFDNUIsa0JBQVEsUUFBUTtTQUNuQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsV0FBVztTQUN0QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsUUFBUTtTQUNuQixDQUNKO0FBQ0QsOENBQXdDLENBQ3BDO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsUUFBUTtTQUNuQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsWUFBWTtTQUN2QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsY0FBYztTQUN6QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsVUFBVTtTQUNyQixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsYUFBYTtTQUN4QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsV0FBVztTQUN0QixFQUNEO0FBQ0ksa0NBQXdCLEtBQUs7QUFDN0Isa0JBQVEsWUFBWTtTQUN2QixD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QUFDSSxrQ0FBd0IsSUFBSTtBQUM1QixrQkFBUSxXQUFXO1NBQ3RCLEVBQ0Q7QUFDSSxrQ0FBd0IsSUFBSTtBQUM1QixrQkFBUSxVQUFVO1NBQ3JCLEVBQ0Q7QUFDSSxrQ0FBd0IsSUFBSTtBQUM1QixrQkFBUSxXQUFXO1NBQ3RCLEVBQ0Q7QUFDSSxrQ0FBd0IsS0FBSztBQUM3QixrQkFBUSxXQUFXO1NBQ3RCLEVBQ0Q7QUFDSSxrQ0FBd0IsSUFBSTtBQUM1QixrQkFBUSxVQUFVO1NBQ3JCLEVBQ0Q7QUFDSSxrQ0FBd0IsSUFBSTtBQUM1QixrQkFBUSxVQUFVO1NBQ3JCLEVBQ0Q7QUFDSSxrQ0FBd0IsS0FBSztBQUM3QixrQkFBUSxjQUFjO1NBQ3pCLENBQ0o7QUFDRCw0Q0FBc0MsQ0FDbEM7QUFDSSxrQ0FBd0IsS0FBSztBQUM3QixrQkFBUSxXQUFXO1NBQ3RCLEVBQ0Q7QUFDSSxrQ0FBd0IsSUFBSTtBQUM1QixrQkFBUSxjQUFjO1NBQ3pCLEVBQ0Q7QUFDSSxrQ0FBd0IsS0FBSztBQUM3QixrQkFBUSxTQUFTO1NBQ3BCLEVBQ0Q7QUFDSSxrQ0FBd0IsSUFBSTtBQUM1QixrQkFBUSxXQUFXO1NBQ3RCLEVBQ0Q7QUFDSSxrQ0FBd0IsS0FBSztBQUM3QixrQkFBUSxjQUFjO1NBQ3pCLEVBQ0Q7QUFDSSxrQ0FBd0IsSUFBSTtBQUM1QixrQkFBUSxTQUFTO1NBQ3BCLENBQ0o7QUFDRCx5Q0FBbUMsQ0FDL0I7QUFDSSxrQ0FBd0IsS0FBSztBQUM3QixrQkFBUSxXQUFXO1NBQ3RCLEVBQ0Q7QUFDSSxrQ0FBd0IsS0FBSztBQUM3QixrQkFBUSxZQUFZO1NBQ3ZCLEVBQ0Q7QUFDSSxrQ0FBd0IsS0FBSztBQUM3QixrQkFBUSxXQUFXO1NBQ3RCLENBQ0o7QUFDRCx3Q0FBa0MsQ0FDOUI7QUFDSSxrQ0FBd0IsS0FBSztBQUM3QixrQkFBUSxXQUFXO1NBQ3RCLEVBQ0Q7QUFDSSxrQ0FBd0IsS0FBSztBQUM3QixrQkFBUSxZQUFZO1NBQ3ZCLEVBQ0Q7QUFDSSxrQ0FBd0IsS0FBSztBQUM3QixrQkFBUSxTQUFTO1NB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O0FBQzNCLDRCQUFrQiwyREFBMkQ7QUFDN0UsNkJBQW1CLGlGQUFpRjtTQUN2RyxFQUNEO0FBQ0ksa0JBQVEsMkJBQTJCO0FBQ25DLDRCQUFrQix3RUFBd0U7QUFDMUYsNkJBQW1CLHdFQUF3RTtTQUM5RixFQUNEO0FBQ0ksa0JBQVEsYUFBYTtBQUNyQiw0QkFBa0Isd0VBQXdFO0FBQzFGLDZCQUFtQixzREFBc0Q7U0FDNUUsRUFDRDtBQUNJLGtCQUFRLG9CQUFvQjtBQUM1Qiw0QkFBa0IsMkRBQTJEO0FBQzdFLDZCQUFtQixpRkFBaUY7U0FDdkcsQ0FDSjtLQUNGO0NBQ0YsQ0FBQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIENvcHlyaWdodCAyMDE1IElCTSBDb3JwLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZm9ybWF0ID0gcmVxdWlyZSgnLi9mb3JtYXQnKSxcbiAgICBpMThuICAgPSByZXF1aXJlKCcuL2kxOG4nKTtcblxuLyoqXG4gKiBQcm92aWRlcyBhIFRleHQgU3VtbWFyeSBmb3IgcHJvZmlsZXMuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGxhbmcpIHtcblxuXG4gIHZhciBzZWxmICA9IHt9LFxuICAgIGRpY3Rpb25hcnkgPSBpMThuLmdldERpY3Rpb25hcnkobGFuZyksXG4gICAgdHBocmFzZSA9IGkxOG4udHJhbnNsYXRvckZhY3RvcnkuY3JlYXRlVHJhbnNsYXRvcihkaWN0aW9uYXJ5LnBocmFzZXMpOyAvLyBpMThuIGZvciBwaHJhc2VzXG5cbiAgLy8gRG93bmxvYWQgYWxsIHN0YXRpYyBkYXRhLlxuICBzZWxmLmNpcmN1bXBsZXhEYXRhID0gZGljdGlvbmFyeS50cmFpdHM7XG4gIHNlbGYuZmFjZXRzRGF0YSA9IGRpY3Rpb25hcnkuZmFjZXRzO1xuICBzZWxmLnZhbHVlc0RhdGEgPSBkaWN0aW9uYXJ5LnZhbHVlcztcbiAgc2VsZi5uZWVkc0RhdGEgPSBkaWN0aW9uYXJ5Lm5lZWRzO1xuXG4gIGZ1bmN0aW9uIGNvbXBhcmVCeVJlbGV2YW5jZShvMSwgbzIpIHtcbiAgICB2YXIgcmVzdWx0ID0gMDtcblxuICAgIGlmIChNYXRoLmFicygwLjUgLSBvMS5wZXJjZW50YWdlKSA+IE1hdGguYWJzKDAuNSAtIG8yLnBlcmNlbnRhZ2UpKSB7XG4gICAgICByZXN1bHQgPSAtMTsgLy8gQSB0cmFpdCB3aXRoIDElIGlzIG1vcmUgaW50ZXJlc3RpbmcgdGhhbiBvbmUgd2l0aCA2MCUuXG4gICAgfVxuXG4gICAgaWYgKE1hdGguYWJzKDAuNSAtIG8xLnBlcmNlbnRhZ2UpIDwgTWF0aC5hYnMoMC41IC0gbzIucGVyY2VudGFnZSkpIHtcbiAgICAgIHJlc3VsdCA9IDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbXBhcmVCeVZhbHVlKG8xLCBvMikge1xuICAgIHZhciByZXN1bHQgPSAwO1xuXG4gICAgaWYgKE1hdGguYWJzKG8xLnBlcmNlbnRhZ2UpID4gTWF0aC5hYnMobzIucGVyY2VudGFnZSkpIHtcbiAgICAgIHJlc3VsdCA9IC0xOyAvLyAxMDAgJSBoYXMgcHJlY2VkZW5jZSBvdmVyIDk5JVxuICAgIH1cblxuICAgIGlmIChNYXRoLmFicyhvMS5wZXJjZW50YWdlKSA8IE1hdGguYWJzKG8yLnBlcmNlbnRhZ2UpKSB7XG4gICAgICByZXN1bHQgPSAxO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDaXJjdW1wbGV4QWRqZWN0aXZlKHAxLCBwMiwgb3JkZXIpIHtcbiAgICAvLyBTb3J0IHRoZSBwZXJzb25hbGl0eSB0cmFpdHMgaW4gdGhlIG9yZGVyIHRoZSBKU09OIGZpbGUgc3RvcmVkIGl0LlxuICAgIHZhciBvcmRlcmVkID0gW3AxLCBwMl0uc29ydChmdW5jdGlvbiAobzEsIG8yKSB7XG4gICAgICB2YXJcbiAgICAgICAgaTEgPSAnRUFOT0MnLmluZGV4T2YobzEuaWQuY2hhckF0KDApKSxcbiAgICAgICAgaTIgPSAnRUFOT0MnLmluZGV4T2YobzIuaWQuY2hhckF0KDApKTtcblxuICAgICAgcmV0dXJuIGkxIDwgaTIgPyAtMSA6IDE7XG4gICAgfSksXG4gICAgICAvLyBBc3NlbWJsZSB0aGUgaWRlbnRpZmllciBhcyB0aGUgSlNPTiBmaWxlIHN0b3JlZCBpdC5cbiAgICAgIGlkZW50aWZpZXIgPSBvcmRlcmVkWzBdLmlkLlxuICAgICAgY29uY2F0KG9yZGVyZWRbMF0ucGVyY2VudGFnZSA+IDAuNSA/ICdfcGx1c18nIDogJ19taW51c18nKS5cbiAgICAgIGNvbmNhdChvcmRlcmVkWzFdLmlkKS5cbiAgICAgIGNvbmNhdChvcmRlcmVkWzFdLnBlcmNlbnRhZ2UgPiAwLjUgPyAnX3BsdXMnIDogJ19taW51cycpLFxuXG4gICAgICB0cmFpdE11bHQgPSBzZWxmLmNpcmN1bXBsZXhEYXRhW2lkZW50aWZpZXJdWzBdLFxuICAgICAgc2VudGVuY2UgPSBcIiVzXCI7XG5cbiAgICBpZiAodHJhaXRNdWx0LnBlcmNlaXZlZF9uZWdhdGl2ZWx5KSB7XG4gICAgICBzd2l0Y2ggKG9yZGVyKSB7XG4gICAgICBjYXNlIDA6XG4gICAgICAgIHNlbnRlbmNlID0gdHBocmFzZSgnYSBiaXQgJXMnKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHNlbnRlbmNlID0gdHBocmFzZSgnc29tZXdoYXQgJXMnKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHNlbnRlbmNlID0gdHBocmFzZSgnY2FuIGJlIHBlcmNlaXZlZCBhcyAlcycpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZm9ybWF0KHNlbnRlbmNlLCB0cmFpdE11bHQud29yZCk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRGYWNldEluZm8oZikge1xuICAgIHZhclxuICAgICAgZGF0YSA9IHNlbGYuZmFjZXRzRGF0YVtmLmlkLnJlcGxhY2UoJ18nLCAnLScpLnJlcGxhY2UoJyAnLCAnLScpXSxcbiAgICAgIHQsIGQ7XG5cbiAgICBpZiAoZi5wZXJjZW50YWdlID4gMC41KSB7XG4gICAgICB0ID0gZGF0YS5IaWdoVGVybS50b0xvd2VyQ2FzZSgpO1xuICAgICAgZCA9IGRhdGEuSGlnaERlc2NyaXB0aW9uLnRvTG93ZXJDYXNlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHQgPSBkYXRhLkxvd1Rlcm0udG9Mb3dlckNhc2UoKTtcbiAgICAgIGQgPSBkYXRhLkxvd0Rlc2NyaXB0aW9uLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IGYuaWQsXG4gICAgICB0ZXJtOiB0LFxuICAgICAgZGVzY3JpcHRpb246IGRcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gaW50ZXJ2YWxGb3IocCkge1xuICAgIC8vIFRoZSBNSU4gaGFuZGxlcyB0aGUgc3BlY2lhbCBjYXNlIGZvciAxMDAlLlxuICAgIHJldHVybiBNYXRoLm1pbihNYXRoLmZsb29yKHAgKiA0KSwgMyk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJbmZvRm9yVmFsdWUodikge1xuICAgIHZhclxuICAgICAgZGF0YSA9IHNlbGYudmFsdWVzRGF0YVt2LmlkLnJlcGxhY2UoL1tfIF0vZywgJy0nKV1bMF0sXG4gICAgICBkID0gdi5wZXJjZW50YWdlID4gMC41ID8gZGF0YS5IaWdoRGVzY3JpcHRpb24gOiBkYXRhLkxvd0Rlc2NyaXB0aW9uO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IHYuaWQsXG4gICAgICB0ZXJtOiBkYXRhLlRlcm0udG9Mb3dlckNhc2UoKSxcbiAgICAgIGRlc2NyaXB0aW9uOiBkXG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFdvcmRzRm9yTmVlZChuKSB7XG4gICAgLy8gQXNzZW1ibGUgdGhlIGlkZW50aWZpZXIgYXMgdGhlIEpTT04gZmlsZSBzdG9yZWQgaXQuXG4gICAgdmFyIHRyYWl0TXVsdCA9IHNlbGYubmVlZHNEYXRhW24uaWRdO1xuICAgIHJldHVybiB0cmFpdE11bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBhc3NlbWJsZVRyYWl0cyhwZXJzb25hbGl0eVRyZWUpIHtcbiAgICB2YXJcbiAgICAgIHNlbnRlbmNlcyA9IFtdLFxuICAgICAgYmlnNWVsZW1lbnRzID0gW10sXG4gICAgICByZWxldmFudEJpZzUsXG4gICAgICBhZGosIGFkajEsIGFkajIsIGFkajM7XG5cbiAgICAvLyBTb3J0IHRoZSBCaWcgNSBiYXNlZCBvbiBob3cgZXh0cmVtZSB0aGUgbnVtYmVyIGlzLlxuICAgIHBlcnNvbmFsaXR5VHJlZS5jaGlsZHJlblswXS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICBiaWc1ZWxlbWVudHMucHVzaCh7XG4gICAgICAgIGlkOiBwLmlkLFxuICAgICAgICBwZXJjZW50YWdlOiBwLnBlcmNlbnRhZ2VcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIGJpZzVlbGVtZW50cy5zb3J0KGNvbXBhcmVCeVJlbGV2YW5jZSk7XG5cbiAgICAvLyBSZW1vdmUgZXZlcnl0aGluZyBiZXR3ZWVuIDMyJSBhbmQgNjglLCBhcyBpdCdzIGluc2lkZSB0aGUgY29tbW9uIHBlb3BsZS5cbiAgICByZWxldmFudEJpZzUgPSBiaWc1ZWxlbWVudHMuZmlsdGVyKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICByZXR1cm4gTWF0aC5hYnMoMC41IC0gaXRlbS5wZXJjZW50YWdlKSA+IDAuMTg7XG4gICAgfSk7XG4gICAgaWYgKHJlbGV2YW50QmlnNS5sZW5ndGggPCAyKSB7XG4gICAgICAvLyBFdmVuIGlmIG5vIEJpZyA1IGF0dHJpYnV0ZSBpcyBpbnRlcmVzdGluZywgeW91IGdldCAxIGFkamVjdGl2ZS5cbiAgICAgIHJlbGV2YW50QmlnNSA9IFtiaWc1ZWxlbWVudHNbMF0sIGJpZzVlbGVtZW50c1sxXV07XG4gICAgfVxuXG4gICAgc3dpdGNoIChyZWxldmFudEJpZzUubGVuZ3RoKSB7XG4gICAgY2FzZSAyOlxuICAgICAgLy8gUmVwb3J0IDEgYWRqZWN0aXZlLlxuICAgICAgYWRqID0gZ2V0Q2lyY3VtcGxleEFkamVjdGl2ZShyZWxldmFudEJpZzVbMF0sIHJlbGV2YW50QmlnNVsxXSwgMCk7XG4gICAgICBzZW50ZW5jZXMucHVzaChmb3JtYXQodHBocmFzZSgnWW91IGFyZSAlcycpLCBhZGopICsgJy4nKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMzpcbiAgICAgIC8vIFJlcG9ydCAyIGFkamVjdGl2ZXMuXG4gICAgICBhZGoxID0gZ2V0Q2lyY3VtcGxleEFkamVjdGl2ZShyZWxldmFudEJpZzVbMF0sIHJlbGV2YW50QmlnNVsxXSwgMCk7XG4gICAgICBhZGoyID0gZ2V0Q2lyY3VtcGxleEFkamVjdGl2ZShyZWxldmFudEJpZzVbMV0sIHJlbGV2YW50QmlnNVsyXSwgMSk7XG4gICAgICBzZW50ZW5jZXMucHVzaChmb3JtYXQodHBocmFzZSgnWW91IGFyZSAlcyBhbmQgJXMnKSwgIGFkajEsIGFkajIpICsgJy4nKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgNDpcbiAgICBjYXNlIDU6XG4gICAgICAvLyBSZXBvcnQgMyBhZGplY3RpdmVzLlxuICAgICAgYWRqMSA9IGdldENpcmN1bXBsZXhBZGplY3RpdmUocmVsZXZhbnRCaWc1WzBdLCByZWxldmFudEJpZzVbMV0sIDApO1xuICAgICAgYWRqMiA9IGdldENpcmN1bXBsZXhBZGplY3RpdmUocmVsZXZhbnRCaWc1WzFdLCByZWxldmFudEJpZzVbMl0sIDEpO1xuICAgICAgYWRqMyA9IGdldENpcmN1bXBsZXhBZGplY3RpdmUocmVsZXZhbnRCaWc1WzJdLCByZWxldmFudEJpZzVbM10sIDIpO1xuICAgICAgc2VudGVuY2VzLnB1c2goZm9ybWF0KHRwaHJhc2UoJ1lvdSBhcmUgJXMsICVzIGFuZCAlcycpLCAgYWRqMSwgYWRqMiwgYWRqMykgKyAnLicpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlbnRlbmNlcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2VtYmxlRmFjZXRzKHBlcnNvbmFsaXR5VHJlZSkge1xuICAgIHZhclxuICAgICAgc2VudGVuY2VzID0gW10sXG4gICAgICBmYWNldEVsZW1lbnRzID0gW10sXG4gICAgICBpbmZvLFxuICAgICAgaTtcblxuICAgIC8vIEFzc2VtYmxlIHRoZSBmdWxsIGxpc3Qgb2YgZmFjZXRzIGFuZCBzb3J0IHRoZW0gYmFzZWQgb24gaG93IGV4dHJlbWVcbiAgICAvLyBpcyB0aGUgbnVtYmVyLlxuICAgIHBlcnNvbmFsaXR5VHJlZS5jaGlsZHJlblswXS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICBwLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKGYpIHtcbiAgICAgICAgZmFjZXRFbGVtZW50cy5wdXNoKHtcbiAgICAgICAgICBpZDogZi5pZCxcbiAgICAgICAgICBwZXJjZW50YWdlOiBmLnBlcmNlbnRhZ2UsXG4gICAgICAgICAgcGFyZW50OiBwXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgZmFjZXRFbGVtZW50cy5zb3J0KGNvbXBhcmVCeVJlbGV2YW5jZSk7XG5cbiAgICAvLyBBc3NlbWJsZSBhbiBhZGplY3RpdmUgYW5kIGRlc2NyaXB0aW9uIGZvciB0aGUgdHdvIG1vc3QgaW1wb3J0YW50IGZhY2V0cy5cbiAgICBpbmZvID0gZ2V0RmFjZXRJbmZvKGZhY2V0RWxlbWVudHNbMF0pO1xuICAgIHNlbnRlbmNlcy5wdXNoKGZvcm1hdCh0cGhyYXNlKCdZb3UgYXJlICVzJyksIGluZm8udGVybSkgKyAnOiAnICsgaW5mby5kZXNjcmlwdGlvbiArICcuJyk7XG4gICAgaW5mbyA9IGdldEZhY2V0SW5mbyhmYWNldEVsZW1lbnRzWzFdKTtcbiAgICBzZW50ZW5jZXMucHVzaChmb3JtYXQodHBocmFzZSgnWW91IGFyZSAlcycpLCBpbmZvLnRlcm0pICsgJzogJyArIGluZm8uZGVzY3JpcHRpb24gKyAnLicpO1xuXG4gICAgLy8gSWYgYWxsIHRoZSBmYWNldHMgY29ycmVzcG9uZCB0byB0aGUgc2FtZSBmZWF0dXJlLCBjb250aW51ZSB1bnRpbCBhXG4gICAgLy8gZGlmZmVyZW50IHBhcmVudCBmZWF0dXJlIGlzIGZvdW5kLlxuICAgIGkgPSAyO1xuICAgIGlmIChmYWNldEVsZW1lbnRzWzBdLnBhcmVudCA9PT0gZmFjZXRFbGVtZW50c1sxXS5wYXJlbnQpIHtcbiAgICAgIHdoaWxlIChmYWNldEVsZW1lbnRzWzBdLnBhcmVudCA9PT0gZmFjZXRFbGVtZW50c1tpXS5wYXJlbnQpIHtcbiAgICAgICAgaSArPSAxO1xuICAgICAgfVxuICAgIH1cbiAgICBpbmZvID0gZ2V0RmFjZXRJbmZvKGZhY2V0RWxlbWVudHNbaV0pO1xuICAgIHNlbnRlbmNlcy5wdXNoKGZvcm1hdCh0cGhyYXNlKCdBbmQgeW91IGFyZSAlcycpLCBpbmZvLnRlcm0pICsgJzogJyArIGluZm8uZGVzY3JpcHRpb24gKyAnLicpO1xuXG4gICAgcmV0dXJuIHNlbnRlbmNlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBBc3NlbWJsZSB0aGUgbGlzdCBvZiB2YWx1ZXMgYW5kIHNvcnQgdGhlbSBiYXNlZCBvbiByZWxldmFuY2UuXG4gICAqL1xuICBmdW5jdGlvbiBhc3NlbWJsZVZhbHVlcyh2YWx1ZXNUcmVlKSB7XG4gICAgdmFyXG4gICAgICBzZW50ZW5jZXMgPSBbXSxcbiAgICAgIHZhbHVlc0xpc3QgPSBbXSxcbiAgICAgIHNhbWVRSSwgaW5mbzEsIGluZm8yLFxuICAgICAgc2VudGVuY2UsXG4gICAgICB2YWx1ZXNJbmZvLFxuICAgICAgaSwgdGVybTEsIHRlcm0yO1xuXG4gICAgdmFsdWVzVHJlZS5jaGlsZHJlblswXS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICB2YWx1ZXNMaXN0LnB1c2goe1xuICAgICAgICBpZDogcC5pZCxcbiAgICAgICAgcGVyY2VudGFnZTogcC5wZXJjZW50YWdlXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB2YWx1ZXNMaXN0LnNvcnQoY29tcGFyZUJ5UmVsZXZhbmNlKTtcblxuICAgIC8vIEFyZSB0aGUgdHdvIG1vc3QgcmVsZXZhbnQgaW4gdGhlIHNhbWUgcXVhcnRpbGUgaW50ZXJ2YWw/IChlLmcuIDAlLTI1JSlcbiAgICBzYW1lUUkgPSBpbnRlcnZhbEZvcih2YWx1ZXNMaXN0WzBdLnBlcmNlbnRhZ2UpID09PSBpbnRlcnZhbEZvcih2YWx1ZXNMaXN0WzFdLnBlcmNlbnRhZ2UpO1xuXG4gICAgLy8gR2V0IGFsbCB0aGUgdGV4dCBhbmQgZGF0YSByZXF1aXJlZC5cbiAgICBpbmZvMSA9IGdldEluZm9Gb3JWYWx1ZSh2YWx1ZXNMaXN0WzBdKTtcbiAgICBpbmZvMiA9IGdldEluZm9Gb3JWYWx1ZSh2YWx1ZXNMaXN0WzFdKTtcblxuICAgIGlmIChzYW1lUUkpIHtcbiAgICAgIC8vIEFzc2VtYmxlIHRoZSBmaXJzdCAnYm90aCcgc2VudGVuY2UuXG4gICAgICB0ZXJtMSA9IGluZm8xLnRlcm07XG4gICAgICB0ZXJtMiA9IGluZm8yLnRlcm07XG4gICAgICBzd2l0Y2ggKGludGVydmFsRm9yKHZhbHVlc0xpc3RbMF0ucGVyY2VudGFnZSkpIHtcbiAgICAgIGNhc2UgMDpcbiAgICAgICAgc2VudGVuY2UgPSBmb3JtYXQodHBocmFzZSgnWW91IGFyZSByZWxhdGl2ZWx5IHVuY29uY2VybmVkIHdpdGggYm90aCAlcyBhbmQgJXMnKSwgdGVybTEsIHRlcm0yKSArICcuJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHNlbnRlbmNlID0gZm9ybWF0KHRwaHJhc2UoXCJZb3UgZG9uJ3QgZmluZCBlaXRoZXIgJXMgb3IgJXMgdG8gYmUgcGFydGljdWxhcmx5IG1vdGl2YXRpbmcgZm9yIHlvdVwiKSwgdGVybTEsIHRlcm0yKSArICcuJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHNlbnRlbmNlID0gZm9ybWF0KHRwaHJhc2UoJ1lvdSB2YWx1ZSBib3RoICVzIGFuZCAlcyBhIGJpdCcpLCB0ZXJtMSwgdGVybTIpICsgJy4nO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgc2VudGVuY2UgPSBmb3JtYXQodHBocmFzZSgnWW91IGNvbnNpZGVyIGJvdGggJXMgYW5kICVzIHRvIGd1aWRlIGEgbGFyZ2UgcGFydCBvZiB3aGF0IHlvdSBkbycpLCB0ZXJtMSwgdGVybTIpICsgJy4nO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHNlbnRlbmNlcy5wdXNoKHNlbnRlbmNlKTtcblxuICAgICAgLy8gQXNzZW1ibGUgdGhlIGZpbmFsIHN0cmluZ3MgaW4gdGhlIGNvcnJlY3QgZm9ybWF0LlxuICAgICAgc2VudGVuY2VzLnB1c2goaW5mbzEuZGVzY3JpcHRpb24gKyAnLicpO1xuICAgICAgc2VudGVuY2VzLnB1c2goZm9ybWF0KHRwaHJhc2UoJ0FuZCAlcycpLCBpbmZvMi5kZXNjcmlwdGlvbi50b0xvd2VyQ2FzZSgpKSArICcuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlc0luZm8gPSBbaW5mbzEsIGluZm8yXTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCB2YWx1ZXNJbmZvLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIC8vIFByb2Nlc3MgaXQgdGhpcyB3YXkgYmVjYXVzZSB0aGUgY29kZSBpcyB0aGUgc2FtZS5cbiAgICAgICAgc3dpdGNoIChpbnRlcnZhbEZvcih2YWx1ZXNMaXN0W2ldLnBlcmNlbnRhZ2UpKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICBzZW50ZW5jZSA9IGZvcm1hdCh0cGhyYXNlKCdZb3UgYXJlIHJlbGF0aXZlbHkgdW5jb25jZXJuZWQgd2l0aCAlcycpLCB2YWx1ZXNJbmZvW2ldLnRlcm0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgc2VudGVuY2UgPSBmb3JtYXQodHBocmFzZShcIllvdSBkb24ndCBmaW5kICVzIHRvIGJlIHBhcnRpY3VsYXJseSBtb3RpdmF0aW5nIGZvciB5b3VcIiksIHZhbHVlc0luZm9baV0udGVybSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBzZW50ZW5jZSA9IGZvcm1hdCh0cGhyYXNlKCdZb3UgdmFsdWUgJXMgYSBiaXQgbW9yZScpLCAgdmFsdWVzSW5mb1tpXS50ZXJtKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHNlbnRlbmNlID0gZm9ybWF0KHRwaHJhc2UoJ1lvdSBjb25zaWRlciAlcyB0byBndWlkZSBhIGxhcmdlIHBhcnQgb2Ygd2hhdCB5b3UgZG8nKSwgIHZhbHVlc0luZm9baV0udGVybSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgc2VudGVuY2UgPSBzZW50ZW5jZS5jb25jYXQoJzogJykuXG4gICAgICAgICAgICBjb25jYXQodmFsdWVzSW5mb1tpXS5kZXNjcmlwdGlvbi50b0xvd2VyQ2FzZSgpKS5cbiAgICAgICAgICAgIGNvbmNhdCgnLicpO1xuICAgICAgICBzZW50ZW5jZXMucHVzaChzZW50ZW5jZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlbnRlbmNlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBBc3NlbWJsZSB0aGUgbGlzdCBvZiBuZWVkcyBhbmQgc29ydCB0aGVtIGJhc2VkIG9uIHZhbHVlLlxuICAgKi9cbiAgZnVuY3Rpb24gYXNzZW1ibGVOZWVkcyhuZWVkc1RyZWUpIHtcbiAgICB2YXJcbiAgICAgIHNlbnRlbmNlcyA9IFtdLFxuICAgICAgbmVlZHNMaXN0ID0gW10sXG4gICAgICB3b3JkLFxuICAgICAgc2VudGVuY2U7XG5cbiAgICBuZWVkc1RyZWUuY2hpbGRyZW5bMF0uY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgbmVlZHNMaXN0LnB1c2goe1xuICAgICAgICBpZDogcC5pZCxcbiAgICAgICAgcGVyY2VudGFnZTogcC5wZXJjZW50YWdlXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBuZWVkc0xpc3Quc29ydChjb21wYXJlQnlWYWx1ZSk7XG5cbiAgICAvLyBHZXQgdGhlIHdvcmRzIHJlcXVpcmVkLlxuICAgIHdvcmQgPSBnZXRXb3Jkc0Zvck5lZWQobmVlZHNMaXN0WzBdKVswXTtcblxuICAgIC8vIEZvcm0gdGhlIHJpZ2h0IHNlbnRlbmNlIGZvciB0aGUgc2luZ2xlIG5lZWQuXG4gICAgc3dpdGNoIChpbnRlcnZhbEZvcihuZWVkc0xpc3RbMF0ucGVyY2VudGFnZSkpIHtcbiAgICBjYXNlIDA6XG4gICAgICBzZW50ZW5jZSA9IHRwaHJhc2UoJ0V4cGVyaWVuY2VzIHRoYXQgbWFrZSB5b3UgZmVlbCBoaWdoICVzIGFyZSBnZW5lcmFsbHkgdW5hcHBlYWxpbmcgdG8geW91Jyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDE6XG4gICAgICBzZW50ZW5jZSA9IHRwaHJhc2UoJ0V4cGVyaWVuY2VzIHRoYXQgZ2l2ZSBhIHNlbnNlIG9mICVzIGhvbGQgc29tZSBhcHBlYWwgdG8geW91Jyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDI6XG4gICAgICBzZW50ZW5jZSA9IHRwaHJhc2UoJ1lvdSBhcmUgbW90aXZhdGVkIHRvIHNlZWsgb3V0IGV4cGVyaWVuY2VzIHRoYXQgcHJvdmlkZSBhIHN0cm9uZyBmZWVsaW5nIG9mICVzJyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDM6XG4gICAgICBzZW50ZW5jZSA9IHRwaHJhc2UoJ1lvdXIgY2hvaWNlcyBhcmUgZHJpdmVuIGJ5IGEgZGVzaXJlIGZvciAlcycpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHNlbnRlbmNlID0gZm9ybWF0KHNlbnRlbmNlLCB3b3JkKS5jb25jYXQoXCIuXCIpO1xuICAgIHNlbnRlbmNlcy5wdXNoKHNlbnRlbmNlKTtcblxuICAgIHJldHVybiBzZW50ZW5jZXM7XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBUcmFpdFRyZWUgcmV0dXJucyBhIHRleHRcbiAgICogc3VtbWFyeSBkZXNjcmliaW5nIHRoZSByZXN1bHQuXG4gICAqXG4gICAqIEBwYXJhbSB0cmVlIEEgVHJhaXRUcmVlLlxuICAgKiBAcmV0dXJuIEFuIGFycmF5IG9mIHN0cmluZ3MgcmVwcmVzZW50aW5nIHRoZVxuICAgKiAgICAgICAgIHBhcmFncmFwaHMgb2YgdGhlIHRleHQgc3VtbWFyeS5cbiAgICovXG4gIGZ1bmN0aW9uIGFzc2VtYmxlKHRyZWUpIHtcbiAgICByZXR1cm4gW1xuICAgICAgYXNzZW1ibGVUcmFpdHModHJlZS5jaGlsZHJlblswXSksXG4gICAgICBhc3NlbWJsZUZhY2V0cyh0cmVlLmNoaWxkcmVuWzBdKSxcbiAgICAgIGFzc2VtYmxlTmVlZHModHJlZS5jaGlsZHJlblsxXSksXG4gICAgICBhc3NlbWJsZVZhbHVlcyh0cmVlLmNoaWxkcmVuWzJdKVxuICAgIF07XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBUcmFpdFRyZWUgcmV0dXJucyBhIHRleHRcbiAgICogc3VtbWFyeSBkZXNjcmliaW5nIHRoZSByZXN1bHQuXG4gICAqXG4gICAqIEBwYXJhbSB0cmVlIEEgVHJhaXRUcmVlLlxuICAgKiBAcmV0dXJuIEEgU3RyaW5nIGNvbnRhaW5pbmcgdGhlIHRleHQgc3VtbWFyeS5cbiAgICovXG4gIGZ1bmN0aW9uIGdldFN1bW1hcnkocHJvZmlsZSkge1xuICAgIHJldHVybiBhc3NlbWJsZShwcm9maWxlLnRyZWUpLm1hcChmdW5jdGlvbiAocGFyYWdyYXBoKSB7IHJldHVybiBwYXJhZ3JhcGguam9pbihcIiBcIik7IH0pLmpvaW4oXCJcXG5cIik7XG4gIH1cblxuICAvKiBUZXh0LVN1bW1hcnkgQVBJICovXG4gIHNlbGYuYXNzZW1ibGVUcmFpdHMgPSBhc3NlbWJsZVRyYWl0cztcbiAgc2VsZi5hc3NlbWJsZUZhY2V0cyA9IGFzc2VtYmxlRmFjZXRzO1xuICBzZWxmLmFzc2VtYmxlTmVlZHMgPSBhc3NlbWJsZU5lZWRzO1xuICBzZWxmLmFzc2VtYmxlVmFsdWVzID0gYXNzZW1ibGVWYWx1ZXM7XG4gIHNlbGYuYXNzZW1ibGUgPSBhc3NlbWJsZTtcbiAgc2VsZi5nZXRTdW1tYXJ5ID0gZ2V0U3VtbWFyeTtcblxuICByZXR1cm4gc2VsZjtcbn07XG4iLCIvKipcbiAqIENvcHlyaWdodCAyMDE1IElCTSBDb3JwLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuXG4vKipcbiAqIEdpdmVuIGEgdGVtcGxhdGUgc3RyaW5nIHRvIGZvcm1hdCBhbmQgc2VydmVyYWwgc3RyaW5nc1xuICogdG8gZmlsbCB0aGUgdGVtcGxhdGUsIGl0IHJldHVybnMgdGhlIGZvcm1hdHRlZCBzdHJpbmcuXG4gKiBAcGFyYW0gdGVtcGxhdGUgVGhpcyBpcyBhIHN0cmluZyBjb250YWluaW5nIHplcm8sIG9uZSBvclxuICogICAgICAgICAgICAgICAgIG1vcmUgb2NjdXJyZW5jZXMgb2YgXCIlc1wiLlxuICogQHBhcmFtIC4uLnN0cmluZ3NcbiAqIEByZXR1cm5zIFRoZSBmb3JtYXR0dGVkIHRlbXBsYXRlLlxuICovXG5mdW5jdGlvbiBmb3JtYXQoc3ViamVjdCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyXG4gICAgcmVwbGFjZXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuYXBwbHkoYXJndW1lbnRzLCBbMSwgYXJndW1lbnRzLmxlbmd0aF0pLFxuICAgIHBhcnRzID0gbnVsbCxcbiAgICBvdXRwdXQsXG4gICAgaTtcblxuICBpZiAoKHN1YmplY3QubWF0Y2goLyVzL2cpID09PSBudWxsICYmIHJlcGxhY2VzLmxlbmd0aCA+IDApIHx8IHJlcGxhY2VzLmxlbmd0aCAhPT0gc3ViamVjdC5tYXRjaCgvJXMvZykubGVuZ3RoKSB7XG4gICAgdGhyb3cgJ0Zvcm1hdCBlcnJvcjogVGhlIHN0cmluZyBjb3VudCB0byByZXBsYWNlIGRvIG5vdCBtYXRjaGVzIHRoZSBhcmd1bWVudCBjb3VudC4gU3ViamVjdDogJyArIHN1YmplY3QgKyAnLiBSZXBsYWNlczogJyArIHJlcGxhY2VzO1xuICB9XG5cbiAgb3V0cHV0ID0gc3ViamVjdDtcbiAgZm9yIChpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHBhcnRzID0gb3V0cHV0LnNwbGl0KCclcycpO1xuICAgIG91dHB1dCA9IHBhcnRzWzBdICsgYXJndW1lbnRzW2ldICsgcGFydHMuc2xpY2UoMSwgcGFydHMubGVuZ3RoKS5qb2luKCclcycpO1xuICB9XG5cbiAgcmV0dXJuIG91dHB1dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmb3JtYXQ7XG4iLCIvKipcbiAqIENvcHlyaWdodCAyMDE1IElCTSBDb3JwLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuXG4vKipcbiAqIENyZWF0ZXMgdHJhbnNsYXRvcnNcbiAqXG4gKiBAYXV0aG9yIEFyeSBQYWJsbyBCYXRpc3RhIDxiYXRhcnlwYUBhci5pYm0uY29tPlxuICovXG52YXIgdHJhbnNsYXRvckZhY3RvcnkgPSAoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBzZWxmID0ge1xuXG4gICAgICAvKipcbiAgICAgICAqIEdldCB0aGUgdmFsdWUgZm9yIHRoZSBnaXZlbiBrZXkgZnJvbSB0aGUgZGljdGlvbmFyeS5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0gZGljdGlvbmFyeSBBIGRpY3Rpb25hcnkgd2l0aCBTdHJpbmcga2V5cyBhbmQgU3RyaW5nIHZhbHVlcy5cbiAgICAgICAqIEBwYXJhbSBrZXkgQSBrZXkuIENhbiBjb250YWluICcuJyB0byBpbmRpY2F0ZSBrZXkncyBwcmVzZW50IGluIHN1Yi1kaWN0aW9uYXJpZXMuXG4gICAgICAgKiAgICAgICAgICAgICAgICAgICBGb3IgZXhhbXBsZSAnYXBwbGljYXRpb24ubmFtZScgbG9va3MgdXAgZm9yIHRoZSAnYXBwbGljYXRpb24nIGtleVxuICAgICAgICogICAgICAgICAgICAgICAgICAgaW4gdGhlIGRpY3Rpb25hcnkgYW5kLCB3aXRoIGl0J3MgdmFsdWUsIGxvb2tzIHVwIGZvciB0aGUgJ25hbWUnIGtleS5cbiAgICAgICAqIEBwYXJhbSBkZWZhdWx0VmFsdWUgQSB2YWx1ZSB0byByZXR1cm4gaWYgdGhlIGtleSBpcyBub3QgaW4gdGhlIGRpY3Rpb25hcnkuXG4gICAgICAgKiBAcmV0dXJucyBUaGUgdmFsdWUgZnJvbSB0aGUgZGljdGlvbmFyeS5cbiAgICAgICAqL1xuICAgICAgZ2V0S2V5IDogZnVuY3Rpb24gKGRpY3Rpb25hcnksIGtleSwgZGVmYXVsdFZhbHVlKSB7XG4gICAgICAgIHZhciBpLFxuICAgICAgICAgIHBhcnRzID0ga2V5LnNwbGl0KCcuJyksXG4gICAgICAgICAgdmFsdWUgPSBkaWN0aW9uYXJ5O1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkgPSBpICsgMSkge1xuICAgICAgICAgIHZhbHVlID0gdmFsdWVbcGFydHNbaV1dO1xuICAgICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICAgIHZhbHVlID0gZGVmYXVsdFZhbHVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAgICogQ3JlYXRlcyBhIHRyYW5zbGF0aW9uIGZ1bmN0aW9uIGdpdmVuIGEgZGljdGlvbmFyeSBvZiB0cmFuc2xhdGlvbnNcbiAgICAgICAqIGFuZCBhbiBvcHRpb25hbCBiYWNrdXAgZGljdGlvbmFyeSBpZiB0aGUga2V5IGlzIG5vIHByZXNlbnQgaW4gdGhlXG4gICAgICAgKiBmaXJzdCBvbmUuIFRoZSBrZXkgaXMgcmV0dXJuZWQgaWYgbm90IGZvdW5kIGluIHRoZSBkaWN0aW9uYXJpZXMuXG4gICAgICAgKiBAcGFyYW0gdHJhbnNsYXRpb25zIEEgdHJhbnNsYXRpb24gZGljdGlvbmFyeS5cbiAgICAgICAqIEBwYXJhbSBkZWZhdWx0cyBBIHRyYW5zbGF0aW9uIGRpY3Rpb25hcnkuXG4gICAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IEEgdHJhbnNsYXRvci5cbiAgICAgICAqL1xuICAgICAgY3JlYXRlVHJhbnNsYXRvciA6IGZ1bmN0aW9uICh0cmFuc2xhdGlvbnMsIGRlZmF1bHRzKSB7XG4gICAgICAgIGRlZmF1bHRzID0gZGVmYXVsdHMgfHwge307XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgdmFyIHZhbHVlID0gc2VsZi5nZXRLZXkodHJhbnNsYXRpb25zLCBrZXksIG51bGwpO1xuICAgICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZm9ybWF0KCdQZW5kaW5nIHRyYW5zbGF0aW9uIGZvcjogJXMnLCBrZXkpKTtcbiAgICAgICAgICAgIHZhbHVlID0gX3RoaXMuZ2V0S2V5KGRlZmF1bHRzLCBrZXksIGtleSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIHNlbGY7XG5cbiAgfSgpKSxcblxuXG4vKipcbiAqIFByb3ZpZGUgZmlsZXMgYWNjb3JkaW5nIHRvIHVzZXIncyBsb2NhbGVcbiAqXG4gKiBAYXV0aG9yIEFyeSBQYWJsbyBCYXRpc3RhIDxiYXRhcnlwYUBhci5pYm0uY29tPlxuICovXG4gIGkxOG5Qcm92aWRlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIERFRkFVTFRfTE9DQUxFID0gJ2VuJyxcbiAgICAgICAgSTE4Tl9ESVIgPSAnLi9pMThuJyxcbiAgICAgICAgc2VsZiA9IHtcbiAgICAgICAgICBkaWN0aW9uYXJpZXM6IHtcbiAgICAgICAgICAgICdlbic6IHJlcXVpcmUoJy4vaTE4bi9lbicpLFxuICAgICAgICAgICAgJ2VzJzogcmVxdWlyZSgnLi9pMThuL2VzJylcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYWxsIHRoZSBsb2NhbGUgb3B0aW9ucy5cbiAgICAgKiBmb3IgJ2VzLUFSJ1sndHJhaXRzX2VzLUFSLmpzb24nLCAndHJhaXRzX2VzLmpzb24nLCAndHJhaXRzLmpzb24nXVxuICAgICAqXG4gICAgICogQHBhcmFtIGxvY2FsZSBBIGxvY2FsZSAoZm9ybWF0OiBsbC1DQylcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFuIGFycmF5IG9mIHRoZSBwb3NzaWJsZSBuYW1lcyBmb3IgZGljdGlvbmFyeSBmaWxlLlxuICAgICAqL1xuICAgIHNlbGYuZ2V0TG9jYWxlT3B0aW9ucyA9IGZ1bmN0aW9uIChsb2NhbGUpIHtcbiAgICAgIHZhclxuICAgICAgICBsb2NhbGVQYXJ0cyA9IGxvY2FsZS5zcGxpdCgnLScpLFxuICAgICAgICBvcHRpb25zID0gW107XG5cbiAgICAgIG9wdGlvbnMucHVzaChsb2NhbGUucmVwbGFjZSgnLScsICdfJykpO1xuICAgICAgaWYgKGxvY2FsZVBhcnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgICBvcHRpb25zLnB1c2gobG9jYWxlUGFydHNbMF0pO1xuICAgICAgfVxuXG4gICAgICBvcHRpb25zLnB1c2goREVGQVVMVF9MT0NBTEUpO1xuXG4gICAgICByZXR1cm4gb3B0aW9ucztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBhcHByb3BpYXRlIGRpY3Rpb25hcnkgZmlsZSBmb3IgdXNlcidzIGxvY2FsZS5cbiAgICAgKi9cbiAgICBzZWxmLmdldERpY3Rpb25hcnkgPSBmdW5jdGlvbiAobG9jYWxlKSB7XG4gICAgICB2YXIgbG9jYWxlcyA9IHNlbGYuZ2V0TG9jYWxlT3B0aW9ucyhsb2NhbGUpLFxuICAgICAgICAgIGRpY3Q7XG5cblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsb2NhbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChzZWxmLmRpY3Rpb25hcmllc1tsb2NhbGVzW2ldXSkge1xuICAgICAgICAgIHJldHVybiBzZWxmLmRpY3Rpb25hcmllc1tsb2NhbGVzW2ldXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBvYnRhaW4gYW55IGRpY3Rpb25hcnkgZm9yIGxvY2FsZSBcIicgKyBsb2NhbGUgKyAnXCInKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHNlbGY7XG5cbiAgfSgpKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGkxOG5Qcm92aWRlciA6IGkxOG5Qcm92aWRlcixcbiAgZ2V0RGljdGlvbmFyeSA6IGkxOG5Qcm92aWRlci5nZXREaWN0aW9uYXJ5LFxuICB0cmFuc2xhdG9yRmFjdG9yeSA6IHRyYW5zbGF0b3JGYWN0b3J5XG59O1xuIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxNSBJQk0gQ29ycC4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBcImZhY2V0c1wiIDoge1xuICBcdFwiRnJpZW5kbGluZXNzXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkV4dHJhdmVyc2lvblwiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiUmVzZXJ2ZWRcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJPdXRnb2luZ1wiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgYSBwcml2YXRlIHBlcnNvbiBhbmQgZG9uJ3QgbGV0IG1hbnkgcGVvcGxlIGluXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBtYWtlIGZyaWVuZHMgZWFzaWx5IGFuZCBmZWVsIGNvbWZvcnRhYmxlIGFyb3VuZCBvdGhlciBwZW9wbGVcIlxuICBcdH0sXG4gIFx0XCJHcmVnYXJpb3VzbmVzc1wiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJFeHRyYXZlcnNpb25cIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkluZGVwZW5kZW50XCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiU29jaWFibGVcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgaGF2ZSBhIHN0cm9uZyBkZXNpcmUgdG8gaGF2ZSB0aW1lIHRvIHlvdXJzZWxmXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBlbmpveSBiZWluZyBpbiB0aGUgY29tcGFueSBvZiBvdGhlcnNcIlxuICBcdH0sXG4gIFx0XCJBc3NlcnRpdmVuZXNzXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkV4dHJhdmVyc2lvblwiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiRGVtdXJlXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiQXNzZXJ0aXZlXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IHByZWZlciB0byBsaXN0ZW4gdGhhbiB0byB0YWxrLCBlc3BlY2lhbGx5IGluIGdyb3VwIHNpdHVhdGlvbnNcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IHRlbmQgdG8gc3BlYWsgdXAgYW5kIHRha2UgY2hhcmdlIG9mIHNpdHVhdGlvbnMsIGFuZCB5b3UgYXJlIGNvbWZvcnRhYmxlIGxlYWRpbmcgZ3JvdXBzXCJcbiAgXHR9LFxuICBcdFwiQWN0aXZpdHktbGV2ZWxcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiRXh0cmF2ZXJzaW9uXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJMYWlkLWJhY2tcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJFbmVyZ2V0aWNcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgYXBwcmVjaWF0ZSBhIHJlbGF4ZWQgcGFjZSBpbiBsaWZlXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBlbmpveSBhIGZhc3QtcGFjZWQsIGJ1c3kgc2NoZWR1bGUgd2l0aCBtYW55IGFjdGl2aXRpZXNcIlxuICBcdH0sXG4gIFx0XCJFeGNpdGVtZW50LXNlZWtpbmdcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiRXh0cmF2ZXJzaW9uXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJDYWxtLXNlZWtpbmdcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJFeGNpdGVtZW50LXNlZWtpbmdcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgcHJlZmVyIGFjdGl2aXRpZXMgdGhhdCBhcmUgcXVpZXQsIGNhbG0sIGFuZCBzYWZlXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgZXhjaXRlZCBieSB0YWtpbmcgcmlza3MgYW5kIGZlZWwgYm9yZWQgd2l0aG91dCBsb3RzIG9mIGFjdGlvbiBnb2luZyBvblwiXG4gIFx0fSxcbiAgXHRcIkNoZWVyZnVsbmVzc1wiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJFeHRyYXZlcnNpb25cIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIlNvbGVtblwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIkNoZWVyZnVsXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBnZW5lcmFsbHkgc2VyaW91cyBhbmQgZG8gbm90IGpva2UgbXVjaFwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGEgam95ZnVsIHBlcnNvbiBhbmQgc2hhcmUgdGhhdCBqb3kgd2l0aCB0aGUgd29ybGRcIlxuICBcdH0sXG4gIFx0XCJUcnVzdFwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJBZ3JlZWFibGVuZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJDYXV0aW91cyBvZiBvdGhlcnNcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJUcnVzdGluZyBvZiBvdGhlcnNcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIHdhcnkgb2Ygb3RoZXIgcGVvcGxlJ3MgaW50ZW50aW9ucyBhbmQgZG8gbm90IHRydXN0IGVhc2lseVwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYmVsaWV2ZSB0aGUgYmVzdCBpbiBvdGhlcnMgYW5kIHRydXN0IHBlb3BsZSBlYXNpbHlcIlxuICBcdH0sXG4gIFx0XCJDb29wZXJhdGlvblwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJBZ3JlZWFibGVuZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJDb250cmFyeVwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIkFjY29tbW9kYXRpbmdcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgZG8gbm90IHNoeSBhd2F5IGZyb20gY29udHJhZGljdGluZyBvdGhlcnNcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBlYXN5IHRvIHBsZWFzZSBhbmQgdHJ5IHRvIGF2b2lkIGNvbmZyb250YXRpb25cIlxuICBcdH0sXG4gIFx0XCJBbHRydWlzbVwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJBZ3JlZWFibGVuZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJTZWxmLWZvY3VzZWRcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJBbHRydWlzdGljXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBtb3JlIGNvbmNlcm5lZCB3aXRoIHRha2luZyBjYXJlIG9mIHlvdXJzZWxmIHRoYW4gdGFraW5nIHRpbWUgZm9yIG90aGVyc1wiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgZmVlbCBmdWxmaWxsZWQgd2hlbiBoZWxwaW5nIG90aGVycywgYW5kIHdpbGwgZ28gb3V0IG9mIHlvdXIgd2F5IHRvIGRvIHNvXCJcbiAgXHR9LFxuICBcdFwiTW9yYWxpdHlcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiQWdyZWVhYmxlbmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiQ29tcHJvbWlzaW5nXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiVW5jb21wcm9taXNpbmdcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGNvbWZvcnRhYmxlIHVzaW5nIGV2ZXJ5IHRyaWNrIGluIHRoZSBib29rIHRvIGdldCB3aGF0IHlvdSB3YW50XCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSB0aGluayBpdCBpcyB3cm9uZyB0byB0YWtlIGFkdmFudGFnZSBvZiBvdGhlcnMgdG8gZ2V0IGFoZWFkXCJcbiAgXHR9LFxuICBcdFwiTW9kZXN0eVwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJBZ3JlZWFibGVuZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJQcm91ZFwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIk1vZGVzdFwiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBob2xkIHlvdXJzZWxmIGluIGhpZ2ggcmVnYXJkLCBzYXRpc2ZpZWQgd2l0aCB3aG8geW91IGFyZVwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIHVuY29tZm9ydGFibGUgYmVpbmcgdGhlIGNlbnRlciBvZiBhdHRlbnRpb25cIlxuICBcdH0sXG4gIFx0XCJTeW1wYXRoeVwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJBZ3JlZWFibGVuZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJIYXJkZW5lZFwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIkVtcGF0aGV0aWNcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgdGhpbmsgdGhhdCBwZW9wbGUgc2hvdWxkIGdlbmVyYWxseSByZWx5IG1vcmUgb24gdGhlbXNlbHZlcyB0aGFuIG9uIG90aGVyIHBlb3BsZVwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgZmVlbCB3aGF0IG90aGVycyBmZWVsIGFuZCBhcmUgY29tcGFzc2lvbmF0ZSB0b3dhcmRzIHRoZW1cIlxuICBcdH0sXG4gIFx0XCJTZWxmLWVmZmljYWN5XCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkNvbnNjaWVudGlvdXNuZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJTZWxmLWRvdWJ0aW5nXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiU2VsZi1hc3N1cmVkXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGZyZXF1ZW50bHkgZG91YnQgeW91ciBhYmlsaXR5IHRvIGFjaGlldmUgeW91ciBnb2Fsc1wiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgZmVlbCB5b3UgaGF2ZSB0aGUgYWJpbGl0eSB0byBzdWNjZWVkIGluIHRoZSB0YXNrcyB5b3Ugc2V0IG91dCB0byBkb1wiXG4gIFx0fSxcbiAgXHRcIk9yZGVybGluZXNzXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkNvbnNjaWVudGlvdXNuZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJVbnN0cnVjdHVyZWRcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJPcmdhbml6ZWRcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgZG8gbm90IG1ha2UgYSBsb3Qgb2YgdGltZSBmb3Igb3JnYW5pemF0aW9uIGluIHlvdXIgZGFpbHkgbGlmZVwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgZmVlbCBhIHN0cm9uZyBuZWVkIGZvciBzdHJ1Y3R1cmUgaW4geW91ciBsaWZlXCJcbiAgXHR9LFxuICBcdFwiRHV0aWZ1bG5lc3NcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiQ29uc2NpZW50aW91c25lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkNhcmVmcmVlXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiRHV0aWZ1bFwiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBkbyB3aGF0IHlvdSB3YW50LCBkaXNyZWdhcmRpbmcgcnVsZXMgYW5kIG9ibGlnYXRpb25zXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSB0YWtlIHJ1bGVzIGFuZCBvYmxpZ2F0aW9ucyBzZXJpb3VzbHksIGV2ZW4gd2hlbiB0aGV5J3JlIGluY29udmVuaWVudFwiXG4gIFx0fSxcbiAgXHRcIkFjaGlldmVtZW50LXN0cml2aW5nXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIkNvbnNjaWVudGlvdXNuZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJDb250ZW50XCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiRHJpdmVuXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBjb250ZW50IHdpdGggeW91ciBsZXZlbCBvZiBhY2NvbXBsaXNobWVudCBhbmQgZG8gbm90IGZlZWwgdGhlIG5lZWQgdG8gc2V0IGFtYml0aW91cyBnb2Fsc1wiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgaGF2ZSBoaWdoIGdvYWxzIGZvciB5b3Vyc2VsZiBhbmQgd29yayBoYXJkIHRvIGFjaGlldmUgdGhlbVwiXG4gIFx0fSxcbiAgXHRcIlNlbGYtZGlzY2lwbGluZVwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJDb25zY2llbnRpb3VzbmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiSW50ZXJtaXR0ZW50XCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiUGVyc2lzdGVudFwiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBoYXZlIGEgaGFyZCB0aW1lIHN0aWNraW5nIHdpdGggZGlmZmljdWx0IHRhc2tzIGZvciBhIGxvbmcgcGVyaW9kIG9mIHRpbWVcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGNhbiB0YWNrbGUgYW5kIHN0aWNrIHdpdGggdG91Z2ggdGFza3NcIlxuICBcdH0sXG4gIFx0XCJDYXV0aW91c25lc3NcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiQ29uc2NpZW50aW91c25lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkJvbGRcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJEZWxpYmVyYXRlXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IHdvdWxkIHJhdGhlciB0YWtlIGFjdGlvbiBpbW1lZGlhdGVseSB0aGFuIHNwZW5kIHRpbWUgZGVsaWJlcmF0aW5nIG1ha2luZyBhIGRlY2lzaW9uXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBjYXJlZnVsbHkgdGhpbmsgdGhyb3VnaCBkZWNpc2lvbnMgYmVmb3JlIG1ha2luZyB0aGVtXCJcbiAgXHR9LFxuICBcdFwiQW54aWV0eVwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJOZXVyb3RpY2lzbVwiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiU2VsZi1hc3N1cmVkXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiUHJvbmUgdG8gd29ycnlcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgdGVuZCB0byBmZWVsIGNhbG0gYW5kIHNlbGYtYXNzdXJlZFwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgdGVuZCB0byB3b3JyeSBhYm91dCB0aGluZ3MgdGhhdCBtaWdodCBoYXBwZW5cIlxuICBcdH0sXG4gIFx0XCJBbmdlclwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJOZXVyb3RpY2lzbVwiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiTWlsZC10ZW1wZXJlZFwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIkZpZXJ5XCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiSXQgdGFrZXMgYSBsb3QgdG8gZ2V0IHlvdSBhbmdyeVwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgaGF2ZSBhIGZpZXJ5IHRlbXBlciwgZXNwZWNpYWxseSB3aGVuIHRoaW5ncyBkbyBub3QgZ28geW91ciB3YXlcIlxuICBcdH0sXG4gIFx0XCJEZXByZXNzaW9uXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIk5ldXJvdGljaXNtXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJDb250ZW50XCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiTWVsYW5jaG9seVwiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgZ2VuZXJhbGx5IGNvbWZvcnRhYmxlIHdpdGggeW91cnNlbGYgYXMgeW91IGFyZVwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgdGhpbmsgcXVpdGUgb2Z0ZW4gYWJvdXQgdGhlIHRoaW5ncyB5b3UgYXJlIHVuaGFwcHkgYWJvdXRcIlxuICBcdH0sXG4gIFx0XCJTZWxmLWNvbnNjaW91c25lc3NcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiTmV1cm90aWNpc21cIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkNvbmZpZGVudFwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIlNlbGYtY29uc2Npb3VzXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBoYXJkIHRvIGVtYmFycmFzcyBhbmQgYXJlIHNlbGYtY29uZmlkZW50IG1vc3Qgb2YgdGhlIHRpbWVcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBzZW5zaXRpdmUgYWJvdXQgd2hhdCBvdGhlcnMgbWlnaHQgYmUgdGhpbmtpbmcgYWJvdXQgeW91XCJcbiAgXHR9LFxuICBcdFwiSW1tb2RlcmF0aW9uXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIk5ldXJvdGljaXNtXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJTZWxmLWNvbnRyb2xsZWRcIixcbiAgXHRcdFwiSGlnaFRlcm1cIjogXCJIZWRvbmlzdGljXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGhhdmUgY29udHJvbCBvdmVyIHlvdXIgZGVzaXJlcywgd2hpY2ggYXJlIG5vdCBwYXJ0aWN1bGFybHkgaW50ZW5zZVwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgZmVlbCB5b3VyIGRlc2lyZXMgc3Ryb25nbHkgYW5kIGFyZSBlYXNpbHkgdGVtcHRlZCBieSB0aGVtXCJcbiAgXHR9LFxuICBcdFwiVnVsbmVyYWJpbGl0eVwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJOZXVyb3RpY2lzbVwiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiQ2FsbSB1bmRlciBwcmVzc3VyZVwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIlN1c2NlcHRpYmxlIHRvIHN0cmVzc1wiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBoYW5kbGUgdW5leHBlY3RlZCBldmVudHMgY2FsbWx5IGFuZCBlZmZlY3RpdmVseVwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGVhc2lseSBvdmVyd2hlbG1lZCBpbiBzdHJlc3NmdWwgc2l0dWF0aW9uc1wiXG4gIFx0fSxcbiAgXHRcIkltYWdpbmF0aW9uXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIk9wZW5uZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJEb3duLXRvLWVhcnRoXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiSW1hZ2luYXRpdmVcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgcHJlZmVyIGZhY3RzIG92ZXIgZmFudGFzeVwiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgaGF2ZSBhIHdpbGQgaW1hZ2luYXRpb25cIlxuICBcdH0sXG4gIFx0XCJBcnRpc3RpYy1pbnRlcmVzdHNcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiT3Blbm5lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIlVuY29uY2VybmVkIHdpdGggYXJ0XCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiQXBwcmVjaWF0aXZlIG9mIGFydFwiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgbGVzcyBjb25jZXJuZWQgd2l0aCBhcnRpc3RpYyBvciBjcmVhdGl2ZSBhY3Rpdml0aWVzIHRoYW4gbW9zdCBwZW9wbGUgd2hvIHBhcnRpY2lwYXRlZCBpbiBvdXIgc3VydmV5c1wiLFxuICBcdFx0XCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgZW5qb3kgYmVhdXR5IGFuZCBzZWVrIG91dCBjcmVhdGl2ZSBleHBlcmllbmNlc1wiXG4gIFx0fSxcbiAgXHRcIkVtb3Rpb25hbGl0eVwiOiB7XG4gIFx0XHRcIkJpZzVcIjogXCJPcGVubmVzc1wiLFxuICBcdFx0XCJMb3dUZXJtXCI6IFwiRGlzcGFzc2lvbmF0ZVwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIkVtb3Rpb25hbGx5IGF3YXJlXCIsXG4gIFx0XHRcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGRvIG5vdCBmcmVxdWVudGx5IHRoaW5rIGFib3V0IG9yIG9wZW5seSBleHByZXNzIHlvdXIgZW1vdGlvbnNcIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBhd2FyZSBvZiB5b3VyIGZlZWxpbmdzIGFuZCBob3cgdG8gZXhwcmVzcyB0aGVtXCJcbiAgXHR9LFxuICBcdFwiQWR2ZW50dXJvdXNuZXNzXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIk9wZW5uZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJDb25zaXN0ZW50XCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiQWR2ZW50dXJvdXNcIixcbiAgXHRcdFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgZW5qb3kgZmFtaWxpYXIgcm91dGluZXMgYW5kIHByZWZlciBub3QgdG8gZGV2aWF0ZSBmcm9tIHRoZW1cIixcbiAgXHRcdFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBlYWdlciB0byBleHBlcmllbmNlIG5ldyB0aGluZ3NcIlxuICBcdH0sXG4gIFx0XCJJbnRlbGxlY3RcIjoge1xuICBcdFx0XCJCaWc1XCI6IFwiT3Blbm5lc3NcIixcbiAgXHRcdFwiTG93VGVybVwiOiBcIkNvbmNyZXRlXCIsXG4gIFx0XHRcIkhpZ2hUZXJtXCI6IFwiUGhpbG9zb3BoaWNhbFwiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBwcmVmZXIgZGVhbGluZyB3aXRoIHRoZSB3b3JsZCBhcyBpdCBpcywgcmFyZWx5IGNvbnNpZGVyaW5nIGFic3RyYWN0IGlkZWFzXCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgb3BlbiB0byBhbmQgaW50cmlndWVkIGJ5IG5ldyBpZGVhcyBhbmQgbG92ZSB0byBleHBsb3JlIHRoZW1cIlxuICBcdH0sXG4gIFx0XCJMaWJlcmFsaXNtXCI6IHtcbiAgXHRcdFwiQmlnNVwiOiBcIk9wZW5uZXNzXCIsXG4gIFx0XHRcIkxvd1Rlcm1cIjogXCJSZXNwZWN0ZnVsIG9mIGF1dGhvcml0eVwiLFxuICBcdFx0XCJIaWdoVGVybVwiOiBcIkF1dGhvcml0eS1jaGFsbGVuZ2luZ1wiLFxuICBcdFx0XCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBwcmVmZXIgZm9sbG93aW5nIHdpdGggdHJhZGl0aW9uIGluIG9yZGVyIHRvIG1haW50YWluIGEgc2Vuc2Ugb2Ygc3RhYmlsaXR5XCIsXG4gIFx0XHRcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBwcmVmZXIgdG8gY2hhbGxlbmdlIGF1dGhvcml0eSBhbmQgdHJhZGl0aW9uYWwgdmFsdWVzIHRvIGhlbHAgYnJpbmcgYWJvdXQgcG9zaXRpdmUgY2hhbmdlc1wiXG4gIFx0fVxuICB9LFxuICBcIm5lZWRzXCI6IHtcbiAgICAgIFwiQ2hhbGxlbmdlXCI6IFtcbiAgICAgICAgICBcInByZXN0aWdlXCIsXG4gICAgICAgICAgXCJjb21wZXRpdGlvblwiLFxuICAgICAgICAgIFwiZ2xvcnlcIlxuICAgICAgXSxcbiAgICAgIFwiQ2xvc2VuZXNzXCI6IFtcbiAgICAgICAgICBcImJlbG9uZ2luZ25lc3NcIixcbiAgICAgICAgICBcIm5vc3RhbGdpYVwiLFxuICAgICAgICAgIFwiaW50aW1hY3lcIlxuICAgICAgXSxcbiAgICAgIFwiQ3VyaW9zaXR5XCI6IFtcbiAgICAgICAgICBcImRpc2NvdmVyeVwiLFxuICAgICAgICAgIFwibWFzdGVyeVwiLFxuICAgICAgICAgIFwiZ2FpbmluZyBrbm93bGVkZ2VcIlxuICAgICAgXSxcbiAgICAgIFwiRXhjaXRlbWVudFwiOiBbXG4gICAgICAgICAgXCJyZXZlbHJ5XCIsXG4gICAgICAgICAgXCJhbnRpY2lwYXRpb25cIixcbiAgICAgICAgICBcImV4aGlsaXJhdGlvblwiXG4gICAgICBdLFxuICAgICAgXCJIYXJtb255XCI6IFtcbiAgICAgICAgICBcIndlbGwtYmVpbmdcIixcbiAgICAgICAgICBcImNvdXJ0ZXN5XCIsXG4gICAgICAgICAgXCJwb2xpdGVuZXNzXCJcbiAgICAgIF0sXG4gICAgICBcIklkZWFsXCI6IFtcbiAgICAgICAgICBcInNvcGhpc3RpY2F0aW9uXCIsXG4gICAgICAgICAgXCJzcGlyaXR1YWxpdHlcIixcbiAgICAgICAgICBcInN1cGVyaW9yaXR5XCIsXG4gICAgICAgICAgXCJmdWxmaWxsbWVudFwiXG4gICAgICBdLFxuICAgICAgXCJMaWJlcnR5XCI6IFtcbiAgICAgICAgICBcIm1vZGVybml0eVwiLFxuICAgICAgICAgIFwiZXhwYW5kaW5nIHBvc3NpYmlsaXR5XCIsXG4gICAgICAgICAgXCJlc2NhcGVcIixcbiAgICAgICAgICBcInNwb250YW5laXR5XCIsXG4gICAgICAgICAgXCJub3ZlbHR5XCJcbiAgICAgIF0sXG4gICAgICBcIkxvdmVcIjogW1xuICAgICAgICAgIFwiY29ubmVjdGVkbmVzc1wiLFxuICAgICAgICAgIFwiYWZmaW5pdHlcIlxuICAgICAgXSxcbiAgICAgIFwiUHJhY3RpY2FsaXR5XCI6IFtcbiAgICAgICAgICBcImVmZmljaWVuY3lcIixcbiAgICAgICAgICBcInByYWN0aWNhbGl0eVwiLFxuICAgICAgICAgIFwiaGlnaCB2YWx1ZVwiLFxuICAgICAgICAgIFwiY29udmVuaWVuY2VcIlxuICAgICAgXSxcbiAgICAgIFwiU2VsZi1leHByZXNzaW9uXCI6IFtcbiAgICAgICAgICBcInNlbGYtZXhwcmVzc2lvblwiLFxuICAgICAgICAgIFwicGVyc29uYWwgZW1wb3dlcm1lbnRcIixcbiAgICAgICAgICBcInBlcnNvbmFsIHN0cmVuZ3RoXCJcbiAgICAgIF0sXG4gICAgICBcIlN0YWJpbGl0eVwiOiBbXG4gICAgICAgICAgXCJzdGFiaWxpdHlcIixcbiAgICAgICAgICBcImF1dGhlbnRpY2l0eVwiLFxuICAgICAgICAgIFwidHJ1c3R3b3J0aGluZXNzXCJcbiAgICAgIF0sXG4gICAgICBcIlN0cnVjdHVyZVwiOiBbXG4gICAgICAgICAgXCJvcmdhbml6YXRpb25cIixcbiAgICAgICAgICBcInN0cmFpZ2h0Zm9yd2FyZG5lc3NcIixcbiAgICAgICAgICBcImNsYXJpdHlcIixcbiAgICAgICAgICBcInJlbGlhYmlsaXR5XCJcbiAgICAgIF1cbiAgfSxcbiAgXCJwaHJhc2VzXCI6IHtcbiAgICBcIllvdSBhcmUgJXNcIjogXCJZb3UgYXJlICVzXCIsXG4gICAgXCJZb3UgYXJlICVzIGFuZCAlc1wiOiBcIllvdSBhcmUgJXMgYW5kICVzXCIsXG4gICAgXCJZb3UgYXJlICVzLCAlcyBhbmQgJXNcIjogXCJZb3UgYXJlICVzLCAlcyBhbmQgJXNcIixcbiAgICBcIkFuZCB5b3UgYXJlICVzXCI6IFwiQW5kIHlvdSBhcmUgJXNcIixcbiAgICBcIllvdSBhcmUgcmVsYXRpdmVseSB1bmNvbmNlcm5lZCB3aXRoICVzXCI6IFwiWW91IGFyZSByZWxhdGl2ZWx5IHVuY29uY2VybmVkIHdpdGggJXNcIixcbiAgICBcIllvdSBhcmUgcmVsYXRpdmVseSB1bmNvbmNlcm5lZCB3aXRoIGJvdGggJXMgYW5kICVzXCI6IFwiWW91IGFyZSByZWxhdGl2ZWx5IHVuY29uY2VybmVkIHdpdGggYm90aCAlcyBhbmQgJXNcIixcbiAgICBcIllvdSBkb24ndCBmaW5kICVzIHRvIGJlIHBhcnRpY3VsYXJseSBtb3RpdmF0aW5nIGZvciB5b3VcIjogXCJZb3UgZG9uJ3QgZmluZCAlcyB0byBiZSBwYXJ0aWN1bGFybHkgbW90aXZhdGluZyBmb3IgeW91XCIsXG4gICAgXCJZb3UgZG9uJ3QgZmluZCBlaXRoZXIgJXMgb3IgJXMgdG8gYmUgcGFydGljdWxhcmx5IG1vdGl2YXRpbmcgZm9yIHlvdVwiOiBcIllvdSBkb24ndCBmaW5kIGVpdGhlciAlcyBvciAlcyB0byBiZSBwYXJ0aWN1bGFybHkgbW90aXZhdGluZyBmb3IgeW91XCIsXG4gICAgXCJZb3UgdmFsdWUgYm90aCAlcyBhIGJpdFwiOiBcIllvdSB2YWx1ZSBib3RoICVzIGEgYml0XCIsXG4gICAgXCJZb3UgdmFsdWUgYm90aCAlcyBhbmQgJXMgYSBiaXRcIjogXCJZb3UgdmFsdWUgYm90aCAlcyBhbmQgJXMgYSBiaXRcIixcbiAgICBcIllvdSBjb25zaWRlciAlcyB0byBndWlkZSBhIGxhcmdlIHBhcnQgb2Ygd2hhdCB5b3UgZG9cIiA6IFwiWW91IGNvbnNpZGVyICVzIHRvIGd1aWRlIGEgbGFyZ2UgcGFydCBvZiB3aGF0IHlvdSBkb1wiLFxuICAgIFwiWW91IGNvbnNpZGVyIGJvdGggJXMgYW5kICVzIHRvIGd1aWRlIGEgbGFyZ2UgcGFydCBvZiB3aGF0IHlvdSBkb1wiIDogXCJZb3UgY29uc2lkZXIgYm90aCAlcyBhbmQgJXMgdG8gZ3VpZGUgYSBsYXJnZSBwYXJ0IG9mIHdoYXQgeW91IGRvXCIsXG4gICAgXCJBbmQgJXNcIjogXCJBbmQgJXNcIixcbiAgICBcIkV4cGVyaWVuY2VzIHRoYXQgbWFrZSB5b3UgZmVlbCBoaWdoICVzIGFyZSBnZW5lcmFsbHkgdW5hcHBlYWxpbmcgdG8geW91XCI6IFwiRXhwZXJpZW5jZXMgdGhhdCBtYWtlIHlvdSBmZWVsIGhpZ2ggJXMgYXJlIGdlbmVyYWxseSB1bmFwcGVhbGluZyB0byB5b3VcIixcbiAgICBcIkV4cGVyaWVuY2VzIHRoYXQgZ2l2ZSBhIHNlbnNlIG9mICVzIGhvbGQgc29tZSBhcHBlYWwgdG8geW91XCI6IFwiRXhwZXJpZW5jZXMgdGhhdCBnaXZlIGEgc2Vuc2Ugb2YgJXMgaG9sZCBzb21lIGFwcGVhbCB0byB5b3VcIixcbiAgICBcIllvdSBhcmUgbW90aXZhdGVkIHRvIHNlZWsgb3V0IGV4cGVyaWVuY2VzIHRoYXQgcHJvdmlkZSBhIHN0cm9uZyBmZWVsaW5nIG9mICVzXCI6IFwiWW91IGFyZSBtb3RpdmF0ZWQgdG8gc2VlayBvdXQgZXhwZXJpZW5jZXMgdGhhdCBwcm92aWRlIGEgc3Ryb25nIGZlZWxpbmcgb2YgJXNcIixcbiAgICBcIllvdXIgY2hvaWNlcyBhcmUgZHJpdmVuIGJ5IGEgZGVzaXJlIGZvciAlc1wiIDogXCJZb3VyIGNob2ljZXMgYXJlIGRyaXZlbiBieSBhIGRlc2lyZSBmb3IgJXNcIixcbiAgICBcImEgYml0ICVzXCI6IFwiYSBiaXQgJXNcIixcbiAgICBcInNvbWV3aGF0ICVzXCIgOiBcInNvbWV3aGF0ICVzXCIsXG4gICAgXCJjYW4gYmUgcGVyY2VpdmVkIGFzICVzXCI6IFwiY2FuIGJlIHBlcmNlaXZlZCBhcyAlc1wiXG4gIH0sXG4gIFwidHJhaXRzXCI6IHtcbiAgICAgIFwiQWdyZWVhYmxlbmVzc19taW51c19Db25zY2llbnRpb3VzbmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluY29uc2lkZXJhdGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImltcG9saXRlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkaXN0cnVzdGZ1bFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5jb29wZXJhdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGhvdWdodGxlc3NcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkFncmVlYWJsZW5lc3NfbWludXNfQ29uc2NpZW50aW91c25lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzdHJpY3RcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJyaWdpZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic3Rlcm5cIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkFncmVlYWJsZW5lc3NfbWludXNfRXh0cmF2ZXJzaW9uX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3luaWNhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwid2FyeSBvZiBvdGhlcnNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlY2x1c2l2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGV0YWNoZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImltcGVyc29uYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImdsdW1cIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkFncmVlYWJsZW5lc3NfbWludXNfRXh0cmF2ZXJzaW9uX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJidWxsaGVhZGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhYnJ1cHRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNydWRlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb21iYXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInJvdWdoXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2x5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJtYW5pcHVsYXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImdydWZmXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkZXZpb3VzXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJBZ3JlZWFibGVuZXNzX21pbnVzX05ldXJvdGljaXNtX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5zZW5zaXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuYWZmZWN0aW9uYXRlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwYXNzaW9ubGVzc1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5lbW90aW9uYWxcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkFncmVlYWJsZW5lc3NfbWludXNfTmV1cm90aWNpc21fcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNyaXRpY2FsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZWxmaXNoXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbGwtdGVtcGVyZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFudGFnb25pc3RpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ3J1bXB5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJiaXR0ZXJcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRpc2FncmVlYWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVtYW5kaW5nXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJBZ3JlZWFibGVuZXNzX21pbnVzX09wZW5uZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29hcnNlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0YWN0bGVzc1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3VydFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibmFycm93LW1pbmRlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY2FsbG91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicnV0aGxlc3NcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuY2hhcml0YWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmluZGljdGl2ZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQWdyZWVhYmxlbmVzc19taW51c19PcGVubmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNocmV3ZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImVjY2VudHJpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluZGl2aWR1YWxpc3RpY1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQWdyZWVhYmxlbmVzc19wbHVzX0NvbnNjaWVudGlvdXNuZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVucHJldGVudGlvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZWxmLWVmZmFjaW5nXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJBZ3JlZWFibGVuZXNzX3BsdXNfQ29uc2NpZW50aW91c25lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJoZWxwZnVsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29vcGVyYXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb25zaWRlcmF0ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInJlc3BlY3RmdWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwb2xpdGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJyZWFzb25hYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY291cnRlb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGhvdWdodGZ1bFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImxveWFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibW9yYWxcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkFncmVlYWJsZW5lc3NfcGx1c19FeHRyYXZlcnNpb25fbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic29mdC1oZWFydGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYWdyZWVhYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwib2JsaWdpbmdcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJodW1ibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImxlbmllbnRcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkFncmVlYWJsZW5lc3NfcGx1c19FeHRyYXZlcnNpb25fcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJlZmZlcnZlc2NlbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJoYXBweVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZyaWVuZGx5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibWVycnlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJqb3ZpYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJodW1vcm91c1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQWdyZWVhYmxlbmVzc19wbHVzX05ldXJvdGljaXNtX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImdlbmVyb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGxlYXNhbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0b2xlcmFudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBlYWNlZnVsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZmxleGlibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJlYXN5LWdvaW5nXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZmFpclwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNoYXJpdGFibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0cnVzdGZ1bFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQWdyZWVhYmxlbmVzc19wbHVzX05ldXJvdGljaXNtX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VudGltZW50YWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhZmZlY3Rpb25hdGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZW5zaXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzb2Z0XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGFzc2lvbmF0ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInJvbWFudGljXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJBZ3JlZWFibGVuZXNzX3BsdXNfT3Blbm5lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkZXBlbmRlbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNpbXBsZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQWdyZWVhYmxlbmVzc19wbHVzX09wZW5uZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ2VuaWFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGFjdGZ1bFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRpcGxvbWF0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkZWVwXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaWRlYWxpc3RpY1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQ29uc2NpZW50aW91c25lc3NfbWludXNfQWdyZWVhYmxlbmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInJhc2hcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuY29vcGVyYXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVucmVsaWFibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRpc3RydXN0ZnVsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0aG91Z2h0bGVzc1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQ29uc2NpZW50aW91c25lc3NfbWludXNfQWdyZWVhYmxlbmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVucHJldGVudGlvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZWxmLWVmZmFjaW5nXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJDb25zY2llbnRpb3VzbmVzc19taW51c19FeHRyYXZlcnNpb25fbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbmRlY2lzaXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhaW1sZXNzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwid2lzaHktd2FzaHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJub25jb21taXR0YWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuYW1iaXRpb3VzXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJDb25zY2llbnRpb3VzbmVzc19taW51c19FeHRyYXZlcnNpb25fcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVucnVseVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImJvaXN0ZXJvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInJlY2tsZXNzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkZXZpbC1tYXktY2FyZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRlbW9uc3RyYXRpdmVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkNvbnNjaWVudGlvdXNuZXNzX21pbnVzX05ldXJvdGljaXNtX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluZm9ybWFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibG93LWtleVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQ29uc2NpZW50aW91c25lc3NfbWludXNfTmV1cm90aWNpc21fcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNjYXR0ZXJicmFpbmVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbmNvbnNpc3RlbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImVycmF0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZvcmdldGZ1bFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1wdWxzaXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmcml2b2xvdXNcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkNvbnNjaWVudGlvdXNuZXNzX21pbnVzX09wZW5uZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZvb2xoYXJkeVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaWxsb2dpY2FsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbW1hdHVyZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaGFwaGF6YXJkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibGF4XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmbGlwcGFudFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQ29uc2NpZW50aW91c25lc3NfbWludXNfT3Blbm5lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmNvbnZlbnRpb25hbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInF1aXJreVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQ29uc2NpZW50aW91c25lc3NfcGx1c19BZ3JlZWFibGVuZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic3Rlcm5cIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzdHJpY3RcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJyaWdpZFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQ29uc2NpZW50aW91c25lc3NfcGx1c19BZ3JlZWFibGVuZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVwZW5kYWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInJlc3BvbnNpYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmVsaWFibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJtYW5uZXJseVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbnNpZGVyYXRlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJDb25zY2llbnRpb3VzbmVzc19wbHVzX0V4dHJhdmVyc2lvbl9taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjYXV0aW91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbmZpZGVudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInB1bmN0dWFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZm9ybWFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGhyaWZ0eVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInByaW5jaXBsZWRcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkNvbnNjaWVudGlvdXNuZXNzX3BsdXNfRXh0cmF2ZXJzaW9uX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYW1iaXRpb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYWxlcnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmaXJtXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicHVycG9zZWZ1bFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbXBldGl0aXZlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJDb25zY2llbnRpb3VzbmVzc19wbHVzX05ldXJvdGljaXNtX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRob3JvdWdoXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic3RlYWR5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uc2lzdGVudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlbGYtZGlzY2lwbGluZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJsb2dpY2FsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVjaXNpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb250cm9sbGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uY2lzZVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQ29uc2NpZW50aW91c25lc3NfcGx1c19OZXVyb3RpY2lzbV9wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBhcnRpY3VsYXJcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImhpZ2gtc3RydW5nXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJDb25zY2llbnRpb3VzbmVzc19wbHVzX09wZW5uZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRyYWRpdGlvbmFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29udmVudGlvbmFsXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJDb25zY2llbnRpb3VzbmVzc19wbHVzX09wZW5uZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic29waGlzdGljYXRlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBlcmZlY3Rpb25pc3RpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluZHVzdHJpb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGlnbmlmaWVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmVmaW5lZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImN1bHR1cmVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZm9yZXNpZ2h0ZWRcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkV4dHJhdmVyc2lvbl9taW51c19BZ3JlZWFibGVuZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNrZXB0aWNhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIndhcnkgb2Ygb3RoZXJzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZWNsdXNpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuY29tbXVuaWNhdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5zb2NpYWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ2x1bVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGV0YWNoZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhbG9vZlwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiRXh0cmF2ZXJzaW9uX21pbnVzX0FncmVlYWJsZW5lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmFnZ3Jlc3NpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJodW1ibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzdWJtaXNzaXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGltaWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb21wbGlhbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJuYcOvdmVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkV4dHJhdmVyc2lvbl9taW51c19Db25zY2llbnRpb3VzbmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluZGlyZWN0XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmVuZXJnZXRpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2x1Z2dpc2hcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm5vbnBlcnNpc3RlbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInZhZ3VlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJFeHRyYXZlcnNpb25fbWludXNfQ29uc2NpZW50aW91c25lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJyZXN0cmFpbmVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VyaW91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRpc2NyZWV0XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY2F1dGlvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwcmluY2lwbGVkXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJFeHRyYXZlcnNpb25fbWludXNfTmV1cm90aWNpc21fbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidHJhbnF1aWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZWRhdGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwbGFjaWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbXBhcnRpYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmFzc3VtaW5nXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYWNxdWllc2NlbnRcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkV4dHJhdmVyc2lvbl9taW51c19OZXVyb3RpY2lzbV9wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImd1YXJkZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwZXNzaW1pc3RpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlY3JldGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY293YXJkbHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZWNyZXRpdmVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkV4dHJhdmVyc2lvbl9taW51c19PcGVubmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzb21iZXJcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm1lZWtcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuYWR2ZW50dXJvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwYXNzaXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhcGF0aGV0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkb2NpbGVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkV4dHJhdmVyc2lvbl9taW51c19PcGVubmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImlubmVyLWRpcmVjdGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW50cm9zcGVjdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm1lZGl0YXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb250ZW1wbGF0aW5nXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VsZi1leGFtaW5pbmdcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkV4dHJhdmVyc2lvbl9wbHVzX0FncmVlYWJsZW5lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwib3BpbmlvbmF0ZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZvcmNlZnVsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkb21pbmVlcmluZ1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYm9hc3RmdWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImJvc3N5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZG9taW5hbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjdW5uaW5nXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJFeHRyYXZlcnNpb25fcGx1c19BZ3JlZWFibGVuZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic29jaWFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZW5lcmdldGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZW50aHVzaWFzdGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29tbXVuaWNhdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInZpYnJhbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzcGlyaXRlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm1hZ25ldGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiemVzdGZ1bFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiRXh0cmF2ZXJzaW9uX3BsdXNfQ29uc2NpZW50aW91c25lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYm9pc3Rlcm91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm1pc2NoaWV2b3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhoaWJpdGlvbmlzdGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ3JlZ2FyaW91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRlbW9uc3RyYXRpdmVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkV4dHJhdmVyc2lvbl9wbHVzX0NvbnNjaWVudGlvdXNuZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYWN0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29tcGV0aXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwZXJzaXN0ZW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYW1iaXRpb3VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicHVycG9zZWZ1bFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiRXh0cmF2ZXJzaW9uX3BsdXNfTmV1cm90aWNpc21fbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uZmlkZW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYm9sZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImFzc3VyZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmluaGliaXRlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvdXJhZ2VvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJicmF2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlbGYtc2F0aXNmaWVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmlnb3JvdXNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzdHJvbmdcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIkV4dHJhdmVyc2lvbl9wbHVzX05ldXJvdGljaXNtX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhwbG9zaXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ3b3JkeVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImV4dHJhdmFnYW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ2b2xhdGlsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImZsaXJ0YXRpb3VzXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJFeHRyYXZlcnNpb25fcGx1c19PcGVubmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInZlcmJvc2VcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuc2NydXB1bG91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9tcG91c1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiRXh0cmF2ZXJzaW9uX3BsdXNfT3Blbm5lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJleHByZXNzaXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY2FuZGlkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZHJhbWF0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzcG9udGFuZW91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIndpdHR5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwib3Bwb3J0dW5pc3RpY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluZGVwZW5kZW50XCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJOZXVyb3RpY2lzbV9taW51c19BZ3JlZWFibGVuZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5lbW90aW9uYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluc2Vuc2l0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmFmZmVjdGlvbmF0ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGFzc2lvbmxlc3NcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk5ldXJvdGljaXNtX21pbnVzX0FncmVlYWJsZW5lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwYXRpZW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmVsYXhlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuZGVtYW5kaW5nXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZG93bi10by1lYXJ0aFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm9wdGltaXN0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb25jZWl0bGVzc1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuY3JpdGljYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bnByZXRlbnRpb3VzXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJOZXVyb3RpY2lzbV9taW51c19Db25zY2llbnRpb3VzbmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbmZvcm1hbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImxvdy1rZXlcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk5ldXJvdGljaXNtX21pbnVzX0NvbnNjaWVudGlvdXNuZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmF0aW9uYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJvYmplY3RpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzdGVhZHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJsb2dpY2FsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVjaXNpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwb2lzZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb25jaXNlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGhvcm91Z2hcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJlY29ub21pY2FsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VsZi1kaXNjaXBsaW5lZFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiTmV1cm90aWNpc21fbWludXNfRXh0cmF2ZXJzaW9uX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuYXNzdW1pbmdcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuZXhjaXRhYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGxhY2lkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidHJhbnF1aWxcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk5ldXJvdGljaXNtX21pbnVzX0V4dHJhdmVyc2lvbl9wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuc2VsZmNvbnNjaW91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIndlYXJpbGVzc1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluZGVmYXRpZ2FibGVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk5ldXJvdGljaXNtX21pbnVzX09wZW5uZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImltcGVydHVyYmFibGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluc2Vuc2l0aXZlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJOZXVyb3RpY2lzbV9taW51c19PcGVubmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImhlYXJ0ZmVsdFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInZlcnNhdGlsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNyZWF0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW50ZWxsZWN0dWFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5zaWdodGZ1bFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiTmV1cm90aWNpc21fcGx1c19BZ3JlZWFibGVuZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGVtcGVyYW1lbnRhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaXJyaXRhYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJxdWFycmVsc29tZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1wYXRpZW50XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJncnVtcHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNyYWJieVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3Jhbmt5XCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJOZXVyb3RpY2lzbV9wbHVzX0FncmVlYWJsZW5lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJlbW90aW9uYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImd1bGxpYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYWZmZWN0aW9uYXRlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2Vuc2l0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic29mdFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiTmV1cm90aWNpc21fcGx1c19Db25zY2llbnRpb3VzbmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbXB1bHNpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIm5vc2V5XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZWxmLWluZHVsZ2VudFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZm9yZ2V0ZnVsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbXB1bHNpdmVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk5ldXJvdGljaXNtX3BsdXNfQ29uc2NpZW50aW91c25lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwYXJ0aWN1bGFyXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJoaWdoLXN0cnVuZ1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiTmV1cm90aWNpc21fcGx1c19FeHRyYXZlcnNpb25fbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ3VhcmRlZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZnJldGZ1bFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5zZWN1cmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInBlc3NpbWlzdGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VjcmV0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmZWFyZnVsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJuZWdhdGl2aXN0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZWxmLWNyaXRpY2FsXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJOZXVyb3RpY2lzbV9wbHVzX0V4dHJhdmVyc2lvbl9wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImV4Y2l0YWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwid29yZHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmbGlydGF0aW91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhwbG9zaXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXh0cmF2YWdhbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInZvbGF0aWxlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJOZXVyb3RpY2lzbV9wbHVzX09wZW5uZXNzX21pbnVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImVhc2lseSByYXR0bGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZWFzaWx5IGlya2VkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXBwcmVoZW5zaXZlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJOZXVyb3RpY2lzbV9wbHVzX09wZW5uZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhjaXRhYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGFzc2lvbmF0ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlbnN1YWxcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk9wZW5uZXNzX21pbnVzX0FncmVlYWJsZW5lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjb2Fyc2VcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRhY3RsZXNzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjdXJ0XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJuYXJyb3ctbWluZGVkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJjYWxsb3VzXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJPcGVubmVzc19taW51c19BZ3JlZWFibGVuZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzaW1wbGVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRlcGVuZGVudFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiT3Blbm5lc3NfbWludXNfQ29uc2NpZW50aW91c25lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzaG9ydHNpZ2h0ZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJmb29saGFyZHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImlsbG9naWNhbFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1tYXR1cmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImhhcGhhemFyZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImxheFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZmxpcHBhbnRcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk9wZW5uZXNzX21pbnVzX0NvbnNjaWVudGlvdXNuZXNzX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29udmVudGlvbmFsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidHJhZGl0aW9uYWxcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk9wZW5uZXNzX21pbnVzX0V4dHJhdmVyc2lvbl9taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJwcmVkaWN0YWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5pbWFnaW5hdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNvbWJlclwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXBhdGhldGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ1bmFkdmVudHVyb3VzXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJPcGVubmVzc19taW51c19FeHRyYXZlcnNpb25fcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInZlcmJvc2VcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInVuc2NydXB1bG91c1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9tcG91c1wiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiT3Blbm5lc3NfbWludXNfTmV1cm90aWNpc21fbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1wZXJ0dXJiYWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5zZW5zaXRpdmVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk9wZW5uZXNzX21pbnVzX05ldXJvdGljaXNtX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZWFzaWx5IHJhdHRsZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJlYXNpbHkgaXJrZWRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhcHByZWhlbnNpdmVcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk9wZW5uZXNzX3BsdXNfQWdyZWVhYmxlbmVzc19taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzaHJld2RcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJlY2NlbnRyaWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbmRpdmlkdWFsaXN0aWNcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk9wZW5uZXNzX3BsdXNfQWdyZWVhYmxlbmVzc19wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImlkZWFsaXN0aWNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJkaXBsb21hdGljXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVlcFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInRhY3RmdWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJnZW5pYWxcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk9wZW5uZXNzX3BsdXNfQ29uc2NpZW50aW91c25lc3NfbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5jb252ZW50aW9uYWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJxdWlya3lcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk9wZW5uZXNzX3BsdXNfQ29uc2NpZW50aW91c25lc3NfcGx1c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJhbmFseXRpY2FsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVyY2VwdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImluZm9ybWF0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXJ0aWN1bGF0ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImRpZ25pZmllZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImN1bHR1cmVkXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJPcGVubmVzc19wbHVzX0V4dHJhdmVyc2lvbl9taW51c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbnRyb3NwZWN0aXZlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwibWVkaXRhdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImNvbnRlbXBsYXRpbmdcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJzZWxmLWV4YW1pbmluZ1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImlubmVyLWRpcmVjdGVkXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJPcGVubmVzc19wbHVzX0V4dHJhdmVyc2lvbl9wbHVzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcIndvcmxkbHlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJ0aGVhdHJpY2FsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZWxvcXVlbnRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbnF1aXNpdGl2ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImludGVuc2VcIlxuICAgICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIk9wZW5uZXNzX3BsdXNfTmV1cm90aWNpc21fbWludXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3JlYXRpdmVcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbnRlbGxlY3R1YWxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgICBcIndvcmRcIjogXCJpbnNpZ2h0ZnVsXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmVyc2F0aWxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW52ZW50aXZlXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJPcGVubmVzc19wbHVzX05ldXJvdGljaXNtX3BsdXNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGFzc2lvbmF0ZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcImV4Y2l0YWJsZVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICAgIFwid29yZFwiOiBcInNlbnN1YWxcIlxuICAgICAgICAgIH1cbiAgICAgIF1cbiAgfSxcbiAgXCJ2YWx1ZXNcIjoge1xuICAgICAgXCJIZWRvbmlzbVwiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJUYWtpbmcgcGxlYXN1cmUgaW4gbGlmZVwiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IHByZWZlciBhY3Rpdml0aWVzIHdpdGggYSBwdXJwb3NlIGdyZWF0ZXIgdGhhbiBqdXN0IHBlcnNvbmFsIGVuam95bWVudFwiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgaGlnaGx5IG1vdGl2YXRlZCB0byBlbmpveSBsaWZlIHRvIGl0cyBmdWxsZXN0XCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJTZWxmLXRyYW5zY2VuZGVuY2VcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiSGVscGluZyBvdGhlcnNcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSB0aGluayBwZW9wbGUgY2FuIGhhbmRsZSB0aGVpciBvd24gYnVzaW5lc3Mgd2l0aG91dCBpbnRlcmZlcmVuY2VcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgdGhpbmsgaXQgaXMgaW1wb3J0YW50IHRvIHRha2UgY2FyZSBvZiB0aGUgcGVvcGxlIGFyb3VuZCB5b3VcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJGYWlybmVzc1wiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGJlbGlldmUgdGhhdCBwZW9wbGUgY3JlYXRlIHRoZWlyIG93biBvcHBvcnR1bml0aWVzXCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGJlbGlldmUgaW4gc29jaWFsIGp1c3RpY2UgYW5kIGVxdWFsaXR5IGZvciBhbGxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJTb2NpYWwganVzdGljZVwiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGJlbGlldmUgdGhhdCBwZW9wbGUgY3JlYXRlIHRoZWlyIG93biBvcHBvcnR1bml0aWVzXCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGJlbGlldmUgaW4gc29jaWFsIGp1c3RpY2UgYW5kIGVxdWFsaXR5IGZvciBhbGxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJFcXVhbGl0eVwiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGJlbGlldmUgdGhhdCBwZW9wbGUgY3JlYXRlIHRoZWlyIG93biBvcHBvcnR1bml0aWVzXCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGJlbGlldmUgaW4gc29jaWFsIGp1c3RpY2UgYW5kIGVxdWFsaXR5IGZvciBhbGxcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJDb21tdW5pdHkgc2VydmljZVwiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IHRoaW5rIHBlb3BsZSBjYW4gaGFuZGxlIHRoZWlyIG93biBidXNpbmVzcyB3aXRob3V0IGludGVyZmVyZW5jZVwiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSB0aGluayBpdCBpcyBpbXBvcnRhbnQgdG8gdGFrZSBjYXJlIG9mIHRoZSBwZW9wbGUgYXJvdW5kIHlvdVwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiQ29uc2VydmF0aW9uXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIlRyYWRpdGlvblwiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGNhcmUgbW9yZSBhYm91dCBtYWtpbmcgeW91ciBvd24gcGF0aCB0aGFuIGZvbGxvd2luZyB3aGF0IG90aGVycyBoYXZlIGRvbmVcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgaGlnaGx5IHJlc3BlY3QgdGhlIGdyb3VwcyB5b3UgYmVsb25nIHRvIGFuZCBmb2xsb3cgdGhlaXIgZ3VpZGFuY2VcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJIYXJtb255XCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgZGVjaWRlIHdoYXQgaXMgcmlnaHQgYmFzZWQgb24geW91ciBiZWxpZWZzLCBub3Qgd2hhdCBvdGhlciBwZW9wbGUgdGhpbmtcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3Uga25vdyBydWxlcyBhcmUgdGhlcmUgZm9yIGEgcmVhc29uLCBhbmQgeW91IHRyeSBuZXZlciB0byBicmVhayB0aGVtXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiSHVtaWxpdHlcIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBkZWNpZGUgd2hhdCBpcyByaWdodCBiYXNlZCBvbiB5b3VyIGJlbGllZnMsIG5vdCB3aGF0IG90aGVyIHBlb3BsZSB0aGlua1wiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBzZWUgd29ydGggaW4gZGVmZXJyaW5nIHRvIG90aGVyc1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIlNvY2lhbCBub3Jtc1wiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGRlY2lkZSB3aGF0IGlzIHJpZ2h0IGJhc2VkIG9uIHlvdXIgYmVsaWVmcywgbm90IHdoYXQgb3RoZXIgcGVvcGxlIHRoaW5rXCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGtub3cgcnVsZXMgYXJlIHRoZXJlIGZvciBhIHJlYXNvbiwgYW5kIHlvdSB0cnkgbmV2ZXIgdG8gYnJlYWsgdGhlbVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIlNlY3VyaXR5XCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgYmVsaWV2ZSB0aGF0IHNlY3VyaXR5IGlzIHdvcnRoIHNhY3JpZmljaW5nIHRvIGFjaGlldmUgb3RoZXIgZ29hbHNcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYmVsaWV2ZSB0aGF0IHNhZmV0eSBhbmQgc2VjdXJpdHkgYXJlIGltcG9ydGFudCB0aGluZ3MgdG8gc2FmZWd1YXJkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiU2FmZXR5XCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgYmVsaWV2ZSB0aGF0IHNhZmV0eSBpcyB3b3J0aCBzYWNyaWZpY2luZyB0byBhY2hpZXZlIG90aGVyIGdvYWxzXCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGJlbGlldmUgdGhhdCBzYWZldHkgYW5kIHNlY3VyaXR5IGFyZSBpbXBvcnRhbnQgdGhpbmdzIHRvIHNhZmVndWFyZFwiXG4gICAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiT3Blbm5lc3MtdG8tY2hhbmdlXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIkluZGVwZW5kZW5jZVwiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IHdlbGNvbWUgd2hlbiBvdGhlcnMgZGlyZWN0IHlvdXIgYWN0aXZpdGllcyBmb3IgeW91XCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGxpa2UgdG8gc2V0IHlvdXIgb3duIGdvYWxzIHRvIGRlY2lkZSBob3cgdG8gYmVzdCBhY2hpZXZlIHRoZW1cIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBcIlRlcm1cIjogXCJFeGNpdGVtZW50XCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3Ugd291bGQgcmF0aGVyIHN0aWNrIHdpdGggdGhpbmdzIHlvdSBhbHJlYWR5IGtub3cgeW91IGxpa2UgdGhhbiByaXNrIHRyeWluZyBzb21ldGhpbmcgbmV3IGFuZCByaXNreVwiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgZWFnZXIgdG8gc2VhcmNoIG91dCBuZXcgYW5kIGV4Y2l0aW5nIGV4cGVyaWVuY2VzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiQ3JlYXRpdml0eVwiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IHdvdWxkIHJhdGhlciBzdGljayB3aXRoIHRoaW5ncyB5b3UgYWxyZWFkeSBrbm93IHlvdSBsaWtlIHRoYW4gcmlzayB0cnlpbmcgc29tZXRoaW5nIG5ldyBhbmQgcmlza3lcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGVhZ2VyIHRvIHNlYXJjaCBvdXQgbmV3IGFuZCBleGNpdGluZyBleHBlcmllbmNlc1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIkN1cmlvc2l0eVwiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IHdvdWxkIHJhdGhlciBzdGljayB3aXRoIHRoaW5ncyB5b3UgYWxyZWFkeSBrbm93IHlvdSBsaWtlIHRoYW4gcmlzayB0cnlpbmcgc29tZXRoaW5nIG5ldyBhbmQgcmlza3lcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgYXJlIGVhZ2VyIHRvIHNlYXJjaCBvdXQgbmV3IGFuZCBleGNpdGluZyBleHBlcmllbmNlc1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIlNlbGYtZGlyZWN0aW9uXCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3Ugd2VsY29tZSB3aGVuIG90aGVycyBkaXJlY3QgeW91ciBhY3Rpdml0aWVzIGZvciB5b3VcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgbGlrZSB0byBzZXQgeW91ciBvd24gZ29hbHMgdG8gZGVjaWRlIGhvdyB0byBiZXN0IGFjaGlldmUgdGhlbVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIkZyZWVkb21cIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSB3ZWxjb21lIHdoZW4gb3RoZXJzIGRpcmVjdCB5b3VyIGFjdGl2aXRpZXMgZm9yIHlvdVwiLFxuICAgICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIllvdSBsaWtlIHRvIHNldCB5b3VyIG93biBnb2FscyB0byBkZWNpZGUgaG93IHRvIGJlc3QgYWNoaWV2ZSB0aGVtXCJcbiAgICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJTZWxmLWVuaGFuY2VtZW50XCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIkFjaGlldmluZyBzdWNjZXNzXCIsXG4gICAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJZb3UgbWFrZSBkZWNpc2lvbnMgd2l0aCBsaXR0bGUgcmVnYXJkIGZvciBob3cgdGhleSBzaG93IG9mZiB5b3VyIHRhbGVudHNcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3Ugc2VlayBvdXQgb3Bwb3J0dW5pdGllcyB0byBpbXByb3ZlIHlvdXJzZWxmIGFuZCBkZW1vbnN0cmF0ZSB0aGF0IHlvdSBhcmUgYSBjYXBhYmxlIHBlcnNvblwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiVGVybVwiOiBcIkdhaW5pbmcgc29jaWFsIHN0YXR1c1wiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IGFyZSBjb21mb3J0YWJsZSB3aXRoIHlvdXIgc29jaWFsIHN0YXR1cyBhbmQgZG9uJ3QgZmVlbCBhIHN0cm9uZyBuZWVkIHRvIGltcHJvdmUgaXRcIixcbiAgICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJZb3UgcHV0IHN1YnN0YW50aWFsIGVmZm9ydCBpbnRvIGltcHJvdmluZyB5b3VyIHN0YXR1cyBhbmQgcHVibGljIGltYWdlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiQW1iaXRpb25cIixcbiAgICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIllvdSBhcmUgY29tZm9ydGFibGUgd2l0aCB5b3VyIHNvY2lhbCBzdGF0dXMgYW5kIGRvbid0IGZlZWwgYSBzdHJvbmcgbmVlZCB0byBpbXByb3ZlIGl0XCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IGZlZWwgaXQgaXMgaW1wb3J0YW50IHRvIHB1c2ggZm9yd2FyZCB0b3dhcmRzIGdvYWxzXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJUZXJtXCI6IFwiSGlnaCBhY2hpZXZlbWVudFwiLFxuICAgICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiWW91IG1ha2UgZGVjaXNpb25zIHdpdGggbGl0dGxlIHJlZ2FyZCBmb3IgaG93IHRoZXkgc2hvdyBvZmYgeW91ciB0YWxlbnRzXCIsXG4gICAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiWW91IHNlZWsgb3V0IG9wcG9ydHVuaXRpZXMgdG8gaW1wcm92ZSB5b3Vyc2VsZiBhbmQgZGVtb25zdHJhdGUgdGhhdCB5b3UgYXJlIGEgY2FwYWJsZSBwZXJzb25cIlxuICAgICAgICAgIH1cbiAgICAgIF1cbiAgfVxufVxuIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxNSBJQk0gQ29ycC4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBcImZhY2V0c1wiOntcbiAgICBcIkFydGlzdGljLWludGVyZXN0c1wiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJVbmEgcGVyc29uYSBxdWUgYXByZWNpYSBlbCBhcnRlXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkFwZXJ0dXJhIGEgZXhwZXJpZW5jaWFzXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiRGlzZnJ1dGEgZGUgbGEgYmVsbGV6YSB5IGJ1c2NhIGV4cGVyaWVuY2lhcyBjcmVhdGl2YXNcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkxlIGludGVyZXNhbiBtZW5vcyBsYXMgYWN0aXZpZGFkZXMgYXJ0w61zdGljYXMgbyBjcmVhdGl2YXMgcXVlIGxhIG1heW9yw61hIGRlIGxhcyBwZXJzb25hcyBxdWUgcGFydGljaXBhcm9uIGRlIG51ZXN0cmFzIGVuY3Vlc3Rhc1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJVbmEgcGVyc29uYSBkZXNpbnRlcmVzYWRhIHBvciBlbCBhcnRlXCJcbiAgICB9LFxuICAgIFwiRHV0aWZ1bG5lc3NcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiVW5hIHBlcnNvbmEgcXVlIGN1bXBsZSBjb24gc3UgZGViZXJcIixcbiAgICAgICAgXCJCaWc1XCI6IFwiUmVzcG9uc2FiaWxpZGFkXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiVG9tYSBsYXMgcmVnbGFzIHkgbGFzIG9ibGlnYWNpb25lcyBzZXJpYW1lbnRlLCBhw7puIGN1YW5kbyBzb24gaW5jb252ZW5pZW50ZXNcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkhhY2UgbG8gcXVlIHF1aWVyZSBzaW4gaW1wb3J0YXIgbGFzIHJlZ2xhcyB5IGxhcyBvYmxpZ2FjaW9uZXNcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiRGVzcHJlb2N1cGFkb1wiXG4gICAgfSxcbiAgICBcIkNvb3BlcmF0aW9uXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIkFjb21vZGF0aWNpb1wiLFxuICAgICAgICBcIkJpZzVcIjogXCJBZmFiaWxpZGFkXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiRXMgZsOhY2lsIGRlIGNvbXBsYWNlciBlIGludGVudGEgZXZpdGFyIHBvc2libGVzIGNvbmZyb250YWNpb25lc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiTm8gdGUgaW1wb3J0YSBjb250cmFkZWNpciBhIGxvcyBkZW3DoXNcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiQ29udHJhcmlvXCJcbiAgICB9LFxuICAgIFwiU2VsZi1jb25zY2lvdXNuZXNzXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIkNvbnNjaWVudGUgZGUgc8OtIG1pc21vXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIlJhbmdvIGVtb2Npb25hbFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkVzIHNlbnNpYmxlIGEgbG8gcXVlIGxhcyBkZW3DoXMgcGVyc29uYXMgcG9kcsOtYW4gZXN0YXIgcGVuc2FuZG8gYWNlcmNhIGRlIHVzdGVkXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJFcyBkaWbDrWNpbCBkZSBhdmVyZ29uemFyIHkgY29uZsOtYSBlbiBzw60gbWlzbW8gbGEgbWF5b3IgcGFydGUgZGVsIHRpZW1wb1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJDb25maWFkb1wiXG4gICAgfSxcbiAgICBcIk9yZGVybGluZXNzXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIk9yZ2FuaXphZG9cIixcbiAgICAgICAgXCJCaWc1XCI6IFwiUmVzcG9uc2FiaWxpZGFkXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiU2llbnRlIHVuYSBmdWVydGUgbmVjZXNpZGFkIGRlIG1hbnRlbmVyIHVuYSB2aWRhIGVzdHJ1Y3R1cmFkYVwiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiTm8gbGUgZGVkaWNhIG11Y2hvIHRpZW1wbyBhIG9yZ2FuaXphcnNlIGVuIHN1IHZpZGEgZGlhcmlhXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIkRlc2VzdHJ1Y3R1cmFkb1wiXG4gICAgfSxcbiAgICBcIlN5bXBhdGh5XCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIkVtcMOhdGljb1wiLFxuICAgICAgICBcIkJpZzVcIjogXCJBZmFiaWxpZGFkXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiU2llbnRlIGxvIHF1ZSBvdHJvcyBzaWVudGVuIHkgZXMgY29tcGFzaXZvIGNvbiBlbGxvc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiQ3JlZSBxdWUgbGFzIHBlcnNvbmFzIGRlYmVyw61hbiBjb25maWFyIG3DoXMgZW4gc8OtIG1pc21vcyBxdWUgZW4gb3RyYXMgcGVyc29uYXNcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiVW5hIHBlcnNvbmEgZGUgZ3JhbiBmb3J0YWxlemFcIlxuICAgIH0sXG4gICAgXCJBY3Rpdml0eS1sZXZlbFwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJFbmVyZ8OpdGljb1wiLFxuICAgICAgICBcIkJpZzVcIjogXCJFeHRyYXZlcnNpw7NuXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiRGlzZnJ1dGEgbGxldmFyIHVuIHJpdG1vIGRlIHZpZGEgYWNlbGVyYWRvLCB1bmEgYWdlbmRhIG9jdXBhZGEgY29uIG11Y2hhcyBhY3RpdmlkYWRlc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiQXByZWNpYSBsbGV2YXIgdW4gcml0bW8gZGUgdmlkYSByZWxhamFkb1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJSZWxhamFkb1wiXG4gICAgfSxcbiAgICBcIlNlbGYtZWZmaWNhY3lcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiU2VndXJvIGRlIHPDrSBtaXNtb1wiLFxuICAgICAgICBcIkJpZzVcIjogXCJSZXNwb25zYWJpbGlkYWRcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJTaWVudGUgcXVlIHRpZW5lIGxhIGhhYmlsaWRhZCBkZSB0cml1bmZhciBlbiBsYXMgdGFyZWFzIHF1ZSBzZSBwcm9wb25lIHJlYWxpemFyXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJGcmVjdWVudGVtZW50ZSBkdWRhIGFjZXJjYSBkZSBzdSBoYWJpbGlkYWQgcGFyYSBhbGNhbnphciBzdXMgbWV0YXNcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiSW5zZWd1cm8gZGUgc8OtIG1pc21hXCJcbiAgICB9LFxuICAgIFwiU2VsZi1kaXNjaXBsaW5lXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIlBlcnNpc3RlbnRlXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIlJlc3BvbnNhYmlsaWRhZFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlB1ZWRlIGhhY2VyIGZyZW50ZSB5IGxsZXZhciBhIGNhYm8gdGFyZWFzIGRpZsOtY2lsZXNcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkxlIGRhIHRyYWJham8gbGxldmFyIGFkZWxhbnRlIHRhcmVhcyBkaWbDrWNpbGVzIHBvciB1biBsYXJnbyBwZXJpb2RvIGRlIHRpZW1wb1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJJbnRlcm1pdGVudGVcIlxuICAgIH0sXG4gICAgXCJBbHRydWlzbVwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJBbHRydWlzdGFcIixcbiAgICAgICAgXCJCaWc1XCI6IFwiQWZhYmlsaWRhZFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlNlIHNpZW50ZSByZWFsaXphZG8gYXl1ZGFuZG8gYSBvdHJvcyB5IGRlamFyw6Egc3VzIGNvc2FzIGRlIGxhZG8gcGFyYSBoYWNlcmxvXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJFc3TDoSBtw6FzIGVuZm9jYWRvIGVuIGN1aWRhciBkZSB1c3RlZCBtaXNtbyBxdWUgZW4gZGVkaWNhciB0aWVtcG8gYSBvdHJhcyBwZXJzb25hc1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJJbmRpdmlkdWFsaXN0YVwiXG4gICAgfSxcbiAgICBcIkNhdXRpb3VzbmVzc1wiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJQcnVkZW50ZVwiLFxuICAgICAgICBcIkJpZzVcIjogXCJSZXNwb25zYWJpbGlkYWRcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJQaWVuc2EgY3VpZGFkb3NhbWVudGUgYWNlcmNhIGRlIHN1cyBkZWNpc2lvbmVzIGFudGVzIGRlIHRvbWFybGFzXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJQcmVmaWVyZSB0b21hciBhY2Npw7NuIGlubWVkaWF0YW1lbnRlIGFudGVzIHF1ZSBpbnZlcnRpciB0aWVtcG8gZGVsaWJlcmFuZG8gcXXDqSBkZWNpc2nDs24gdG9tYXJcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiQXVkYXpcIlxuICAgIH0sXG4gICAgXCJNb3JhbGl0eVwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJJbnRyYW5zaWdlbnRlXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkFmYWJpbGlkYWRcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJQaWVuc2EgcXVlIGVzdMOhIG1hbCB0b21hciB2ZW50YWphIGRlIGxvcyBkZW3DoXMgcGFyYSBhdmFuemFyXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJVdGlsaXphIGN1YWxxdWllciBtZWRpbyBwb3NpYmxlIHBhcmEgY29uc2VndWlyIGxvIHF1ZSBxdWllcmUgeSBlc3TDoSBjw7Ntb2RvIGNvbiBlbGxvXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIlVuYSBwZXJzb25hIGNvbXByb21ldGlkYVwiXG4gICAgfSxcbiAgICBcIkFueGlldHlcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiUHJvcGVuc28gYSBwcmVvY3VwYXJzZVwiLFxuICAgICAgICBcIkJpZzVcIjogXCJSYW5nbyBlbW9jaW9uYWxcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJUaWVuZGUgYSBwcmVvY3VwYXJzZSBhY2VyY2EgZGUgbGFzIGNvc2FzIHF1ZSBwb2Ryw61hbiBwYXNhclwiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiVGllbmRlIGEgc2VudGlyc2UgdHJhbnF1aWxvIHkgYSBjb25maWFyIGVuIHPDrSBtaXNtb1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJTZWd1cm8gZGUgc8OtIG1pc21vXCJcbiAgICB9LFxuICAgIFwiRW1vdGlvbmFsaXR5XCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIkVtb2Npb25hbG1lbnRlIGNvbnNjaWVudGVcIixcbiAgICAgICAgXCJCaWc1XCI6IFwiQXBlcnR1cmEgYSBleHBlcmllbmNpYXNcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJFcyBjb25zY2llbnRlIGRlIHN1cyBzZW50aW1pZW50b3MgeSBkZSBjw7NtbyBleHByZXNhcmxvc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiTm8gcGllbnNhIGZyZWN1ZW50ZW1lbnRlIGFjZXJjYSBkZSBzdXMgZW1vY2lvbmVzIG5pIGxhcyBleHByZXNhIGFiaWVydGFtZW50ZVwiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJEZXNhcGFzaW9uYWRvXCJcbiAgICB9LFxuICAgIFwiVnVsbmVyYWJpbGl0eVwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJTdXNjZXB0aWJsZSBhbCBlc3Ryw6lzXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIlJhbmdvIGVtb2Npb25hbFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlNlIGFicnVtYSBmw6FjaWxtZW50ZSBlbiBzaXR1YWNpb25lcyBkZSBlc3Ryw6lzXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJNYW5lamEgZXZlbnRvcyBpbmVzcGVyYWRvcyBjb24gY2FsbWEgeSBlZmVjdGl2YW1lbnRlXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIlVuYSBwZXJzb25hIHF1ZSBtYW50aWVuZSBsYSBjYWxtYSBiYWpvIHByZXNpw7NuXCJcbiAgICB9LFxuICAgIFwiSW1tb2RlcmF0aW9uXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIkhlZG9uaXN0YVwiLFxuICAgICAgICBcIkJpZzVcIjogXCJSYW5nbyBlbW9jaW9uYWxcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJTaWVudGUgZnVlcnRlbWVudGUgc3VzIGRlc2VvcyB5IGVzIGbDoWNpbG1lbnRlIHRlbnRhZG8gcG9yIGVsbG9zXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJDb250cm9sYSBzdXMgZGVzZW9zLCBsb3MgY3VhbGVzIG5vIHNvbiBwYXJ0aWN1bGFybWVudGUgaW50ZW5zb3NcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiU2VyZW5vXCJcbiAgICB9LFxuICAgIFwiRnJpZW5kbGluZXNzXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIkV4dHJvdmVydGlkb1wiLFxuICAgICAgICBcIkJpZzVcIjogXCJFeHRyYXZlcnNpw7NuXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiSGFjZSBhbWlnb3MgZsOhY2lsbWVudGUgeSBzZSBzaWVudGUgY8OzbW9kbyBlc3RhbmRvIGNvbiBvdHJhcyBwZXJzb25hc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiRXMgdW5hIHBlcnNvbmEgcmVzZXJ2YWRhIHkgbm8gZGVqYSBhIG11Y2hhcyBwZXJzb25hcyBlbnRyYXJcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiUmVzZXJ2YWRvXCJcbiAgICB9LFxuICAgIFwiQWNoaWV2ZW1lbnQtc3RyaXZpbmdcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiVW5hIHBlcnNvbmEgbW90aXZhZGFcIixcbiAgICAgICAgXCJCaWc1XCI6IFwiUmVzcG9uc2FiaWxpZGFkXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiU2UgcHJvcG9uZSBncmFuZGVzIG1ldGFzIHkgdHJhYmFqYSBkdXJvIHBhcmEgYWxjYW56YXJsYXNcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkVzdMOhIGNvbmZvcm1lIGNvbiBzdXMgbG9ncm9zIHkgbm8gc2llbnRlIGxhIG5lY2VzaWRhZCBkZSBwb25lcnNlIG1ldGFzIG3DoXMgYW1iaWNpb3Nhc1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJVbmEgcGVyc29uYSBzYXRpc2ZlY2hhXCJcbiAgICB9LFxuICAgIFwiTW9kZXN0eVwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJNb2Rlc3RvXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkFmYWJpbGlkYWRcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJTZSBzaWVudGUgY8OzbW9kbyBzaWVuZG8gZWwgY2VudHJvIGRlIGF0ZW5jacOzblwiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiU2UgdGllbmUgdW5hIGVzdGltYSBhbHRhLCBzZSBlbmN1ZW50cmEgc2F0aXNmZWNobyBjb24gcXVpw6luIGVzXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIk9yZ3VsbG9zb1wiXG4gICAgfSxcbiAgICBcIkV4Y2l0ZW1lbnQtc2Vla2luZ1wiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJVbmEgcGVyc29uYSBxdWUgYnVzY2EgbGEgZW1vY2nDs25cIixcbiAgICAgICAgXCJCaWc1XCI6IFwiRXh0cmF2ZXJzacOzblwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkxlIGVtb2Npb25hIHRvbWFyIHJpZXNnb3MgeSBzZSBhYnVycmUgc2kgbm8gc2UgdmUgZW52dWVsdG8gZW4gbXVjaGEgYWNjacOzblwiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiUHJlZmllcmUgbGFzIGFjdGl2aWRhZGVzIHRyYW5xdWlsYXMsIHBhY8OtZmljYXMgeSBzZWd1cmFzXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIlVuYSBwZXJzb25hIHF1ZSBidXNjYSBsYSBjYWxtYVwiXG4gICAgfSxcbiAgICBcIkFzc2VydGl2ZW5lc3NcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiQXNlcnRpdm9cIixcbiAgICAgICAgXCJCaWc1XCI6IFwiRXh0cmF2ZXJzacOzblwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlRpZW5kZSBhIGV4cHJlc2Fyc2UgeSBhIGhhY2Vyc2UgY2FyZ28gZGUgbGFzIHNpdHVhY2lvbmVzLCB5IHNlIGVuY3VlbnRyYSBjw7Ntb2RvIGxpZGVyYW5kbyBncnVwb3NcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlByZWZpZXJlIGVzY3VjaGFyIGFudGVzIHF1ZSBoYWJsYXIsIGVzcGVjaWFsbWVudGUgZW4gc2l0dWFjaW9uZXMgZGUgZ3J1cG9cIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiQ2FsbGFkb1wiXG4gICAgfSxcbiAgICBcIkFkdmVudHVyb3VzbmVzc1wiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJBdWRhelwiLFxuICAgICAgICBcIkJpZzVcIjogXCJBcGVydHVyYSBhIGV4cGVyaWVuY2lhc1wiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkVzdMOhIGRlc2Vvc28gZGUgdGVuZXIgbnVldmFzIGV4cGVyaWVuY2lhc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiRGlzZnJ1dGEgZGUgbGFzIHJ1dGluYXMgZmFtaWxpYXJlcyB5IHByZWZpZXJlIG5vIGRlc3ZpYXJzZSBkZSBlbGxhc1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJDb25zaXN0ZW50ZVwiXG4gICAgfSxcbiAgICBcIkdyZWdhcmlvdXNuZXNzXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIlNvY2lhYmxlXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkV4dHJhdmVyc2nDs25cIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJEaXNmcnV0YSBlc3RhbmRvIGVuIGNvbXBhw7HDrWEgZGUgb3Ryb3NcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlRpZW5lIHVuIGZ1ZXJ0ZSBkZXNlbyBkZSB0ZW5lciB0aWVtcG8gcGFyYSB1c3RlZCBtaXNtb1wiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJJbmRlcGVuZGllbnRlXCJcbiAgICB9LFxuICAgIFwiQ2hlZXJmdWxuZXNzXCI6IHtcbiAgICAgICAgXCJIaWdoVGVybVwiOiBcIkFsZWdyZVwiLFxuICAgICAgICBcIkJpZzVcIjogXCJFeHRyYXZlcnNpw7NuXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiRXMgdW5hIHBlcnNvbmEgYWxlZ3JlIHkgY29tcGFydGUgZXNhIGFsZWdyw61hIGNvbiBlbCBtdW5kb1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiR2VuZXJhbG1lbnRlIGVzIHNlcmlvIHkgbm8gaGFjZSBtdWNoYXMgYnJvbWFzXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIlNvbGVtbmVcIlxuICAgIH0sXG4gICAgXCJJbWFnaW5hdGlvblwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJJbWFnaW5hdGl2b1wiLFxuICAgICAgICBcIkJpZzVcIjogXCJBcGVydHVyYSBhIGV4cGVyaWVuY2lhc1wiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlN1IGltYWdpbmFjacOzbiB2dWVsYSBsaWJyZVwiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiUHJlZmllcmUgaGVjaG9zIGFudGVzIHF1ZSBsYSBmYW50YXPDrWFcIixcbiAgICAgICAgXCJMb3dUZXJtXCI6IFwiVW5hIHBlcnNvbmEgY29uIGxvcyBwaWVzIGVuIGxhIHRpZXJyYVwiXG4gICAgfSxcbiAgICBcIkRlcHJlc3Npb25cIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiTWVsYW5jw7NsaWNvXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIlJhbmdvIGVtb2Npb25hbFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlBpZW5zYSBiYXN0YW50ZSBzZWd1aWRvIGVuIGxhcyBjb3NhcyBjb24gbGFzIHF1ZSBlc3TDoSBkaXNjb25mb3JtZVwiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiR2VuZXJhbG1lbnRlIHNlIGFjZXB0YSBhIHVzdGVkIG1pc21vIHRhbCBjdWFsIGVzXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIlVuYSBwZXJzb25hIHNhdGlzZmVjaGFcIlxuICAgIH0sXG4gICAgXCJBbmdlclwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJJbnRlbnNvXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIlJhbmdvIGVtb2Npb25hbFwiLFxuICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlRpZW5lIHVuIHRlbXBlcmFtZW50byBmdWVydGUsIGVzcGVjaWFsbWVudGUgY3VhbmRvIGxhcyBjb3NhcyBubyBmdW5jaW9uYW4gY29tbyBlc3BlcmFcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkVzIGRpZsOtY2lsIGhhY2VybGUgZW5vamFyXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIkFwYWNpYmxlXCJcbiAgICB9LFxuICAgIFwiVHJ1c3RcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiVW5hIHBlcnNvbmEgcXVlIGNvbmbDrWEgZW4gbG9zIGRlbcOhc1wiLFxuICAgICAgICBcIkJpZzVcIjogXCJBZmFiaWxpZGFkXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiQ3JlZSBsbyBtZWpvciBkZSBsb3MgZGVtw6FzIHkgY29uZsOtYSBmw6FjaWxtZW50ZSBlbiBsYXMgcGVyc29uYXNcIixcbiAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlNlIGN1aWRhIGRlIGxhcyBpbnRlbmNpb25lcyBkZSBsb3MgZGVtw6FzIHkgbm8gY29uZsOtYSBmw6FjaWxtZW50ZVwiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJDdWlkYWRvc28gY29uIGxvcyBkZW3DoXNcIlxuICAgIH0sXG4gICAgXCJJbnRlbGxlY3RcIjoge1xuICAgICAgICBcIkhpZ2hUZXJtXCI6IFwiRmlsb3PDs2ZpY29cIixcbiAgICAgICAgXCJCaWc1XCI6IFwiQXBlcnR1cmEgYSBleHBlcmllbmNpYXNcIixcbiAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJFc3TDoSBhYmllcnRvIGEgbnVldmFzIGlkZWFzLCBsZSBpbnRyaWdhbiB5IGFtYSBleHBsb3Jhcmxhc1wiLFxuICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiUHJlZmllcmUgbGlkaWFyIGNvbiBlbCBtdW5kbyB0YWwgY3VhbCBlcywgcmFyYW1lbnRlIGNvbnNpZGVyYW5kbyBpZGVhcyBhYnN0cmFjdGFzXCIsXG4gICAgICAgIFwiTG93VGVybVwiOiBcIkNvbmNyZXRvXCJcbiAgICB9LFxuICAgIFwiTGliZXJhbGlzbVwiOiB7XG4gICAgICAgIFwiSGlnaFRlcm1cIjogXCJEZXNhZmlhbnRlIGFudGUgbGEgYXV0b3JpZGFkXCIsXG4gICAgICAgIFwiQmlnNVwiOiBcIkFwZXJ0dXJhIGEgZXhwZXJpZW5jaWFzXCIsXG4gICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiUHJlZmllcmUgZGVzYWZpYXIgYSBsYSBhdXRvcmlkYWQgeSAgYSBsb3MgdmFsb3JlcyB0cmFkaWNpb25hbGVzIHBhcmEgbG9ncmFyIGNhbWJpb3MgcG9zaXRpdm9zXCIsXG4gICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJQcmVmaWVyZSBzZWd1aXIgdHJhZGljaW9uZXMgcGFyYSBtYW50ZW5lciB1bmEgc2Vuc2FjacOzbiBkZSBlc3RhYmlsaWRhZFwiLFxuICAgICAgICBcIkxvd1Rlcm1cIjogXCJSZXNwZXR1b3NvIGRlIGxhIGF1dG9yaWRhZFwiXG4gICAgfVxuICB9LFxuICBcIm5lZWRzXCI6IHtcbiAgICBcIlN0YWJpbGl0eVwiOiBbXG4gICAgICAgIFwiZXN0YWJpbGlkYWRcIixcbiAgICAgICAgXCJhdXRlbnRpY2lkYWRcIixcbiAgICAgICAgXCJpbnRlZ3JpZGFkXCJcbiAgICBdLFxuICAgIFwiUHJhY3RpY2FsaXR5XCI6IFtcbiAgICAgICAgXCJlZmljaWVuY2lhXCIsXG4gICAgICAgIFwicHJhY3RpY2lkYWRcIixcbiAgICAgICAgXCJ2YWxvciBhZ3JlZ2Fkb1wiLFxuICAgICAgICBcImNvbnZlbmllbmNpYVwiXG4gICAgXSxcbiAgICBcIkxvdmVcIjogW1xuICAgICAgICBcImFmaW5pZGFkXCIsXG4gICAgICAgIFwiY29uZXhpw7NuXCJcbiAgICBdLFxuICAgIFwiU2VsZi1leHByZXNzaW9uXCI6IFtcbiAgICAgICAgXCJhdXRvLWV4cHJlc2nDs25cIixcbiAgICAgICAgXCJlbXBvZGVyYW1pZW50byBwZXJzb25hbFwiLFxuICAgICAgICBcImZvcnRhbGV6YSBwZXJzb25hbFwiXG4gICAgXSxcbiAgICBcIkNoYWxsZW5nZVwiOiBbXG4gICAgICAgIFwicHJlc3RpZ2lvXCIsXG4gICAgICAgIFwiY29tcGV0ZW5jaWFcIixcbiAgICAgICAgXCJnbG9yaWFcIlxuICAgIF0sXG4gICAgXCJDbG9zZW5lc3NcIjogW1xuICAgICAgICBcInBlcnRlbmVuY2lhXCIsXG4gICAgICAgIFwibm9zdGFsZ2lhXCIsXG4gICAgICAgIFwiaW50aW1pZGFkXCJcbiAgICBdLFxuICAgIFwiTGliZXJ0eVwiOiBbXG4gICAgICAgIFwibW9kZXJuaWRhZFwiLFxuICAgICAgICBcImV4cGFuc2nDs24gZGUgcG9zaWJpbGlkYWRlc1wiLFxuICAgICAgICBcInBvZGVyIGVzY2FwYXJcIixcbiAgICAgICAgXCJlc3BvbnRhbmVpZGFkXCIsXG4gICAgICAgIFwibm92ZWRhZFwiXG4gICAgXSxcbiAgICBcIkV4Y2l0ZW1lbnRcIjogW1xuICAgICAgICBcInJlZ29jaWpvXCIsXG4gICAgICAgIFwiYW50aWNpcGFjacOzblwiLFxuICAgICAgICBcImNlYnJhY2nDs25cIlxuICAgIF0sXG4gICAgXCJJZGVhbFwiOiBbXG4gICAgICAgIFwic29maXN0aWNhY2nDs25cIixcbiAgICAgICAgXCJlc3Bpcml0dWFsaWRhZFwiLFxuICAgICAgICBcInN1cGVyaW9yaWRhZFwiLFxuICAgICAgICBcInJlYWxpemFjacOzblwiXG4gICAgXSxcbiAgICBcIkhhcm1vbnlcIjogW1xuICAgICAgICBcImJpZW5lc3RhclwiLFxuICAgICAgICBcImNvcnRlc8OtYVwiLFxuICAgICAgICBcImNpdmlsaWRhZFwiXG4gICAgXSxcbiAgICBcIkN1cmlvc2l0eVwiOiBbXG4gICAgICAgIFwiZGVzY3VicmltaWVudG9cIixcbiAgICAgICAgXCJtYWVzdHLDrWFcIixcbiAgICAgICAgXCJhZHF1aXNpY2nDs24gZGUgY29ub2NpbWllbnRvXCJcbiAgICBdLFxuICAgIFwiU3RydWN0dXJlXCI6IFtcbiAgICAgICAgXCJvcmdhbml6YWNpw7NuXCIsXG4gICAgICAgIFwiZnJhbnF1ZXphXCIsXG4gICAgICAgIFwiY2xhcmlkYWRcIixcbiAgICAgICAgXCJjb25maWFiaWxpZGFkXCJcbiAgICBdXG4gIH0sXG4gIFwicGhyYXNlc1wiOiB7XG4gICAgXCJZb3UgYXJlICVzXCI6IFwiVXN0ZWQgZXMgJXNcIixcbiAgICBcIllvdSBhcmUgJXMgYW5kICVzXCI6IFwiVXN0ZWQgZXMgJXMgeSAlc1wiLFxuICAgIFwiWW91IGFyZSAlcywgJXMgYW5kICVzXCI6IFwiVXN0ZWQgZXMgJXMsICVzIHkgJXNcIixcbiAgICBcIkFuZCB5b3UgYXJlICVzXCI6IFwiWSB1c3RlZCBlcyAlc1wiLFxuICAgIFwiWW91IGFyZSByZWxhdGl2ZWx5IHVuY29uY2VybmVkIHdpdGggJXNcIjogXCJVc3RlZCBlcyByZWxhdGl2YW1lbnRlIGluZGlmZXJlbnRlIGNvbiAlc1wiLFxuICAgIFwiWW91IGFyZSByZWxhdGl2ZWx5IHVuY29uY2VybmVkIHdpdGggYm90aCAlcyBhbmQgJXNcIjogXCJVc3RlZCBlcyByZWxhdGl2YW1lbnRlIGluZGlmZXJlbnRlIGNvbiAlcyB5ICVzXCIsXG4gICAgXCJZb3UgZG9uJ3QgZmluZCAlcyB0byBiZSBwYXJ0aWN1bGFybHkgbW90aXZhdGluZyBmb3IgeW91XCI6IFwiVXN0ZWQgbm8gZW5jdWVudHJhIGEgJXMgcGFydGljdWxhcm1lbnRlIG1vdGl2YW50ZSBwYXJhIHVzdGVkXCIsXG4gICAgXCJZb3UgZG9uJ3QgZmluZCBlaXRoZXIgJXMgb3IgJXMgdG8gYmUgcGFydGljdWxhcmx5IG1vdGl2YXRpbmcgZm9yIHlvdVwiOiBcIlVzdGVkIG5vIGVuY3VlbnRyYSBhICVzIG8gJXMgcGFydGljdWxhcm1lbnRlIG1vdGl2YW50ZXMgcGFyYSB1c3RlZFwiLFxuICAgIFwiWW91IHZhbHVlIGJvdGggJXMgYSBiaXRcIjogXCJVc3RlZCB2YWxvcmEgYSAlcyB1biBwb2NvXCIsXG4gICAgXCJZb3UgdmFsdWUgYm90aCAlcyBhbmQgJXMgYSBiaXRcIjogXCJVc3RlZCB2YWxvcmEgYSAlcyB5ICVzIHVuIHBvY29cIixcbiAgICBcIllvdSBjb25zaWRlciAlcyB0byBndWlkZSBhIGxhcmdlIHBhcnQgb2Ygd2hhdCB5b3UgZG9cIiA6IFwiVXN0ZWQgY29uc2lkZXJhIHF1ZSAlcyBsbyBndWlhIGVuIGdyYW4gcGFydGUgZGUgbG8gcXVlIGhhY2VcIixcbiAgICBcIllvdSBjb25zaWRlciBib3RoICVzIGFuZCAlcyB0byBndWlkZSBhIGxhcmdlIHBhcnQgb2Ygd2hhdCB5b3UgZG9cIiA6IFwiVXN0ZWQgY29uc2lkZXJhIHF1ZSAlcyB5ICVzIGxvIGd1aWFuIGVuIGdyYW4gcGFydGUgZGUgbG8gcXVlIGhhY2VcIixcbiAgICBcIkFuZCAlc1wiOiBcIlkgJXNcIixcbiAgICBcIkV4cGVyaWVuY2VzIHRoYXQgbWFrZSB5b3UgZmVlbCBoaWdoICVzIGFyZSBnZW5lcmFsbHkgdW5hcHBlYWxpbmcgdG8geW91XCI6IFwiTm8gbGUgYWdyYWRhbiBsYXMgZXhwZXJpZW5jaWFzIHF1ZSBsZSBkYW4gdW5hIGdyYW4gc2Vuc2FjacOzbiBkZSAlc1wiLFxuICAgIFwiRXhwZXJpZW5jZXMgdGhhdCBnaXZlIGEgc2Vuc2Ugb2YgJXMgaG9sZCBzb21lIGFwcGVhbCB0byB5b3VcIjogXCJMZSBhZ3JhZGFuIGxhcyBleHBlcmllbmNpYXMgcXVlIGxlIGRhbiB1bmEgc2Vuc2FjacOzbiBkZSAlc1wiLFxuICAgIFwiWW91IGFyZSBtb3RpdmF0ZWQgdG8gc2VlayBvdXQgZXhwZXJpZW5jZXMgdGhhdCBwcm92aWRlIGEgc3Ryb25nIGZlZWxpbmcgb2YgJXNcIjogXCJFc3TDoSBtb3RpdmFkbyBhIGJ1c2NhciBleHBlcmllbmNpYXMgcXVlIGxvIHByb3ZlYW4gZGUgdW5hIGZ1ZXJ0ZSBzZW5zYWNpw7NuIGRlICVzXCIsXG4gICAgXCJZb3VyIGNob2ljZXMgYXJlIGRyaXZlbiBieSBhIGRlc2lyZSBmb3IgJXNcIiA6IFwiU3VzIGVsZWNjaW9uZXMgZXN0w6FuIGRldGVybWluYWRhcyBwb3IgdW4gZGVzZW8gZGUgJXNcIixcbiAgICBcImEgYml0ICVzXCI6IFwidW4gcG9jbyAlc1wiLFxuICAgIFwic29tZXdoYXQgJXNcIiA6IFwiYWxnbyAlc1wiLFxuICAgIFwiY2FuIGJlIHBlcmNlaXZlZCBhcyAlc1wiOiBcInB1ZWRlIHNlciBwZXJjaWJpZG8gY29tbyAlc1wiXG4gIH0sXG4gIFwidHJhaXRzXCI6IHtcbiAgICBcIkFncmVlYWJsZW5lc3NfbWludXNfQ29uc2NpZW50aW91c25lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZXNjb25zaWRlcmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlc2NvcnTDqXNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZXNjb25maWFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gY29vcGVyYXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpcnJlZmxleGl2b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQWdyZWVhYmxlbmVzc19taW51c19Db25zY2llbnRpb3VzbmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImVzdHJpY3RvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInLDrWdpZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkdXJvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJBZ3JlZWFibGVuZXNzX21pbnVzX0V4dHJhdmVyc2lvbl9taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImPDrW5pY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjYXV0byBjb24gbG9zIGRlbcOhc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNvbGl0YXJpb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlc2FwZWdhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbXBlcnNvbmFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic29tYnLDrW9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkFncmVlYWJsZW5lc3NfbWludXNfRXh0cmF2ZXJzaW9uX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJvYnN0aW5hZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhYnJ1cHRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3J1ZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb21iYXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkdXJvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFzdHV0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm1hbmlwdWxhZG9yXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaG9zY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ0YWltYWRvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJBZ3JlZWFibGVuZXNzX21pbnVzX05ldXJvdGljaXNtX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5zZW5zaWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gYWZlY3R1b3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVzYXBhc2lvbmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInVuYSBwZXJzb25hIHNpbiBlbW9jaW9uZXNcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkFncmVlYWJsZW5lc3NfbWludXNfTmV1cm90aWNpc21fcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNyw610aWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZWdvw61zdGFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZSBtYWwgZ2VuaW9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhbnRhZ29uaXN0YVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImdydcOxw7NuXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYW1hcmdhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZXNhZ3JhZGFibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJleGlnZW50ZVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQWdyZWVhYmxlbmVzc19taW51c19PcGVubmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInRvc2NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5hIHBlcnNvbmEgc2luIHRhY3RvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYnJ1c2NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY2VycmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIsOhc3Blcm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbXBsYWNhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBjYXJpdGF0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmVuZ2F0aXZvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJBZ3JlZWFibGVuZXNzX21pbnVzX09wZW5uZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVyc3BpY2F6XCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImV4Y8OpbnRyaWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluZGl2aWR1YWxpc3RhXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJBZ3JlZWFibGVuZXNzX3BsdXNfQ29uc2NpZW50aW91c25lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic29icmlvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm1vZGVzdG9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkFncmVlYWJsZW5lc3NfcGx1c19Db25zY2llbnRpb3VzbmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNlcnZpY2lhbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb29wZXJhdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb25zaWRlcmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJyZXNwZXR1b3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvcnTDqXNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2Vuc2F0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhdGVudG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uc2lkZXJhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibGVhbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJtb3JhbFwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQWdyZWVhYmxlbmVzc19wbHVzX0V4dHJhdmVyc2lvbl9taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb25tb3ZpYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFncmFkYWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzZXJ2aWNpYWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaHVtaWxkZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluZHVsZ2VudGVcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkFncmVlYWJsZW5lc3NfcGx1c19FeHRyYXZlcnNpb25fcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJlZmVydmVzY2VudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYWxlZ3JlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFtaXN0b3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFsZWdyZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJqb3ZpYWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiam9jb3NvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJBZ3JlZWFibGVuZXNzX3BsdXNfTmV1cm90aWNpc21fbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ2VuZXJvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYWdyYWRhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInRvbGVyYW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwYWPDrWZpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZmxleGlibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZsOhY2lsIGRlIHRyYXRhclwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJqdXN0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjYXJpdGF0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbmZpYWJsZVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQWdyZWVhYmxlbmVzc19wbHVzX05ldXJvdGljaXNtX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VudGltZW50YWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY2FyacOxb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNlbnNpYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInRpZXJub1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhcGFzaW9uYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInJvbcOhbnRpY29cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkFncmVlYWJsZW5lc3NfcGx1c19PcGVubmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlcGVuZGllbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2ltcGxlXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJBZ3JlZWFibGVuZXNzX3BsdXNfT3Blbm5lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhbWlzdG9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ1bmEgcGVyc29uYSBjb24gdGFjdG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGlwbG9tw6F0aWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInByb2Z1bmRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImlkZWFsaXN0YVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQ29uc2NpZW50aW91c25lc3NfbWludXNfQWdyZWVhYmxlbmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFycmViYXRhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIGNvb3BlcmF0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBmaWFibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZXNjb25maWFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImlycmVmbGV4aXZvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJDb25zY2llbnRpb3VzbmVzc19taW51c19BZ3JlZWFibGVuZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBwcmV0ZW5jaW9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJtb2Rlc3RvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJDb25zY2llbnRpb3VzbmVzc19taW51c19FeHRyYXZlcnNpb25fbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmRlY2lzb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInVuYSBwZXJzb25hIHNpbiBwcm9ww7NzaXRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInVuYSBwZXJzb25hIHNpbiBjYXLDoWN0ZXJcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5hIHBlcnNvbmEgc2luIGNvbXByb21pc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIGFtYmljaW9zb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQ29uc2NpZW50aW91c25lc3NfbWludXNfRXh0cmF2ZXJzaW9uX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJyZXZvbHRvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYnVsbGljaW9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInRlbWVyYXJpb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInR1bXVsdHVvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVtb3N0cmF0aXZvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJDb25zY2llbnRpb3VzbmVzc19taW51c19OZXVyb3RpY2lzbV9taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmZvcm1hbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZSBiYWpvIHBlcmZpbFwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQ29uc2NpZW50aW91c25lc3NfbWludXNfTmV1cm90aWNpc21fcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImF0b2xvbmRyYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5jb25zaXN0ZW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImVycsOhdGljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm9sdmlkYWRpem9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbXB1bHNpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJmcsOtdm9sb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQ29uc2NpZW50aW91c25lc3NfbWludXNfT3Blbm5lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidGVtZXJhcmlvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaWzDs2dpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbm1hZHVyb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImF6YXJvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibGF4b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluZGlzY2lwbGluYWRvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJDb25zY2llbnRpb3VzbmVzc19taW51c19PcGVubmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gY29udmVuY2lvbmFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBlY3VsaWFyXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJDb25zY2llbnRpb3VzbmVzc19wbHVzX0FncmVlYWJsZW5lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmZsZXhpYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImVzdHJpY3RvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInLDrWdpZG9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkNvbnNjaWVudGlvdXNuZXNzX3BsdXNfQWdyZWVhYmxlbmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbmZpYWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJyZXNwb25zYWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzZWd1cm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZWR1Y2Fkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb25zaWRlcmFkb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQ29uc2NpZW50aW91c25lc3NfcGx1c19FeHRyYXZlcnNpb25fbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY2F1dG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VndXJvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImV4YWN0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJmb3JtYWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYWhvcnJhdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwcmluY2lwaXN0YVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQ29uc2NpZW50aW91c25lc3NfcGx1c19FeHRyYXZlcnNpb25fcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhbWJpY2lvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYWxlcnRhXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImZpcm1lXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlY2lkaWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbXBldGl0aXZvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJDb25zY2llbnRpb3VzbmVzc19wbHVzX05ldXJvdGljaXNtX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm1pbnVjaW9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJlc3RhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbnNpc3RlbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRpc2NpcGxpbmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJsw7NnaWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlY2lkaWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbnRyb2xhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uY2lzb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiQ29uc2NpZW50aW91c25lc3NfcGx1c19OZXVyb3RpY2lzbV9wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRldGFsbGlzdGFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJleGNpdGFibGVcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkNvbnNjaWVudGlvdXNuZXNzX3BsdXNfT3Blbm5lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidHJhZGljaW9uYWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29udmVuY2lvbmFsXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJDb25zY2llbnRpb3VzbmVzc19wbHVzX09wZW5uZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic29maXN0aWNhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVyZmVjY2lvbmlzdGFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5kdXN0cmlvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGlnbm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmVmaW5hZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3VsdG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicHJldmlzb3JcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkV4dHJhdmVyc2lvbl9taW51c19BZ3JlZWFibGVuZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImVzY8OpcHRpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY2F1dG8gY29uIGxvcyBkZW3DoXNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzb2xpdGFyaW9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIGNvbXVuaWNhdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFudGlzb2NpYWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzb21icsOtb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlc2ludGVyZXNhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXBhcnRhZG9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkV4dHJhdmVyc2lvbl9taW51c19BZ3JlZWFibGVuZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGFjw61maWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImh1bWlsZGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic3VtaXNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInTDrW1pZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwib2JlZGllbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluZ2VudW9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkV4dHJhdmVyc2lvbl9taW51c19Db25zY2llbnRpb3VzbmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluZGlyZWN0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImTDqWJpbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBlcmV6b3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBwZXJzaXN0ZW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInZhZ29cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkV4dHJhdmVyc2lvbl9taW51c19Db25zY2llbnRpb3VzbmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm1vZGVyYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNlcmlvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRpc2NyZXRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNhdXRlbG9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwcmluY2lwaXN0YVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiRXh0cmF2ZXJzaW9uX21pbnVzX05ldXJvdGljaXNtX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInRyYW5xdWlsb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzb3NlZ2Fkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwbMOhY2lkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbXBhcmNpYWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwibW9kZXN0b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb25kZXNjZW5kaWVudGVcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkV4dHJhdmVyc2lvbl9taW51c19OZXVyb3RpY2lzbV9wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlc2NvbmZpYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBlc2ltaXN0YVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJyZXNlcnZhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb2JhcmRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNhbGxhZG9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkV4dHJhdmVyc2lvbl9taW51c19PcGVubmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzb21icsOtb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm1hbnNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBhdmVudHVyZXJvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBhc2l2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFww6F0aWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImTDs2NpbFwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiRXh0cmF2ZXJzaW9uX21pbnVzX09wZW5uZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5hIHBlcnNvbmEgZ3VpYWRhIHBvciBzdSBwcm9waWEgY29uc2NpZW5jaWEgeSB2YWxvcmVzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImludHJvc3BlY3Rpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVuc2F0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbnRlbXBsYXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW50cm9zcGVjdGl2b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiRXh0cmF2ZXJzaW9uX3BsdXNfQWdyZWVhYmxlbmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInRlcmNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmlnb3Jvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkb21pbmFkb3JcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwcmVzdW1pZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJtYW5kw7NuXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRvbWluYW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhc3R1dG9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkV4dHJhdmVyc2lvbl9wbHVzX0FncmVlYWJsZW5lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzb2NpYWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZW7DqXJnaWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImVudHVzaWFzdGFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29tdW5pY2F0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInZpYnJhbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImVzcGlyaXR1b3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm1hZ27DqXRpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZW50dXNpYXN0YVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiRXh0cmF2ZXJzaW9uX3BsdXNfQ29uc2NpZW50aW91c25lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYnVsbGljaW9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ0cmF2aWVzb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJleGhpYmljaW9uaXN0YVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJncmVnYXJpb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZW1vc3RyYXRpdm9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkV4dHJhdmVyc2lvbl9wbHVzX0NvbnNjaWVudGlvdXNuZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYWN0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbXBldGl0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBlcnNpc3RlbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFtYmljaW9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZWNpZGlkb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiRXh0cmF2ZXJzaW9uX3BsdXNfTmV1cm90aWNpc21fbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29uZmlhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXVkYXpcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VndXJvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlc2luaGliaWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInZhbGllbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInZhbGllbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInVuYSBwZXJzb25hIHNhdGlzZmVjaGEgZGUgc2kgbWlzbWFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmlnb3Jvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZnVlcnRlXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJFeHRyYXZlcnNpb25fcGx1c19OZXVyb3RpY2lzbV9wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImV4cGxvc2l2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInZlcmJvcnLDoWdpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXh0cmF2YWdhbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidm9sw6F0aWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29xdWV0b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiRXh0cmF2ZXJzaW9uX3BsdXNfT3Blbm5lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ2ZXJib3Jyw6FnaWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5lc2NydXB1bG9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvbXBvc29cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkV4dHJhdmVyc2lvbl9wbHVzX09wZW5uZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhwcmVzaXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImPDoW5kaWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRyYW3DoXRpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXNwb250w6FuZW9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5nZW5pb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm9wb3J0dW5pc3RhXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluZGVwZW5kaWVudGVcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk5ldXJvdGljaXNtX21pbnVzX0FncmVlYWJsZW5lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIGVtb2Npb25hbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluc2Vuc2libGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIGNhcmnDsW9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlc2FwYXNpb25hZG9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk5ldXJvdGljaXNtX21pbnVzX0FncmVlYWJsZW5lc3NfcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwYWNpZW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJyZWxhamFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIGV4aWdlbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInJlYWxpc3RhXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm9wdGltaXN0YVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJtb2Rlc3RvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gY3LDrXRpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBwcmV0ZW5jaW9zb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiTmV1cm90aWNpc21fbWludXNfQ29uc2NpZW50aW91c25lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5mb3JtYWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGUgcGVyZmlsIGJham9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk5ldXJvdGljaXNtX21pbnVzX0NvbnNjaWVudGlvdXNuZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicmFjaW9uYWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwib2JqZXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXN0YWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJsw7NnaWNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRlY2lkaWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInByZXBhcmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb25jaXNvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImV4aGF1c3Rpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZWNvbsOzbWljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkaXNjaXBsaW5hZG9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk5ldXJvdGljaXNtX21pbnVzX0V4dHJhdmVyc2lvbl9taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJtb2Rlc3RvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicG9jbyBleGNpdGFibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGzDoWNpZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidHJhbnF1aWxvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJOZXVyb3RpY2lzbV9taW51c19FeHRyYXZlcnNpb25fcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmNvbnNjaWVudGUgZGUgc2kgbWlzbW9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5jYW5zYWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbmZhdGlnYWJsZVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiTmV1cm90aWNpc21fbWludXNfT3Blbm5lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1wZXJ0dXJiYWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluc2Vuc2libGVcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk5ldXJvdGljaXNtX21pbnVzX09wZW5uZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2VudGlkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ2ZXJzw6F0aWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY3JlYXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW50ZWxlY3R1YWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVyc3BpY2F6XCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJOZXVyb3RpY2lzbV9wbHVzX0FncmVlYWJsZW5lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ0ZW1wZXJhbWVudGFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaXJyaXRhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicGVsZWFkb3JcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbXBhY2llbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ3J1w7HDs25cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJtYWxodW1vcmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImlycml0YWJsZVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiTmV1cm90aWNpc21fcGx1c19BZ3JlZWFibGVuZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZW1vdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNyw6lkdWxvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNhcmnDsW9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzZW5zaWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJibGFuZG9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk5ldXJvdGljaXNtX3BsdXNfQ29uc2NpZW50aW91c25lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb21wdWxzaXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5xdWlzaXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkZXNlbmZyZW5hZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJvbHZpZGFkaXpvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW1wdWxzaXZvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJOZXVyb3RpY2lzbV9wbHVzX0NvbnNjaWVudGlvdXNuZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGV0YWxsaXN0YVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImV4Y2l0YWJsZVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiTmV1cm90aWNpc21fcGx1c19FeHRyYXZlcnNpb25fbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZ3VhcmRhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpcnJpdGFibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbnNlZ3Vyb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBlc2ltaXN0YVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJyZXNlcnZhZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ0ZW1lcm9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm5lZ2F0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImF1dG8tY3LDrXRpY29cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk5ldXJvdGljaXNtX3BsdXNfRXh0cmF2ZXJzaW9uX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhjaXRhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmVyYm9ycsOhZ2ljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjb3F1ZXRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhwbG9zaXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImV4dHJhdmFnYW50ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInZvbMOhdGlsXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJOZXVyb3RpY2lzbV9wbHVzX09wZW5uZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImlycml0YWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJmYXN0aWRpb3NvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFwcmVuc2l2b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiTmV1cm90aWNpc21fcGx1c19PcGVubmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImV4Y2l0YWJsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhcGFzaW9uYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNlbnN1YWxcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk9wZW5uZXNzX21pbnVzX0FncmVlYWJsZW5lc3NfbWludXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJvcmRpbmFyaW9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJzaW4gdGFjdG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJicnVzY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjZXJyYWRvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZHVyb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiT3Blbm5lc3NfbWludXNfQWdyZWVhYmxlbmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwic2ltcGxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZGVwZW5kaWVudGVcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk9wZW5uZXNzX21pbnVzX0NvbnNjaWVudGlvdXNuZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29ydG9wbGFjaXN0YVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ0ZW1lcmFyaW9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbMOzZ2ljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImlubWFkdXJvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXphcm9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJsYXhvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaXJyZXNwZXR1b3NvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJPcGVubmVzc19taW51c19Db25zY2llbnRpb3VzbmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImNvbnZlbmNpb25hbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJ0cmFkaWNpb25hbFwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiT3Blbm5lc3NfbWludXNfRXh0cmF2ZXJzaW9uX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInByZWRlY2libGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIGltYWdpbmF0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNvbWJyw61vXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYXDDoXRpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb2NvIGF2ZW50dXJlcm9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk9wZW5uZXNzX21pbnVzX0V4dHJhdmVyc2lvbl9wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmVyYm9ycsOhZ2ljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluZXNjcnVwdWxvc29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IHRydWUsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwb21wb3NvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJPcGVubmVzc19taW51c19OZXVyb3RpY2lzbV9taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbXBlcnR1cmJhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiB0cnVlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5zZW5zaWJsZVwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiT3Blbm5lc3NfbWludXNfTmV1cm90aWNpc21fcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpcnJpdGFibGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZmFzdGlkaW9zb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJhcHJlbnNpdm9cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk9wZW5uZXNzX3BsdXNfQWdyZWVhYmxlbmVzc19taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwZXJzcGljYXpcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhjw6ludHJpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5kaXZpZHVhbGlzdGFcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIk9wZW5uZXNzX3BsdXNfQWdyZWVhYmxlbmVzc19wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImlkZWFsaXN0YVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJkaXBsb23DoXRpY29cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwicHJvZnVuZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidW5hIHBlcnNvbmEgY29uIHRhY3RvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFtaXN0b3NvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJPcGVubmVzc19wbHVzX0NvbnNjaWVudGlvdXNuZXNzX21pbnVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBvY28gY29udmVuY2lvbmFsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBlY3VsaWFyXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJPcGVubmVzc19wbHVzX0NvbnNjaWVudGlvdXNuZXNzX3BsdXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiYW5hbMOtdGljb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwZXJjZXB0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImluZm9ybWF0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImdyYW5kaWxvY3VlbnRlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImRpZ25vXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImN1bHRvXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJPcGVubmVzc19wbHVzX0V4dHJhdmVyc2lvbl9taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbnRyb3NwZWN0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcIm1lZGl0YXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiY29udGVtcGxhdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbnRyb3NwZWN0aXZvXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInBlbnNhdGl2b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiT3Blbm5lc3NfcGx1c19FeHRyYXZlcnNpb25fcGx1c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJtdW5kYW5vXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImV4YWdlcmFkb1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJlbG9jdWVudGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW5xdWlzaXRpdm9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiaW50ZW5zb1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiT3Blbm5lc3NfcGx1c19OZXVyb3RpY2lzbV9taW51c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJjcmVhdGl2b1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJpbnRlbGVjdHVhbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicGVyY2VpdmVkX25lZ2F0aXZlbHlcIjogZmFsc2UsXG4gICAgICAgICAgICBcIndvcmRcIjogXCJwZXJzcGljYXpcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwidmVyc8OhdGlsXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImludmVudGl2b1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiT3Blbm5lc3NfcGx1c19OZXVyb3RpY2lzbV9wbHVzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcImFwYXNpb25hZG9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInBlcmNlaXZlZF9uZWdhdGl2ZWx5XCI6IGZhbHNlLFxuICAgICAgICAgICAgXCJ3b3JkXCI6IFwiZXhjaXRhYmxlXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwZXJjZWl2ZWRfbmVnYXRpdmVseVwiOiBmYWxzZSxcbiAgICAgICAgICAgIFwid29yZFwiOiBcInNlbnN1YWxcIlxuICAgICAgICB9XG4gICAgXVxufSxcblwidmFsdWVzXCI6IHtcbiAgICBcIkhlZG9uaXNtXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiRGlzZnJ1dGFyIGRlIGxhIHZpZGFcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJQcmVmaWVyZSBhY3RpdmlkYWRlcyBjb24gdW4gcHJvcMOzc2l0byBtw6FzIGdyYW5kZSBxdWUgZWwgc8OzbG8gZGVsZWl0ZSBwZXJzb25hbFwiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJUaWVuZSBncmFuIG1vdGl2YWNpw7NuIHBvciBkaXNmcnV0YXIgbGEgdmlkYSBlbiBzdSBwbGVuaXR1ZFwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiU2VsZi10cmFuc2NlbmRlbmNlXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiQXl1ZGFyIGEgbG9zIGRlbcOhc1wiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkNyZWUgcXVlIGxhcyBwZXJzb25hcyBwdWVkZW4gZW5jYXJnYXJzZSBkZSBzdXMgcHJvcGlvcyBhc3VudG9zIHNpbiBpbnRlcmZlcmVuY2lhXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkNyZWUgcXVlIGVzIGltcG9ydGFudGUgY3VpZGFyIGRlIGxhcyBwZXJzb25hcyBxdWUgbG8gcm9kZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiTGEganVzdGljaWFcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJDcmVlIHF1ZSBzb24gbGFzIHBlcnNvbmFzIGNyZWFuIHN1cyBvcG9ydHVuaWRhZGVzXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkNyZWUgZW4gbGEganVzdGljaWEgc29jaWFsIHkgbGEgaWd1YWxkYWQgcGFyYSB0b2Rvc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkxhIGp1c3RpY2lhIHNvY2lhbFwiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkNyZWUgcXVlIHNvbiBsYXMgcGVyc29uYXMgY3JlYW4gc3VzIG9wb3J0dW5pZGFkZXNcIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiQ3JlZSBlbiBsYSBqdXN0aWNpYSBzb2NpYWwgeSBsYSBpZ3VhbGRhZCBwYXJhIHRvZG9zXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiTGEgaWd1YWxkYWRcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJDcmVlIHF1ZSBzb24gbGFzIHBlcnNvbmFzIGNyZWFuIHN1cyBvcG9ydHVuaWRhZGVzXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkNyZWUgZW4gbGEganVzdGljaWEgc29jaWFsIHkgbGEgaWd1YWxkYWQgcGFyYSB0b2Rvc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkVsIHNlcnZpY2lvIGNvbXVuaXRhcmlvXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiQ3JlZSBxdWUgbGFzIHBlcnNvbmFzIHB1ZWRlbiBlbmNhcmdhcnNlIGRlIHN1cyBwcm9waW9zIGFzdW50b3Mgc2luIGludGVyZmVyZW5jaWFcIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiQ3JlZSBxdWUgZXMgaW1wb3J0YW50ZSBjdWlkYXIgZGUgbGFzIHBlcnNvbmFzIHF1ZSBsbyByb2RlYW5cIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIkNvbnNlcnZhdGlvblwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkxhcyB0cmFkaWNpb25lc1wiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkxlIGltcG9ydGEgbcOhcyBzZWd1aXIgc3UgcHJvcGlvIGNhbWlubyBxdWUgc2VndWlyIGVsIGNhbWlubyBkZSBvdHJvc1wiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJUaWVuZSBtdWNobyByZXNwZXRvIHBvciBsb3MgZ3J1cG9zIGEgbG9zIHF1ZSBwZXJ0ZW5lY2UgeSBzaWd1ZSBzdSBndcOtYVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkxhIGFybW9uw61hXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiRGVjaWRlIHF1w6kgZXMgbG8gY29ycmVjdG8gYmFzYWRvIGVuIHN1cyBjcmVlbmNpYXMsIG5vIGVuIGxvIHF1ZSBsYSBnZW50ZSBwaWVuc2FcIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiQ3JlZSBxdWUgbGFzIHJlZ2xhcyBleGlzdGVuIHBvciB1bmEgcmF6w7NuIHkgbnVuY2EgaW50ZW50YSB0cmFzZ3JlZGlybGFzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiTGEgaHVtaWxkYWRcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJEZWNpZGUgcXXDqSBlcyBsbyBjb3JyZWN0byBiYXNhZG8gZW4gc3VzIGNyZWVuY2lhcywgbm8gZW4gbG8gcXVlIGxhIGdlbnRlIHBpZW5zYVwiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJWZSB2YWxvciBlbiBkZWZlcmlyIGEgb3Ryb3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJMYXMgbm9ybWFzIHNvY2lhbGVzXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiRGVjaWRlIHF1w6kgZXMgbG8gY29ycmVjdG8gYmFzYWRvIGVuIHN1cyBjcmVlbmNpYXMsIG5vIGVuIGxvIHF1ZSBsYSBnZW50ZSBwaWVuc2FcIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiQ3JlZSBxdWUgbGFzIHJlZ2xhcyBleGlzdGVuIHBvciB1bmEgcmF6w7NuIHkgbnVuY2EgaW50ZW50YSB0cmFzZ3JlZGlybGFzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiTGEgc2VndXJpZGFkXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiUHJlZmllcmUgbGEgc2VndXJpZGFkIGEgY29zdGEgZGUgZGVqYXIgYSB1biBsYWRvIHN1cyBtZXRhc1wiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJDcmVlIHF1ZSBlcyBpbXBvcnRhbnRlIHNhbHZhZ3VhcmRhciBsYSBzZWd1cmlkYWRcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJMYSBzZWd1cmlkYWRcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJQcmVmaWVyZSBlc3RhciBzZWd1cm8gYSBjb3N0YSBkZSBkZWphciBhIHVuIGxhZG8gc3VzIG1ldGFzXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkNyZWUgcXVlIGVzIGltcG9ydGFudGUgc2FsdmFndWFyZGFyIGxhIHNlZ3VyaWRhZFwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiT3Blbm5lc3MtdG8tY2hhbmdlXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiU2VyIGluZGVwZW5kaWVudGVcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJSZWNpYmUgZGUgYnVlbmEgbWFuZXJhIHF1ZSBvdHJvcyBkaXJpamFuIHN1cyBhY3RpdmlkYWRlc1wiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJMZSBndXN0YSBlc3RhYmxlY2VyIHN1cyBwcm9waWFzIG1ldGFzIHBhcmEgZGVjaWRpciBjw7NtbyBhbGNhbnphcmxhcyBtZWpvclwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkxhIGVtb2Npw7NuXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiU2UgYXBlZ2EgYSBsYXMgY29zYXMgcXVlIGNvbm9jZSBhbnRlcyBxdWUgYXJyaWVzZ2Fyc2UgYSBwcm9iYXIgYWxnbyBudWV2byB5IHJpZXNnb3NvXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkVzdMOhIGFuc2lvc28gcG9yIGJ1c2NhciBleHBlcmllbmNpYXMgbnVldmFzIHkgZW1vY2lvbmFudGVzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiTGEgY3JlYXRpdmlkYWRcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJTZSBhcGVnYSBhIGxhcyBjb3NhcyBxdWUgY29ub2NlIGFudGVzIHF1ZSBhcnJpZXNnYXJzZSBhIHByb2JhciBhbGdvIG51ZXZvIHkgcmllc2dvc29cIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiRXN0w6EgYW5zaW9zbyBwb3IgYnVzY2FyIGV4cGVyaWVuY2lhcyBudWV2YXMgeSBlbW9jaW9uYW50ZXNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJMYSBjdXJpb3NpZGFkXCIsXG4gICAgICAgICAgICBcIkxvd0Rlc2NyaXB0aW9uXCI6IFwiU2UgYXBlZ2EgYSBsYXMgY29zYXMgcXVlIGNvbm9jZSBhbnRlcyBxdWUgYXJyaWVzZ2Fyc2UgYSBwcm9iYXIgYWxnbyBudWV2byB5IHJpZXNnb3NvXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkVzdMOhIGFuc2lvc28gcG9yIGJ1c2NhciBleHBlcmllbmNpYXMgbnVldmFzIHkgZW1vY2lvbmFudGVzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiTGEgYXV0b25vbcOtYVwiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlJlY2liZSBkZSBidWVuYSBtYW5lcmEgcXVlIG90cm9zIGRpcmlqYW4gc3VzIGFjdGl2aWRhZGVzXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkxlIGd1c3RhIGVzdGFibGVjZXIgc3VzIHByb3BpYXMgbWV0YXMgcGFyYSBkZWNpZGlyIGPDs21vIGFsY2FuemFybGFzIG1lam9yXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJUZXJtXCI6IFwiTGEgbGliZXJ0YWRcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJSZWNpYmUgZGUgYnVlbmEgbWFuZXJhIHF1ZSBvdHJvcyBkaXJpamFuIHN1cyBhY3RpdmlkYWRlc1wiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJMZSBndXN0YSBlc3RhYmxlY2VyIHN1cyBwcm9waWFzIG1ldGFzIHBhcmEgZGVjaWRpciBjw7NtbyBhbGNhbnphcmxhcyBtZWpvclwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiU2VsZi1lbmhhbmNlbWVudFwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkFsY2FuemFyIGVsIMOpeGl0b1wiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIlRvbWEgZGVjaXNpb25lcyBzaW4gY29uc2lkZXJhciBjw7NtbyBtdWVzdHJhbiBzdXMgdGFsZW50b3NcIixcbiAgICAgICAgICAgIFwiSGlnaERlc2NyaXB0aW9uXCI6IFwiQnVzY2Egb3BvcnR1bmlkYWRlcyBwYXJhIGF1dG9zdXBlcmFzZSB5IHBhcmEgZGVtb3N0cmFyIHF1ZSBlcyB1bmEgcGVyc29uYSBjYXBhelwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIk1lam9yYXIgc3UgZXN0YXR1cyBzb2NpYWxcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJFc3TDoSBjb25mb3JtZSBjb24gc3UgZXN0YXR1cyBzb2NpYWwgeSBubyBzaWVudGUgbmVjZXNpZGFkIGRlIG1lam9yYXJsb1wiLFxuICAgICAgICAgICAgXCJIaWdoRGVzY3JpcHRpb25cIjogXCJTZSBlc2Z1ZXJ6YSBjb25zaWRlcmFibGVtZW50ZSBwYXJhIG1lam9yYXIgc3UgZXN0YXR1cyBlIGltYWdlbiBww7pibGljYVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiVGVybVwiOiBcIkxhIGFtYmljacOzblwiLFxuICAgICAgICAgICAgXCJMb3dEZXNjcmlwdGlvblwiOiBcIkVzdMOhIGNvbmZvcm1lIGNvbiBzdSBlc3RhdHVzIHNvY2lhbCB5IG5vIHNpZW50ZSBuZWNlc2lkYWQgZGUgbWVqb3JhcmxvXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIlNpZW50ZSBxdWUgZXMgaW1wb3J0YW50ZSBhdmFuemFyIHBhcmEgYWxjYW56YXIgbWV0YXNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIlRlcm1cIjogXCJMb3MgZ3JhbmRlcyBsb2dyb3NcIixcbiAgICAgICAgICAgIFwiTG93RGVzY3JpcHRpb25cIjogXCJUb21hIGRlY2lzaW9uZXMgc2luIGNvbnNpZGVyYXIgY8OzbW8gbXVlc3RyYW4gc3VzIHRhbGVudG9zXCIsXG4gICAgICAgICAgICBcIkhpZ2hEZXNjcmlwdGlvblwiOiBcIkJ1c2NhIG9wb3J0dW5pZGFkZXMgcGFyYSBhdXRvc3VwZXJhc2UgeSBwYXJhIGRlbW9zdHJhciBxdWUgZXMgdW5hIHBlcnNvbmEgY2FwYXpcIlxuICAgICAgICB9XG4gICAgXVxuICB9XG59XG4iXX0=
(1)
});
