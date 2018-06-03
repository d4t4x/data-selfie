# Data Selfie

Work in progress. Some information might not apply.

* * *

## How to use

#### monitor your monitoring
- open console in any Facebook tab (by pressing Alt+Cmd+J on a Mac)
- you can see logs of what is happening in the background with Data Selfie

#### fix for most errors
- "Have you tried turning it off and on again?" - refresh the Facebook tab or close and open a new one

#### short cuts
- url bar, type "ds" + tab
- available commands ```reset db```, ```delete db```, ```init db```

#### access local data

###### tracked data
- open console in background page or Data Selfie Me page (Alt+Cmd+J on a Mac)
- go to the "Application" tab
- Storage > IndexedDB
- click triangle to expand the subitems
- "DataSelfieLocalDB" contains all tracked data (this is not saved anywhere else(!), so be careful before clearing this storage)

###### chrome local storage
- you can access settings, your general user data and the prediction
    - open console in background page or Data Selfie Me page (Alt+Cmd+J on a Mac)
    - copy ```chrome.storage.local.get(function(data){console.log(data)})```
    - press Enter

- you can delete your prediction results to start new
    - open console in background page or Data Selfie Me page (Alt+Cmd+J on a Mac)
    - copy ```chrome.storage.local.remove(["alchemy", "applymagicsauce", "personality"])```
    - press Enter

* * *

## How to run (locally) and pack

- ```npm install```
- to make a build (folder) from src ```npm run build```
- to make a build and watch for changes ```npm run buildw```
- to make a build and minify etc (see webpack.config.js) ```npm run buildprod```
    - use this to reproduce the code submitted to Chrome Web Store and Firefox Add-ons
    - for both Chrome and Firefox the content of the build folder is compressed and submitted to the developer platform

#### Chrome extension

- in your Chrome browser go to chrome://extensions/ and tick the box that says "Developer mode"
- now click "Load unpacked extension..." and choose the build folder you just created
- you can now use Data Selfie, the extension icon (the eye) should now appear in your toolbar
- it is tracking if the eye is black (instead of gray) and if you can see a clock at the bottom left in your facebook window

#### Firefox add-on

- go to about:debugging and and click on "Load Temporary Add-on"
- choose manifest.json from the build folder and hit enter

#### Difference Chrome and Firefox

- background.persistent: Event pages are not currently supported in Firefox. Background page has to be persistent

* * *

#### Known bugs
- posts like friendship anniversaries and memories are not considered, which sometimes leads to time being added to the previously looked at post
- when Facebook tab has been in the background for a while and you go back the clock might not show up again
- exporting your data can result in an invalid json file (that you can't import), when URLs contain double quotes " that are not escaped, you can do that manually by adding \ before the "
- more bugs commented in source code marked with "// FIX"

#### To Do List
- refine the limit of data sent to IBM (Alchemy and Personality Insights), now only last 300 rows - add date (e.g. last 5 days from last time active)
- make tracking more stable (we need your help, please report any problems you run into)
- improve Your Data Selfie (Me) page front end code (responsive, handlebars or similar instead of jquery append - I know horrible)

* * *

#### Disclaimer

This project is maintained by one developer (Hang aka 01fade) as of now. Email hello@dataselfie.it to get involved. Email support@dataselfie.it to report any issues you might have.

Last tested with:
- Chrome Version 61.0.3163.100 (64-bit) with macOS High Sierra 10.13 with Facebook in English (US)
- Firefox Nightly 58 with macOS High Sierra 10.13 with Facebook in English (US)


#### License

Data Selfie is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or any later version.

Data Selfie is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

For more info see <http://www.gnu.org/licenses/>.
