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

const _ = require('underscore');
const extend = _.extend;
const pick = _.pick;

var format = require('./utilities/format');
var comparators = require('./utilities/comparators');

const I18nDataV2 = require('./i18n/v2');
const I18nDataV3 = require('./i18n/v3');
const PersonalityProfileV2 = require('../profiles/v2/index');
const PersonalityProfileV3 = require('../profiles/v3/index');
const defaultVersion = 'v2';

const CIRCUMPLEX_ORDER_OF_PERSONALITY_TRAITS = 'EANOC';

class TextSummary {

  constructor(options) {
    this._options = extend(this.defaultOptions(), pick(options, 'locale', 'format', 'version'));
    this._version = typeof this._options.version !== 'undefined' ? this._options.version : defaultVersion;

    // Select localization dictionary based on the version of PI, V2 or V3
    if (this._version === 'v3'){
      this._i18n = new I18nDataV3(this._options.locale);
    } else{
      this._i18n = new I18nDataV2(this._options.locale);
    }

    this._dictionary = this._i18n.data();
    this._translatorFactory = this._i18n.translatorFactory();
    this._translator = this._translatorFactory.createTranslator(this._dictionary.phrases);

    this.circumplexData = this._dictionary.traits;
    this.facetsData = this._dictionary.facets;
    this.valuesData = this._dictionary.values;
    this.needsData = this._dictionary.needs;
  }

  defaultOptions() {
    return {
      locale: 'en',
      version: 'v2'
    };
  }

  //getSummary(profile) {
  getSummary(profile) {
    var personalityProfile = this._version === 'v3' ? new PersonalityProfileV3(profile) : new PersonalityProfileV2(profile);
    this._personalityProfile = personalityProfile;
    return this.assemble(personalityProfile).map(function (paragraph) { return paragraph.join(' '); }).join('\n');
  }

  //assemble(tree) {
  assemble(profile) {
    return [
      this.assembleTraits(profile.traits()),
      this.assembleFacets(profile.traits()),
      this.assembleNeeds(profile.needs()),
      this.assembleValues(profile.values())
    ];
  }

  //assembleTraits(personalityTree) {
  assembleTraits(traits) {
    var
      sentences = [],
      big5elements = [],
      relevantBig5,
      adj1, adj2, adj3;

    // Sort the Big 5 based on how extreme the number is.
    traits.forEach(function (p) {
      big5elements.push({
        id: p.id,
        percentage: p.score
      });
    });

    big5elements.sort(comparators.compareByRelevance);

    // Remove all traits with percentage values between 32% and 68%, as it's inside the common people.
    relevantBig5 = big5elements.filter(function (item) {
      return Math.abs(0.5 - item.percentage) > 0.18;
    });

    if (relevantBig5.length < 2) {
      // Even if no Big 5 attribute is interesting, you get 1 adjective.
      relevantBig5 = [big5elements[0], big5elements[1]];
    }

    adj1 = relevantBig5.length >=2 ? this.getCircumplexAdjective(relevantBig5[0], relevantBig5[1], 0) : null;
    adj2 = relevantBig5.length >=3 ? this.getCircumplexAdjective(relevantBig5[1], relevantBig5[2], 1) : null;
    adj3 = relevantBig5.length >=4 ? this.getCircumplexAdjective(relevantBig5[2], relevantBig5[3], 2) : null;

    // Generate sentences summarizing personality traits composed of cross trait phrases
    switch (relevantBig5.length) {
    case 2:
      sentences.push(format(this._translator('You are %s'), adj1) + '.');
      break;
    case 3:
      sentences.push(format(this._translator('You are %s and %s'),  adj1, adj2) + '.');
      break;
    case 4:
    case 5:
      sentences.push(format(this._translator('You are %s, %s and %s'),  adj1, adj2, adj3) + '.');
      break;
    }

    return sentences;
  }

  //assembleFacets(personalityTree) {
  assembleFacets(traits) {
    var
      sentences = [],
      facetElements = [],
      info,
      i;

    // Assemble the full list of facets and sort them based on how extreme
    // is the number.
    traits.forEach(function (p) {
      p.facets.forEach(function (f) {
        facetElements.push({
          id: f.id,
          percentage: f.score,
          parent: p
        });
      });
    });
    facetElements.sort(comparators.compareByRelevance);

    info = this.getFacetInfo(facetElements[0]);
    sentences.push(format(this._translator('You are %s'), info.term) + ': ' + info.description + '.');
    info = this.getFacetInfo(facetElements[1]);
    sentences.push(format(this._translator('You are %s'), info.term) + ': ' + info.description + '.');

    // If all the facets correspond to the same feature, continue until a
    // different parent feature is found.
    i = 2;
    if (facetElements[0].parent === facetElements[1].parent) {
      while (facetElements[0].parent === facetElements[i].parent) {
        i += 1;
      }
    }
    info = this.getFacetInfo(facetElements[i]);
    sentences.push(format(this._translator('And you are %s'), info.term) + ': ' + info.description + '.');

    return sentences;
  }

  //assembleNeeds(needsTree) {
  assembleNeeds(needs) {
    var
      sentences = [],
      needsList = [],
      word,
      sentence;

    needs.forEach(function (n) {
      needsList.push({
        id: n.id,
        percentage: n.score
      });
    });
    needsList.sort(comparators.compareByValue);

    // Get the words required.
    var need = needsList[0];
    word = (this.needsData[need.id])[0];

    // Form the right sentence for the single need.
    switch (this.intervalFor(needsList[0].percentage)) {
    case 0:
      sentence = this._translator('Experiences that make you feel high %s are generally unappealing to you');
      break;
    case 1:
      sentence = this._translator('Experiences that give a sense of %s hold some appeal to you');
      break;
    case 2:
      sentence = this._translator('You are motivated to seek out experiences that provide a strong feeling of %s');
      break;
    case 3:
      sentence = this._translator('Your choices are driven by a desire for %s');
      break;
    }
    sentence = format(sentence, word).concat('.');
    sentences.push(sentence);

    return sentences;
  }

  assembleValues(values) {
    var
      sentences = [],
      valuesList = [],
      info1, info2,
      sentence,
      valuesInfo,
      i, term1, term2;

    values.forEach(function (v) {
      valuesList.push({
        id: v.id,
        percentage: v.score
      });
    });
    valuesList.sort(comparators.compareByRelevance);

    // Get all the text and data required.
    info1 = this.getValueInfo(valuesList[0]);
    info2 = this.getValueInfo(valuesList[1]);

    if (this.intervalFor(valuesList[0].percentage) === this.intervalFor(valuesList[1].percentage)) {
      // Assemble the first 'both' sentence.
      term1 = info1.term;
      term2 = info2.term;
      switch (this.intervalFor(valuesList[0].percentage)) {
      case 0:
        sentence = format(this._translator('You are relatively unconcerned with both %s and %s'), term1, term2) + '.';
        break;
      case 1:
        sentence = format(this._translator('You don\'t find either %s or %s to be particularly motivating for you'), term1, term2) + '.';
        break;
      case 2:
        sentence = format(this._translator('You value both %s and %s a bit'), term1, term2) + '.';
        break;
      case 3:
        sentence = format(this._translator('You consider both %s and %s to guide a large part of what you do'), term1, term2) + '.';
        break;
      }
      sentences.push(sentence);

      // Assemble the final strings in the correct format.
      sentences.push(info1.description + '.');
      sentences.push(format(this._translator('And %s'), info2.description.toLowerCase()) + '.');
    } else {
      valuesInfo = [info1, info2];
      for (i = 0; i < valuesInfo.length; i += 1) {
        // Process it this way because the code is the same.
        switch (this.intervalFor(valuesList[i].percentage)) {
        case 0:
          sentence = format(this._translator('You are relatively unconcerned with %s'), valuesInfo[i].term);
          break;
        case 1:
          sentence = format(this._translator('You don\'t find %s to be particularly motivating for you'), valuesInfo[i].term);
          break;
        case 2:
          sentence = format(this._translator('You value %s a bit more'),  valuesInfo[i].term);
          break;
        case 3:
          sentence = format(this._translator('You consider %s to guide a large part of what you do'),  valuesInfo[i].term);
          break;
        }
        sentence = sentence.concat(': ').
            concat(valuesInfo[i].description.toLowerCase()).
            concat('.');
        sentences.push(sentence);
      }
    }

    return sentences;
  }

  /**
  *  getCircumplexAdjective generates a qualified cross trait phrase given two personality traits, p1 and p2
  *  p1 and p2: personality traits of the form {"id":<id>,"percentage":<percentage>}
  *  order: determines which qualifier to use for the cross trait adjective
  *      e.g., terms that are viewed negatively in Western culture are qualified with 'a bit' or 'somewhat'
  *         0: 'a bit'
  *         1: 'somewhat'
  *         2: 'can be perceived as'
  *  Returns the qualified cross trait adjective phrase for p1 and p2.
  */
  getCircumplexAdjective(p1, p2, order) {
    var version = this._version;
    var ordered = [p1, p2].sort(function (o1, o2) {
      var i1, i2;
      if (version === 'v3') {
        i1 = CIRCUMPLEX_ORDER_OF_PERSONALITY_TRAITS.indexOf(o1.id.replace('big5_', '').charAt(0).toUpperCase());
        i2 = CIRCUMPLEX_ORDER_OF_PERSONALITY_TRAITS.indexOf(o2.id.replace('big5_', '').charAt(0).toUpperCase());
      }else{
        i1 = CIRCUMPLEX_ORDER_OF_PERSONALITY_TRAITS.indexOf(o1.id.charAt(0));
        i2 = CIRCUMPLEX_ORDER_OF_PERSONALITY_TRAITS.indexOf(o2.id.charAt(0));
      }
      return i1 < i2 ? -1 : 1;
    });

    // Assemble the identifier as the JSON file stored it.
    var identifier = ordered[0].id.
        concat(ordered[0].percentage > 0.5 ? '_plus_' : '_minus_').
        concat(ordered[1].id).
        concat(ordered[1].percentage > 0.5 ? '_plus' : '_minus');

    var traitMult = this.circumplexData[identifier][0];
    var sentence = '%s';

    if (traitMult.perceived_negatively) {
      switch (order) {
      case 0:
        sentence = this._translator('a bit %s');
        break;
      case 1:
        sentence = this._translator('somewhat %s');
        break;
      case 2:
        sentence = this._translator('can be perceived as %s');
        break;
      }
    }

    return format(sentence, traitMult.word);
  }

  getValueInfo(v) {
    return {
      name: v.id,
      term: this.valuesData[v.id][0].Term.toLowerCase(),
      description: v.percentage > 0.5 ? this.valuesData[v.id][0].HighDescription : this.valuesData[v.id][0].LowDescription
    };
  }

  getFacetInfo(f) {
    return {
      name: f.id,
      term: f.percentage > 0.5 ? this.facetsData[f.id].HighTerm.toLowerCase() : this.facetsData[f.id].LowTerm.toLowerCase(),
      description: f.percentage > 0.5 ? this.facetsData[f.id].HighDescription.toLowerCase() : this.facetsData[f.id].LowDescription.toLowerCase()
    };
  }

  intervalFor(p) {
    return Math.min(Math.floor(p * 4), 3);
  }

}

module.exports = TextSummary;
