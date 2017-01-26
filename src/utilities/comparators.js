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

 module.exports = {
   compareByRelevance: compareByRelevance,
   compareByValue: compareByValue
 };
