/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @type {Array<Smokehouse.ExpectedRunnerResult>}
 */
const expectations = [
  {
    artifacts: {
      FullPageScreenshot: {
        data: /data:image\/jpeg;base64,.{700000,720000}$/,
        width: 980,
        height: 1758,
      },
    },
    lhr: {
      requestedUrl: 'http://localhost:10200/screenshots.html',
      finalUrl: 'http://localhost:10200/screenshots.html',
      audits: {},
    },
  },
  {
    artifacts: {
      FullPageScreenshot: {
        data: /data:image\/jpeg;base64,.{1800000,2000000}$/,
        width: 980,
        height: 16384,
      },
    },
    lhr: {
      requestedUrl: 'http://localhost:10200/screenshots.html?height=1000vh',
      finalUrl: 'http://localhost:10200/screenshots.html?height=1000vh',
      audits: {},
    },
  },
];

module.exports = expectations;
